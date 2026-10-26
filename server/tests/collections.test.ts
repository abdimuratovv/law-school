import { env } from 'cloudflare:workers';
import { beforeEach,describe,it,expect } from 'vitest';
import { createApi } from '../app';
import { account,authEnv,resetAuthDatabase } from './auth-helpers';
import type { ServerAttempt } from '../../shared/contracts/exams';

const api=createApi();type Account=Awaited<ReturnType<typeof account>>;
const request=(u:Account,path:string,body?:unknown)=>api.request('/api/v1'+path,{method:body===undefined?'GET':'POST',headers:u.headers,...(body===undefined?{}:{body:JSON.stringify(body)})},authEnv);
async function collection(owner:Account,scheduled=false,manual=false,enabled=true){
 const qid=crypto.randomUUID();
 await request(owner,'/staff/questions',{operationId:qid,content:{kind:manual?'written':'single',topic:'theory',stem:'Synthetic public collection question',options:[{id:'a',text:'Alpha'},{id:'b',text:'Beta'},{id:'c',text:'Gamma'},{id:'d',text:'Delta'}],correctOptionId:manual?null:'a',accepted:[],explanation:'Private synthetic explanation'}});
 const batch=await (await request(owner,'/staff/question-bank/publish',{items:[{id:qid,revision:0}]})).json() as {results:{versionId:string}[]};
 const version=batch.results[0]!.versionId,draftId=crypto.randomUUID();
 const opens=scheduled?Date.now()-120000:null,closes=scheduled?Date.now()+3600000:null;
 const draft=await request(owner,'/staff/tests',{operationId:draftId,content:{name:'Synthetic public test',mode:'mock',durationSeconds:null,isPublic:false,questionDraftIds:[qid],questionVersionIds:[version],opensAt:opens,closesAt:closes}});expect(draft.status).toBe(201);
 const result=await request(owner,'/staff/collections',{draftId,revision:0});expect(result.status).toBe(201);
 const data=await result.json() as {id:string;examId:string};if(enabled)await env.DB.prepare('UPDATE test_collections SET start_enabled=1 WHERE id=?').bind(data.id).run();return {...data,draftId,qid,version,closes};
}
const start=async(u:Account,id:string)=>{const r=await request(u,`/exams/${id}/start`,{operationId:crypto.randomUUID()});expect(r.status).toBe(200);return await r.json() as ServerAttempt;};
beforeEach(resetAuthDatabase);

