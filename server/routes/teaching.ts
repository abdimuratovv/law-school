import { Hono } from 'hono';
import { z } from 'zod';
import { assignTestSchema, createQuestionSchema,createTestSchema,publishSchema,reviewItemSchema,teachingPageSchema,updateQuestionSchema,updateTestSchema,type QuestionDraftContent,type TestDraftContent } from '../../shared/contracts/teaching';
import { limitMutation,requireAuthentication,requireCsrf,requireRole } from '../auth/session';
import type { ApiEnv } from '../env';
import { readJson,validate } from '../http/validation';
import { audit,changed,groupScope,ownerScope,reviewScope,staffActor,unavailable } from '../teaching/access';
import { draftRow,draftView,publishQuestion,publishTest,type DraftRow,type DraftTable } from '../teaching/content';
import { accessibleAttempt,applyReview,reviewView } from '../teaching/reviews';
import { SQL_NOW } from '../exams/service';
import { importRoutes } from './imports';
import { reportFilter,summarize } from './learning';

type Content=QuestionDraftContent|TestDraftContent;
function draftRoutes(kind:DraftTable,createSchema:z.ZodType<{operationId:string;content:Content}>,updateSchema:z.ZodType<{revision:number;content:Content}>) {
  const app=new Hono<ApiEnv>();
  app.get('/',async c=>{
    const {limit,after}=validate(teachingPageSchema,c.req.query());const actor=c.get('auth').user.id;
    const rows=await c.env.DB.prepare(`SELECT d.* FROM ${kind}_drafts d WHERE d.id>? AND ${ownerScope('d')} ORDER BY d.id LIMIT ?`).bind(after,actor,limit+1).all<DraftRow>();
    return c.json({items:await Promise.all(rows.results.slice(0,limit).map(row=>draftView(c.env.DB,kind,row))),next:rows.results.length>limit?rows.results[limit-1]!.id:null});
  });
  app.post('/',async c=>{
    const body=await readJson(c.req.raw,createSchema);const actor=c.get('auth').user.id;
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT OR IGNORE INTO ${kind}_drafts(id,owner_id,content,created_at,updated_at) SELECT ?,?,?,?,? WHERE ${staffActor}`)
        .bind(body.operationId,actor,JSON.stringify(body.content),Date.now(),Date.now(),actor),
      audit(c.env.DB,actor,`${kind}.create`,body.operationId),
    ]);
    const row=await draftRow(c.env.DB,kind,body.operationId,actor);
    if(row.owner_id!==actor || row.content!==JSON.stringify(body.content)) throw changed();
    return c.json(await draftView(c.env.DB,kind,row),201);
  });
  app.get('/:id',async c=>c.json(await draftView(c.env.DB,kind,await draftRow(c.env.DB,kind,c.req.param('id'),c.get('auth').user.id))));
  app.patch('/:id',async c=>{
    const body=await readJson(c.req.raw,updateSchema);const actor=c.get('auth').user.id;const id=c.req.param('id');
    await draftRow(c.env.DB,kind,id,actor);
    const results=await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE ${kind}_drafts AS d SET content=?,revision=revision+1,updated_at=? WHERE d.id=? AND d.revision=? AND ${ownerScope('d')}`)
        .bind(JSON.stringify(body.content),Date.now(),id,body.revision,actor),
      audit(c.env.DB,actor,`${kind}.edit`,id,{revision:body.revision+1}),
    ]);
    if(!results[0]?.meta.changes) throw changed();
    return c.json(await draftView(c.env.DB,kind,await draftRow(c.env.DB,kind,id,actor)));
  });
  app.post('/:id/publish',async c=>{
    const {revision}=await readJson(c.req.raw,publishSchema);const actor=c.get('auth').user.id;
    const versionId=kind==='question'?await publishQuestion(c.env.DB,c.req.param('id'),actor,revision):await publishTest(c.env.DB,c.req.param('id'),actor,revision);
    return c.json({versionId});
  });
  return app;
}
export function teachingRoutes() {
  const app=new Hono<ApiEnv>();
  app.use('*',requireAuthentication,requireRole('teacher','admin'));
  app.use('*',async(c,next)=>{if(!['GET','HEAD'].includes(c.req.method))return requireCsrf(c,async()=>{await limitMutation(c);await next();});await next();});
  app.route('/questions',draftRoutes('question',createQuestionSchema,updateQuestionSchema));
  app.route('/imports',importRoutes());
  app.get('/analytics',async c=>{
    const id=validate(z.uuid(),c.req.query('assignmentId'));const f=validate(reportFilter,c.req.query());const actor=c.get('auth').user.id;
    if(!await c.env.DB.prepare(`SELECT a.id FROM assignments a WHERE a.id=? AND ${groupScope('a.group_id')}`).bind(id,actor).first())throw unavailable();
    const rows=await c.env.DB.prepare(`SELECT r.*,t.name,t.mode,1 AS released FROM (SELECT * FROM attempt_reports WHERE assignment_id=? ORDER BY submitted_at DESC,attempt_id LIMIT 200) r JOIN attempts a ON a.id=r.attempt_id JOIN test_versions t ON t.id=a.test_version_id
      WHERE r.submitted_at>=? AND r.submitted_at<? AND (? IS NULL OR t.mode=?) AND (? IS NULL OR EXISTS(SELECT 1 FROM json_each(r.outcomes) WHERE json_extract(value,'$.topic')=?)) ORDER BY r.submitted_at DESC,r.attempt_id`)
      .bind(id,f.from,f.until,f.mode??null,f.mode??null,f.topic??null,f.topic??null).all<Parameters<typeof summarize>[0][number]>();
    return c.json({summary:summarize(rows.results,f.topic),window:200});
  });
  app.route('/tests',draftRoutes('test',createTestSchema,updateTestSchema));
  app.get('/question-versions',async c=>{
    const {limit,after}=validate(teachingPageSchema,c.req.query());const actor=c.get('auth').user.id;
    const rows=await c.env.DB.prepare(`SELECT p.version_id AS id,p.question_id AS questionId,p.draft_revision AS revision,json_extract(v.payload,'$.question.stem') AS stem,json_extract(v.payload,'$.question.kind') AS kind
      FROM question_publications p JOIN question_drafts q ON q.id=p.question_id JOIN question_versions v ON v.id=p.version_id
      WHERE p.version_id>? AND ${ownerScope('q')} ORDER BY p.version_id LIMIT ?`).bind(after,actor,limit+1).all<{id:string}>();
    return c.json({items:rows.results.slice(0,limit),next:rows.results.length>limit?rows.results[limit-1]!.id:null});
  });
  app.post('/assignments',async c=>{
    const body=await readJson(c.req.raw,assignTestSchema);const actor=c.get('auth').user.id;
    const opens=Date.parse(body.opensAt),closes=Date.parse(body.closesAt);
    const allowedVersion=`EXISTS(SELECT 1 FROM test_publications p JOIN test_drafts d ON d.id=p.test_id WHERE p.version_id=? AND p.archived=0 AND ${ownerScope('d')})`;
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT OR IGNORE INTO assignments(id,test_version_id,group_id,opens_at,closes_at)
        SELECT ?,?,?,?,? WHERE ${groupScope('?')} AND ${allowedVersion} AND ?>${SQL_NOW}`)
        .bind(body.operationId,body.testVersionId,body.groupId,opens,closes,actor,body.groupId,body.testVersionId,actor,closes),
      c.env.DB.prepare('INSERT INTO assignment_authors SELECT ?,?,? WHERE changes()>0').bind(body.operationId,actor,Date.now()),
      audit(c.env.DB,actor,'assignment.create',body.operationId,{groupId:body.groupId,testVersionId:body.testVersionId,opensAt:opens,closesAt:closes,timeZone:'Asia/Tashkent'}),
    ]);
    const row=await c.env.DB.prepare(`SELECT a.* FROM assignments a WHERE a.id=? AND ${groupScope('a.group_id')}`).bind(body.operationId,actor).first<{test_version_id:string;group_id:string;opens_at:number;closes_at:number}>();
    if(!row)throw unavailable();
    if(row.test_version_id!==body.testVersionId||row.group_id!==body.groupId||row.opens_at!==opens||row.closes_at!==closes)throw changed();
    return c.json({id:body.operationId},201);
  });
  app.get('/assignments',async c=>{
    const {limit,after}=validate(teachingPageSchema,c.req.query());
    const rows=await c.env.DB.prepare(`SELECT a.id,t.name,g.name AS groupName,a.opens_at AS opensAt,a.closes_at AS closesAt
      FROM assignments a JOIN test_versions t ON t.id=a.test_version_id JOIN groups g ON g.id=a.group_id
      WHERE a.id>? AND ${groupScope('a.group_id')} ORDER BY a.id LIMIT ?`).bind(after,c.get('auth').user.id,limit+1).all<{id:string}>();
    return c.json({items:rows.results.slice(0,limit),next:rows.results.length>limit?rows.results[limit-1]!.id:null});
  });
  app.get('/assignments/:id/attempts',async c=>{
    const actor=c.get('auth').user.id;const id=c.req.param('id');const {limit,after}=validate(teachingPageSchema,c.req.query());
    if(!await c.env.DB.prepare(`SELECT a.id FROM assignments a WHERE a.id=? AND ${groupScope('a.group_id')}`).bind(id,actor).first())throw unavailable();
    const rows=await c.env.DB.prepare(`SELECT a.id,u.display_name AS student,a.state,a.result FROM attempts a JOIN users u ON u.id=a.user_id
      WHERE a.assignment_id=? AND a.id>? AND ${reviewScope} ORDER BY a.id LIMIT ?`).bind(id,after,actor,limit+1).all<{id:string;result:string|null}>();
    return c.json({items:rows.results.slice(0,limit).map(r=>({...r,result:r.result?JSON.parse(r.result):null})),next:rows.results.length>limit?rows.results[limit-1]!.id:null});
  });
  app.get('/reviews',async c=>{
    const {limit,after}=validate(teachingPageSchema,c.req.query());
    const rows=await c.env.DB.prepare(`SELECT a.id,t.name,u.display_name AS student,a.result FROM attempts a JOIN test_versions t ON t.id=a.test_version_id JOIN users u ON u.id=a.user_id
      WHERE a.state='final' AND json_extract(a.result,'$.pending')>0 AND a.id>? AND ${reviewScope} ORDER BY a.id LIMIT ?`).bind(after,c.get('auth').user.id,limit+1).all<{id:string;result:string}>();
    return c.json({items:rows.results.slice(0,limit).map(r=>({...r,result:JSON.parse(r.result)})),next:rows.results.length>limit?rows.results[limit-1]!.id:null});
  });
  app.get('/reviews/:id',async c=>c.json(await reviewView(c.env.DB,await accessibleAttempt(c.env.DB,c.req.param('id'),c.get('auth').user.id))));
  app.post('/reviews/:id',async c=>{
    const body=await readJson(c.req.raw,reviewItemSchema);const actor=c.get('auth').user.id;const id=c.req.param('id');
    await applyReview(c.env.DB,id,actor,body);
    return c.json(await reviewView(c.env.DB,await accessibleAttempt(c.env.DB,id,actor)));
  });
  return app;
}
