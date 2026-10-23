import type { PrivateQuestion, ServerAttempt } from '../../shared/contracts/exams';
import type { grade } from './grading';

export interface Outcome {id:string;topic:string;verdict:string;units:number|null}
export function reportOutcomes(bank:PrivateQuestion[],grades:ReturnType<typeof grade>[]):Outcome[]{return bank.map((item,i)=>({id:item.question.id,topic:item.question.topic,verdict:grades[i]!.verdict,units:grades[i]!.units}));}
/** Place immediately after the successful attempt CAS inside the same D1 transaction. */
export function reportStatement(db:D1Database,id:string,result:NonNullable<ServerAttempt['result']>,outcomes:Outcome[]){
 return db.prepare(`INSERT INTO attempt_reports(attempt_id,user_id,assignment_id,submitted_at,grade_revision,units,max_units,pending,outcomes,algorithm)
  SELECT id,user_id,assignment_id,submitted_at,grade_revision,?,?,?,?,? FROM attempts WHERE id=? AND state='final' AND changes()>0
  ON CONFLICT(attempt_id) DO UPDATE SET grade_revision=excluded.grade_revision,units=excluded.units,max_units=excluded.max_units,pending=excluded.pending,outcomes=excluded.outcomes,algorithm=excluded.algorithm`)
  .bind(result.units,result.maxUnits,result.pending,JSON.stringify(outcomes),result.algorithm,id);
}
