import { TeachingRequestError } from './requestError';
export { TeachingRequestError } from './requestError';
export async function teachingRequest<T>(path:string,csrf?:string|null,body?:unknown,method=body===undefined?'GET':'POST',signal?:AbortSignal):Promise<T> {
  const timeout=AbortSignal.timeout(15000);
  const response=await fetch('/api/v1'+path,{method,credentials:'same-origin',cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout,
    ...(body===undefined?{}:{headers:{'Content-Type':'application/json','X-CSRF-Token':csrf??''},body:JSON.stringify(body)})});
  if(!response.ok){
    let fields:string[]=[];
    try { const error=await response.json() as {error?:{issues?:{path?:unknown}[]}}; fields=(error.error?.issues??[]).map(i=>i.path).filter((p):p is string=>typeof p==='string'&&/^[\w.]{1,100}$/.test(p)).slice(0,5); } catch { /* Edge errors need not be JSON. */ }
    const after=Number(response.headers.get('Retry-After'));
    throw new TeachingRequestError(response.status,response.headers.get('X-Request-Id'),Number.isFinite(after)?Math.min(60000,Math.max(0,after*1000)):0,fields);
  }
  return await response.json() as T;
}
export function tashkentInput(timestamp=Date.now()):string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(timestamp);
  const value=(name:string)=>parts.find(p=>p.type===name)?.value??'';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}
export const tashkentTimestamp=(input:string)=>input+':00+05:00';
