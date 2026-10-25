import { Hono } from 'hono';
import { bulkPublishQuestionsSchema,questionBankSchema,type BankQuestion,type BulkPublishResult } from '../../shared/contracts/teaching';
import type { ApiEnv } from '../env';
import { readJson,validate } from '../http/validation';
import { ownerScope } from '../teaching/access';
import { publishQuestion } from '../teaching/content';
import { ApiError } from '../http/errors';

// Mounted inside the authenticated staff router. Only list metadata leaves this route.
export function questionBankRoutes(){
  const app=new Hono<ApiEnv>();
  app.post('/publish',async c=>{
    const body=await readJson(c.req.raw,bulkPublishQuestionsSchema);
    const results:BulkPublishResult['results']=[];
    for(const item of body.items){
      try{
        const versionId=await publishQuestion(c.env.DB,item.id,c.get('auth').user.id,item.revision);
        results.push({id:item.id,versionId,status:'published'});
      }catch(error){
        if(!(error instanceof ApiError)||![404,409,422].includes(error.status))throw error;
        results.push({id:item.id,status:'failed',code:error.status===422?'invalid':error.status===409?'changed':'unavailable'});
      }
    }
    return c.json({results});
  });
  app.get('/',async c=>{
    const filter=validate(questionBankSchema,c.req.query());
    const published="EXISTS(SELECT 1 FROM question_publications p WHERE p.question_id=d.id AND p.draft_revision=d.revision)";
    const where=`${ownerScope('d')}
      AND instr(lower(json_extract(d.content,'$.stem')),lower(?))>0
      AND (?='all' OR json_extract(d.content,'$.kind')=?)
      AND (?='all' OR json_extract(d.content,'$.topic')=?)
      AND (?='all' OR ${published}=(?='published'))`;
    const args=[c.get('auth').user.id,filter.search,filter.kind,filter.kind,filter.topic,filter.topic,filter.status,filter.status];
    const total=await c.env.DB.prepare(`SELECT count(*) AS n FROM question_drafts d WHERE ${where}`).bind(...args).first<number>('n')??0;
    const pageSize=20,page=Math.min(filter.page,Math.max(1,Math.ceil(total/pageSize)));
    // The import row is authoritative even when a stem has no leading number.
    // Keep batches together, newest first, then preserve the entire file's row order.
    const rows=await c.env.DB.prepare(`SELECT d.id,d.revision,d.language,
      json_extract(d.content,'$.stem') AS stem,json_extract(d.content,'$.kind') AS kind,
      json_extract(d.content,'$.topic') AS topic,${published} AS published,
      j.filename AS sourceName,r.row_number-1 AS sourceNumber
      FROM question_drafts d LEFT JOIN import_rows r ON r.draft_id=d.id LEFT JOIN import_jobs j ON j.id=r.job_id
      WHERE ${where} ORDER BY coalesce(j.created_at,d.created_at) DESC,coalesce(j.id,d.id),r.row_number,d.id LIMIT ? OFFSET ?`)
      .bind(...args,pageSize,(page-1)*pageSize).all<BankQuestion>();
    return c.json({items:rows.results,total,page,pageSize});
  });
  return app;
}
