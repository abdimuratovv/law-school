import { env } from 'cloudflare:workers';
import { beforeEach, expect, it } from 'vitest';
import worker from '../index';
import { createApi } from '../app';
import { account, authEnv, resetAuthDatabase } from './auth-helpers';
import { emptyMetrics, meteredDatabase } from './load-helpers';
import type { ServerAttempt } from '../../shared/contracts/exams';

beforeEach(resetAuthDatabase);

it('finishes a busy cron within the combined Free D1 invocation budget', async () => {
  const student = await account(); const now = Date.now();
  const result = JSON.stringify({ units: 2, maxUnits: 2, pending: 0, final: true, algorithm: 'nfc-distance2-v1' });
  for (let i = 0; i < 28; i++) {
    const historical = i < 2;
    const qid = `capacity-q-${i}`;
    await env.DB.prepare('INSERT INTO question_versions VALUES(?,?,?)').bind(qid, JSON.stringify({
      question: { id: qid, kind: 'written', topic: 'theory', stem: 'Write Nizom' }, accepted: ['Nizom'], explanation: '',
    }), now).run();
    await env.DB.prepare('INSERT INTO test_versions VALUES(?,?,?,?,?,?,?)')
      .bind(`capacity-test-${i}`, 'Capacity fixture', 'practice', null, JSON.stringify([qid]), 1, now).run();
    await env.DB.prepare(`INSERT INTO attempts(id,user_id,exam_id,test_version_id,start_operation,started_at,ends_at,
      question_order,saved_at,snapshot,state,result,submitted_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      `${historical ? '000' : 'zzz'}-${i}`, student.id, `capacity-${i}`, `capacity-test-${i}`, `operation-${i}`,
      now - 60000, now - 1000, JSON.stringify([{ id: qid }]), now - 10000,
      JSON.stringify({ answers: { [qid]: 'Nizom' }, flags: [] }), historical ? 'final' : i % 2 ? 'active' : 'submitted', historical ? result : null,
      now - 1000,
    ).run();
  }
  await env.DB.prepare("UPDATE report_backfill SET cursor='',done=0 WHERE singleton=1").run();
  const metrics = emptyMetrics();
  await worker.scheduled({} as ScheduledController, { ...authEnv, DB: meteredDatabase(env.DB, metrics, 50) });
  expect(metrics.calls).toBeLessThanOrEqual(39);
  expect(await env.DB.prepare("SELECT count(*) n FROM attempts WHERE state='final'").first('n')).toBe(27);
  expect(await env.DB.prepare('SELECT count(*) n FROM attempt_reports').first('n')).toBe(27);
  expect(await env.DB.prepare("SELECT count(*) n FROM attempts WHERE state='final' AND submitted_at<>ends_at").first('n')).toBe(0);
  // A later cron drains the remainder and advances the persistent backfill cursor.
  await worker.scheduled({} as ScheduledController, authEnv);
  expect(await env.DB.prepare("SELECT count(*) n FROM attempts WHERE state='final'").first('n')).toBe(28);
});

it('checks each new request for revocation while avoiding duplicate route authentication', async () => {
  const student = await account(); const api = createApi(); const metrics = emptyMetrics();
  const bindings = { ...authEnv, DB: meteredDatabase(env.DB, metrics) };
  expect((await api.request('/api/v1/exams', { headers: student.headers }, bindings)).status).toBe(200);
  expect(metrics.calls).toBe(2); // Session lookup and catalog query.
  await env.DB.prepare("UPDATE users SET status='suspended' WHERE id=?").bind(student.id).run();
  expect((await api.request('/api/v1/exams', { headers: student.headers }, bindings)).status).toBe(401);
});

it('drains 200 expired attempts in eight bounded scheduled runs with one report per learner', async () => {
  const now = Date.now(); const ids = Array.from({ length: 200 }, () => crypto.randomUUID());
  await env.DB.prepare('INSERT INTO question_versions VALUES(?,?,?)').bind('deadline-q', JSON.stringify({
    question: { id: 'deadline-q', kind: 'written', topic: 'theory', stem: 'Write Nizom' }, accepted: ['Nizom'], explanation: '',
  }), now).run();
  await env.DB.prepare('INSERT INTO test_versions VALUES(?,?,?,?,?,?,?)')
    .bind('deadline-test', 'Deadline fixture', 'practice', null, '["deadline-q"]', 1, now).run();
  await env.DB.batch(ids.flatMap(id => [
    env.DB.prepare('INSERT INTO users(id,display_name,email,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id, 'Deadline Learner', `${id}@example.test`, now, now),
    env.DB.prepare(`INSERT INTO attempts(id,user_id,exam_id,test_version_id,start_operation,started_at,ends_at,question_order,saved_at,snapshot)
      VALUES(?,?,?,'deadline-test',?,?,?,?,?,?)`).bind(id, id, 'p_deadline-test', id, now - 60000, now - 1000, '[{"id":"deadline-q"}]', now - 10000, '{"answers":{"deadline-q":"Nizom"},"flags":[]}'),
  ]));
  for (let tick = 0; tick < 8; tick++) {
    const metrics = emptyMetrics();
    await worker.scheduled({} as ScheduledController, { ...authEnv, DB: meteredDatabase(env.DB, metrics, 50) });
    expect(metrics.calls).toBeLessThanOrEqual(39);
    expect(await env.DB.prepare('SELECT count(*) n FROM attempt_reports').first('n')).toBe((tick + 1) * 25);
  }
  expect(await env.DB.prepare("SELECT count(*) n FROM attempts WHERE state='final' AND json_extract(result,'$.units')=2 AND submitted_at=ends_at").first('n')).toBe(200);
  await worker.scheduled({} as ScheduledController, authEnv);
  expect(await env.DB.prepare('SELECT count(*) n FROM attempt_reports').first('n')).toBe(200);
}, 30000);

it('spends one D1 row write on autosave without rewriting active-state indexes', async () => {
  const student = await account(); const api = createApi(); const now = Date.now();
  await env.DB.prepare('INSERT INTO question_versions VALUES(?,?,?)').bind('write-q', JSON.stringify({
    question: { id: 'write-q', kind: 'written', topic: 'theory', stem: 'Write Nizom' }, accepted: ['Nizom'], explanation: '',
  }), now).run();
  await env.DB.prepare('INSERT INTO test_versions VALUES(?,?,?,?,?,?,?)')
    .bind('write-test', 'Write fixture', 'practice', null, '["write-q"]', 1, now).run();
  const start = await api.request('/api/v1/exams/p_write-test/start', {
    method: 'POST', headers: student.headers, body: JSON.stringify({ operationId: crypto.randomUUID() }),
  }, authEnv);
  expect(start.status).toBe(200);
  const attempt = await start.json() as ServerAttempt;
  const metrics = emptyMetrics();
  const save = await api.request(`/api/v1/attempts/${attempt.id}/save`, {
    method: 'POST', headers: student.headers,
    body: JSON.stringify({ operationId: crypto.randomUUID(), revision: attempt.revision, answers: { 'write-q': 'Nizom' }, flags: [] }),
  }, { ...authEnv, DB: meteredDatabase(env.DB, metrics) });
  expect(save.status).toBe(200);
  expect(metrics.rowsWritten).toBe(1);
  expect(await save.json()).toMatchObject({ state: 'active', revision: 1, snapshot: { answers: { 'write-q': 'Nizom' } } });
});
