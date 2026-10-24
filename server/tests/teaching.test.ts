import { env } from 'cloudflare:workers';
import { beforeEach,describe,expect,it } from 'vitest';
import { createApi } from '../app';
import { account,authEnv,resetAuthDatabase } from './auth-helpers';
import type { QuestionDraftContent,TeachingDraft,TestDraftContent } from '../../shared/contracts/teaching';
import type { ServerAttempt } from '../../shared/contracts/exams';

const api=createApi();
type Account=Awaited<ReturnType<typeof account>>;
const request=(user:Account,path:string,body?:unknown,method=body===undefined?'GET':'POST')=>api.request('/api/v1'+path,{method,headers:user.headers,...(body===undefined?{}:{body:JSON.stringify(body)})},authEnv);
const content=(kind:'single'|'written'='written'):QuestionDraftContent=>({kind,topic:'theory',stem:'Synthetic controls question',options:[{id:'one',text:'ONE'},{id:'two',text:'TWO'},{id:'three',text:'THREE'},{id:'four',text:'FOUR'}],correctOptionId:kind==='single'?'one':null,accepted:[],explanation:'Private synthetic explanation'});
async function question(user:Account,kind:'single'|'written'='written') {
  const r=await request(user,'/staff/questions',{operationId:crypto.randomUUID(),content:content(kind)});expect(r.status).toBe(201);
  return await r.json() as TeachingDraft<QuestionDraftContent>;
}
async function publishQuestion(user:Account,draft:TeachingDraft<QuestionDraftContent>) {
  const r=await request(user,`/staff/questions/${draft.id}/publish`,{revision:draft.revision});expect(r.status).toBe(200);return (await r.json() as {versionId:string}).versionId;
}
async function test(user:Account,ids:string[],isPublic=false) {
  const input:TestDraftContent={name:'Synthetic teacher test',mode:isPublic?'practice':'mock',durationSeconds:isPublic?null:3600,questionVersionIds:ids,isPublic};
  const response=await request(user,'/staff/tests',{operationId:crypto.randomUUID(),content:input});expect(response.status).toBe(201);
  const draft=await response.json() as TeachingDraft<TestDraftContent>;
  const published=await request(user,`/staff/tests/${draft.id}/publish`,{revision:draft.revision});expect(published.status).toBe(200);
  return {draft,versionId:(await published.json() as {versionId:string}).versionId};
}
async function group(teacher:Account,student?:Account) {
  const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO groups(id,name,created_by,created_at) VALUES(?,?,?,?)').bind(id,'Synthetic group',teacher.id,Date.now()).run();
  await env.DB.prepare('INSERT INTO group_teachers VALUES(?,?,?)').bind(id,teacher.id,Date.now()).run();
  if(student)await env.DB.prepare('INSERT INTO group_memberships VALUES(?,?,?,?)').bind(id,student.id,teacher.id,Date.now()).run();return id;
}
const localTime=(ms:number)=>new Date(ms+5*3600000).toISOString().slice(0,16)+':00+05:00';
async function assignedAttempt() {
  const teacher=await account('teacher'),student=await account();const q=await question(teacher);const qv=await publishQuestion(teacher,q);const t=await test(teacher,[qv]);const g=await group(teacher,student);
  const assignment={operationId:crypto.randomUUID(),testVersionId:t.versionId,groupId:g,timeZone:'Asia/Tashkent',opensAt:localTime(Date.now()-120000),closesAt:localTime(Date.now()+3600000)};
  expect((await request(teacher,'/staff/assignments',assignment)).status).toBe(201);
  const start=await request(student,`/exams/a_${assignment.operationId}/start`,{operationId:crypto.randomUUID()});expect(start.status).toBe(200);const a=await start.json() as ServerAttempt;
  const submitted=await request(student,`/attempts/${a.id}/submit`,{operationId:crypto.randomUUID(),revision:a.revision,answers:{[qv]:'free text'},flags:[]});expect(submitted.status).toBe(200);
  return {teacher,student,q,qv,t,g,assignment,attempt:await submitted.json() as ServerAttempt};
}
beforeEach(resetAuthDatabase);

