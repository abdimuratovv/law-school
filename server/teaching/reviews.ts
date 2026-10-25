import type { ServerAttempt, Snapshot } from '../../shared/contracts/exams';
import type { ReviewItemRequest } from '../../shared/contracts/teaching';
import { withOverride as reviewedGrade } from '../exams/grading';
import { hash } from '../auth/crypto';
import { reportOutcomes,reportStatement } from '../exams/reporting';
import { finalize, questions, type AttemptRow } from '../exams/service';
import { ApiError } from '../http/errors';
import { audit, changed, reviewScope, unavailable } from './access';

export interface ItemReview {question_version_id:string;units:number;comment:string;reviewer_id:string;revision:number;updated_at:number}
export type ReviewAttempt = AttemptRow & {grade_revision:number;last_review_operation:string|null;last_review_digest:string|null};
export async function accessibleAttempt(db:D1Database,id:string,actor:string):Promise<ReviewAttempt> {
  const row=await db.prepare(`SELECT a.* FROM attempts a WHERE a.id=? AND ${reviewScope}`).bind(id,actor).first<ReviewAttempt>();
  if(!row) throw unavailable();
  if(row.state==='submitted' || (row.state==='active' && row.ends_at!==null && row.ends_at<=Date.now())) {
    await finalize(db,id);
    const refreshed=await db.prepare(`SELECT a.* FROM attempts a WHERE a.id=? AND ${reviewScope}`).bind(id,actor).first<ReviewAttempt>();
    if(!refreshed) throw unavailable(); return refreshed;
  }
  return row;
}
export const loadReviews=(db:D1Database,id:string)=>db.prepare('SELECT * FROM attempt_item_reviews WHERE attempt_id=?').bind(id).all<ItemReview>();
export async function reviewView(db:D1Database,row:ReviewAttempt) {
  if(row.state!=='final') throw new ApiError(409,'CONFLICT','This attempt is still in progress.');
  const order=JSON.parse(row.question_order) as {id:string}[];
  const [bank,reviews]=await Promise.all([questions(db,order.map(q=>q.id)),loadReviews(db,row.id)]);
  const snapshot=JSON.parse(row.snapshot) as Snapshot;
  return {id:row.id,language:row.language,revision:row.grade_revision,result:row.result?JSON.parse(row.result) as ServerAttempt['result']:null,
    items:bank.map(item=>{const review=reviews.results.find(r=>r.question_version_id===item.question.id);return {
      question:item.question,correctOptionId:item.correctOptionId,accepted:item.accepted,explanation:item.explanation,
      answer:snapshot.answers[item.question.id]??'',grade:reviewedGrade(item,snapshot.answers[item.question.id],review),
      review:review?{units:review.units,comment:review.comment,revision:review.revision,updatedAt:review.updated_at}:null,
    };})};
}
export async function applyReview(db:D1Database,id:string,actor:string,body:ReviewItemRequest) {
  const row=await accessibleAttempt(db,id,actor);
  const digest=await hash(JSON.stringify(body));
  if(row.last_review_operation===body.operationId) {if(row.last_review_digest!==digest) throw changed();return;}
  if(row.state!=='final' || row.grade_revision!==body.revision) throw changed();
  const order=JSON.parse(row.question_order) as {id:string}[];
  const [bank,reviews]=await Promise.all([questions(db,order.map(q=>q.id)),loadReviews(db,id)]);
  const question=bank.find(q=>q.question.id===body.questionId);
  if(!question || question.question.kind!=='written') throw new ApiError(422,'VALIDATION_ERROR','Choose a written question from this attempt.');
  const snapshot=JSON.parse(row.snapshot) as Snapshot;
  const grades=bank.map(item=>reviewedGrade(item,snapshot.answers[item.question.id],item.question.id===body.questionId?{units:body.units}:reviews.results.find(r=>r.question_version_id===item.question.id)));
  const pending=grades.filter(g=>g.units===null).length;
  const previous=JSON.parse(row.result!) as NonNullable<ServerAttempt['result']>;
  const result={...previous,units:grades.reduce((total,g)=>total+(g.units??0),0),maxUnits:bank.length*2,pending,final:pending===0};
  const results=await db.batch([
    db.prepare(`UPDATE attempts AS a SET result=?,grade_revision=grade_revision+1,last_review_operation=?,last_review_digest=?
      WHERE a.id=? AND a.state='final' AND a.grade_revision=? AND ${reviewScope}`)
      .bind(JSON.stringify(result),body.operationId,digest,id,body.revision,actor),
    reportStatement(db,id,result,reportOutcomes(bank,grades)),
    db.prepare(`INSERT INTO attempt_item_reviews(attempt_id,question_version_id,units,comment,reviewer_id,revision,updated_at)
      SELECT ?,?,?,?,?,1,? WHERE changes()>0 ON CONFLICT(attempt_id,question_version_id) DO UPDATE SET
      units=excluded.units,comment=excluded.comment,reviewer_id=excluded.reviewer_id,revision=attempt_item_reviews.revision+1,updated_at=excluded.updated_at`)
      .bind(id,body.questionId,body.units,body.comment,actor,Date.now()),
    audit(db,actor,'attempt.review',id,{questionId:body.questionId,units:body.units,previousUnits:reviewedGrade(question,snapshot.answers[body.questionId],reviews.results.find(r=>r.question_version_id===body.questionId)).units,gradeRevision:body.revision+1,comment:body.comment,previousComment:reviews.results.find(r=>r.question_version_id===body.questionId)?.comment??''}),
  ]);
  if(!results[0]?.meta.changes) {
    const latest=await accessibleAttempt(db,id,actor);
    if(latest.last_review_operation!==body.operationId || latest.last_review_digest!==digest) throw changed();
  }
}
