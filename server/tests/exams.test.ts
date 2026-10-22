import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApi } from '../app';
import { account, authEnv, resetAuthDatabase } from './auth-helpers';
import { closeEnough, grade, normalize } from '../exams/grading';
import { sweepExpired } from '../exams/service';
import type { ServerAttempt, PrivateQuestion } from '../../shared/contracts/exams';
import { privateQuestionSchema } from '../../shared/contracts/exams';
import localSeed from '../fixtures/local-exam.json';

const api = createApi();
const choice: PrivateQuestion = { question: { id: 'choice-v1', topic: 'theory', stem: 'Select the word shown: ALPHA', kind: 'single', options: [
  { id: 'alpha', text: 'ALPHA' }, { id: 'beta', text: 'BETA' }, { id: 'gamma', text: 'GAMMA' }, { id: 'delta', text: 'DELTA' },
] }, correctOptionId: 'alpha', accepted: [], explanation: 'Synthetic test fixture explanation.' };
const written: PrivateQuestion = { question: { id: 'written-v1', topic: 'theory', stem: 'Write the shown word: Nızam', kind: 'written' }, accepted: ['Nızam'], explanation: 'Synthetic fixture.' };
async function publish(id = 'sample', mode = 'practice', isPublic = 1) {
  const now = Date.now();
  for (const item of [choice, written]) await env.DB.prepare('INSERT OR IGNORE INTO question_versions VALUES(?,?,?)').bind(item.question.id, JSON.stringify(item), now).run();
  await env.DB.prepare('INSERT INTO test_versions VALUES(?,?,?,?,?,?,?)').bind(id, 'Synthetic test', mode, mode === 'mock' ? 3600 : null, JSON.stringify(['choice-v1', 'written-v1']), isPublic, now).run();
}
async function groupExam(user: string, opens = Date.now() - 10000, closes = Date.now() + 60000) {
  await publish('group', 'mock', 0);
  await env.DB.prepare("INSERT INTO groups(id,name,created_by,created_at) VALUES('g','Group',?,?)").bind(user, Date.now()).run();
  await env.DB.prepare("INSERT INTO group_memberships(group_id,student_id,enrolled_by,created_at) VALUES('g',?,?,?)").bind(user,user,Date.now()).run();
  await env.DB.prepare("INSERT INTO assignments VALUES('assignment','group','g',?,?)").bind(opens,closes).run();
}
type Account = Awaited<ReturnType<typeof account>>;
const request = (user: Account, path: string, body?: unknown) => api.request('/api/v1' + path, { method: body === undefined ? 'GET' : 'POST', headers: user.headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, authEnv);
async function start(user: Account, exam = 'p_sample', operationId = crypto.randomUUID()) { const r = await request(user, `/exams/${exam}/start`, { operationId }); expect(r.status).toBe(200); return await r.json() as ServerAttempt; }
const body = (a: ServerAttempt, answers: Record<string,string> = {}) => ({ revision: a.revision, operationId: crypto.randomUUID(), answers, flags: [] });
beforeEach(resetAuthDatabase);

describe('server examinations', () => {
  it('validates the synthetic local seed with the same published-content contract', () => {
    for (const item of localSeed) expect(privateQuestionSchema.safeParse(item).success).toBe(true);
    expect(new Set(localSeed.map(item=>item.question.id)).size).toBe(localSeed.length);
  });
  it('requires a real session and CSRF for examination mutations', async () => {
    expect((await api.request('/api/v1/exams', {}, authEnv)).status).toBe(401);
    const u = await account(); await publish();
    const r = await api.request('/api/v1/exams/p_sample/start', { method: 'POST', headers: { Cookie: u.headers.Cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ operationId: crypto.randomUUID() }) }, authEnv);
    expect(r.status).toBe(403);
  });
  it('returns only eligible metadata and keeps answer keys out of active attempts', async () => {
    const u = await account(); await publish(); await publish('private', 'mock', 0);
    const list = await (await request(u, '/exams')).json() as { items: { id: string }[] };
    expect(list.items.map(i => i.id)).toEqual(['p_sample']);
    expect((await request(u, '/exams/p_private')).status).toBe(404);
    const a = await start(u); const json = JSON.stringify(a);
    expect(json).not.toContain('correctOptionId'); expect(json).not.toContain('accepted'); expect(json).not.toContain('explanation');
    expect(a.feedback).toEqual({}); expect(a.result).toBeNull();
  });
  it('resumes one active practice for concurrent starts with stable shuffled options', async () => {
    const u = await account(); await publish();
    const attempts = await Promise.all(Array.from({ length: 8 }, () => start(u)));
    expect(new Set(attempts.map(a => a.id)).size).toBe(1);
    expect(attempts.every(a => JSON.stringify(a.questions) === JSON.stringify(attempts[0]!.questions))).toBe(true);
    expect(await env.DB.prepare('SELECT count(*) n FROM attempts').first('n')).toBe(1);
  });
  it('retries start operations after completion while permitting an explicit new practice', async () => {
    const u = await account(); await publish(); const op = crypto.randomUUID();
    const a = await start(u, 'p_sample', op); const otherOp = crypto.randomUUID(); await start(u, 'p_sample', otherOp);
    await request(u, `/attempts/${a.id}/submit`, body(a));
    expect((await start(u, 'p_sample', op)).id).toBe(a.id);
    expect((await start(u, 'p_sample', otherOp)).id).toBe(a.id);
    expect((await start(u)).id).not.toBe(a.id);
  });
  it('acknowledges a save once, replays identical retries and rejects reused operation IDs', async () => {
    const u = await account(); await publish(); const a = await start(u); const save = body(a, { 'choice-v1': 'beta' });
    const results = await Promise.all([request(u, `/attempts/${a.id}/save`, save), request(u, `/attempts/${a.id}/save`, save)]);
    expect(results.map(r => r.status)).toEqual([200,200]);
    const resumed = await (await request(u, `/attempts/${a.id}`)).json() as ServerAttempt;
    expect(resumed.revision).toBe(1); expect(resumed.snapshot.answers['choice-v1']).toBe('beta');
    expect((await request(u, `/attempts/${a.id}/save`, { ...save, answers: { 'choice-v1': 'alpha' } })).status).toBe(409);
  });
  it('rejects the losing tab without overwriting the acknowledged snapshot', async () => {
    const u = await account(); await publish(); const a = await start(u);
    const r = await Promise.all(['alpha','beta'].map(value => request(u, `/attempts/${a.id}/save`, body(a, { 'choice-v1': value }))));
    expect(r.map(x => x.status).sort()).toEqual([200,409]);
    const winner = await r.find(x => x.status === 200)!.json() as ServerAttempt;
    expect((await (await request(u, `/attempts/${a.id}`)).json() as ServerAttempt).snapshot).toEqual(winner.snapshot);
  });
  it('freezes one consistent snapshot when save and submit race', async () => {
    const u = await account(); await publish(); const a = await start(u);
    const responses = await Promise.all([request(u,`/attempts/${a.id}/save`,body(a,{'choice-v1':'beta'})),request(u,`/attempts/${a.id}/submit`,body(a,{'choice-v1':'alpha'}))]);
    const server = await (await request(u,`/attempts/${a.id}`)).json() as ServerAttempt;
    if (server.state==='active') {
      expect(responses[1]!.status).toBe(409);
      const submitted = await (await request(u,`/attempts/${a.id}/submit`,body(server,server.snapshot.answers))).json() as ServerAttempt;
      expect(submitted.snapshot.answers['choice-v1']).toBe('beta'); expect(submitted.result?.units).toBe(0);
    } else { expect(server.snapshot.answers['choice-v1']).toBe('alpha'); expect(server.result?.units).toBe(2); }
  });
  it('validates question IDs, choice IDs, character counts and state boundaries', async () => {
    const u = await account(); await publish(); const a = await start(u);
    const invalid: Record<string,string>[] = [{ other: 'alpha' }, { 'choice-v1': 'A' }, { 'written-v1': 'x'.repeat(1001) }];
    for (const answers of invalid) expect((await request(u, `/attempts/${a.id}/save`, body(a, answers))).status).toBe(422);
  });
  it('locks checked practice answers and reveals only checked feedback', async () => {
    const u = await account(); await publish(); const a = await start(u);
    const r = await request(u, `/attempts/${a.id}/check`, { ...body(a, { 'choice-v1': 'beta' }), questionId: 'choice-v1' });
    const checked = await r.json() as ServerAttempt; expect(r.status).toBe(200);
    expect(Object.keys(checked.feedback)).toEqual(['choice-v1']); expect(checked.feedback['choice-v1']?.correctOptionId).toBe('alpha');
    expect((await request(u, `/attempts/${a.id}/save`, body(checked, { 'choice-v1': 'alpha' }))).status).toBe(409);
  });
  it('atomically submits and returns the same result for duplicate submissions', async () => {
    const u = await account(); await publish(); const a = await start(u); const submission = body(a, { 'choice-v1': 'alpha', 'written-v1': ' NIZAM ' });
    // Dotless ı is significant; this different spelling is pending rather than exact.
    const responses = await Promise.all(Array.from({ length: 4 }, () => request(u, `/attempts/${a.id}/submit`, submission)));
    expect(responses.map(r => r.status)).toEqual([200,200,200,200]);
    const result = await responses[0]!.json() as ServerAttempt;
    expect(result.result).toMatchObject({ units: 2, maxUnits: 4, pending: 1, final: false });
    expect(result.feedback).toEqual({});
    const retry = await (await request(u, `/attempts/${a.id}/submit`, body(a, { 'choice-v1': 'beta' }))).json() as ServerAttempt;
    expect(retry.snapshot.answers['choice-v1']).toBe('alpha');
  });
  it('preserves the last saved snapshot on late submission and finalizes on read without cron', async () => {
    const u = await account(); await publish(); const a = await start(u);
    const saved = await (await request(u, `/attempts/${a.id}/save`, body(a, { 'choice-v1': 'beta' }))).json() as ServerAttempt;
    await env.DB.prepare('UPDATE attempts SET ends_at = ? WHERE id = ?').bind(Date.now()-1,a.id).run();
    const late = await (await request(u, `/attempts/${a.id}/submit`, body(saved, { 'choice-v1': 'alpha' }))).json() as ServerAttempt;
    expect(late.state).toBe('final'); expect(late.snapshot.answers['choice-v1']).toBe('beta'); expect(late.result?.units).toBe(0);
    expect((await request(u, `/attempts/${a.id}/save`, body(late))).status).toBe(409);
  });
  it('uses group membership, schedule and one attempt per assignment', async () => {
    const u = await account(); const stranger = await account(); await groupExam(u.id);
    expect((await request(stranger,'/exams/a_assignment')).status).toBe(404);
    const a = await start(u,'a_assignment'); expect(a.endsAt! - a.startedAt).toBeLessThanOrEqual(60000);
    expect((await request(u,`/attempts/${a.id}/check`, { ...body(a, { 'choice-v1': 'alpha' }), questionId: 'choice-v1' })).status).toBe(403);
    const result = await (await request(u,`/attempts/${a.id}/submit`,body(a,{ 'choice-v1': 'alpha', 'written-v1': 'Nızam' }))).json() as ServerAttempt;
    expect(result.result?.final).toBe(true); expect(result.feedback).toEqual({});
    expect((await start(u,'a_assignment')).id).toBe(a.id);
  });
  it('does not start a scheduled test before opening', async () => {
    const u = await account(); await groupExam(u.id,Date.now()+100000,Date.now()+200000);
    expect((await request(u,'/exams/a_assignment/start',{ operationId:crypto.randomUUID() })).status).toBe(404);
    expect(await env.DB.prepare('SELECT count(*) n FROM attempts').first('n')).toBe(0);
  });
  it('does not accept group changes after membership is revoked', async () => {
    const u = await account(); await groupExam(u.id); const a = await start(u,'a_assignment');
    await env.DB.prepare('DELETE FROM group_memberships WHERE student_id = ?').bind(u.id).run();
    expect((await request(u,`/attempts/${a.id}/save`,body(a,{'choice-v1':'alpha'}))).status).toBe(409);
    expect((await request(u,'/exams/a_assignment/start',{operationId:crypto.randomUUID()})).status).toBe(404);
  });
  it('releases group feedback only after closing and final grading', async () => {
    const u=await account(); await groupExam(u.id,Date.now()-20000,Date.now()-10000);
    const id=crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO attempts(id,user_id,exam_id,test_version_id,assignment_id,start_operation,started_at,ends_at,state,snapshot,question_order,saved_at,result)
      VALUES(?,?,'a_assignment','group','assignment',?,?,?,'final',?,?,?,?)`)
      .bind(id,u.id,crypto.randomUUID(),Date.now()-15000,Date.now()-10000,JSON.stringify({answers:{'choice-v1':'alpha','written-v1':'Nızam'},flags:[]}),JSON.stringify([{id:'choice-v1'},{id:'written-v1'}]),Date.now()-10000,JSON.stringify({units:4,maxUnits:4,pending:0,final:true,algorithm:'nfc-distance2-v1'})).run();
    const final=await (await request(u,`/attempts/${id}`)).json() as ServerAttempt;
    expect(final.feedback['choice-v1']?.correctOptionId).toBe('alpha'); expect(final.feedback['written-v1']?.accepted).toEqual(['Nızam']);
    await env.DB.prepare('UPDATE attempts SET result = ? WHERE id = ?').bind(JSON.stringify({...final.result,final:false,pending:1}),id).run();
    expect((await (await request(u,`/attempts/${id}`)).json() as ServerAttempt).feedback).toEqual({});
  });
  it('finalizes expired attempts on GET without trusting the scheduled sweeper', async () => {
    const u=await account(); await publish(); const a=await start(u);
    await env.DB.prepare('UPDATE attempts SET ends_at = ? WHERE id = ?').bind(Date.now()-1,a.id).run();
    const expired=await (await request(u,`/attempts/${a.id}`)).json() as ServerAttempt;
    expect(expired.state).toBe('final'); expect(expired.result?.units).toBe(0);
  });
  it('paginates same-timestamp attempts without dropping records', async () => {
    const u = await account(); await publish(); const ids: string[] = [];
    for (let i=0;i<3;i++) { const a=await start(u); ids.push(a.id); await request(u,`/attempts/${a.id}/submit`,body(a)); }
    await env.DB.prepare('UPDATE attempts SET started_at = 1000 WHERE user_id = ?').bind(u.id).run();
    let cursor: string | null=null; const found: string[]=[];
    do { const page=await (await request(u,'/attempts?limit=1'+(cursor?'&before='+encodeURIComponent(cursor):''))).json() as { items:{id:string}[];next:string|null }; found.push(...page.items.map(a=>a.id));cursor=page.next; } while(cursor);
    expect(found.sort()).toEqual(ids.sort());
    expect((await request(u,'/attempts?before=invalid')).status).toBe(422);
  });
  it('rejects unknown, duplicate and unbounded published question references', async () => {
    const u=await account(); await publish();
    for (const ids of [[],['missing'],['choice-v1','choice-v1'],new Array(101).fill('choice-v1')])
      await expect(env.DB.prepare("INSERT INTO test_versions VALUES(?, 'Bad', 'practice', NULL, ?, 1, 0)").bind(crypto.randomUUID(),JSON.stringify(ids)).run()).rejects.toThrow();
    expect(u.id).toBeTruthy();
  });
  it('isolates attempts and history from other users including staff', async () => {
    const u = await account(); const teacher = await account('teacher'); await publish(); const a = await start(u);
    for (const path of [`/attempts/${a.id}`,`/attempts/${crypto.randomUUID()}`]) expect((await request(teacher,path)).status).toBe(404);
    expect((await request(teacher,`/attempts/${a.id}/submit`,body(a))).status).toBe(404);
    expect((await (await request(teacher,'/attempts')).json() as { items: unknown[] }).items).toEqual([]);
  });
  it('does not let published version changes rewrite an attempt', async () => {
    const u = await account(); await publish(); const a = await start(u);
    await expect(env.DB.prepare("UPDATE question_versions SET payload = '{}' WHERE id = 'choice-v1'").run()).rejects.toThrow();
    await expect(env.DB.prepare("UPDATE test_versions SET name = 'Changed' WHERE id = 'sample'").run()).rejects.toThrow();
    await publish('second'); expect((await (await request(u,`/attempts/${a.id}`)).json() as ServerAttempt).questions).toEqual(a.questions);
  });
  it('bounds expiry sweeps and keeps receipts bounded', async () => {
    const u = await account(); await publish(); let a = await start(u);
    for (let i=0;i<20;i++) a = await (await request(u,`/attempts/${a.id}/save`,body(a,{ 'written-v1': String(i) }))).json() as ServerAttempt;
    expect(await env.DB.prepare('SELECT json_array_length(receipts) n FROM attempts WHERE id = ?').bind(a.id).first('n')).toBe(16);
    await env.DB.prepare('UPDATE attempts SET ends_at = ? WHERE id = ?').bind(Date.now()-1,a.id).run();
    await sweepExpired(env.DB,1); expect(await env.DB.prepare('SELECT state FROM attempts WHERE id = ?').bind(a.id).first('state')).toBe('final');
  });
});

describe('bounded written grading', () => {
  it('normalizes Unicode, spaces and case while preserving Karakalpak letters', () => {
    expect(normalize('  NıZAM\n ')).toBe('nızam'); expect(normalize('o\u0301')).toBe('ó');
    expect(grade(written,' NıZAM ')).toEqual({ verdict:'correct',units:2 });
    expect(grade(written,'nızan')).toEqual({ verdict:'pending',units:null });
    expect(grade(written,'completely different')).toEqual({ verdict:'incorrect',units:0 });
    expect(grade({ ...written, accepted: [] },'answer').verdict).toBe('pending');
  });
  it('handles insertion, deletion, replacement and long adversarial strings', () => {
    expect(closeEnough('abc','a')).toBe(true); expect(closeEnough('abc','abXYZc')).toBe(false);
    expect(closeEnough('x'.repeat(1000),'y'.repeat(1000))).toBe(false);
    expect(closeEnough('','ab')).toBe(true); expect(closeEnough('abcd','')).toBe(false);
  });
  it('matches an exhaustive short-string distance oracle at the two-edit boundary', () => {
    const words=[''];
    for(let length=1;length<=4;length++) for(const prefix of words.filter(word=>word.length===length-1)) for(const letter of ['a','ı']) words.push(prefix+letter);
    for(const a of words) for(const b of words) {
      const matrix=Array.from({length:a.length+1},()=>new Array<number>(b.length+1).fill(0));
      for(let i=0;i<=a.length;i++) matrix[i]![0]=i;
      for(let j=0;j<=b.length;j++) matrix[0]![j]=j;
      for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) matrix[i]![j]=Math.min(matrix[i-1]![j]!+1,matrix[i]![j-1]!+1,matrix[i-1]![j-1]!+(a[i-1]===b[j-1]?0:1));
      expect(closeEnough(a,b),`${a}/${b}`).toBe(matrix[a.length]![b.length]!<=2);
    }
  });
});