describe('staff authoring',()=>{
  it('lists a scoped question bank with global filters, pagination and no answer keys',async()=>{
    const teacher=await account('teacher'),other=await account('teacher'),student=await account();
    const drafts=[];
    for(let i=1;i<=23;i++){
      const response=await request(teacher,'/staff/questions',{operationId:crypto.randomUUID(),content:{...content(i%2?'written':'single'),stem:`Synthetic item ${String(i).padStart(2,'0')}`}});
      drafts.push(await response.json() as TeachingDraft<QuestionDraftContent>);
    }
    await question(other);await publishQuestion(teacher,drafts[0]!);
    const read=async(query='')=>await (await request(teacher,'/staff/question-bank'+query)).json() as {total:number;page:number;items:{id:string;stem:string;published:number}[]};
    const first=await read();expect(first.total).toBe(23);expect(first.items).toHaveLength(20);
    const last=await read('?page=2');expect(last.items).toHaveLength(3);expect(new Set([...first.items,...last.items].map(q=>q.id)).size).toBe(23);
    expect(JSON.stringify(first)).not.toContain('Private synthetic explanation');expect(JSON.stringify(first)).not.toContain('correctOptionId');
    expect((await read('?status=published')).items.map(q=>q.id)).toEqual([drafts[0]!.id]);
    expect((await read('?status=draft')).total).toBe(22);
    expect((await read('?search=item%2002&kind=single&topic=theory')).items.map(q=>q.id)).toEqual([drafts[1]!.id]);
    expect((await read('?topic=civil')).total).toBe(0);
    expect((await read('?page=999')).page).toBe(2);
    expect((await request(student,'/staff/question-bank')).status).toBe(403);
    expect((await api.request('/api/v1/staff/question-bank',{},authEnv)).status).toBe(401);
    expect((await request(teacher,'/staff/question-bank?kind=invalid')).status).toBe(422);
  });
  it('preserves original import row order across question bank pages',async()=>{
    const teacher=await account('teacher');const jobId=crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO import_jobs(id,owner_id,filename,file_hash,source_bytes,total_rows,duplicate_policy,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(jobId,teacher.id,'synthetic.csv','a'.repeat(64),100,23,'skip',1,1).run();
    for(let i=23;i>=1;i--){
      const q=await question(teacher);
      await env.DB.prepare('INSERT INTO import_rows(job_id,row_number,content,content_hash,content_bytes,draft_id) VALUES(?,?,?,?,?,?)').bind(jobId,i+1,JSON.stringify(content()),'a'.repeat(64),10,q.id).run();
    }
    const one=await (await request(teacher,'/staff/question-bank')).json() as {items:{sourceNumber:number;sourceName:string}[]};
    const two=await (await request(teacher,'/staff/question-bank?page=2')).json() as typeof one;
    expect([...one.items,...two.items].map(q=>q.sourceNumber)).toEqual(Array.from({length:23},(_,i)=>i+1));
    expect(one.items[0]!.sourceName).toBe('synthetic.csv');
  });
  it('rejects students, anonymous users and cross-origin/CSRF mutations',async()=>{
    const student=await account(),teacher=await account('teacher');
    expect((await request(student,'/staff/questions')).status).toBe(403);
    expect((await api.request('/api/v1/staff/questions',{},authEnv)).status).toBe(401);
    expect((await api.request('/api/v1/staff/questions',{method:'POST',headers:{Cookie:teacher.headers.Cookie,'Content-Type':'application/json'},body:JSON.stringify({operationId:crypto.randomUUID(),content:content()})},authEnv)).status).toBe(403);
  });
  it('creates incomplete drafts idempotently but refuses to publish incomplete content',async()=>{
    const teacher=await account('teacher');const input={operationId:crypto.randomUUID(),content:{...content('single'),stem:'',correctOptionId:null}};
    const results=await Promise.all([request(teacher,'/staff/questions',input),request(teacher,'/staff/questions',input)]);
    expect(results.map(r=>r.status)).toEqual([201,201]);expect(await env.DB.prepare('SELECT count(*) n FROM question_drafts').first('n')).toBe(1);
    expect((await request(teacher,`/staff/questions/${input.operationId}/publish`,{revision:0})).status).toBe(422);
    expect((await request(teacher,'/staff/questions',{...input,content:content()})).status).toBe(409);
  });
  it('isolates private drafts and publication keys between teachers',async()=>{
    const teacher=await account('teacher'),other=await account('teacher'),admin=await account('admin');const q=await question(teacher);
    expect((await request(other,`/staff/questions/${q.id}`)).status).toBe(404);
    expect((await request(other,`/staff/questions/${q.id}`,{revision:0,content:content()},'PATCH')).status).toBe(404);
    expect((await request(other,`/staff/questions/${q.id}/publish`,{revision:0})).status).toBe(404);
    expect((await request(admin,`/staff/questions/${q.id}`)).status).toBe(200);
    expect((await (await request(other,'/staff/questions')).json() as {items:unknown[]}).items).toEqual([]);
  });
  it('guards draft saves by revision and preserves immutable published content',async()=>{
    const teacher=await account('teacher');const q=await question(teacher,'single');const v1=await publishQuestion(teacher,q);
    const changedContent={...q.content,stem:'New question text',correctOptionId:'two'};
    const responses=await Promise.all([request(teacher,`/staff/questions/${q.id}`,{revision:0,content:changedContent},'PATCH'),request(teacher,`/staff/questions/${q.id}`,{revision:0,content:q.content},'PATCH')]);
    expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
    const current=await (await request(teacher,`/staff/questions/${q.id}`)).json() as TeachingDraft<QuestionDraftContent>;const v2=await publishQuestion(teacher,current);
    expect(v2).not.toBe(v1);expect(JSON.parse((await env.DB.prepare('SELECT payload FROM question_versions WHERE id=?').bind(v1).first<string>('payload'))!).question.stem).toBe(q.content.stem);
  });
  it('publishes exactly one version for concurrent retries and audits only the publication',async()=>{
    const teacher=await account('teacher');const q=await question(teacher);
    const ids=await Promise.all(Array.from({length:4},()=>publishQuestion(teacher,q)));expect(new Set(ids).size).toBe(1);
    expect(await env.DB.prepare("SELECT count(*) n FROM audit_events WHERE action='question.publish'").first('n')).toBe(1);
    expect((await (await request(teacher,'/staff/question-versions')).json() as {items:{id:string}[]}).items[0]?.id).toBe(ids[0]);
  });
  it('only composes tests from accessible published questions and validates public/mock rules',async()=>{
    const teacher=await account('teacher'),other=await account('teacher');const q=await question(teacher);const version=await publishQuestion(teacher,q);
    const input:TestDraftContent={name:'Test',mode:'mock',durationSeconds:60,questionVersionIds:[version],isPublic:false};
    const create=await request(other,'/staff/tests',{operationId:crypto.randomUUID(),content:input});const t=await create.json() as TeachingDraft<TestDraftContent>;
    expect((await request(other,`/staff/tests/${t.id}/publish`,{revision:0})).status).toBe(404);
    const bad=await request(teacher,'/staff/tests',{operationId:crypto.randomUUID(),content:{...input,isPublic:true}});const bt=await bad.json() as TeachingDraft<TestDraftContent>;
    expect((await request(teacher,`/staff/tests/${bt.id}/publish`,{revision:0})).status).toBe(422);
    expect((await request(teacher,'/staff/tests',{operationId:crypto.randomUUID(),content:{...input,questionVersionIds:[version,version]}})).status).toBe(422);
  });
  it('replaces public catalog versions without changing an existing attempt',async()=>{
    const teacher=await account('teacher'),student=await account();const q=await question(teacher,'single');const v=await publishQuestion(teacher,q);const t=await test(teacher,[v],true);
    const start=await request(student,`/exams/p_${t.versionId}/start`,{operationId:crypto.randomUUID()});const a=await start.json() as ServerAttempt;
    const changedDraft=await (await request(teacher,`/staff/tests/${t.draft.id}`,{revision:0,content:{...t.draft.content,name:'Second edition'}},'PATCH')).json() as TeachingDraft<TestDraftContent>;
    const version=(await (await request(teacher,`/staff/tests/${t.draft.id}/publish`,{revision:changedDraft.revision})).json() as {versionId:string}).versionId;
    const list=await (await request(student,'/exams')).json() as {items:{id:string}[]};expect(list.items.map(t=>t.id)).toEqual(['p_'+version]);
    expect((await (await request(student,`/attempts/${a.id}`)).json() as ServerAttempt).name).toBe('Synthetic teacher test');
  });
  it('grades an old attempt with its original key after the author publishes a different key',async()=>{
    const teacher=await account('teacher'),student=await account();const q=await question(teacher,'single');const v1=await publishQuestion(teacher,q);const t=await test(teacher,[v1],true);
    const a=await (await request(student,`/exams/p_${t.versionId}/start`,{operationId:crypto.randomUUID()})).json() as ServerAttempt;
    const edited=await (await request(teacher,`/staff/questions/${q.id}`,{revision:0,content:{...q.content,correctOptionId:'two'}},'PATCH')).json() as TeachingDraft<QuestionDraftContent>;
    const v2=await publishQuestion(teacher,edited);expect(v2).not.toBe(v1);
    const result=await (await request(student,`/attempts/${a.id}/submit`,{revision:0,operationId:crypto.randomUUID(),answers:{[v1]:'one'},flags:[]})).json() as ServerAttempt;
    expect(result.result?.units).toBe(2);expect(result.feedback[v1]?.correctOptionId).toBe('one');
  });
});

describe('assignments and scope',()=>{
  it('pins a test to an authorized group using explicit Tashkent times and retries safely',async()=>{
    const f=await assignedAttempt();expect((await request(f.teacher,'/staff/assignments',f.assignment)).status).toBe(201);
    const row=await env.DB.prepare('SELECT opens_at,closes_at FROM assignments WHERE id=?').bind(f.assignment.operationId).first<{opens_at:number;closes_at:number}>();
    expect(row?.opens_at).toBe(Date.parse(f.assignment.opensAt));expect(row?.closes_at).toBe(Date.parse(f.assignment.closesAt));
    expect(await env.DB.prepare("SELECT count(*) n FROM audit_events WHERE action='assignment.create'").first('n')).toBe(1);
  });
  it('rejects device-zone timestamps, impossible calendar dates and reversed schedules',async()=>{
    const teacher=await account('teacher');const base={operationId:crypto.randomUUID(),testVersionId:'test',groupId:crypto.randomUUID(),timeZone:'Asia/Tashkent',opensAt:'2026-10-23T09:00:00+05:00',closesAt:'2026-10-23T10:00:00+05:00'};
    for(const changes of [{opensAt:'2026-10-23T09:00:00Z'},{opensAt:'2026-02-30T09:00:00+05:00'},{closesAt:base.opensAt},{timeZone:'Europe/London'}])expect((await request(teacher,'/staff/assignments',{...base,...changes})).status).toBe(422);
  });
  it('hides another teacher group, assignment and learner answers even from content authors',async()=>{
    const f=await assignedAttempt();const other=await account('teacher');await group(other);
    expect((await request(other,`/staff/assignments/${f.assignment.operationId}/attempts`)).status).toBe(404);
    expect((await request(other,`/staff/reviews/${f.attempt.id}`)).status).toBe(404);
    expect((await request(other,'/staff/assignments',{...f.assignment,operationId:crypto.randomUUID()})).status).toBe(404);
    expect((await (await request(other,'/staff/reviews')).json() as {items:unknown[]}).items).toEqual([]);
    await env.DB.prepare('DELETE FROM group_teachers WHERE teacher_id=?').bind(f.teacher.id).run();
    expect((await request(f.teacher,`/staff/reviews/${f.attempt.id}`)).status).toBe(404);
  });
});

describe('revisioned manual grading',()=>{
  it('updates a real provisional result with half-points and an audited review',async()=>{
    const f=await assignedAttempt();expect(f.attempt.result?.pending).toBe(1);
    const queue=await (await request(f.teacher,'/staff/reviews')).json() as {items:{id:string}[]};expect(queue.items[0]?.id).toBe(f.attempt.id);
    const input={revision:0,operationId:crypto.randomUUID(),questionId:f.qv,units:1,comment:'Core idea is present.'};
    const response=await request(f.teacher,`/staff/reviews/${f.attempt.id}`,input);expect(response.status).toBe(200);
    const graded=await response.json() as {revision:number;result:{units:number;pending:number;final:boolean}};expect(graded.revision).toBe(1);expect(graded.result).toMatchObject({units:1,pending:0,final:true});
    const student=await (await request(f.student,`/attempts/${f.attempt.id}`)).json() as ServerAttempt;
    expect(student.result?.units).toBe(1);expect(student.feedback).toEqual({});
    expect(await env.DB.prepare("SELECT count(*) n FROM audit_events WHERE action='attempt.review'").first('n')).toBe(1);
    expect((await request(f.teacher,`/staff/reviews/${f.attempt.id}`,input)).status).toBe(200);
    expect(await env.DB.prepare('SELECT revision FROM attempt_item_reviews WHERE attempt_id=?').bind(f.attempt.id).first('revision')).toBe(1);
  });
  it('rejects stale or mismatched review operations and audits deliberate regrades',async()=>{
    const f=await assignedAttempt();const input={revision:0,operationId:crypto.randomUUID(),questionId:f.qv,units:2,comment:'First decision'};
    expect((await request(f.teacher,`/staff/reviews/${f.attempt.id}`,input)).status).toBe(200);
    expect((await request(f.teacher,`/staff/reviews/${f.attempt.id}`,{...input,units:0})).status).toBe(409);
    expect((await request(f.teacher,`/staff/reviews/${f.attempt.id}`,{...input,operationId:crypto.randomUUID(),units:0})).status).toBe(409);
    expect((await request(f.teacher,`/staff/reviews/${f.attempt.id}`,{...input,revision:1,operationId:crypto.randomUUID(),units:0,comment:'Audited correction'})).status).toBe(200);
    expect(await env.DB.prepare('SELECT grade_revision FROM attempts WHERE id=?').bind(f.attempt.id).first('grade_revision')).toBe(2);
    expect(await env.DB.prepare("SELECT count(*) n FROM audit_events WHERE action='attempt.review'").first('n')).toBe(2);
  });
  it('lets one competing review win without losing a newer result',async()=>{
    const f=await assignedAttempt();const responses=await Promise.all([0,2].map(units=>request(f.teacher,`/staff/reviews/${f.attempt.id}`,{revision:0,operationId:crypto.randomUUID(),questionId:f.qv,units,comment:''})));
    expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
    const winning=await responses.find(r=>r.status===200)!.json() as {result:{units:number}};
    expect((await (await request(f.student,`/attempts/${f.attempt.id}`)).json() as ServerAttempt).result?.units).toBe(winning.result.units);
  });
  it('denies unrelated reviewers, student reviews and invalid units/questions',async()=>{
    const f=await assignedAttempt();const other=await account('teacher');const body={revision:0,operationId:crypto.randomUUID(),questionId:f.qv,units:1,comment:''};
    expect((await request(f.student,`/staff/reviews/${f.attempt.id}`,body)).status).toBe(403);
    expect((await request(other,`/staff/reviews/${f.attempt.id}`,body)).status).toBe(404);
    for(const changes of [{units:0.5},{units:3},{questionId:'other'},{comment:'x'.repeat(2001)}])expect((await request(f.teacher,`/staff/reviews/${f.attempt.id}`,{...body,...changes})).status).toBe(422);
  });
  it('reserves unassigned public-practice review for administrators',async()=>{
    const teacher=await account('teacher'),admin=await account('admin'),student=await account();const q=await question(teacher);const v=await publishQuestion(teacher,q);const t=await test(teacher,[v],true);
    const a=await (await request(student,`/exams/p_${t.versionId}/start`,{operationId:crypto.randomUUID()})).json() as ServerAttempt;
    await request(student,`/attempts/${a.id}/submit`,{revision:0,operationId:crypto.randomUUID(),answers:{[v]:'answer'},flags:[]});
    expect((await request(teacher,`/staff/reviews/${a.id}`)).status).toBe(404);
    expect((await request(admin,`/staff/reviews/${a.id}`,{revision:0,operationId:crypto.randomUUID(),questionId:v,units:1,comment:'Partial understanding'})).status).toBe(200);
    const result=await (await request(student,`/attempts/${a.id}`)).json() as ServerAttempt;
    expect(result.feedback[v]).toMatchObject({units:1,verdict:'partial',reviewComment:'Partial understanding'});
  });
});
