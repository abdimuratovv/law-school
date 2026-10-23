import { env } from 'cloudflare:workers';
import { beforeEach,describe,expect,it } from 'vitest';
import { createApi } from '../app';
import { account,authEnv,resetAuthDatabase } from './auth-helpers';
import { backfillReports } from '../exams/backfill';
import type { PrivateQuestion,ServerAttempt } from '../../shared/contracts/exams';
import type { ProgressResponse,StudyPage } from '../../shared/contracts/learning';
const assignment='b2d0af4a-bf00-4f3a-bf51-7dc059127ab6';
const api=createApi();type User=Awaited<ReturnType<typeof account>>;
const req=(u:User,path:string,body?:unknown)=>api.request('/api/v1'+path,{method:body===undefined?'GET':'POST',headers:u.headers,...(body===undefined?{}:{body:JSON.stringify(body)})},authEnv);
async function fixture(group=false){
 const u=await account(),teacher=await account('teacher');const q:PrivateQuestion={question:{id:'q',kind:'written',topic:'theory',stem:'Write synthetic word'},accepted:['example'],explanation:'RELEASED_PRIVATE_EXPLANATION'};
 await env.DB.prepare('INSERT INTO question_versions VALUES(?,?,?)').bind('q',JSON.stringify(q),Date.now()).run();
 await env.DB.prepare('INSERT INTO test_versions VALUES(?,?,?,?,?,?,?)').bind('t','Synthetic report test',group?'mock':'practice',group?3600:null,'["q"]',group?0:1,Date.now()).run();
 if(group){await env.DB.prepare('INSERT INTO groups VALUES(?,?,?,?)').bind('g','Synthetic class',teacher.id,Date.now()).run();await env.DB.prepare('INSERT INTO group_teachers VALUES(?,?,?)').bind('g',teacher.id,Date.now()).run();await env.DB.prepare('INSERT INTO group_memberships VALUES(?,?,?,?)').bind('g',u.id,teacher.id,Date.now()).run();await env.DB.prepare('INSERT INTO assignments VALUES(?,?,?,?,?)').bind(assignment,'t','g',Date.now()-60000,Date.now()+3600000).run();}
 const a=await (await req(u,'/exams/'+(group?'a_'+assignment:'p_t')+'/start',{operationId:crypto.randomUUID()})).json() as ServerAttempt;return {u,teacher,a};
}
async function finish(u:User,a:ServerAttempt,answer='wrong'){const r=await req(u,'/attempts/'+a.id+'/submit',{revision:a.revision,operationId:crypto.randomUUID(),answers:{q:answer},flags:[]});expect(r.status).toBe(200);return await r.json() as ServerAttempt;}
const progress=async(u:User,path='')=>await (await req(u,'/progress'+path)).json() as ProgressResponse;
beforeEach(async()=>{await resetAuthDatabase();await env.DB.prepare("UPDATE report_backfill SET cursor='',done=0").run();});
describe('learning records and bounded reports',()=>{
 it('creates no report on autosave and creates exactly one on finalization/retry',async()=>{
  const {u,a}=await fixture();const b={revision:a.revision,operationId:crypto.randomUUID(),answers:{q:'wrong'},flags:[]};const saved=await (await req(u,'/attempts/'+a.id+'/save',b)).json() as ServerAttempt;
  expect(await env.DB.prepare('SELECT count(*) n FROM attempt_reports').first('n')).toBe(0);await finish(u,saved);await req(u,'/attempts/'+a.id);
  expect(await env.DB.prepare('SELECT count(*) n FROM attempt_reports').first('n')).toBe(1);expect((await progress(u)).summary).toMatchObject({completed:1,averagePercent:0});
 });
 it('keeps progress, mistakes and saved questions isolated by account',async()=>{
  const {u,a}=await fixture();await finish(u,a);const other=await account();expect((await progress(other)).items).toEqual([]);
  expect((await req(other,'/saved-questions',{attemptId:a.id,questionId:'q',saved:true})).status).toBe(404);
  const mistakes=await (await req(u,'/mistakes')).json() as StudyPage;expect(mistakes.items).toHaveLength(1);expect(mistakes.items[0]?.feedback.explanation).toBe('RELEASED_PRIVATE_EXPLANATION');
  expect((await (await req(other,'/mistakes')).json() as StudyPage).items).toEqual([]);
 });
 it('allows bookmarks for checked public practice feedback without prematurely creating a finished report',async()=>{
  const {u,a}=await fixture();const response=await req(u,'/attempts/'+a.id+'/check',{revision:a.revision,operationId:crypto.randomUUID(),answers:{q:'example'},flags:[],questionId:'q'});expect(response.status).toBe(200);
  expect((await req(u,'/saved-questions',{attemptId:a.id,questionId:'q',saved:true})).status).toBe(200);
  expect((await (await req(u,'/saved-questions')).json() as StudyPage).items).toHaveLength(1);expect((await progress(u)).summary.completed).toBe(0);
 });
 it('blocks bookmarks before release, saves idempotently after release and removes only owned records',async()=>{
  const {u,a}=await fixture();const body={attemptId:a.id,questionId:'q',saved:true};expect((await req(u,'/saved-questions',body)).status).toBe(404);
  await finish(u,a);expect((await Promise.all([req(u,'/saved-questions',body),req(u,'/saved-questions',body)])).map(r=>r.status)).toEqual([200,200]);
  expect((await (await req(u,'/saved-questions')).json() as StudyPage).items).toHaveLength(1);
  await req(await account(),'/saved-questions',{...body,saved:false});expect(await env.DB.prepare('SELECT count(*) n FROM saved_questions').first('n')).toBe(1);
  await req(u,'/saved-questions',{...body,saved:false});expect(await env.DB.prepare('SELECT count(*) n FROM saved_questions').first('n')).toBe(0);
 });
 it('does not expose pending or pre-close question outcomes through learning endpoints',async()=>{
  const {u,a,teacher}=await fixture(true);await finish(u,a,'exampel');let p=await progress(u);expect(p.summary).toMatchObject({completed:1,provisional:1,averagePercent:null,topics:{}});
  expect((await (await req(u,'/mistakes')).json() as StudyPage).items).toEqual([]);
  const review={operationId:crypto.randomUUID(),revision:0,questionId:'q',units:1,comment:'Partial rubric'};expect((await req(teacher,'/staff/reviews/'+a.id,review)).status).toBe(200);
  p=await progress(u);expect(p.summary).toMatchObject({averagePercent:50,topics:{}});expect((await req(u,'/saved-questions',{attemptId:a.id,questionId:'q',saved:true})).status).toBe(404);
  await env.DB.prepare('DROP TRIGGER assignments_immutable').run();
  try{await env.DB.prepare('UPDATE assignments SET closes_at=?').bind(Date.now()-1000).run();}finally{await env.DB.prepare("CREATE TRIGGER assignments_immutable BEFORE UPDATE ON assignments BEGIN SELECT RAISE(ABORT, 'immutable assignment'); END").run();}
  expect((await progress(u)).summary.topics.theory?.partial).toBe(1);
  expect((await (await req(u,'/mistakes')).json() as StudyPage).items[0]?.feedback.reviewComment).toBe('Partial rubric');
 });
 it('updates reports atomically with grade corrections, preserves review idempotency and staff scopes',async()=>{
  const {u,a,teacher}=await fixture(true);await finish(u,a,'exampel');const review={operationId:crypto.randomUUID(),revision:0,questionId:'q',units:1,comment:'Rubric'};
  await req(teacher,'/staff/reviews/'+a.id,review);await req(teacher,'/staff/reviews/'+a.id,review);
  expect(await env.DB.prepare('SELECT grade_revision FROM attempt_reports WHERE attempt_id=?').bind(a.id).first('grade_revision')).toBe(1);
  const analytics=await (await req(teacher,'/staff/analytics?assignmentId='+assignment)).json() as {summary:{averagePercent:number}};expect(analytics.summary.averagePercent).toBe(50);
  expect((await req(await account('teacher'),'/staff/analytics?assignmentId='+assignment)).status).toBe(404);
  expect((await req(teacher,'/staff/analytics?assignmentId='+assignment+'&from='+String(Date.now()+1000))).status).toBe(200);
  expect((await req(teacher,'/staff/analytics?assignmentId=invalid')).status).toBe(422);
  expect((await req(u,'/staff/analytics')).status).toBe(403);
  await req(teacher,'/staff/reviews/'+a.id,{...review,operationId:crypto.randomUUID(),revision:1,units:2});
  expect((await progress(u)).summary.averagePercent).toBe(100);
  expect(await env.DB.prepare("SELECT count(*) n FROM audit_events WHERE action='attempt.review'").first('n')).toBe(2);
 });
 it('applies validated time/mode/topic filters inside the bounded report window',async()=>{
  const {u,a}=await fixture();await finish(u,a,'example');expect((await progress(u,'?mode=mock')).items).toEqual([]);expect((await progress(u,'?topic=civil')).items).toEqual([]);
  expect((await progress(u,'?from='+String(Date.now()+1000))).items).toEqual([]);expect((await progress(u,'?topic=theory')).items).toHaveLength(1);
  for(const q of ['?from=bad','?from=10&until=1','?mode=bad','?topic=bad'])expect((await req(u,'/progress'+q)).status).toBe(422);
 });
 it('backfills older attempts in bounded chunks without changing attempts or rewriting completed reports',async()=>{
  const {u,a}=await fixture();await finish(u,a,'example');await env.DB.prepare('DELETE FROM attempt_reports').run();const before=await env.DB.prepare('SELECT * FROM attempts WHERE id=?').bind(a.id).first();
  await backfillReports(env.DB);expect((await progress(u)).summary.averagePercent).toBe(100);expect(await env.DB.prepare('SELECT * FROM attempts WHERE id=?').bind(a.id).first()).toEqual(before);
  const first=await env.DB.prepare('SELECT * FROM attempt_reports').first();await backfillReports(env.DB);expect(await env.DB.prepare('SELECT * FROM attempt_reports').first()).toEqual(first);
 });
 it('limits own progress and mistake scans to the latest 100 finished reports before filtering',async()=>{
  const {u,a}=await fixture();await finish(u,a);const ids=Array.from({length:105},()=>crypto.randomUUID());
  await env.DB.prepare(`INSERT INTO attempts(id,user_id,exam_id,test_version_id,start_operation,started_at,state,question_order,saved_at,submitted_at,result)
    SELECT value,?,'p_t','t',value,?,'final','[{"id":"q"}]',?,?,? FROM json_each(?)`).bind(u.id,Date.now(),Date.now(),Date.now(),JSON.stringify({units:0,maxUnits:2,pending:0,final:true,algorithm:'nfc-distance2-v1'}),JSON.stringify(ids)).run();
  await env.DB.prepare(`INSERT INTO attempt_reports SELECT id,user_id,NULL,submitted_at,0,0,2,0,'[{"id":"q","topic":"theory","units":0,"verdict":"incorrect"}]','nfc-distance2-v1' FROM attempts WHERE id IN(SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)).run();
  const p=await progress(u);expect(p.items).toHaveLength(100);expect(p.summary.completed).toBe(100);
  const page=await (await req(u,'/mistakes?limit=100')).json() as StudyPage;expect(page.items).toHaveLength(100);expect(page.next).toBeNull();
  expect((await req(u,'/mistakes?after=10001')).status).toBe(422);
 });
 it('bounds assignment analytics to 200 reports and excludes out-of-window matches',async()=>{
  const {u,a,teacher}=await fixture(true);await finish(u,a,'example');const ids=Array.from({length:205},()=>crypto.randomUUID());const now=Date.now();
  await env.DB.prepare(`INSERT INTO users(id,display_name,email,role,created_at,updated_at) SELECT value,'Synthetic',value||'@example.test','student',?,? FROM json_each(?)`).bind(now,now,JSON.stringify(ids)).run();
  await env.DB.prepare(`INSERT INTO attempts(id,user_id,exam_id,test_version_id,assignment_id,start_operation,started_at,state,question_order,saved_at,submitted_at,result)
    SELECT value,value,?,'t',?,value,?,'final','[{"id":"q"}]',?,?,? FROM json_each(?)`).bind('a_'+assignment,assignment,now,now,now,JSON.stringify({units:0,maxUnits:2,pending:0,final:true,algorithm:'nfc-distance2-v1'}),JSON.stringify(ids)).run();
  await env.DB.prepare(`INSERT INTO attempt_reports SELECT id,user_id,assignment_id,submitted_at,0,0,2,0,'[{"id":"q","topic":"civil","units":0,"verdict":"incorrect"}]','nfc-distance2-v1' FROM attempts WHERE id IN(SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)).run();
  const response=await (await req(teacher,'/staff/analytics?assignmentId='+assignment)).json() as {summary:{completed:number;averagePercent:number}};expect(response.summary.completed).toBe(200);expect(response.summary.averagePercent).toBe(0);
  expect(await (await req(teacher,'/staff/analytics?assignmentId='+assignment+'&topic=theory')).json()).toMatchObject({summary:{completed:0}});
 });
});
