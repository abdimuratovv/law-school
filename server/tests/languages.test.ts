import { env } from 'cloudflare:workers';
import { beforeEach, expect, it } from 'vitest';
import { createApi } from '../app';
import { account, authEnv, resetAuthDatabase } from './auth-helpers';
import type { ServerAttempt } from '../../shared/contracts/exams';
const api = createApi();
type User = Awaited<ReturnType<typeof account>>;
const request = (user: User, path: string, body?: unknown) => api.request('/api/v1' + path, {
  method: body === undefined ? 'GET' : 'POST', headers: user.headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}, authEnv);
beforeEach(resetAuthDatabase);
async function version(owner: User, name: string, answer: string, count = 1) {
  const qid = crypto.randomUUID(), vid = crypto.randomUUID(), draft = crypto.randomUUID(), now = Date.now();
  await env.DB.prepare('INSERT INTO question_versions VALUES(?,?,?)').bind(qid, JSON.stringify({ question: { id: qid, kind: 'written', topic: 'theory', stem: name }, accepted: [answer], explanation: 'PRIVATE_KEY' }), now).run();
  await env.DB.prepare('INSERT INTO test_versions VALUES(?,?,?,?,?,?,?)').bind(vid, name, 'mock', 86400, JSON.stringify(count ? [qid] : []), 0, now).run();
  await env.DB.prepare('INSERT INTO test_drafts(id,owner_id,content,created_at,updated_at) VALUES(?,?,?,?,?)').bind(draft, owner.id, '{}', now, now).run();
  await env.DB.prepare('INSERT INTO test_publications(test_id,draft_revision,version_id,created_at) VALUES(?,0,?,?)').bind(draft, vid, now).run();
  return { qid, vid, draft };
}
async function fixture() {
  const owner = await account('teacher');
  const uz = await version(owner, 'O‘zbekcha savol', 'salom');
  const kaa = await version(owner, 'Qaraqalpaqsha soraw', 'sálem');
  const id = crypto.randomUUID(), now = Date.now();
  await env.DB.prepare('INSERT INTO test_collections(id,test_id,test_version_id,owner_id,opens_at,closes_at,created_at) VALUES(?,?,?,?,?,?,?)')
    .bind(id, uz.draft, uz.vid, owner.id, now - 60000, now + 3600000, now).run();
  const attach = await request(owner, `/staff/collections/${id}/languages`, { language: 'kaa', testVersionId: kaa.vid });
  expect(attach.status).toBe(200);
  return { owner, uz, kaa, id };
}
const start = (user: User, id: string, language?: 'uz' | 'kaa', operationId = crypto.randomUUID()) => request(user, `/exams/c_${id}/start`, { operationId, ...(language ? { language } : {}) });

it('lists one collection, serves the selected language, grades its own key and reports language to staff', async () => {
  const f = await fixture(), user = await account();
  const catalog = await (await request(user, '/exams')).json() as { items: { id: string; languages: string[] }[] };
  expect(catalog.items).toHaveLength(1); expect(catalog.items[0]?.languages.sort()).toEqual(['kaa', 'uz']);
  const response = await start(user, f.id, 'kaa'); expect(response.status).toBe(200);
  const attempt = await response.json() as ServerAttempt;
  expect(attempt.language).toBe('kaa'); expect(attempt.questions[0]?.id).toBe(f.kaa.qid);
  expect(JSON.stringify(attempt)).not.toContain('PRIVATE_KEY'); expect(attempt.feedback).toEqual({});
  const saved = await request(user, `/attempts/${attempt.id}/save-changes`, { operationId: crypto.randomUUID(), revision: 0, answers: { [f.kaa.qid]: 'sálem' }, deletedAnswerIds: [], flags: [] });
  expect(saved.status).toBe(200);
  const resumed = await (await request(user, `/attempts/${attempt.id}`)).json() as ServerAttempt;
  expect(resumed.language).toBe('kaa'); expect(resumed.snapshot.answers).toEqual({ [f.kaa.qid]: 'sálem' });
  const final = await request(user, `/attempts/${attempt.id}/submit`, { operationId: crypto.randomUUID(), revision: 1, answers: { [f.kaa.qid]: 'sálem' }, flags: [] });
  expect(final.status).toBe(200); expect((await final.json() as ServerAttempt).result?.units).toBe(2);
  for (const path of [`/staff/collections/${f.id}/results`, '/staff/collections/results']) {
    const results = await (await request(f.owner, path)).json() as { items: { id: string; language: string }[] };
    expect(results.items[0]).toMatchObject({ id: attempt.id, language: 'kaa' });
  }
  const review = await (await request(f.owner, `/staff/reviews/${attempt.id}`)).json() as { language: string };
  expect(review.language).toBe('kaa');
});

