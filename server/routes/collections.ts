import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../env';
import { requireRole } from '../auth/session';
import { readJson,validate } from '../http/validation';
import { ApiError } from '../http/errors';
import { ownerScope,reviewScope,audit,changed,unavailable } from '../teaching/access';
import { draftRow,draftView,publishTest } from '../teaching/content';
import { reopenAssignmentSchema,testDraftContentSchema } from '../../shared/contracts/teaching';
import { SQL_NOW } from '../exams/service';

const pageSchema=z.object({after:z.string().max(100).default(''),limit:z.coerce.number().int().min(1).max(100).default(25)});
function cursor(value:string):[number,string]{
 if(!value)return [Number.MAX_SAFE_INTEGER,''];
 try{return validate(z.tuple([z.number().int().min(0),z.uuid()]),JSON.parse(atob(value)));}catch{throw new ApiError(422,'VALIDATION_ERROR','Invalid result cursor.');}
}
const nextCursor=(rows:{id:string;startedAt:number}[],limit:number)=>rows.length>limit?btoa(JSON.stringify([rows[limit-1]!.startedAt,rows[limit-1]!.id])):null;
export function collectionRoutes(){
 const app=new Hono<ApiEnv>();
 app.get('/drafts',async c=>{
  const {after,limit}=validate(pageSchema,c.req.query());
  const rows=await c.env.DB.prepare(`SELECT d.id,json_extract(d.content,'$.name') AS name,coalesce(json_array_length(json_extract(d.content,'$.questionDraftIds')),json_array_length(json_extract(d.content,'$.questionVersionIds'))) AS questionCount
   FROM test_drafts d WHERE d.id>? AND ${ownerScope('d')} AND NOT EXISTS(SELECT 1 FROM test_publications p WHERE p.test_id=d.id AND p.draft_revision=d.revision) ORDER BY d.id LIMIT ?`).bind(after,c.get('auth').user.id,limit+1).all<{id:string}>();
  return c.json({items:rows.results.slice(0,limit),next:rows.results.length>limit?rows.results[limit-1]!.id:null});
 });
 app.get('/draft/:id',async c=>{
  const row=await draftRow(c.env.DB,'test',c.req.param('id'),c.get('auth').user.id);
  const draft=await draftView(c.env.DB,'test',row),content=testDraftContentSchema.parse(draft.content);
  if(!content.questionDraftIds?.length){
   const mapping=await c.env.DB.prepare('SELECT version_id,question_id FROM question_publications WHERE version_id IN(SELECT value FROM json_each(?))').bind(JSON.stringify(content.questionVersionIds)).all<{version_id:string;question_id:string}>();
   content.questionDraftIds=content.questionVersionIds.map(id=>mapping.results.find(q=>q.version_id===id)?.question_id).filter((id):id is string=>!!id);
  }
  return c.json({...draft,content});
 });
 app.get('/import/:id',async c=>{
  const rows=await c.env.DB.prepare(`SELECT d.id,j.filename FROM import_rows r JOIN question_drafts d ON d.id=r.draft_id JOIN import_jobs j ON j.id=r.job_id
   WHERE j.id=? AND ${ownerScope('d')} ORDER BY r.row_number`).bind(c.req.param('id'),c.get('auth').user.id).all<{id:string;filename:string}>();
  if(!rows.results.length)throw unavailable();
  return c.json({ids:rows.results.map(r=>r.id),name:rows.results[0]!.filename.replace(/\.(csv|xlsx)$/i,'')});
 });
 app.post('/',async c=>{
  const body=await readJson(c.req.raw,z.strictObject({draftId:z.uuid(),revision:z.number().int().min(0)}));
  const actor=c.get('auth').user.id,row=await draftRow(c.env.DB,'test',body.draftId,actor);
  if(row.revision!==body.revision)throw changed();
  const known=await c.env.DB.prepare('SELECT c.id FROM test_collections c JOIN test_publications p ON p.version_id=c.id WHERE p.test_id=? AND p.draft_revision=?').bind(row.id,body.revision).first<{id:string}>();
  if(known)return c.json({id:known.id,examId:'c_'+known.id},201);
  const content=testDraftContentSchema.parse(JSON.parse(row.content)),opens=content.opensAt??null,closes=content.closesAt??null;
  if((opens===null)!==(closes===null)||(opens!==null&&closes!==null&&(closes<=opens||closes<=Date.now())))throw new ApiError(422,'VALIDATION_ERROR','Choose a valid future deadline.');
  const version=await publishTest(c.env.DB,row.id,actor,body.revision);
  await c.env.DB.batch([
   c.env.DB.prepare(`INSERT OR IGNORE INTO test_collections(id,test_id,test_version_id,owner_id,opens_at,closes_at,created_at)
    SELECT ?,d.id,?,d.owner_id,?,?,? FROM test_drafts d WHERE d.id=? AND d.revision=? AND ${ownerScope('d')}`)
    .bind(version,version,opens,closes,Date.now(),row.id,body.revision,actor),
   audit(c.env.DB,actor,'collection.publish',version,{testId:row.id,revision:body.revision}),
   c.env.DB.prepare(`UPDATE test_collections SET retired=1 WHERE test_id=? AND id<>? AND EXISTS(SELECT 1 FROM test_collections n WHERE n.id=? AND n.test_id=?)`).bind(row.id,version,version,row.id),
  ]);
  const found=await c.env.DB.prepare('SELECT id FROM test_collections WHERE id=?').bind(version).first();if(!found)throw changed();
  return c.json({id:version,examId:'c_'+version},201);
 });
 app.get('/',async c=>{
  const {after,limit}=validate(pageSchema,c.req.query()),actor=c.get('auth').user.id;
  const rows=await c.env.DB.prepare(`SELECT c.id,c.test_id AS draftId,t.name,json_array_length(t.question_ids) AS questionCount,c.opens_at AS opensAt,c.closes_at AS closesAt,c.retired,c.created_at AS createdAt,
   (SELECT count(*) FROM attempts a WHERE a.collection_id=c.id) AS attempts,
   (SELECT count(*) FROM attempts a WHERE a.collection_id=c.id AND a.state='final') AS completed
   FROM test_collections c JOIN test_versions t ON t.id=c.test_version_id WHERE c.id>? AND ${ownerScope('c')} ORDER BY c.id LIMIT ?`).bind(after,actor,limit+1).all<{id:string}>();
  return c.json({items:rows.results.slice(0,limit),next:rows.results.length>limit?rows.results[limit-1]!.id:null});
 });
 app.get('/:id/results',async c=>{
  const id=c.req.param('id'),actor=c.get('auth').user.id,{after,limit}=validate(pageSchema,c.req.query());
  const [time,last]=cursor(after);
  const collection=await c.env.DB.prepare(`SELECT c.id,t.name FROM test_collections c JOIN test_versions t ON t.id=c.test_version_id WHERE c.id=? AND ${ownerScope('c')}`).bind(id,actor).first();if(!collection)throw unavailable();
  const rows=await c.env.DB.prepare(`SELECT a.id,u.display_name AS student,u.email,a.state,a.started_at AS startedAt,a.submitted_at AS submittedAt,a.result
   FROM attempts a JOIN users u ON u.id=a.user_id WHERE a.collection_id=? AND (a.started_at<? OR(a.started_at=? AND a.id>?)) ORDER BY a.started_at DESC,a.id LIMIT ?`).bind(id,time,time,last,limit+1).all<{id:string;startedAt:number;result:string|null}>();
  const summary=await c.env.DB.prepare(`SELECT count(*) AS attempts,count(DISTINCT user_id) AS participants,sum(state='final') AS completed,
   avg(CASE WHEN json_extract(result,'$.final')=1 THEN 100.0*json_extract(result,'$.units')/json_extract(result,'$.maxUnits') END) AS averagePercent
   FROM attempts WHERE collection_id=?`).bind(id).first();
  return c.json({collection,summary,items:rows.results.slice(0,limit).map(r=>({...r,result:r.result?JSON.parse(r.result):null})),next:nextCursor(rows.results,limit)});
 });
 app.get('/results',async c=>{
  const {after,limit}=validate(pageSchema,c.req.query());
  const [time,last]=cursor(after);
  const rows=await c.env.DB.prepare(`SELECT a.id,a.collection_id AS collectionId,t.name,u.display_name AS student,u.email,a.state,a.started_at AS startedAt,a.submitted_at AS submittedAt,a.result
   FROM attempts a JOIN users u ON u.id=a.user_id JOIN test_versions t ON t.id=a.test_version_id WHERE (a.started_at<? OR(a.started_at=? AND a.id>?)) AND ${reviewScope} ORDER BY a.started_at DESC,a.id LIMIT ?`).bind(time,time,last,c.get('auth').user.id,limit+1).all<{id:string;startedAt:number;result:string|null}>();
  return c.json({items:rows.results.slice(0,limit).map(r=>({...r,result:r.result?JSON.parse(r.result):null})),next:nextCursor(rows.results,limit)});
 });
 app.post('/:id/reopen',requireRole('admin'),async c=>{
  const body=await readJson(c.req.raw,reopenAssignmentSchema),source=c.req.param('id'),actor=c.get('auth').user.id;
  const opens=Date.parse(body.opensAt),closes=Date.parse(body.closesAt);
  await c.env.DB.batch([
   c.env.DB.prepare(`INSERT OR IGNORE INTO test_collections(id,test_id,test_version_id,owner_id,opens_at,closes_at,reopened_from,created_at)
    SELECT ?,test_id,test_version_id,owner_id,?,?,id,? FROM test_collections WHERE id=? AND closes_at<=${SQL_NOW} AND ?>${SQL_NOW}
    AND EXISTS(SELECT 1 FROM users WHERE id=? AND role='admin' AND status='active')`).bind(body.operationId,opens,closes,Date.now(),source,closes,actor),
   audit(c.env.DB,actor,'collection.reopen',body.operationId,{source,opensAt:opens,closesAt:closes}),
   c.env.DB.prepare('UPDATE test_collections SET retired=1 WHERE id=? AND EXISTS(SELECT 1 FROM test_collections n WHERE n.id=? AND n.reopened_from=?)').bind(source,body.operationId,source),
  ]);
  const row=await c.env.DB.prepare('SELECT reopened_from,opens_at,closes_at FROM test_collections WHERE id=?').bind(body.operationId).first<{reopened_from:string;opens_at:number;closes_at:number}>();
  if(!row||row.reopened_from!==source||row.opens_at!==opens||row.closes_at!==closes)throw changed();
  return c.json({id:body.operationId},201);
 });
 return app;
}

export function staffUserRoutes(){
 const app=new Hono<ApiEnv>();app.use('*',requireRole('admin'));
 app.get('/',async c=>{
  const {after,limit,search}=validate(pageSchema.extend({search:z.string().trim().max(100).default('')}),c.req.query());
  const [time,last]=cursor(after);
  const rows=await c.env.DB.prepare(`SELECT u.id,u.display_name AS name,u.email,u.role,u.created_at AS createdAt,
   (SELECT count(*) FROM attempts a WHERE a.user_id=u.id AND a.state='final') AS completed
   FROM users u WHERE (u.created_at<? OR(u.created_at=? AND u.id>?)) AND (instr(lower(u.display_name),lower(?))>0 OR instr(lower(u.email),lower(?))>0) ORDER BY u.created_at DESC,u.id LIMIT ?`).bind(time,time,last,search,search,limit+1).all<{id:string;createdAt:number}>();
  const lastRow=rows.results[limit-1];
  return c.json({items:rows.results.slice(0,limit),next:rows.results.length>limit&&lastRow?btoa(JSON.stringify([lastRow.createdAt,lastRow.id])):null});
 });return app;
}
