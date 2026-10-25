import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import { createApi } from '../app';
import { account, authEnv, resetAuthDatabase } from './auth-helpers';
import { emptyMetrics, meteredDatabase } from './load-helpers';
import type { PrivateQuestion, ServerAttempt, SaveAcknowledgement } from '../../shared/contracts/exams';
import { pendingSave, resolveSaveResponse } from '../../src/lib/attemptSync';

const api = createApi();
type LoadAccount = Awaited<ReturnType<typeof account>>;
declare module 'vitest' { interface TaskMeta { loadResult?: Record<string, unknown> } }
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] ?? 0;

for (const users of [100, 200]) it(`${users} simultaneous authenticated exam solvers`, async ({ task }) => {
  await resetAuthDatabase();
  const students: LoadAccount[] = [];
  for (let i = 0; i < users; i++) students.push(await account());
  const now = Date.now();
  const bank: PrivateQuestion[] = Array.from({ length: 100 }, (_, i) => ({
    question: i % 5 === 0
      ? { id: `load-q-${i}`, topic: 'theory', stem: `Synthetic written question ${i}: write Nizom`, kind: 'written' }
      : { id: `load-q-${i}`, topic: 'theory', stem: `Synthetic choice question ${i}: choose A`, kind: 'single',
        options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }, { id: 'd', text: 'D' }] },
    ...(i % 5 === 0 ? {} : { correctOptionId: 'a' }), accepted: ['Nizom'], explanation: 'Synthetic explanation.',
  }));
  await env.DB.batch(bank.map(q => env.DB.prepare('INSERT INTO question_versions VALUES(?,?,?)').bind(q.question.id, JSON.stringify(q), now)));
  await env.DB.prepare('INSERT INTO test_versions VALUES(?,?,?,?,?,?,?)')
    .bind('load-test', 'Load test', 'mock', 3600, JSON.stringify(bank.map(q => q.question.id)), 0, now).run();
  await env.DB.prepare('INSERT INTO test_drafts(id,owner_id,content,created_at,updated_at) VALUES(?,?,?,?,?)')
    .bind('load-draft', students[0]!.id, '{}', now, now).run();
  await env.DB.prepare('INSERT INTO test_collections(id,test_id,test_version_id,owner_id,opens_at,closes_at,created_at) VALUES(?,?,?,?,?,?,?)')
    .bind('load-collection', 'load-draft', 'load-test', students[0]!.id, now - 1000, now + 3600000, now).run();

  const samples: Record<string, { ms: number[]; calls: number; statements: number; rowsRead: number; rowsWritten: number; bytes: number }> = {};
  const errors: string[] = [];
  let inFlight = 0, peakInFlight = 0, completed = 0;
  const started = performance.now();
  const request = async (student: typeof students[number], phase: string, path: string, body?: unknown) => {
    const metrics = emptyMetrics();
    const sample = samples[phase] ??= { ms: [], calls: 0, statements: 0, rowsRead: 0, rowsWritten: 0, bytes: 0 };
    const at = performance.now(); peakInFlight = Math.max(peakInFlight, ++inFlight);
    try {
      const response = await api.request('/api/v1' + path, {
        method: body === undefined ? 'GET' : 'POST', headers: student.headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }, { ...authEnv, DB: meteredDatabase(env.DB, metrics, 50) });
      const text = await response.text();
      sample.bytes += new TextEncoder().encode(text).byteLength;
      if (response.status !== 200) throw new Error(`${phase}: HTTP ${response.status}: ${text.slice(0, 180)}`);
      return JSON.parse(text);
    } finally {
      inFlight--; sample.ms.push(performance.now() - at);
      for (const key of ['calls', 'statements', 'rowsRead', 'rowsWritten'] as const) sample[key] += metrics[key];
    }
  };
  await Promise.all(students.map(async student => {
    try {
      await request(student, 'catalog', '/exams');
      let attempt = await request(student, 'start', '/exams/c_load-collection/start', { operationId: crypto.randomUUID() }) as ServerAttempt;
      expect(attempt.questions).toHaveLength(100);
      expect(attempt.feedback).toEqual({});
      const answers: Record<string, string> = {};
      for (let round = 0; round < 4; round++) {
        for (const q of bank.slice(round * 25, (round + 1) * 25)) answers[q.question.id] = q.question.kind === 'single' ? 'a' : 'Nizom';
        const pending = pendingSave(attempt, { key: student.id, revision: attempt.revision, dirty: true,
          snapshot: { answers: { ...answers }, flags: [], currentQuestionId: bank[round * 25]!.question.id } });
        const response = await request(student, 'save', `/attempts/${attempt.id}/save-changes`, pending.body);
        attempt = await resolveSaveResponse(response, attempt, pending, async () => { throw new Error('Unexpected normal-save full reload'); });
        expect(attempt.revision).toBe(round + 1);
        expect(attempt.snapshot.answers).toEqual(answers);
        expect(attempt.feedback).toEqual({});
        if (round === 1) {
          const replay = await request(student, 'save-retry', `/attempts/${attempt.id}/save-changes`, pending.body) as SaveAcknowledgement;
          expect(replay.revision).toBe(attempt.revision);
          const resumed = await request(student, 'reconnect', `/attempts/${attempt.id}`) as ServerAttempt;
          expect(resumed.snapshot).toEqual(attempt.snapshot);
        }
      }
      const body = { operationId: crypto.randomUUID(), revision: attempt.revision, answers, flags: [] };
      attempt = await request(student, 'submit', `/attempts/${attempt.id}/submit`, body) as ServerAttempt;
      expect(attempt.state).toBe('final'); expect(attempt.result?.units).toBe(200);
      expect(attempt.feedback).toEqual({}); // Shared deadline still hides keys.
      const replay = await request(student, 'submit-retry', `/attempts/${attempt.id}/submit`, body) as ServerAttempt;
      expect(replay.revision).toBe(attempt.revision);
      const result = await request(student, 'result', `/attempts/${attempt.id}`) as ServerAttempt;
      expect(result.result).toEqual(attempt.result);
      completed++;
    } catch (error) { errors.push(String(error)); }
  }));
  const elapsedMs = performance.now() - started;
  const phases = Object.fromEntries(Object.entries(samples).map(([name, s]) => [name, {
    requests: s.ms.length, p50Ms: percentile(s.ms, .5), p95Ms: percentile(s.ms, .95), p99Ms: percentile(s.ms, .99),
    maxMs: Math.max(...s.ms), overClientTimeout: s.ms.filter(ms => ms >= 15000).length,
    callsPerRequest: s.calls / s.ms.length, statementsPerRequest: s.statements / s.ms.length,
    rowsRead: s.rowsRead, rowsWritten: s.rowsWritten, responseBytes: s.bytes,
  }]));
  const requests = Object.values(samples).reduce((sum, s) => sum + s.ms.length, 0);
  const reports = await env.DB.prepare('SELECT count(*) n FROM attempt_reports').first<number>('n');
  task.meta.loadResult = { users, questions: 100, savesPerUser: 4, saveProtocol: 'save-changes: partial answers + compact acknowledgement',
    pacing: 'Accelerated: no think time; independent users, synchronized start', peakInFlight,
    completed, requests, errors, elapsedMs, requestsPerSecond: requests / (elapsedMs / 1000),
    reports, phases,
  };
  expect(errors).toEqual([]); expect(completed).toBe(users); expect(reports).toBe(users);
}, 300000);
