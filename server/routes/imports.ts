import { Hono } from 'hono';
import type { ApiEnv } from '../env';
import { readJson,validate } from '../http/validation';
import { ApiError } from '../http/errors';
import { canonicalImportContent,IMPORT_CHUNK_ROWS,importChunkSchema,importCommitSchema,importJobSchema,MAX_IMPORT_BYTES,type ImportJob } from '../../shared/contracts/imports';
import { teachingPageSchema } from '../../shared/contracts/teaching';
import { publishedQuestion } from '../teaching/content';
import { staffActor,changed,unavailable } from '../teaching/access';
import { hash } from '../auth/crypto';

interface JobRow {id:string;owner_id:string;filename:string;file_hash:string;source_bytes:number;total_rows:number;duplicate_policy:'skip'|'keep';status:ImportJob['status'];uploaded_rows:number;payload_bytes:number;cursor:number;created_count:number;skipped_count:number}
const jobView=(j:JobRow):ImportJob=>({id:j.id,filename:j.filename,status:j.status,totalRows:j.total_rows,uploadedRows:j.uploaded_rows,payloadBytes:j.payload_bytes,cursor:j.cursor,created:j.created_count,skipped:j.skipped_count,duplicatePolicy:j.duplicate_policy});
async function ownedJob(db:D1Database,id:string,actor:string){const job=await db.prepare(`SELECT * FROM import_jobs WHERE id=? AND owner_id=? AND ${staffActor}`).bind(id,actor,actor).first<JobRow>();if(!job)throw unavailable();return job;}
export function importRoutes(){
 const app=new Hono<ApiEnv>();
 app.get('/',async c=>{const {after,limit}=validate(teachingPageSchema,c.req.query());const rows=await c.env.DB.prepare('SELECT * FROM import_jobs WHERE owner_id=? AND id>? ORDER BY id LIMIT ?').bind(c.get('auth').user.id,after,limit+1).all<JobRow>();return c.json({items:rows.results.slice(0,limit).map(jobView),next:rows.results.length>limit?rows.results[limit-1]!.id:null});});
 app.post('/',async c=>{
  const b=await readJson(c.req.raw,importJobSchema);const actor=c.get('auth').user.id;
  await c.env.DB.prepare(`INSERT OR IGNORE INTO import_jobs(id,owner_id,filename,file_hash,source_bytes,total_rows,duplicate_policy,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ${staffActor}`)
   .bind(b.operationId,actor,b.filename,b.fileHash,b.bytes,b.totalRows,b.duplicatePolicy,Date.now(),Date.now(),actor).run();
  const j=await c.env.DB.prepare(`SELECT * FROM import_jobs WHERE owner_id=? AND (id=? OR (file_hash=? AND duplicate_policy=?)) ORDER BY id=? DESC LIMIT 1`).bind(actor,b.operationId,b.fileHash,b.duplicatePolicy,b.operationId).first<JobRow>();
  if(!j)throw changed();if(j.file_hash!==b.fileHash||j.source_bytes!==b.bytes||j.total_rows!==b.totalRows||j.duplicate_policy!==b.duplicatePolicy)throw changed();return c.json(jobView(j),201);
 });
 app.get('/:id',async c=>c.json(jobView(await ownedJob(c.env.DB,c.req.param('id'),c.get('auth').user.id))));
 app.post('/:id/rows',async c=>{
  const b=await readJson(c.req.raw,importChunkSchema);const actor=c.get('auth').user.id;const j=await ownedJob(c.env.DB,c.req.param('id'),actor);
  const rows=await Promise.all(b.rows.map(async row=>{
   if(row.rowNumber>j.total_rows+1)throw new ApiError(422,'VALIDATION_ERROR','Row number is outside this import.');
   const content=canonicalImportContent(row.content);publishedQuestion(content,'import-validation');const json=JSON.stringify(content);
   return {row:row.rowNumber,content:json,digest:await hash(json),bytes:new TextEncoder().encode(json).byteLength,draftId:crypto.randomUUID()};
  }));
  const data=JSON.stringify(rows);
  await c.env.DB.batch([
   c.env.DB.prepare(`INSERT OR IGNORE INTO import_rows(job_id,row_number,content,content_hash,content_bytes,draft_id)
    SELECT ?,json_extract(v.value,'$.row'),json_extract(v.value,'$.content'),json_extract(v.value,'$.digest'),json_extract(v.value,'$.bytes'),json_extract(v.value,'$.draftId') FROM json_each(?) v
    WHERE EXISTS(SELECT 1 FROM import_jobs WHERE id=? AND owner_id=? AND status='uploading') AND ${staffActor}
    AND NOT EXISTS(SELECT 1 FROM json_each(?) n JOIN import_rows old ON old.job_id=? AND old.row_number=json_extract(n.value,'$.row') WHERE old.content_hash<>json_extract(n.value,'$.digest'))
    AND coalesce((SELECT sum(content_bytes) FROM import_rows WHERE job_id=?),0)+(SELECT coalesce(sum(json_extract(n.value,'$.bytes')),0) FROM json_each(?) n WHERE NOT EXISTS(SELECT 1 FROM import_rows old WHERE old.job_id=? AND old.row_number=json_extract(n.value,'$.row')))<=?`)
    .bind(j.id,data,j.id,actor,actor,data,j.id,j.id,data,j.id,MAX_IMPORT_BYTES),
   c.env.DB.prepare(`UPDATE import_jobs SET uploaded_rows=(SELECT count(*) FROM import_rows WHERE job_id=?),payload_bytes=(SELECT coalesce(sum(content_bytes),0) FROM import_rows WHERE job_id=?),updated_at=? WHERE id=? AND owner_id=? AND changes()>0`)
    .bind(j.id,j.id,Date.now(),j.id,actor),
  ]);
  const stored=await c.env.DB.prepare('SELECT row_number,content_hash FROM import_rows WHERE job_id=? AND row_number IN(SELECT json_extract(value,\'$.row\') FROM json_each(?))').bind(j.id,data).all<{row_number:number;content_hash:string}>();
  if(rows.some(row=>stored.results.find(old=>old.row_number===row.row)?.content_hash!==row.digest)){
   const current=await ownedJob(c.env.DB,j.id,actor);
   if(current.status==='uploading'&&current.payload_bytes+rows.filter(row=>!stored.results.some(old=>old.row_number===row.row)).reduce((sum,r)=>sum+r.bytes,0)>MAX_IMPORT_BYTES)throw new ApiError(413,'PAYLOAD_TOO_LARGE','Canonical import data exceeds 5 MB.');
   throw changed();
  }
  return c.json(jobView(await ownedJob(c.env.DB,j.id,actor)));
 });
 app.post('/:id/validate',async c=>{
  await readJson(c.req.raw,importCommitSchema);const actor=c.get('auth').user.id;const j=await ownedJob(c.env.DB,c.req.param('id'),actor);
  await c.env.DB.prepare(`UPDATE import_jobs SET status='ready',updated_at=? WHERE id=? AND owner_id=? AND status='uploading' AND uploaded_rows=total_rows AND ${staffActor}`).bind(Date.now(),j.id,actor,actor).run();
  const current=await ownedJob(c.env.DB,j.id,actor);if(current.status==='uploading')throw new ApiError(409,'CONFLICT','Upload every validated row before committing.');return c.json(jobView(current));
 });
 app.post('/:id/commit',async c=>{
  const b=await readJson(c.req.raw,importCommitSchema);const actor=c.get('auth').user.id;const j=await ownedJob(c.env.DB,c.req.param('id'),actor);
  if(b.cursor<j.cursor||j.status==='complete')return c.json(jobView(j));if(b.cursor!==j.cursor||j.status==='uploading')throw changed();
  const rows=await c.env.DB.prepare(`SELECT r.*,EXISTS(SELECT 1 FROM import_rows earlier WHERE earlier.job_id=r.job_id AND earlier.content_hash=r.content_hash AND earlier.row_number<r.row_number) AS duplicate
   FROM import_rows r WHERE r.job_id=? AND r.row_number>? ORDER BY r.row_number LIMIT ?`).bind(j.id,j.cursor,IMPORT_CHUNK_ROWS).all<{row_number:number;content:string;draft_id:string;duplicate:number}>();
  if(!rows.results.length)throw changed();const last=rows.results.at(-1)!.row_number;const keep=rows.results.filter(row=>j.duplicate_policy==='keep'||!row.duplicate);
  await c.env.DB.batch([
   c.env.DB.prepare(`INSERT INTO question_drafts(id,owner_id,content,created_at,updated_at) SELECT json_extract(r.value,'$.draft_id'),?,json_extract(r.value,'$.content'),?,? FROM json_each(?) r
    WHERE EXISTS(SELECT 1 FROM import_jobs WHERE id=? AND owner_id=? AND cursor=? AND status IN('ready','committing')) AND ${staffActor}`)
    .bind(actor,Date.now(),Date.now(),JSON.stringify(keep),j.id,actor,j.cursor,actor),
   c.env.DB.prepare(`UPDATE import_jobs SET cursor=?,status=?,created_count=created_count+?,skipped_count=skipped_count+?,updated_at=? WHERE id=? AND owner_id=? AND cursor=? AND status IN('ready','committing') AND ${staffActor}`)
    .bind(last,last===j.total_rows+1?'complete':'committing',keep.length,rows.results.length-keep.length,Date.now(),j.id,actor,j.cursor,actor),
   c.env.DB.prepare(`INSERT INTO audit_events(id,actor_id,action,target_id,metadata_json,created_at) SELECT ?,?,'import.complete',?,json_object('created',created_count,'skipped',skipped_count),? FROM import_jobs WHERE id=? AND status='complete' AND changes()>0`)
    .bind(crypto.randomUUID(),actor,j.id,Date.now(),j.id),
  ]);
  return c.json(jobView(await ownedJob(c.env.DB,j.id,actor)));
 });
 return app;
}