describe('admin admission controls',()=>{
 it('publishes paused, rejects direct starts in either language, and requires admin + CSRF + current revision',async()=>{
  const owner=await account('teacher'),admin=await account('admin'),student=await account();
  const c=await collection(owner,false,false,false),path=`/staff/collections/${c.id}/availability`;
  const summary=await (await request(student,'/exams/'+c.examId)).json() as {startEnabled:boolean};expect(summary.startEnabled).toBe(false);
  for(const language of ['uz','kaa'])expect((await request(student,`/exams/${c.examId}/start`,{operationId:crypto.randomUUID(),language})).status).toBe(403);
  expect((await request(owner,path,{enabled:true,revision:0})).status).toBe(403);
  expect((await request(student,path,{enabled:true,revision:0})).status).toBe(403);
  expect((await api.request('/api/v1'+path,{method:'POST',headers:{Cookie:admin.headers.Cookie,'Content-Type':'application/json'},body:JSON.stringify({enabled:true,revision:0})},authEnv)).status).toBe(403);
  expect((await request(admin,path,{enabled:true,revision:0})).status).toBe(200);
  expect((await request(admin,path,{enabled:false,revision:0})).status).toBe(409);
  expect(await env.DB.prepare('SELECT start_enabled FROM test_collections WHERE id=?').bind(c.id).first('start_enabled')).toBe(1);
  expect(await env.DB.prepare("SELECT count(*) n FROM audit_events WHERE action='collection.availability' AND target_id=?").bind(c.id).first('n')).toBe(1);
  await env.DB.prepare('UPDATE test_collections SET retired=1 WHERE id=?').bind(c.id).run();
  expect((await request(admin,path,{enabled:false,revision:1})).status).toBe(409);
 });
 it('blocks new admissions while preserving resume, saved answers, submission, deadline and the single-attempt rule',async()=>{
  const admin=await account('admin'),student=await account(),fresh=await account();const c=await collection(admin,true);
  const a=await start(student,c.examId),path=`/staff/collections/${c.id}/availability`;
  expect((await request(admin,path,{enabled:false,revision:0})).status).toBe(200);
  expect((await request(fresh,`/exams/${c.examId}/start`,{operationId:crypto.randomUUID()})).status).toBe(403);
  const resumed=await start(student,c.examId);expect(resumed.id).toBe(a.id);expect(resumed.endsAt).toBe(c.closes);
  const saved=await request(student,`/attempts/${a.id}/save`,{revision:0,operationId:crypto.randomUUID(),answers:{[c.version]:'a'},flags:[]});expect(saved.status).toBe(200);
  const body=await saved.json() as ServerAttempt;
  const submitted=await request(student,`/attempts/${a.id}/submit`,{revision:body.revision,operationId:crypto.randomUUID(),answers:{[c.version]:'a'},flags:[]});expect(submitted.status).toBe(200);
  expect((await submitted.json() as ServerAttempt).result?.units).toBe(2);
  expect((await request(admin,path,{enabled:true,revision:1})).status).toBe(200);
  expect((await start(student,c.examId)).id).toBe(a.id);expect((await start(fresh,c.examId)).endsAt).toBe(c.closes);
 });
 it('cannot bypass future opening or expired closing times by enabling admission',async()=>{
  const admin=await account('admin'),student=await account(),c=await collection(admin,true,false,false);
  expect((await request(admin,`/staff/collections/${c.id}/availability`,{enabled:true,revision:0})).status).toBe(200);
  await env.DB.prepare('UPDATE test_collections SET opens_at=?,closes_at=? WHERE id=?').bind(Date.now()+60000,Date.now()+120000,c.id).run();
  expect((await request(student,`/exams/${c.examId}/start`,{operationId:crypto.randomUUID()})).status).toBe(404);
  await env.DB.prepare('UPDATE test_collections SET opens_at=?,closes_at=? WHERE id=?').bind(Date.now()-120000,Date.now()-60000,c.id).run();
  expect((await request(student,`/exams/${c.examId}/start`,{operationId:crypto.randomUUID()})).status).toBe(404);
  expect(await env.DB.prepare('SELECT count(*) n FROM attempts WHERE collection_id=?').bind(c.id).first('n')).toBe(0);
 });
});
describe('public test collections',()=>{
 it('is visible to every registered user without groups and reports results to its owner',async()=>{
  const teacher=await account('teacher'),student=await account(),newStudent=await account(),other=await account('teacher'),admin=await account('admin');
  const c=await collection(teacher);
  for(const u of [student,newStudent]){const list=await (await request(u,'/exams')).json() as {items:{id:string}[]};expect(list.items.map(r=>r.id)).toEqual([c.examId]);}
  expect(await env.DB.prepare('SELECT count(*) FROM group_memberships').first('count(*)')).toBe(0);
  const a=await start(student,c.examId);expect(a.endsAt).toBeNull();expect(JSON.stringify(a)).not.toContain('Private synthetic explanation');
  const submitted=await request(student,`/attempts/${a.id}/submit`,{revision:a.revision,operationId:crypto.randomUUID(),answers:{[c.version]:'a'},flags:[]});
  const final=await submitted.json() as ServerAttempt;expect(final.result?.units).toBe(2);expect(final.answerCounts?.correct).toBe(1);expect(final.feedback[c.version]?.correctOptionId).toBe('a');
  const results=await (await request(teacher,`/staff/collections/${c.id}/results`)).json() as {items:{id:string;result:{units:number}}[];summary:{participants:number}};
  expect(results.items[0]!.result.units).toBe(2);expect(results.summary.participants).toBe(1);
  expect((await request(other,`/staff/collections/${c.id}/results`)).status).toBe(404);
  expect((await request(admin,`/staff/collections/${c.id}/results`)).status).toBe(200);
  expect((await request(student,'/staff/collections')).status).toBe(403);
  const second=await start(student,c.examId);expect(second.id).toBe(a.id);expect(second.state).toBe('final');
 });
 it('shares a scheduled deadline, prevents schedule bypass and preserves old results on admin reopen',async()=>{
  const admin=await account('admin'),student=await account(),teacher=await account('teacher');const c=await collection(admin,true);
  const attempts=await Promise.all(Array.from({length:5},()=>start(student,c.examId)));expect(new Set(attempts.map(a=>a.id)).size).toBe(1);expect(attempts[0]!.endsAt).toBe(c.closes);
  const a=attempts[0]!;
  const final=await (await request(student,`/attempts/${a.id}/submit`,{revision:0,operationId:crypto.randomUUID(),answers:{[c.version]:'a'},flags:[]})).json() as ServerAttempt;
  expect(final.result?.final).toBe(true);expect(final.feedback).toEqual({});expect((await start(student,c.examId)).id).toBe(a.id);
  const version=await env.DB.prepare('SELECT test_version_id FROM test_collections WHERE id=?').bind(c.id).first<string>('test_version_id');
  expect((await request(student,`/exams/p_${version}/start`,{operationId:crypto.randomUUID()})).status).toBe(404);
  await env.DB.prepare('UPDATE test_collections SET closes_at=? WHERE id=?').bind(Date.now()-10000,c.id).run();
  const fresh=await account();expect((await request(fresh,`/exams/${c.examId}/start`,{operationId:crypto.randomUUID()})).status).toBe(404);
  const time=(n:number)=>new Date(n+5*3600000).toISOString().slice(0,16)+':00+05:00';
  const body={operationId:crypto.randomUUID(),timeZone:'Asia/Tashkent',opensAt:time(Date.now()-60000),closesAt:time(Date.now()+7200000)};
  expect((await request(teacher,`/staff/collections/${c.id}/reopen`,body)).status).toBe(403);
  expect((await request(admin,`/staff/collections/${c.id}/reopen`,body)).status).toBe(201);
  expect((await request(admin,`/staff/collections/${c.id}/reopen`,body)).status).toBe(201);
  expect(await env.DB.prepare('SELECT start_enabled FROM test_collections WHERE id=?').bind(body.operationId).first('start_enabled')).toBe(0);
  expect((await request(admin,'/staff/collections/'+body.operationId+'/availability',{enabled:true,revision:0})).status).toBe(200);
  const next=await start(student,'c_'+body.operationId);expect(next.id).not.toBe(a.id);expect(next.endsAt).toBe(Date.parse(body.closesAt));
  const old=await (await request(student,'/attempts/'+a.id)).json() as ServerAttempt;expect(old.result).toEqual(final.result);
 });
 it('shows provisional written results, author review updates totals, and users are listed automatically',async()=>{
  const owner=await account('teacher'),admin=await account('admin'),student=await account();const c=await collection(owner,false,true),a=await start(student,c.examId);
  const final=await (await request(student,`/attempts/${a.id}/submit`,{revision:0,operationId:crypto.randomUUID(),answers:{[c.version]:'Synthetic answer'},flags:[]})).json() as ServerAttempt;
  expect(final.result?.pending).toBe(1);expect(final.answerCounts?.pending).toBe(1);
  const review=await request(owner,`/staff/reviews/${a.id}`,{revision:0,operationId:crypto.randomUUID(),questionId:c.version,units:2,comment:'Synthetic feedback'});expect(review.status).toBe(200);
  const updated=await (await request(student,'/attempts/'+a.id)).json() as ServerAttempt;expect(updated.result?.units).toBe(2);expect(updated.answerCounts?.correct).toBe(1);
  const users=await (await request(admin,'/staff/users')).json() as {items:{id:string}[]};expect(users.items.map(u=>u.id)).toContain(student.id);expect((await request(owner,'/staff/users')).status).toBe(403);
 });
 it('publishes idempotently and enforces ownership, CSRF and valid schedules',async()=>{
  const owner=await account('teacher'),other=await account('teacher'),c=await collection(owner);
  const again=await (await request(owner,'/staff/collections',{draftId:c.draftId,revision:0})).json() as {id:string};expect(again.id).toBe(c.id);
  expect(await env.DB.prepare('SELECT count(*) FROM test_collections').first('count(*)')).toBe(1);
  expect((await request(other,'/staff/collections',{draftId:c.draftId,revision:0})).status).toBe(404);
  expect((await api.request('/api/v1/staff/collections',{method:'POST',headers:{Cookie:owner.headers.Cookie,'Content-Type':'application/json'},body:JSON.stringify({draftId:c.draftId,revision:0})},authEnv)).status).toBe(403);
  expect((await request(owner,'/staff/collections',{draftId:c.draftId,revision:99})).status).toBe(409);
  const bad=crypto.randomUUID();await request(owner,'/staff/tests',{operationId:bad,content:{name:'Invalid schedule',mode:'mock',durationSeconds:null,isPublic:false,questionVersionIds:[c.version],opensAt:Date.now()-20000,closesAt:Date.now()-10000}});
  expect((await request(owner,'/staff/collections',{draftId:bad,revision:0})).status).toBe(422);
 });
 it('paginates same-time results and directory users without dropping records',async()=>{
  const admin=await account('admin'),student=await account(),c=await collection(admin);const ids:string[]=[];
  for(let i=0;i<3;i++){const learner=i===0?student:await account();const a=await start(learner,c.examId);ids.push(a.id);await request(learner,`/attempts/${a.id}/submit`,{revision:0,operationId:crypto.randomUUID(),answers:{[c.version]:'a'},flags:[]});}
  await env.DB.prepare('UPDATE attempts SET started_at=1000').run();
  const found:string[]=[];let after:string|null='';
  do{const page=await (await request(admin,`/staff/collections/${c.id}/results?limit=1&after=${after}`)).json() as {items:{id:string}[];next:string|null};found.push(...page.items.map(r=>r.id));after=page.next;}while(after);
  expect(found.sort()).toEqual(ids.sort());
  const first=await (await request(admin,'/staff/users?limit=1')).json() as {items:{id:string}[];next:string};
  const second=await (await request(admin,'/staff/users?limit=1&after='+first.next)).json() as typeof first;
  expect(new Set([...first.items,...second.items].map(r=>r.id)).size).toBe(2);
  expect((await request(admin,'/staff/collections/results?after=invalid')).status).toBe(422);
 });
});

