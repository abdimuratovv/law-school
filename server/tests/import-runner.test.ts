import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApi } from '../app';
import { account, authEnv, resetAuthDatabase } from './auth-helpers';
import { uploadImport, type ImportTransport } from '../../src/lib/importRunner';
import { TeachingRequestError } from '../../src/lib/requestError';
import type { ImportJob, ImportRow } from '../../shared/contracts/imports';

beforeEach(resetAuthDatabase);
const api=createApi();
const rows:ImportRow[]=Array.from({length:45},(_,i)=>({rowNumber:i+2,content:{
  kind:i<35?'single':'written',topic:'theory',stem:'Synthetic import recovery question '+(i+1),
  options:[{id:'o1',text:'First'},{id:'o2',text:'Second'},{id:'o3',text:'Third'},{id:'o4',text:'Fourth'}],
  correctOptionId:i<35?'o2':null,accepted:i<35?[]:['example','alternative'],explanation:'',
}}));
const input={filename:'recovery.csv',bytes:23000,fileHash:'a'.repeat(64),rows,keep:false};
async function transport(){
  const user=await account('teacher');
  const request:ImportTransport=async<T>(path:string,body?:unknown)=>{
    const response=await api.request('https://school.test/api/v1'+path,{method:body===undefined?'GET':'POST',headers:user.headers,...(body===undefined?{}:{body:JSON.stringify(body)})},authEnv);
    if(!response.ok)throw new TeachingRequestError(response.status,response.headers.get('X-Request-Id'),0,[]);
    return await response.json() as T;
  };
  return request;
}
const options=(request:ImportTransport)=>({request,signal:new AbortController().signal,progress:()=>{},retry:()=>{},sleep:async()=>{}});

describe('resumable import client against D1',()=>{
  it('recovers 25/45 saved rows and lost upload/commit responses without duplicate drafts',async()=>{
    const request=await transport();
    const saved=await request<ImportJob>('/staff/imports',{operationId:crypto.randomUUID(),filename:input.filename,bytes:input.bytes,fileHash:input.fileHash,totalRows:45,duplicatePolicy:'skip'});
    await request('/staff/imports/'+saved.id+'/rows',{rows:rows.slice(0,25)});
    let uploadLost=false,commitLost=false,retries=0;
    const sent:number[][]=[];
    const flaky:ImportTransport=async<T>(path:string,body?:unknown)=>{
      if(path.endsWith('/rows')&&body)sent.push((body as {rows:ImportRow[]}).rows.map(row=>row.rowNumber));
      const value=await request<T>(path,body);
      if(path.endsWith('/rows')&&body&&!uploadLost){uploadLost=true;throw new TypeError('Response lost after storage');}
      if(path.endsWith('/commit')&&!commitLost){commitLost=true;throw new TeachingRequestError(503,null,0,[]);}
      return value;
    };
    const result=await uploadImport(input,{...options(flaky),retry:()=>{retries++;}});
    expect(result).toMatchObject({id:saved.id,status:'complete',uploadedRows:45,created:45,skipped:0});
    expect(retries).toBe(2);expect(sent.every(chunk=>chunk.length<=10&&chunk.every(n=>n>=27))).toBe(true);
    expect(await env.DB.prepare('SELECT count(*) n FROM import_jobs').first('n')).toBe(1);
    expect(await env.DB.prepare('SELECT count(*) n FROM question_drafts').first('n')).toBe(45);
    expect(await env.DB.prepare('SELECT count(*) n FROM question_versions').first('n')).toBe(0);
    expect(await env.DB.prepare("SELECT count(*) n FROM audit_events WHERE action='import.complete'").first('n')).toBe(1);
    expect((await uploadImport(input,options(request))).created).toBe(45);
    expect(await env.DB.prepare('SELECT count(*) n FROM question_drafts').first('n')).toBe(45);
  });
  it('uses a row manifest rather than assuming the saved rows form a prefix',async()=>{
    const request=await transport();
    const saved=await request<ImportJob>('/staff/imports',{operationId:crypto.randomUUID(),filename:input.filename,bytes:input.bytes,fileHash:input.fileHash,totalRows:45,duplicatePolicy:'skip'});
    await request('/staff/imports/'+saved.id+'/rows',{rows:[rows[0],rows[44]]});
    const sent:number[]=[];
    const spy:ImportTransport=async<T>(path:string,body?:unknown)=>{if(path.endsWith('/rows')&&body)sent.push(...(body as {rows:ImportRow[]}).rows.map(row=>row.rowNumber));return request<T>(path,body);};
    expect((await uploadImport(input,options(spy))).created).toBe(45);
    expect(sent).not.toContain(2);expect(sent).not.toContain(46);expect(sent).toHaveLength(43);
  });
  it('does not retry authorization or validation errors',async()=>{
    for(const status of [401,403,409,413,422]){
      let calls=0;const request:ImportTransport=async()=>{calls++;throw new TeachingRequestError(status,'fixture',0,['rows.0']);};
      await expect(uploadImport(input,options(request))).rejects.toMatchObject({status});expect(calls).toBe(1);
    }
  });
  it('retries a transient error a bounded number of times and preserves operation identity',async()=>{
    const bodies:unknown[]=[];
    const request:ImportTransport=async(_path,body)=>{bodies.push(body);throw new TeachingRequestError(503,null,0,[]);};
    await expect(uploadImport(input,options(request))).rejects.toMatchObject({status:503});
    expect(bodies).toHaveLength(3);expect(bodies[0]).toEqual(bodies[1]);expect(bodies[1]).toEqual(bodies[2]);
  });
  it('honors throttling retry delays and cancellation before another request',async()=>{
    const abort=new AbortController();let delay=0,calls=0;
    const request:ImportTransport=async()=>{calls++;throw new TeachingRequestError(429,null,60000,[]);};
    await expect(uploadImport(input,{...options(request),signal:abort.signal,sleep:async ms=>{delay=ms;abort.abort();}})).rejects.toBeDefined();
    expect(delay).toBe(60000);expect(calls).toBe(1);
  });
});
