import { useEffect,useRef,useState } from 'react';
import { Button } from '@/components/ui/basic';
import { useAuth } from '@/state/AuthState';
import { useText } from '@/i18n/LanguageProvider';
import { teachingRequest } from '@/lib/teachingApi';
import type { ParsedImport } from '@/lib/importParser';
import { IMPORT_TEMPLATE,MAX_IMPORT_BYTES,type ImportJob,type ImportRow } from '../../../shared/contracts/imports';

// Keep the spreadsheet implementation exclusively in the worker chunk.
export default function ServerImport(){
 const t=useText();const {csrfToken}=useAuth();const [parsed,setParsed]=useState<ParsedImport>();const [file,setFile]=useState<File>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [keep,setKeep]=useState(false);const [job,setJob]=useState<ImportJob>();const [jobs,setJobs]=useState<ImportJob[]>([]);const [next,setNext]=useState<string|null>(null);
 const worker=useRef<Worker>();const timer=useRef<ReturnType<typeof setTimeout>>();const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;worker.current?.terminate();clearTimeout(timer.current);};},[]);
 const load=async(after='')=>{try{const data=await teachingRequest<{items:ImportJob[];next:string|null}>('/staff/imports?after='+encodeURIComponent(after));if(alive.current){setJobs(old=>after?[...old,...data.items]:data.items);setNext(data.next);}}catch{setError('The request could not be completed.');}};
 useEffect(()=>{void load();},[]);
 const choose=async(selected?:File)=>{
  worker.current?.terminate();clearTimeout(timer.current);setParsed(undefined);setJob(undefined);setFile(selected);setError('');if(!selected)return;
  if(selected.size>MAX_IMPORT_BYTES||!selected.size||!(/\.(csv|xlsx)$/i.test(selected.name))){setError('Choose a CSV or XLSX file up to 5 MB.');return;}
  setBusy(true);try{const bytes=await selected.arrayBuffer();if(!alive.current)return;const w=new Worker(new URL('../../lib/import.worker.ts',import.meta.url),{type:'module'});worker.current=w;
   const fail=(message:string)=>{w.terminate();clearTimeout(timer.current);if(alive.current){setBusy(false);setError(message);}};
   timer.current=setTimeout(()=>fail('File parsing timed out. Try a smaller file.'),15000);w.onerror=()=>fail('Could not read the file.');
   w.onmessage=(event:MessageEvent<{result?:ParsedImport;error?:string}>)=>{w.terminate();clearTimeout(timer.current);if(alive.current){setBusy(false);setParsed(event.data.result);setError(event.data.error??'');}};w.postMessage({bytes,filename:selected.name},[bytes]);
  }catch{setBusy(false);setError('Could not read the file.');}
 };
 const finish=async(current:ImportJob)=>{while(current.status!=='complete'){current=await teachingRequest<ImportJob>('/staff/imports/'+current.id+'/commit',csrfToken,{cursor:current.cursor});if(!alive.current)return;setJob(current);}await load();};
 const run=async()=>{if(!file||!parsed||parsed.errors.length)return;setBusy(true);setError('');try{
  let current=await teachingRequest<ImportJob>('/staff/imports',csrfToken,{operationId:crypto.randomUUID(),filename:file.name,bytes:file.size,totalRows:parsed.rows.length,fileHash:parsed.fileHash,duplicatePolicy:keep?'keep':'skip'});setJob(current);
  if(current.status==='uploading'){
   const chunks:ImportRow[][]=[];let chunk:ImportRow[]=[];
   for(const row of parsed.rows){if(chunk.length===25||new TextEncoder().encode(JSON.stringify({rows:[...chunk,row]})).length>192*1024){chunks.push(chunk);chunk=[];}chunk.push(row);}if(chunk.length)chunks.push(chunk);
   for(const rows of chunks){current=await teachingRequest<ImportJob>('/staff/imports/'+current.id+'/rows',csrfToken,{rows});if(!alive.current)return;setJob(current);}
   current=await teachingRequest<ImportJob>('/staff/imports/'+current.id+'/validate',csrfToken,{cursor:current.cursor});setJob(current);
  }await finish(current);
 }catch{setError('Import paused. Select the same file to resume safely.');await load();}finally{if(alive.current)setBusy(false);}};
 const resume=async(j:ImportJob)=>{setBusy(true);setError('');setJob(j);try{await finish(j);}catch{setError('Import paused. Select the same file to resume safely.');}finally{if(alive.current)setBusy(false);}};
 const download=()=>{const url=URL.createObjectURL(new Blob([IMPORT_TEMPLATE],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='questions-template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <section className="authoring-page learning-page" data-no-translate><h1>{t('Import questions')}</h1><section className="card learning-card"><p>{t('CSV or XLSX, up to 5 MB and 1000 rows. Imported questions remain drafts.')}</p><Button variant="secondary" onClick={download}>{t('Download CSV template')}</Button><label className="field"><span>{t('Choose file')}</span><input type="file" accept=".csv,.xlsx" disabled={busy} onChange={e=>{void choose(e.target.files?.[0]);}} /></label>
 {parsed&&<><p>{t('Valid rows')}: {parsed.rows.length} · {t('Duplicate rows')}: {parsed.duplicates}</p><label><input type="checkbox" checked={keep} disabled={busy} onChange={e=>setKeep(e.target.checked)} /> {t('Keep duplicate rows')}</label><ul>{parsed.warnings.slice(0,10).map(w=><li key={w}>{w}</li>)}</ul>{parsed.errors.length>0&&<div role="alert"><p>{t('Fix the source file before importing.')}</p><ul>{parsed.errors.slice(0,20).map(e=><li key={e}>{e}</li>)}</ul></div>}
 <div className="report-table"><table><thead><tr><th>{t('Row')}</th><th>{t('Question')}</th><th>{t('Topic')}</th></tr></thead><tbody>{parsed.rows.slice(0,10).map(row=><tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.content.stem}</td><td>{row.content.topic}</td></tr>)}</tbody></table></div><p>{t('Preview shows the first 10 rows.')}</p><Button disabled={busy||parsed.errors.length>0||!parsed.rows.length} onClick={()=>{void run();}}>{t('Import as drafts')}</Button></>}
 {busy&&<p role="status">{t('Processing import…')}</p>}{error&&<p role="alert">{t(error)}</p>}{job&&<p role="status">{t(job.status==='complete'?'Import complete':'Import progress')}: {job.uploadedRows}/{job.totalRows} · {t('Created')}: {job.created} · {t('Skipped')}: {job.skipped}</p>}</section>
 <h2>{t('Import history')}</h2>{jobs.map(j=><article key={j.id} className="card learning-card"><h3>{j.filename}</h3><p>{t(j.status==='complete'?'Import complete':'Import progress')} · {j.uploadedRows}/{j.totalRows} · {t('Created')}: {j.created} · {t('Skipped')}: {j.skipped}</p>{['ready','committing'].includes(j.status)&&<Button disabled={busy} onClick={()=>{void resume(j);}}>{t('Resume import')}</Button>}{j.status==='uploading'&&<p>{t('Select the same file to resume.')}</p>}</article>)}{next&&<Button disabled={busy} onClick={()=>{void load(next);}}>{t('Load more')}</Button>}<Button to="/admin/bank">{t('Question bank')}</Button></section>;
}
