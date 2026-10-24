import type { ImportJob, ImportRow } from '../../shared/contracts/imports';
import { TeachingRequestError } from './requestError';

export type ImportTransport = <T>(path:string,body?:unknown)=>Promise<T>;
export type ImportPhase = 'uploading'|'validating'|'committing'|'complete';
type Options = {
  request:ImportTransport; signal:AbortSignal;
  progress:(job:ImportJob,phase:ImportPhase)=>void;
  retry:(attempt:number,delayMs:number)=>void;
  sleep?:(ms:number,signal:AbortSignal)=>Promise<void>;
};
const pause = (ms:number,signal:AbortSignal) => new Promise<void>((resolve,reject)=>{
  signal.throwIfAborted();
  const abort=()=>{clearTimeout(timer);reject(signal.reason);};
  const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);
  signal.addEventListener('abort',abort,{once:true});
});
const transient = (error:unknown) => error instanceof TeachingRequestError
  ? [408,429,500,502,503,504].includes(error.status)
  : error instanceof TypeError || error instanceof Error && ['TimeoutError','NetworkError'].includes(error.name);

/** Every retried mutation is idempotent on the server; keep its original body. */
async function retry<T>(options:Options,operation:()=>Promise<T>):Promise<T> {
  for(let attempt=0;;attempt++){
    options.signal.throwIfAborted();
    try { return await operation(); }
    catch(error){
      options.signal.throwIfAborted();
      if(attempt>=2||!transient(error))throw error;
      const wait=Math.max(1000*2**attempt,error instanceof TeachingRequestError?error.retryAfterMs:0);
      options.retry(attempt+1,wait);
      await (options.sleep??pause)(wait,options.signal);
    }
  }
}

export async function commitImport(current:ImportJob,options:Options):Promise<ImportJob> {
  while(current.status!=='complete'){
    options.progress(current,'committing');
    const previous=current;
    current=await retry(options,()=>options.request<ImportJob>('/staff/imports/'+previous.id+'/commit',{cursor:previous.cursor}));
    if(current.cursor<=previous.cursor&&current.status!=='complete')throw Error('Import made no progress.');
    options.progress(current,current.status==='complete'?'complete':'committing');
  }
  options.progress(current,'complete');return current;
}

export async function uploadImport(input:{filename:string;bytes:number;fileHash:string;rows:ImportRow[];keep:boolean},options:Options):Promise<ImportJob> {
  const metadata={operationId:crypto.randomUUID(),filename:input.filename,bytes:input.bytes,totalRows:input.rows.length,fileHash:input.fileHash,duplicatePolicy:input.keep?'keep':'skip'};
  let current=await retry(options,()=>options.request<ImportJob>('/staff/imports',metadata));
  options.progress(current,current.status==='complete'?'complete':current.status==='uploading'?'uploading':'committing');
  if(current.status==='uploading'){
    const manifest=await retry(options,()=>options.request<{rowNumbers:number[]}>('/staff/imports/'+current.id+'/rows'));
    const stored=new Set(manifest.rowNumbers);
    const missing=input.rows.filter(row=>!stored.has(row.rowNumber));
    // Smaller row/byte budgets leave headroom for validation and uncertain networks.
    const chunks:ImportRow[][]=[];let chunk:ImportRow[]=[];
    for(const row of missing){
      if(chunk.length&&(chunk.length===10||new TextEncoder().encode(JSON.stringify({rows:[...chunk,row]})).length>96*1024)){chunks.push(chunk);chunk=[];}
      chunk.push(row);
    }
    if(chunk.length)chunks.push(chunk);
    for(const rows of chunks){
      current=await retry(options,()=>options.request<ImportJob>('/staff/imports/'+current.id+'/rows',{rows}));
      options.progress(current,'uploading');
    }
    options.progress(current,'validating');
    current=await retry(options,()=>options.request<ImportJob>('/staff/imports/'+current.id+'/validate',{cursor:current.cursor}));
  }
  return commitImport(current,options);
}
