import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../env';
import { requireAuthentication,requireCsrf,limitMutation } from '../auth/session';
import { readJson,validate } from '../http/validation';
import { owned,settleOwned,view } from '../exams/service';
import { unavailable } from '../teaching/access';
import type { Outcome } from '../exams/reporting';
import { teachingPageSchema } from '../../shared/contracts/teaching';

export const reportFilter=z.object({from:z.coerce.number().int().min(0).default(0),until:z.coerce.number().int().min(1).default(8640000000000000),mode:z.enum(['practice','mock']).optional(),topic:z.enum(['constitutional','civil','criminal','administrative','human-rights','labor','family','theory']).optional()}).refine(v=>v.until>v.from);
interface ReportRow {attempt_id:string;submitted_at:number;units:number;max_units:number;pending:number;outcomes:string;name:string;mode:string;released:number}
export function summarize(rows:ReportRow[],topic?:string){
 const final=rows.filter(r=>r.pending===0);const topics:Record<string,{correct:number;partial:number;incorrect:number;pending:number}>={};
 for(const r of rows)if(r.released)for(const item of JSON.parse(r.outcomes) as Outcome[]){if(topic&&item.topic!==topic)continue;const stats=topics[item.topic]??={correct:0,partial:0,incorrect:0,pending:0};stats[item.units===null?'pending':item.units===2?'correct':item.units===1?'partial':'incorrect']++;}
 return {completed:rows.length,final:final.length,provisional:rows.length-final.length,averagePercent:final.length?Math.round(final.reduce((sum,r)=>sum+r.units/r.max_units*100,0)/final.length):null,topics};
}
export const releasedSql="(r.pending=0 AND (r.assignment_id IS NULL OR g.closes_at<=CAST(unixepoch('subsec')*1000 AS INTEGER)))";
export function learningRoutes(){
 const app=new Hono<ApiEnv>();for(const path of ['/progress','/mistakes','/saved-questions'])app.use(path,requireAuthentication);
 app.get('/progress',async c=>{
  const f=validate(reportFilter,c.req.query());
  const rows=await c.env.DB.prepare(`SELECT r.*,t.name,t.mode,${releasedSql} AS released FROM (SELECT * FROM attempt_reports WHERE user_id=? ORDER BY submitted_at DESC,attempt_id LIMIT 100) r JOIN attempts a ON a.id=r.attempt_id JOIN test_versions t ON t.id=a.test_version_id LEFT JOIN assignments g ON g.id=r.assignment_id
    WHERE r.submitted_at>=? AND r.submitted_at<? AND (? IS NULL OR t.mode=?) AND (? IS NULL OR EXISTS(SELECT 1 FROM json_each(r.outcomes) WHERE json_extract(value,'$.topic')=?)) ORDER BY r.submitted_at DESC,r.attempt_id`).bind(c.get('auth').user.id,f.from,f.until,f.mode??null,f.mode??null,f.topic??null,f.topic??null).all<ReportRow>();
  const pending=await c.env.DB.prepare('SELECT done FROM report_backfill WHERE singleton=1').first<number>('done');
  return c.json({summary:summarize(rows.results,f.topic),window:100,backfillPending:pending!==1,items:rows.results.map(r=>({id:r.attempt_id,name:r.name,submittedAt:r.submitted_at,units:r.units,maxUnits:r.max_units,pending:r.pending}))});
 });
 app.get('/mistakes',async c=>{
  const {after,limit}=validate(teachingPageSchema,c.req.query());const offset=validate(z.coerce.number().int().min(0).max(10000),after||'0');
  const rows=await c.env.DB.prepare(`WITH recent AS(SELECT * FROM attempt_reports WHERE user_id=? ORDER BY submitted_at DESC,attempt_id LIMIT 100)
   SELECT r.attempt_id AS attemptId,json_extract(j.value,'$.id') AS questionId
   FROM recent r LEFT JOIN assignments g ON g.id=r.assignment_id JOIN json_each(r.outcomes) j
   WHERE ${releasedSql} AND json_extract(j.value,'$.units')<2 ORDER BY r.submitted_at DESC,r.attempt_id,j.key LIMIT ? OFFSET ?`).bind(c.get('auth').user.id,limit+1,offset).all<{attemptId:string;questionId:string}>();
  // Fetch released feedback through the same policy used by exam responses.
  const cache=new Map<string,Awaited<ReturnType<typeof view>>>();const items=[];
  for(const r of rows.results.slice(0,limit)){let a=cache.get(r.attemptId);if(!a){a=await view(c.env.DB,await owned(c.env.DB,r.attemptId,c.get('auth').user.id));cache.set(r.attemptId,a);}if(a.feedback[r.questionId])items.push({attemptId:r.attemptId,question:a.questions.find(q=>q.id===r.questionId),answer:a.snapshot.answers[r.questionId]??'',feedback:a.feedback[r.questionId]});}
  return c.json({items,next:rows.results.length>limit?String(offset+limit):null,window:100});
 });
 app.get('/saved-questions',async c=>{
  const {after,limit}=validate(teachingPageSchema,c.req.query());const rows=await c.env.DB.prepare('SELECT * FROM saved_questions WHERE user_id=? AND question_version_id>? ORDER BY question_version_id LIMIT ?').bind(c.get('auth').user.id,after,limit+1).all<{source_attempt_id:string;question_version_id:string}>();const items=[];
  const cache=new Map<string,Awaited<ReturnType<typeof view>>>();
  for(const r of rows.results.slice(0,limit)){let a=cache.get(r.source_attempt_id);if(!a){a=await view(c.env.DB,await owned(c.env.DB,r.source_attempt_id,c.get('auth').user.id));cache.set(r.source_attempt_id,a);}if(a.feedback[r.question_version_id])items.push({attemptId:a.id,question:a.questions.find(q=>q.id===r.question_version_id),answer:a.snapshot.answers[r.question_version_id]??'',feedback:a.feedback[r.question_version_id]});}
  return c.json({items,next:rows.results.length>limit?rows.results[limit-1]!.question_version_id:null});
 });
 app.post('/saved-questions',requireCsrf,async c=>{
  await limitMutation(c);const b=await readJson(c.req.raw,z.strictObject({attemptId:z.uuid(),questionId:z.string().min(1).max(100),saved:z.boolean()}));const actor=c.get('auth').user.id;
  if(!b.saved){await c.env.DB.prepare('DELETE FROM saved_questions WHERE user_id=? AND question_version_id=?').bind(actor,b.questionId).run();return c.json({saved:false});}
  const a=await settleOwned(c.env.DB,await owned(c.env.DB,b.attemptId,actor));const v=await view(c.env.DB,a);if(!v.feedback[b.questionId])throw unavailable();
  const write=await c.env.DB.prepare(`INSERT INTO saved_questions(user_id,question_version_id,source_attempt_id,saved_at)
   SELECT a.user_id,?,a.id,? FROM attempts a JOIN test_versions t ON t.id=a.test_version_id LEFT JOIN assignments g ON g.id=a.assignment_id
   WHERE a.id=? AND a.user_id=? AND EXISTS(SELECT 1 FROM json_each(a.question_order) WHERE json_extract(value,'$.id')=?) AND
    ((a.state='final' AND json_extract(a.result,'$.final')=1 AND (a.assignment_id IS NULL OR g.closes_at<=CAST(unixepoch('subsec')*1000 AS INTEGER))) OR
     (a.assignment_id IS NULL AND t.mode='practice' AND EXISTS(SELECT 1 FROM json_each(a.checked) WHERE value=?)))
   ON CONFLICT(user_id,question_version_id) DO UPDATE SET source_attempt_id=excluded.source_attempt_id,saved_at=excluded.saved_at`)
   .bind(b.questionId,Date.now(),b.attemptId,actor,b.questionId,b.questionId).run();if(!write.meta.changes)throw unavailable();return c.json({saved:true});
 });return app;
}
