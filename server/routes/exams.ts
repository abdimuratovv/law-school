import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../env';
import { requireAuthentication, requireCsrf, limitMutation } from '../auth/session';
import { readJson, validate } from '../http/validation';
import { saveAnswersSchema, saveAnswerChangesSchema } from '../../shared/contracts/api';
import { checkSchema, startSchema } from '../../shared/contracts/exams';
import { ApiError } from '../http/errors';
import type { TestLanguage } from '../../shared/contracts/languages';
import { missing, mutate, owned, questions, settleOwned, shuffled, SQL_NOW, view, type TestRow, type ExamContent } from '../exams/service';

const eligible = `SELECT 'c_' || c.id AS exam_id,t.*,c.opens_at,c.closes_at,NULL AS assignment_id,c.id AS collection_id,c.start_enabled,
  (SELECT json_group_array(language) FROM (SELECT 'uz' AS language UNION SELECT language FROM collection_languages WHERE collection_id=c.id ORDER BY language DESC)) AS languages
  FROM test_collections c JOIN test_versions t ON t.id=c.test_version_id WHERE c.retired=0
  UNION ALL SELECT 'p_' || t.id AS exam_id,t.*,NULL AS opens_at,NULL AS closes_at,NULL AS assignment_id,NULL AS collection_id,1 AS start_enabled,'["uz"]' AS languages FROM test_versions t WHERE t.is_public=1 AND NOT EXISTS(SELECT 1 FROM test_collections c WHERE c.test_version_id=t.id) AND NOT EXISTS(SELECT 1 FROM test_publications p WHERE p.version_id=t.id AND p.archived=1)
  UNION ALL SELECT 'a_' || a.id AS exam_id,t.*,a.opens_at,a.closes_at,a.id AS assignment_id,NULL AS collection_id,1 AS start_enabled,'["uz"]' AS languages
  FROM assignments a JOIN test_versions t ON t.id=a.test_version_id JOIN group_memberships m ON m.group_id=a.group_id WHERE m.student_id=? AND NOT EXISTS(SELECT 1 FROM test_collections c WHERE c.test_version_id=t.id)`;

type Eligible = TestRow & { exam_id: string; opens_at: number | null; closes_at: number | null; assignment_id: string | null;collection_id:string|null;start_enabled:number;languages:string };
const summary = (r: Eligible) => ({ id: r.exam_id, name: r.name, mode: r.mode, questionCount: (JSON.parse(r.question_ids) as string[]).length, durationSeconds: r.assignment_id||r.collection_id?null:r.duration_seconds,opensAt:r.opens_at, closesAt: r.closes_at,serverNow:Date.now(),startEnabled:!!r.start_enabled,languages:JSON.parse(r.languages) as TestLanguage[] });

