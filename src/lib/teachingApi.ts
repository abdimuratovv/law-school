import { ExamError } from './examApi';

export async function teachingRequest<T>(path:string,csrf?:string|null,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T> {
  const response=await fetch('/api/v1'+path,{method,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),
    ...(body===undefined?{}:{headers:{'Content-Type':'application/json','X-CSRF-Token':csrf??''},body:JSON.stringify(body)})});
  if(!response.ok)throw new ExamError(response.status,'The request could not be completed.');
  return await response.json() as T;
}
export function tashkentInput(timestamp=Date.now()):string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(timestamp);
  const value=(name:string)=>parts.find(p=>p.type===name)?.value??'';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}
export const tashkentTimestamp=(input:string)=>input+':00+05:00';
