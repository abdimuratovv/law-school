import type { Snapshot, ServerAttempt } from '../../shared/contracts/exams';
import { questions, type AttemptRow } from './service';
import { withOverride } from './grading';
import { reportOutcomes } from './reporting';

/** Bounded migration work, independent of autosaves. Conditional writes cannot overwrite a newer review. */
export async function backfillReports(db:D1Database){
 const state=await db.prepare('SELECT cursor,done FROM report_backfill WHERE singleton=1').first<{cursor:string;done:number}>();if(!state||state.done)return;
 const rows=await db.prepare('SELECT * FROM attempts WHERE id>? ORDER BY id LIMIT 10').bind(state.cursor).all<AttemptRow&{submitted_at:number;grade_revision:number}>();
 for(const a of rows.results){
  if(a.state!=='final'||!a.result)continue;
  if(await db.prepare('SELECT attempt_id FROM attempt_reports WHERE attempt_id=?').bind(a.id).first())continue;
  const bank=await questions(db,(JSON.parse(a.question_order) as {id:string}[]).map(q=>q.id));const snapshot=JSON.parse(a.snapshot) as Snapshot;
  const reviews=await db.prepare('SELECT question_version_id,units FROM attempt_item_reviews WHERE attempt_id=?').bind(a.id).all<{question_version_id:string;units:number}>();
  const outcomes=reportOutcomes(bank,bank.map(q=>withOverride(q,snapshot.answers[q.question.id],reviews.results.find(r=>r.question_version_id===q.question.id))));
  const result=JSON.parse(a.result) as NonNullable<ServerAttempt['result']>;
  await db.prepare(`INSERT OR IGNORE INTO attempt_reports SELECT id,user_id,assignment_id,submitted_at,grade_revision,?,?,?,?,? FROM attempts WHERE id=? AND state='final' AND grade_revision=?`)
   .bind(result.units,result.maxUnits,result.pending,JSON.stringify(outcomes),result.algorithm,a.id,a.grade_revision).run();
 }
 await db.prepare('UPDATE report_backfill SET cursor=?,done=? WHERE singleton=1 AND cursor=?').bind(rows.results.at(-1)?.id??state.cursor,rows.results.length<10?1:0,state.cursor).run();
}