it('keeps one attempt across both languages and rejects a language change even after submission', async () => {
  const f = await fixture(), user = await account();
  const responses = await Promise.all([start(user, f.id, 'uz'), start(user, f.id, 'kaa')]);
  expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
  const attempt = await responses.find(r => r.status === 200)!.json() as ServerAttempt;
  expect(await env.DB.prepare('SELECT count(*) n FROM attempts WHERE user_id=?').bind(user.id).first('n')).toBe(1);
  const operation = crypto.randomUUID();
  const replay = await start(user, f.id, attempt.language, operation); expect(replay.status).toBe(200);
  expect((await replay.json() as ServerAttempt).id).toBe(attempt.id);
  expect((await start(user, f.id, attempt.language === 'uz' ? 'kaa' : 'uz', operation)).status).toBe(409);
  const lobby = await (await request(user, `/exams/c_${f.id}`)).json() as { attemptLanguage: string };
  expect(lobby.attemptLanguage).toBe(attempt.language);
  await request(user, `/attempts/${attempt.id}/submit`, { operationId: crypto.randomUUID(), revision: 0, answers: {}, flags: [] });
  expect((await start(user, f.id, attempt.language === 'uz' ? 'kaa' : 'uz')).status).toBe(409);
  await expect(env.DB.prepare('UPDATE attempts SET language=? WHERE id=?').bind(attempt.language === 'uz' ? 'kaa' : 'uz', attempt.id).run()).rejects.toThrow('immutable');
});

it('supports legacy Uzbek starts and pins an in-progress translation when a newer variant is attached', async () => {
  const f = await fixture(); const oldUser = await account();
  const legacy = await (await start(oldUser, f.id)).json() as ServerAttempt;
  expect(legacy.language).toBe('uz'); expect(legacy.questions[0]?.id).toBe(f.uz.qid);
  const user = await account(); const original = await (await start(user, f.id, 'kaa')).json() as ServerAttempt;
  const replacement = await version(f.owner, 'Jańa soraw', 'jańa');
  expect((await request(f.owner, `/staff/collections/${f.id}/languages`, { language: 'kaa', testVersionId: replacement.vid })).status).toBe(200);
  const resumed = await (await start(user, f.id, 'kaa')).json() as ServerAttempt;
  expect(resumed.id).toBe(original.id); expect(resumed.questions[0]?.id).toBe(f.kaa.qid);
  expect((await (await start(await account(), f.id, 'kaa')).json() as ServerAttempt).questions[0]?.id).toBe(replacement.qid);
});

it('enforces variant ownership and hides unavailable languages and foreign collections', async () => {
  const f = await fixture(); const student = await account(), other = await account('teacher');
  const body = { language: 'kaa', testVersionId: f.kaa.vid };
  expect((await request(student, `/staff/collections/${f.id}/languages`, body)).status).toBe(403);
  expect((await request(other, `/staff/collections/${f.id}/languages`, body)).status).toBe(404);
  const foreign = await version(other, 'Foreign', 'secret');
  expect((await request(f.owner, `/staff/collections/${f.id}/languages`, { ...body, testVersionId: foreign.vid })).status).toBe(404);
  expect((await request(f.owner, `/staff/collections/${f.id}/languages`, { ...body, testVersionId: f.uz.vid })).status).toBe(422);
  await env.DB.prepare('DELETE FROM collection_languages WHERE collection_id=? AND language=?').bind(f.id, 'kaa').run();
  expect((await start(student, f.id, 'kaa')).status).toBe(422);
});

it('copies both languages into a reopened window while preserving the original results', async () => {
  const f = await fixture(), user = await account(), admin = await account('admin');
  const old = await (await start(user, f.id, 'kaa')).json() as ServerAttempt;
  await request(user, `/attempts/${old.id}/submit`, { operationId: crypto.randomUUID(), revision: 0, answers: {}, flags: [] });
  await env.DB.prepare('UPDATE test_collections SET closes_at=? WHERE id=?').bind(Date.now() - 1000, f.id).run();
  const id = crypto.randomUUID(), minute = Math.floor(Date.now() / 60000) * 60000;
  const timestamp = (time: number) => new Date(time + 5 * 3600000).toISOString().slice(0, 16) + ':00+05:00';
  const reopened = await request(admin, `/staff/collections/${f.id}/reopen`, { operationId: id, timeZone: 'Asia/Tashkent', opensAt: timestamp(minute - 60000), closesAt: timestamp(minute + 3600000) });
  expect(reopened.status).toBe(201);
  const next = await (await start(user, id, 'kaa')).json() as ServerAttempt;
  expect(next.id).not.toBe(old.id); expect(next.language).toBe('kaa'); expect(next.questions[0]?.id).toBe(f.kaa.qid);
  expect((await (await request(user, `/attempts/${old.id}`)).json() as ServerAttempt).language).toBe('kaa');
});