describe('bilingual authoring',()=>{
 it('publishes a single catalog entry with independent variants and preserves old attempts',async()=>{
  const owner=await account('teacher'),student=await account();const first=await collection(owner);
  const kaaId=crypto.randomUUID();
  await request(owner,'/staff/questions',{operationId:kaaId,content:{kind:'written',topic:'theory',stem:'Qaraqalpaqsha synthetic',options:[{id:'a',text:''},{id:'b',text:''},{id:'c',text:''},{id:'d',text:''}],correctOptionId:null,accepted:['sálem'],explanation:''}});
  await env.DB.prepare("UPDATE question_drafts SET language='kaa' WHERE id=?").bind(kaaId).run();
  const published=await (await request(owner,'/staff/question-bank/publish',{items:[{id:kaaId,revision:0}]})).json() as {results:{versionId:string}[]};
  const kaa=published.results[0]!.versionId;
  const content={name:'Two languages',mode:'mock',durationSeconds:null,isPublic:false,questionVersionIds:[first.version],questionDraftIds:[first.qid],translations:{kaa:{questionVersionIds:[kaa],questionDraftIds:[kaaId]}}};
  const update=await api.request('/api/v1/staff/tests/'+first.draftId,{method:'PATCH',headers:owner.headers,body:JSON.stringify({revision:0,content})},authEnv);expect(update.status).toBe(200);
  const old=await start(student,first.examId);
  const response=await request(owner,'/staff/collections',{draftId:first.draftId,revision:1});expect(response.status).toBe(201);const next=await response.json() as {id:string;examId:string};
  expect((await (await request(owner,'/staff/collections',{draftId:first.draftId,revision:1})).json() as {id:string}).id).toBe(next.id);
  expect(await env.DB.prepare('SELECT count(*) n FROM test_collections WHERE retired=0').first('n')).toBe(1);
  const variants=await env.DB.prepare('SELECT l.language,json_array_length(t.question_ids) n FROM collection_languages l JOIN test_versions t ON t.id=l.test_version_id WHERE l.collection_id=? ORDER BY l.language').bind(next.id).all();expect(variants.results).toEqual([{language:'kaa',n:1},{language:'uz',n:1}]);
  expect(await env.DB.prepare('SELECT start_enabled FROM test_collections WHERE id=?').bind(next.id).first('start_enabled')).toBe(0);
  await env.DB.prepare('UPDATE test_collections SET start_enabled=1 WHERE id=?').bind(next.id).run();
  const fresh=await account();const attempt=await (await request(fresh,'/exams/'+next.examId+'/start',{operationId:crypto.randomUUID(),language:'kaa'})).json() as ServerAttempt;
  expect(attempt.language).toBe('kaa');expect(attempt.questions[0]?.stem).toBe('Qaraqalpaqsha synthetic');expect(attempt.questions).toHaveLength(1);
  expect((await request(student,'/attempts/'+old.id)).status).toBe(200);
 });
 it('rejects a mixed primary list before replacing an existing collection',async()=>{
  const owner=await account('teacher'),first=await collection(owner);
  await env.DB.prepare("UPDATE question_drafts SET language='kaa' WHERE id=?").bind(first.qid).run();
  expect((await request(owner,'/staff/collections',{draftId:first.draftId,revision:0})).status).toBe(422);
  expect(await env.DB.prepare('SELECT retired FROM test_collections WHERE id=?').bind(first.id).first('retired')).toBe(0);
 });
 it('rejects a translation referencing Uzbek questions',async()=>{
  const owner=await account('teacher'),first=await collection(owner);const id=crypto.randomUUID();
  await request(owner,'/staff/tests',{operationId:id,content:{name:'Invalid pair',mode:'mock',durationSeconds:null,isPublic:false,questionVersionIds:[first.version],translations:{kaa:{questionVersionIds:[first.version],questionDraftIds:[first.qid]}}}});
  expect((await request(owner,'/staff/collections',{draftId:id,revision:0})).status).toBe(422);
  expect(await env.DB.prepare('SELECT count(*) n FROM test_collections WHERE retired=0').first('n')).toBe(1);
 });
});
