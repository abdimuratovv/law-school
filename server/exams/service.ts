import { privateQuestionSchema, type PrivateQuestion, type ServerAttempt, type Snapshot } from '../../shared/contracts/exams';
import type { SaveAnswersRequest } from '../../shared/contracts/api';
import { studentQuestionSchema, type StudentQuestion } from '../../shared/contracts/questions';
import { ApiError } from '../http/errors';
import { ALGORITHM, grade, withOverride } from './grading';
import { hash } from '../auth/crypto';

export const SQL_NOW = "CAST(unixepoch('subsec') * 1000 AS INTEGER)";
export interface TestRow { id: string; name: string; mode: 'practice' | 'mock'; duration_seconds: number | null; question_ids: string; is_public: number }
export interface AttemptRow {
  id: string; user_id: string; exam_id: string; test_version_id: string; assignment_id: string | null;
  state: 'active' | 'submitted' | 'final'; revision: number; snapshot: string; question_order: string;
  checked: string; receipts: string; started_at: number; ends_at: number | null; saved_at: number; result: string | null;
}
export const missing = () => new ApiError(404, 'NOT_FOUND', 'This test or attempt is unavailable.');
export const conflict = () => new ApiError(409, 'CONFLICT', 'The attempt changed. Reload the server version before continuing.');
export async function questions(db: D1Database, ids: string[]): Promise<PrivateQuestion[]> {
  if (ids.length < 1 || ids.length > 100 || new Set(ids).size !== ids.length) throw new Error('Invalid published test');
  const rows = await db.prepare('SELECT id, payload FROM question_versions WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids)).all<{ id: string; payload: string }>();
  const map = new Map(rows.results.map(row => [row.id, privateQuestionSchema.parse(JSON.parse(row.payload))]));
  return ids.map(id => { const q = map.get(id); if (!q || q.question.id !== id) throw new Error('Invalid published content'); return q; });
}
export async function owned(db: D1Database, id: string, user: string): Promise<AttemptRow> {
  const row = await db.prepare('SELECT * FROM attempts WHERE id = ? AND user_id = ?').bind(id, user).first<AttemptRow>();
  if (!row) throw missing();
  return row;
}
export async function settleOwned(db: D1Database, row: AttemptRow): Promise<AttemptRow> {
  if (row.state === 'submitted' || (row.state === 'active' && row.ends_at !== null && row.ends_at <= Date.now())) {
    await finalize(db,row.id);
    return owned(db,row.id,row.user_id);
  }
  return row;
}
export async function finalize(db: D1Database, id: string): Promise<void> {
  await db.prepare(`UPDATE attempts SET state = 'submitted', submitted_at = ends_at
    WHERE id = ? AND state = 'active' AND ends_at IS NOT NULL AND ends_at <= ${SQL_NOW}`).bind(id).run();
  const row = await db.prepare("SELECT * FROM attempts WHERE id = ? AND state = 'submitted'").bind(id).first<AttemptRow>();
  if (!row) return;
  const order = JSON.parse(row.question_order) as { id: string; options?: string[] }[];
  const bank = await questions(db, order.map(q => q.id));
  const snapshot = JSON.parse(row.snapshot) as Snapshot;
  const grades = bank.map(q => ({ id: q.question.id, ...grade(q, snapshot.answers[q.question.id]) }));
  const pending = grades.filter(g => g.units === null).length;
  const result = { units: grades.reduce((sum, g) => sum + (g.units ?? 0), 0), maxUnits: bank.length * 2, pending, final: pending === 0, algorithm: ALGORITHM };
  await db.prepare("UPDATE attempts SET state = 'final', result = ? WHERE id = ? AND state = 'submitted' AND revision = ?")
    .bind(JSON.stringify(result), row.id, row.revision).run();
}
export async function sweepExpired(db: D1Database, limit = 25) {
  const rows = await db.prepare(`SELECT id FROM attempts WHERE (state = 'active' AND ends_at <= ${SQL_NOW}) OR state = 'submitted' LIMIT ?`).bind(Math.min(25, Math.max(1, limit))).all<{ id: string }>();
  for (const row of rows.results) await finalize(db, row.id);
}
export async function view(db: D1Database, row: AttemptRow): Promise<ServerAttempt> {
  const test = await db.prepare('SELECT * FROM test_versions WHERE id = ?').bind(row.test_version_id).first<TestRow>();
  if (!test) throw missing();
  const order = JSON.parse(row.question_order) as { id: string; options?: string[] }[];
  const bank = await questions(db, order.map(q => q.id));
  const checked: string[] = JSON.parse(row.checked); const snapshot: Snapshot = JSON.parse(row.snapshot);
  const assignment = row.assignment_id ? await db.prepare('SELECT closes_at FROM assignments WHERE id = ?').bind(row.assignment_id).first<{ closes_at: number }>() : null;
  const result = row.result ? JSON.parse(row.result) as ServerAttempt['result'] : null;
  const overrides=row.state==='final' ? (await db.prepare('SELECT question_version_id,units,comment FROM attempt_item_reviews WHERE attempt_id=?').bind(row.id).all<{question_version_id:string;units:number;comment:string}>()).results : [];
  const release = row.state === 'final' && result?.final && (!assignment || assignment.closes_at <= Date.now());
  const feedback: ServerAttempt['feedback'] = {};
  const safe: StudentQuestion[] = bank.map((item, i) => {
    if (release || (!assignment && test.mode === 'practice' && checked.includes(item.question.id))) {
      const override=overrides.find(r=>r.question_version_id===item.question.id);
      feedback[item.question.id] = { ...withOverride(item, snapshot.answers[item.question.id],override), ...(override ? {reviewComment:override.comment}:{}), accepted: item.accepted,
        explanation: item.explanation, ...(item.correctOptionId ? { correctOptionId: item.correctOptionId } : {}) };
    }
    const q = studentQuestionSchema.parse(item.question);
    if (q.kind === 'single') {
      const choices = order[i]?.options;
      if (choices) q.options = choices.map(id => q.options.find(o => o.id === id)!) as typeof q.options;
    }
    return q;
  });
  return { id: row.id, examId: row.exam_id, name: test.name, mode: test.mode, state: row.state, revision: row.revision,
    startedAt: row.started_at, endsAt: row.ends_at, savedAt: row.saved_at, serverNow: Date.now(), snapshot,
    questions: safe, checked, feedback, result };
}
export function shuffled<T>(values: readonly T[]): T[] {
  const list = [...values];
  for (let i = list.length - 1; i > 0; i--) {
    // Rejection sampling avoids modulo bias.
    const ceiling = Math.floor(0x100000000 / (i + 1)) * (i + 1); let value: number;
    do { value = crypto.getRandomValues(new Uint32Array(1))[0]!; } while (value >= ceiling);
    const j = value % (i + 1); [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}
export async function mutate(db: D1Database, row: AttemptRow, user: string, body: SaveAnswersRequest, action: 'save' | 'submit' | 'check', questionId?: string) {
  const digest = await hash(JSON.stringify({ action, ...body, questionId }));
  const receipts: { id: string; digest: string }[] = JSON.parse(row.receipts);
  const receipt = receipts.find(r => r.id === body.operationId);
  if (receipt) { if (receipt.digest !== digest) throw conflict(); return; }
  if (row.state !== 'active') { if (action === 'save' || action === 'check') throw conflict(); return; }
  if (body.revision !== row.revision) throw conflict();
  const order = JSON.parse(row.question_order) as { id: string }[];
  const bank = await questions(db, order.map(q => q.id)); const ids = new Set(order.map(q => q.id));
  if (Object.keys(body.answers).some(id => !ids.has(id)) || body.flags.some(id => !ids.has(id)) || (body.currentQuestionId && !ids.has(body.currentQuestionId)))
    throw new ApiError(422, 'VALIDATION_ERROR', 'Unknown question in answer snapshot.');
  for (const item of bank) {
    const answer = body.answers[item.question.id];
    if (answer && item.question.kind === 'single' && !item.question.options.some(o => o.id === answer))
      throw new ApiError(422, 'VALIDATION_ERROR', 'Unknown answer option.');
  }
  const checked: string[] = JSON.parse(row.checked); const previous: Snapshot = JSON.parse(row.snapshot);
  if (checked.some(id => (previous.answers[id] ?? '') !== (body.answers[id] ?? ''))) throw conflict();
  if (action === 'check') {
    const test = await db.prepare('SELECT mode FROM test_versions WHERE id = ?').bind(row.test_version_id).first<{ mode: string }>();
    if (row.assignment_id || test?.mode !== 'practice') throw new ApiError(403, 'FORBIDDEN', 'Answer checking is unavailable for this test.');
    if (!questionId || !ids.has(questionId) || !body.answers[questionId]?.trim()) throw new ApiError(422, 'VALIDATION_ERROR', 'Choose an answer before checking.');
    if (!checked.includes(questionId)) checked.push(questionId);
  }
  const snapshot: Snapshot = { answers: body.answers, flags: [...new Set(body.flags)], ...(body.currentQuestionId ? { currentQuestionId: body.currentQuestionId } : {}) };
  const changed = await db.prepare(`UPDATE attempts SET snapshot = ?, checked = ?, receipts = ?, revision = revision + 1,
    saved_at = ${SQL_NOW}, state = ?, submitted_at = CASE WHEN ? = 'submit' THEN ${SQL_NOW} ELSE submitted_at END
    WHERE id = ? AND user_id = ? AND revision = ? AND state = 'active' AND (ends_at IS NULL OR ends_at > ${SQL_NOW})
    AND EXISTS(SELECT 1 FROM users WHERE id = ? AND status = 'active')
    AND (assignment_id IS NULL OR EXISTS(SELECT 1 FROM group_memberships m JOIN assignments a ON a.group_id = m.group_id WHERE a.id = attempts.assignment_id AND m.student_id = ?))`)
    .bind(JSON.stringify(snapshot), JSON.stringify(checked), JSON.stringify([...receipts, { id: body.operationId, digest }].slice(-16)),
      action === 'submit' ? 'submitted' : 'active', action, row.id, user, body.revision, user, user).run();
  if (!changed.meta.changes) {
    await finalize(db, row.id);
    const latest = await owned(db, row.id, user);
    const known = (JSON.parse(latest.receipts) as { id: string; digest: string }[]).find(r => r.id === body.operationId);
    if (known?.digest === digest || (action === 'submit' && latest.state !== 'active')) return;
    throw conflict();
  }
}
