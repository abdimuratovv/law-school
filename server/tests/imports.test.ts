import { env } from 'cloudflare:workers';
import { beforeEach,describe,expect,it } from 'vitest';
import { createApi } from '../app';
import { account,authEnv,resetAuthDatabase } from './auth-helpers';
import type { ImportJob } from '../../shared/contracts/imports';
import type { QuestionDraftContent } from '../../shared/contracts/teaching';
const api=createApi();type User=Awaited<ReturnType<typeof account>>;
const req=(u:User,path:string,body?:unknown)=>api.request('/api/v1/staff/imports'+path,{method:body===undefined?'GET':'POST',headers:u.headers,...(body===undefined?{}:{body:JSON.stringify(body)})},authEnv);
const content:QuestionDraftContent={kind:'written',topic:'theory',stem:'Synthetic imported question',options:[{id:'o1',text:''},{id:'o2',text:''},{id:'o3',text:''},{id:'o4',text:''}],correctOptionId:null,accepted:['example'],explanation:'Private import explanation'};
const input=(totalRows=2,duplicatePolicy='skip')=>({operationId:crypto.randomUUID(),filename:'fixture.csv',bytes:100,totalRows,fileHash:'a'.repeat(64),duplicatePolicy});
async function job(u:User,totalRows=2,policy='skip'){const r=await req(u,'',input(totalRows,policy));expect(r.status).toBe(201);return await r.json() as ImportJob;}
const upload=(u:User,j:ImportJob,rows=[{rowNumber:2,content},{rowNumber:3,content}])=>req(u,'/'+j.id+'/rows',{rows});
beforeEach(resetAuthDatabase);
describe('bounded draft imports',()=>{
 it('requires staff and CSRF, and hides other owners even from admins',async()=>{
  const teacher=await account('teacher'),student=await account(),admin=await account('admin');const j=await job(teacher);
  expect((await req(student,'')).status).toBe(403);expect((await req(admin,'/'+j.id)).status).toBe(404);
  expect((await api.request('/api/v1/staff/imports',{method:'POST',headers:{Cookie:teacher.headers.Cookie,'Content-Type':'application/json'},body:JSON.stringify(input())},authEnv)).status).toBe(403);
 });
 it('enforces source type/byte/row bounds before creating a job',async()=>{
  const u=await account('teacher');for(const change of [{filename:'old.xls'},{bytes:5242881},{totalRows:1001},{totalRows:0}])expect((await req(u,'',{...input(),...change})).status).toBe(422);
  expect(await env.DB.prepare('SELECT count(*) FROM import_jobs').first('count(*)')).toBe(0);
 });
 it('resumes the same file under new operation ids and rejects changed metadata',async()=>{
  const u=await account('teacher');const b=input();const first=await (await req(u,'',b)).json() as ImportJob;
  expect((await (await req(u,'',{...b,operationId:crypto.randomUUID()})).json() as ImportJob).id).toBe(first.id);
  expect((await req(u,'',{...b,totalRows:3})).status).toBe(409);
 });
 it('validates canonical rows server-side and stages nothing on invalid chunks',async()=>{
  const u=await account('teacher');const j=await job(u);
  expect((await upload(u,j,[{rowNumber:2,content},{rowNumber:3,content:{...content,stem:''}}])).status).toBe(422);
  expect((await upload(u,j,[{rowNumber:4,content}])).status).toBe(422);
  expect(await env.DB.prepare('SELECT count(*) n FROM import_rows').first('n')).toBe(0);
 });
 it('accepts retry/concurrent uploads once and rejects a conflicting whole chunk',async()=>{
  const u=await account('teacher');const j=await job(u,3);
  expect((await upload(u,j,[{rowNumber:2,content}])).status).toBe(200);
  expect((await upload(u,j,[{rowNumber:2,content:{...content,stem:'conflict'}},{rowNumber:3,content}])).status).toBe(409);
  expect(await env.DB.prepare('SELECT count(*) n FROM import_rows').first('n')).toBe(1);
  expect((await Promise.all([upload(u,j,[{rowNumber:3,content},{rowNumber:4,content}]),upload(u,j,[{rowNumber:3,content},{rowNumber:4,content}])])).map(r=>r.status)).toEqual([200,200]);
  expect((await (await req(u,'/'+j.id)).json() as ImportJob).uploadedRows).toBe(3);
 });
 it('does not create drafts until explicitly sealed and committed',async()=>{
  const u=await account('teacher');const j=await job(u);await upload(u,j);
  expect((await req(u,'/'+j.id+'/commit',{cursor:1})).status).toBe(409);
  expect(await env.DB.prepare('SELECT count(*) n FROM question_drafts').first('n')).toBe(0);
  expect((await req(u,'/'+j.id+'/validate',{cursor:1})).status).toBe(200);
  expect(await env.DB.prepare('SELECT count(*) n FROM question_drafts').first('n')).toBe(0);
 });
 it('cannot seal an incomplete upload',async()=>{const u=await account('teacher');const j=await job(u);await upload(u,j,[{rowNumber:2,content}]);expect((await req(u,'/'+j.id+'/validate',{cursor:1})).status).toBe(409);});
 it('returns only saved row numbers for the owner, including noncontiguous uploads',async()=>{
  const u=await account('teacher'),other=await account('admin');const j=await job(u,5);
  await upload(u,j,[{rowNumber:2,content},{rowNumber:6,content}]);
  expect(await (await req(u,'/'+j.id+'/rows')).json()).toEqual({rowNumbers:[2,6]});
  expect((await req(other,'/'+j.id+'/rows')).status).toBe(404);
  expect(await (await req(u,'/'+j.id)).json()).toMatchObject({fileHash:'a'.repeat(64)});
 });
 it('deduplicates canonical rows, commits concurrently once and never publishes',async()=>{
  const u=await account('teacher');const j=await job(u);await upload(u,j,[{rowNumber:2,content},{rowNumber:3,content:{...content,stem:'  '+content.stem+'  '}}]);await req(u,'/'+j.id+'/validate',{cursor:1});
  const results=await Promise.all([req(u,'/'+j.id+'/commit',{cursor:1}),req(u,'/'+j.id+'/commit',{cursor:1})]);expect(results.map(r=>r.status)).toEqual([200,200]);
  const current=await (await req(u,'/'+j.id)).json() as ImportJob;expect(current).toMatchObject({status:'complete',created:1,skipped:1});
  expect(await env.DB.prepare('SELECT count(*) n FROM question_drafts').first('n')).toBe(1);expect(await env.DB.prepare('SELECT count(*) n FROM question_versions').first('n')).toBe(0);
  expect(await env.DB.prepare("SELECT count(*) n FROM audit_events WHERE action='import.complete'").first('n')).toBe(1);
 });
 it('allows explicit duplicate retention and rejects edits after validation',async()=>{
  const u=await account('teacher');const j=await job(u,2,'keep');await upload(u,j);await req(u,'/'+j.id+'/validate',{cursor:1});
  expect((await upload(u,j,[{rowNumber:2,content:{...content,stem:'changed'}}])).status).toBe(409);expect((await upload(u,j)).status).toBe(200);
  const r=await req(u,'/'+j.id+'/commit',{cursor:1});expect(await r.json()).toMatchObject({created:2,skipped:0});
 });
 it('recovers bounded 25-row commit chunks from stored cursor',async()=>{
  const u=await account('teacher');const j=await job(u,27,'keep');for(let start=2;start<29;start+=25)await upload(u,j,Array.from({length:Math.min(25,29-start)},(_,i)=>({rowNumber:start+i,content})));
  await req(u,'/'+j.id+'/validate',{cursor:1});const first=await (await req(u,'/'+j.id+'/commit',{cursor:1})).json() as ImportJob;expect(first).toMatchObject({cursor:26,created:25,status:'committing'});
  expect(await (await req(u,'/'+j.id+'/commit',{cursor:1})).json()).toMatchObject({created:25});
  expect(await (await req(u,'/'+j.id+'/commit',{cursor:26})).json()).toMatchObject({created:27,status:'complete'});
 });
 it('enforces the cumulative canonical byte limit independently of compressed source size',async()=>{
  const u=await account('teacher');const j=await job(u,140);const large={...content,stem:'s'.repeat(20000),explanation:'e'.repeat(20000)};
  for(let start=2;start<130;start+=4)expect((await upload(u,j,Array.from({length:4},(_,i)=>({rowNumber:start+i,content:large})))).status).toBe(200);
  expect((await upload(u,j,Array.from({length:4},(_,i)=>({rowNumber:130+i,content:large})))).status).toBe(413);
  expect((await (await req(u,'/'+j.id)).json() as ImportJob).uploadedRows).toBe(128);
  expect(await env.DB.prepare('SELECT count(*) n FROM question_drafts').first('n')).toBe(0);
 });
});