export function examRoutes() {
  const app = new Hono<ApiEnv>();
  for (const path of ['/exams', '/exams/*', '/attempts', '/attempts/*']) app.use(path, requireAuthentication);
  app.use('*', async (c, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method) && /^\/(exams|attempts)(\/|$)/.test(c.req.path.replace('/api/v1', ''))) {
      return requireCsrf(c, async () => { await limitMutation(c); await next(); });
    }
    await next();
  });
  app.get('/exams', async c => {
    const query = validate(z.object({ limit: z.coerce.number().int().min(1).max(100).default(25), after: z.string().max(150).default('') }), c.req.query());
    const list = await c.env.DB.prepare(`SELECT * FROM (${eligible}) available WHERE exam_id > ? AND (collection_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM test_collections visible WHERE visible.test_version_id=available.id)) AND (collection_id IS NOT NULL OR closes_at IS NULL OR closes_at > ${SQL_NOW}) ORDER BY exam_id LIMIT ?`)
      .bind(c.get('auth').user.id, query.after, query.limit + 1).all<Eligible>();
    return c.json({ items: list.results.slice(0, query.limit).map(summary), next: list.results.length > query.limit ? list.results[query.limit - 1]!.exam_id : null });
  });
  app.get('/exams/:id', async c => {
    const row = await c.env.DB.prepare(`SELECT * FROM (${eligible}) WHERE exam_id = ?`).bind(c.get('auth').user.id, c.req.param('id')).first<Eligible>();
    if (!row) throw missing();
    const known = await c.env.DB.prepare(`SELECT id,state,language FROM attempts WHERE user_id=? AND exam_id=?
      AND (state='active' OR assignment_id IS NOT NULL OR collection_id IS NOT NULL)
      ORDER BY (state='active') DESC,started_at DESC,id LIMIT 1`)
      .bind(c.get('auth').user.id,row.exam_id).first<{id:string;state:'active'|'submitted'|'final';language:TestLanguage}>();
    return c.json({ ...summary(row), opensAt: row.opens_at, attemptLanguage:known?.language??null, attempt:known??null });
  });
  app.post('/exams/:id/start', async c => {
    const content: ExamContent = new Map();
    const body = await readJson(c.req.raw, startSchema); const user = c.get('auth').user.id;
    let test = await c.env.DB.prepare(`SELECT * FROM (${eligible}) WHERE exam_id = ?`).bind(user, c.req.param('id')).first<Eligible>();
    if (!test) throw missing();
    const known = await c.env.DB.prepare(`SELECT id, exam_id,language FROM attempts WHERE user_id = ? AND (id = (SELECT attempt_id FROM attempt_starts WHERE user_id = ? AND operation_id = ?) OR start_operation = ? OR
      (exam_id = ? AND (assignment_id IS NOT NULL OR collection_id IS NOT NULL OR state = 'active'))) ORDER BY (state='active') DESC,started_at DESC,id LIMIT 1`).bind(user, user, body.operationId, body.operationId, test.exam_id).first<{ id: string; exam_id: string;language:TestLanguage }>();
    if (known && known.exam_id !== test.exam_id) throw missing();
    if (!known && !test.start_enabled) throw new ApiError(403,'FORBIDDEN','New attempts are paused for this test.');
    const language = body.language ?? known?.language ?? 'uz';
    if (known && language !== known.language) throw new ApiError(409,'CONFLICT','Resume this attempt in its original language.');
    if (language !== 'uz' && !known) {
      const variant = test.collection_id ? await c.env.DB.prepare(`SELECT t.* FROM collection_languages l JOIN test_versions t ON t.id=l.test_version_id WHERE l.collection_id=? AND l.language=?`)
        .bind(test.collection_id,language).first<TestRow>() : null;
      if (!variant) throw new ApiError(422,'VALIDATION_ERROR','This language is unavailable for this test.');
      test = {...test,...variant};
    }
    let id = known?.id;
    if (!id) {
      const bank = await questions(c.env.DB, JSON.parse(test.question_ids) as string[], content);
      const order = bank.map(q => ({ id: q.question.id, ...(q.question.kind === 'single' ? { options: shuffled(q.question.options.map(o => o.id)) } : {}) }));
      const candidate = crypto.randomUUID();
      // INSERT...SELECT checks schedule, eligibility and active account at the write itself.
      await c.env.DB.prepare(`INSERT OR IGNORE INTO attempts(id,user_id,exam_id,test_version_id,assignment_id,collection_id,start_operation,language,started_at,ends_at,question_order,saved_at)
        SELECT ?,?,?,?,?,?,?,?,${SQL_NOW},CASE WHEN ? IS NOT NULL THEN ? WHEN ? IS NULL THEN NULL ELSE ${SQL_NOW} + ? * 1000 END,?,${SQL_NOW}
        WHERE (? IS NULL OR ? <= ${SQL_NOW}) AND (? IS NULL OR ? > ${SQL_NOW})
        AND EXISTS(SELECT 1 FROM users WHERE id = ? AND status = 'active')
        AND (? IS NULL OR EXISTS(SELECT 1 FROM group_memberships WHERE student_id = ? AND group_id = (SELECT group_id FROM assignments WHERE id = ?)))
        AND (? IS NULL OR EXISTS(SELECT 1 FROM test_collections WHERE id=? AND retired=0 AND start_enabled=1))`)
        .bind(candidate,user,test.exam_id,test.id,test.assignment_id,test.collection_id,body.operationId,language,test.assignment_id??test.collection_id,test.closes_at,
          test.duration_seconds,test.duration_seconds,JSON.stringify(order),test.opens_at,test.opens_at,test.closes_at,test.closes_at,user,test.assignment_id,user,test.assignment_id,test.collection_id,test.collection_id).run();
      const created = await c.env.DB.prepare(`SELECT id FROM attempts WHERE user_id = ? AND (start_operation = ? OR (exam_id = ? AND (assignment_id IS NOT NULL OR collection_id IS NOT NULL OR state = 'active'))) ORDER BY (state='active') DESC,started_at DESC,id LIMIT 1`)
        .bind(user, body.operationId, test.exam_id).first<{ id: string }>();
      id = created?.id;
    }
    if (!id) throw missing();
    await c.env.DB.prepare('INSERT OR IGNORE INTO attempt_starts(user_id,operation_id,attempt_id) VALUES(?,?,?)').bind(user, body.operationId, id).run();
    const mapped = await c.env.DB.prepare('SELECT attempt_id FROM attempt_starts WHERE user_id = ? AND operation_id = ?').bind(user,body.operationId).first<{ attempt_id: string }>();
    if (mapped) id = mapped.attempt_id;
    const row = await owned(c.env.DB,id,user);
    if (row.exam_id !== test.exam_id) throw missing();
    if (row.language !== language) throw new ApiError(409,'CONFLICT','Resume this attempt in its original language.');
    return c.json(await view(c.env.DB, await settleOwned(c.env.DB, row, content), content));
  });
  app.get('/attempts', async c => {
    const query = validate(z.object({ limit: z.coerce.number().int().min(1).max(100).default(25), before: z.string().max(200).optional() }), c.req.query());
    let timestamp = Number.MAX_SAFE_INTEGER; let lastId = '';
    if (query.before) {
      let cursor: unknown;
      try { cursor = JSON.parse(atob(query.before)); } catch { cursor = null; }
      const parsed = validate(z.tuple([z.number().int().min(0),z.uuid()]),cursor);
      [timestamp,lastId] = parsed;
    }
    const rows = await c.env.DB.prepare(`SELECT a.id, t.name, a.language, a.state, a.started_at AS startedAt, a.ends_at AS endsAt, a.result
      FROM attempts a JOIN test_versions t ON t.id = a.test_version_id WHERE a.user_id = ? AND (a.started_at < ? OR (a.started_at = ? AND a.id > ?)) ORDER BY a.started_at DESC, a.id LIMIT ?`)
      .bind(c.get('auth').user.id, timestamp, timestamp, lastId, query.limit + 1).all<{ id: string; name: string; state: string; startedAt: number; endsAt: number | null; result: string | null }>();
    const last = rows.results[query.limit - 1];
    return c.json({ items: rows.results.slice(0, query.limit).map(row => ({ ...row, result: row.result ? JSON.parse(row.result) : null })), next: rows.results.length > query.limit && last ? btoa(JSON.stringify([last.startedAt,last.id])) : null });
  });
  app.get('/attempts/:id', async c => {
    const content: ExamContent = new Map();
    const user = c.get('auth').user.id; const row = await owned(c.env.DB, c.req.param('id'), user);
    return c.json(await view(c.env.DB, await settleOwned(c.env.DB,row,content),content));
  });
  app.post('/attempts/:id/save-changes', async c => {
    const body = await readJson(c.req.raw, saveAnswerChangesSchema);
    const user = c.get('auth').user.id;
    const row = await settleOwned(c.env.DB, await owned(c.env.DB, c.req.param('id'), user));
    await mutate(c.env.DB, row, user, body, 'save');
    const latest = await owned(c.env.DB, row.id, user);
    return c.json({ id: latest.id, state: latest.state, revision: latest.revision, savedAt: latest.saved_at, serverNow: Date.now() });
  });
  for (const action of ['save', 'submit', 'check'] as const) {
    app.post(`/attempts/:id/${action}`, async c => {
      const content: ExamContent = new Map();
      const body = await readJson(c.req.raw, action === 'check' ? checkSchema : saveAnswersSchema);
      const user = c.get('auth').user.id; const initial = await owned(c.env.DB, c.req.param('id'), user);
      const row = await settleOwned(c.env.DB, initial, content);
      // A late submit returns the frozen saved snapshot, discarding unsynced edits.
      if (row.state === 'active') await mutate(c.env.DB, row, user, body, action, 'questionId' in body ? body.questionId as string : undefined, content);
      else if (action !== 'submit') await mutate(c.env.DB, row, user, body, action, undefined, content);
      return c.json(await view(c.env.DB, await settleOwned(c.env.DB, await owned(c.env.DB, row.id, user), content), content));
    });
  }
  return app;
}
