import { env } from 'cloudflare:workers';
import { beforeEach, expect, it } from 'vitest';
import { createApi } from '../app';
import { account, authEnv, resetAuthDatabase } from './auth-helpers';
import { emptyMetrics, meteredDatabase } from './load-helpers';
import type { ServerAttempt, SaveAcknowledgement } from '../../shared/contracts/exams';

const api = createApi();
type User = Awaited<ReturnType<typeof account>>;
const request = (user: User, path: string, body?: unknown, db = env.DB) => api.request('/api/v1' + path, {
  headers: user.headers, method: body === undefined ? 'GET' : 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}, { ...authEnv, DB: db });
beforeEach(resetAuthDatabase);
async function fixture() {
  const user = await account(); const now = Date.now();
  for (const q of [
    { question: { id: 'choice', kind: 'single', topic: 'theory', stem: 'Choose A', options: ['a', 'b', 'c', 'd'].map(id => ({ id, text: id })) }, correctOptionId: 'a', accepted: [], explanation: 'PRIVATE' },
    { question: { id: 'text', kind: 'written', topic: 'theory', stem: 'Write Nizom' }, accepted: ['Nizom'], explanation: 'PRIVATE' },
  ]) await env.DB.prepare('INSERT INTO question_versions VALUES(?,?,?)').bind(q.question.id, JSON.stringify(q), now).run();
  await env.DB.prepare('INSERT INTO test_versions VALUES(?,?,?,?,?,?,?)').bind('delta', 'Delta fixture', 'practice', null, '["choice","text"]', 1, now).run();
  const response = await request(user, '/exams/p_delta/start', { operationId: crypto.randomUUID() });
  expect(response.status).toBe(200);
  return { user, attempt: await response.json() as ServerAttempt };
}
const changes = (revision: number, answers: Record<string, string> = {}, deletedAnswerIds: string[] = []) => ({
  revision, operationId: crypto.randomUUID(), answers, deletedAnswerIds, flags: [],
});

it('merges only changed answers, explicitly deletes, and sends a small acknowledgement without question reads', async () => {
  const { user, attempt } = await fixture(); const path = `/attempts/${attempt.id}/save-changes`;
  const metrics = emptyMetrics(); const db = meteredDatabase(env.DB, metrics);
  const originalPrepare = db.prepare;
  db.prepare = sql => { if (sql.includes('question_versions')) throw new Error('Autosave read question content'); return originalPrepare(sql); };
  const response = await request(user, path, changes(0, { choice: 'a', text: 'Nizom' }), db);
  expect(response.status).toBe(200);
  const text = await response.text(); const ack = JSON.parse(text) as SaveAcknowledgement;
  expect(text.length).toBeLessThan(250);
  expect(ack).toMatchObject({ id: attempt.id, state: 'active', revision: 1 });
  expect(metrics.calls).toBe(4); expect(metrics.rowsWritten).toBe(1);
  expect((await request(user, path, changes(1, { text: 'Changed' }))).status).toBe(200);
  let saved = await (await request(user, `/attempts/${attempt.id}`)).json() as ServerAttempt;
  expect(saved.snapshot.answers).toEqual({ choice: 'a', text: 'Changed' });
  expect((await request(user, path, changes(2, {}, ['choice']))).status).toBe(200);
  saved = await (await request(user, `/attempts/${attempt.id}`)).json() as ServerAttempt;
  expect(saved.snapshot.answers).toEqual({ text: 'Changed' });
});

it('retries once, rejects changed operations and makes racing tabs conflict without losing answers', async () => {
  const { user, attempt } = await fixture(); const path = `/attempts/${attempt.id}/save-changes`;
  const body = changes(0, { choice: 'a' });
  const responses = await Promise.all([request(user, path, body), request(user, path, body)]);
  expect(responses.map(r => r.status)).toEqual([200, 200]);
  expect((await request(user, path, { ...body, answers: { choice: 'b' } })).status).toBe(409);
  const racing = await Promise.all(['a', 'b'].map(value => request(user, path, changes(1, { choice: value }))));
  expect(racing.map(r => r.status).sort()).toEqual([200, 409]);
  const retry = await (await request(user, path, body)).json() as SaveAcknowledgement;
  expect(retry.revision).toBe(2); // Client must fetch the latest snapshot for this replay.
  expect((await request(await account(), path, changes(2))).status).toBe(404);
});

it('retains ownership, CSRF, choice validation, checked-answer locking and deletion validation', async () => {
  const { user, attempt } = await fixture(); const path = `/attempts/${attempt.id}/save-changes`;
  for (const body of [changes(0, { missing: 'a' }), changes(0, { choice: 'forged' }), changes(0, {}, ['missing']), changes(0, { choice: 'a' }, ['choice'])])
    expect((await request(user, path, body)).status).toBe(422);
  expect((await api.request('/api/v1' + path, { method: 'POST', headers: { Cookie: user.headers.Cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(changes(0)) }, authEnv)).status).toBe(403);
  expect((await request(user, `/attempts/${attempt.id}/check`, { ...changes(0, { choice: 'a' }), deletedAnswerIds: undefined, questionId: 'choice' })).status).toBe(200);
  expect((await request(user, path, changes(1, {}, ['choice']))).status).toBe(409);
  expect((await request(user, path, changes(1, { text: 'Nizom' }))).status).toBe(200);
  const final = await request(user, `/attempts/${attempt.id}/submit`, { revision: 2, operationId: crypto.randomUUID(), answers: { choice: 'a', text: 'Nizom' }, flags: [] });
  expect((await final.json() as ServerAttempt).result?.units).toBe(4);
  expect((await request(user, path, changes(2, { text: 'late' }))).status).toBe(409);
});

it('rejects late changes and grades only the last acknowledged snapshot at the deadline', async () => {
  const { user, attempt } = await fixture(); const path = `/attempts/${attempt.id}/save-changes`;
  expect((await request(user, path, changes(0, { choice: 'a' }))).status).toBe(200);
  await env.DB.prepare('UPDATE attempts SET ends_at=? WHERE id=?').bind(Date.now() - 10000, attempt.id).run();
  expect((await request(user, path, changes(1, { choice: 'b', text: 'late' }))).status).toBe(409);
  const final = await (await request(user, `/attempts/${attempt.id}`)).json() as ServerAttempt;
  expect(final.state).toBe('final'); expect(final.snapshot.answers).toEqual({ choice: 'a' }); expect(final.result?.units).toBe(2);
});
