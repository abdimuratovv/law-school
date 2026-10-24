import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/basic';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/state/AuthState';
import { useText } from '@/i18n/LanguageProvider';
import { teachingRequest, TeachingRequestError } from '@/lib/teachingApi';
import { commitImport, uploadImport, type ImportPhase } from '@/lib/importRunner';
import type { ParsedImport } from '@/lib/importParser';
import { TOPICS } from '@/data/topics';
import { IMPORT_TEMPLATE, MAX_IMPORT_BYTES, type ImportJob } from '../../../shared/contracts/imports';

function phaseLabel(job:ImportJob):string {
  return job.status==='complete'?'Import complete':job.status==='uploading'?'Uploading questions':job.status==='ready'?'Ready to create drafts':'Creating question drafts';
}
function Progress({ job }: { job:ImportJob }) {
  const t=useText();const committing=job.status==='ready'||job.status==='committing';
  const value=committing?job.created+job.skipped:job.uploadedRows;
  return <div className="import-progress">
    <div className="import-progress-heading"><strong>{t(phaseLabel(job))}</strong><span>{value} / {job.totalRows}</span></div>
    <progress value={value} max={job.totalRows} aria-label={t(phaseLabel(job))} />
    <p className="fn l2">{t('Uploaded')}: {job.uploadedRows}/{job.totalRows} · {t('Created')}: {job.created} · {t('Skipped')}: {job.skipped}</p>
    {job.status==='uploading'&&<p className="fn l2">{t('Rows are saved temporarily. Question drafts are created after the upload is complete.')}</p>}
  </div>;
}
function errorLabel(error:unknown):string {
  if(error instanceof TeachingRequestError){
    if(error.status===401)return 'Your session expired. Sign in again and resume this import.';
    if(error.status===403)return 'This request was not authorized. Refresh the page and try again.';
    if(error.status===413)return 'This upload exceeds the server limit. Split the file into smaller imports.';
    if(error.status===422)return 'The server rejected some fields. Check the listed rows and retry.';
    if(error.status===409)return 'The import changed in another tab. Retry to load its saved state.';
    if(error.status===429)return 'Too many requests. Wait a minute, then resume.';
    return 'The server is temporarily unavailable. Saved rows are safe; you can resume.';
  }
  return 'The connection was interrupted. Saved rows are safe; you can resume.';
}

export default function ServerImport() {
  const t=useText();const {csrfToken}=useAuth();
  const [parsed,setParsed]=useState<ParsedImport>();const [file,setFile]=useState<File>();
  const [busy,setBusy]=useState(false);const [parsing,setParsing]=useState(false);const [error,setError]=useState('');
  const [detail,setDetail]=useState('');const [keep,setKeep]=useState(false);const [job,setJob]=useState<ImportJob>();
  const [jobs,setJobs]=useState<ImportJob[]>([]);const [next,setNext]=useState<string|null>(null);const [historyError,setHistoryError]=useState(false);
  const [retrying,setRetrying]=useState<{attempt:number;seconds:number}|null>(null);const [phase,setPhase]=useState<ImportPhase>();
  const worker=useRef<Worker>();const timer=useRef<ReturnType<typeof setTimeout>>();const alive=useRef(true);
  const controller=useRef<AbortController>();const generation=useRef(0);const picker=useRef<HTMLInputElement>(null);const target=useRef<ImportJob|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;controller.current?.abort();worker.current?.terminate();clearTimeout(timer.current);};},[]);
  const load=async(after='')=>{
    setHistoryError(false);
    try{const data=await teachingRequest<{items:ImportJob[];next:string|null}>('/staff/imports?after='+encodeURIComponent(after));if(alive.current){setJobs(old=>after?[...old,...data.items]:data.items);setNext(data.next);}}
    catch{if(alive.current)setHistoryError(true);}
  };
  useEffect(()=>{void load();},[]);
  const choose=async(selected?:File)=>{
    const ticket=++generation.current;const expected=target.current;target.current=null;
    worker.current?.terminate();clearTimeout(timer.current);setParsed(undefined);setJob(undefined);setPhase(undefined);setFile(selected);setError('');setDetail('');setRetrying(null);
    if(!selected)return;
    if(selected.size>MAX_IMPORT_BYTES||!selected.size||!(/\.(csv|xlsx)$/i.test(selected.name))){setError('Choose a CSV or XLSX file up to 5 MB.');return;}
    setBusy(true);setParsing(true);
    try {
      const bytes=await selected.arrayBuffer();if(!alive.current||ticket!==generation.current)return;
      const w=new Worker(new URL('../../lib/import.worker.ts',import.meta.url),{type:'module'});worker.current=w;
      const fail=(message:string)=>{w.terminate();clearTimeout(timer.current);if(alive.current&&ticket===generation.current){setBusy(false);setParsing(false);setError(message);}};
      timer.current=setTimeout(()=>fail('File parsing timed out. Try a smaller file.'),15000);w.onerror=()=>fail('Could not read the file.');
      w.onmessage=(event:MessageEvent<{result?:ParsedImport;error?:string}>)=>{
        w.terminate();clearTimeout(timer.current);if(!alive.current||ticket!==generation.current)return;
        setBusy(false);setParsing(false);const result=event.data.result;
        if(expected&&result&&expected.fileHash!==result.fileHash){setError('The selected file does not match this import. Choose the original file.');return;}
        setParsed(result);setError(event.data.error??'');
        if(expected){setKeep(expected.duplicatePolicy==='keep');setJob(expected);}
      };
      w.postMessage({bytes,filename:selected.name},[bytes]);
    } catch {if(alive.current&&ticket===generation.current){setBusy(false);setParsing(false);setError('Could not read the file.');}}
  };
  const operation=()=>{
    const abort=new AbortController();controller.current=abort;
    return {
      signal:abort.signal,
      request:<T,>(path:string,body?:unknown)=>teachingRequest<T>(path,csrfToken,body,body===undefined?'GET':'POST',abort.signal),
      progress:(current:ImportJob,currentPhase:ImportPhase)=>{if(alive.current&&!abort.signal.aborted){setJob(current);setPhase(currentPhase);setRetrying(null);setJobs(old=>[current,...old.filter(j=>j.id!==current.id)]);}},
      retry:(attempt:number,delayMs:number)=>{if(alive.current&&!abort.signal.aborted)setRetrying({attempt,seconds:Math.ceil(delayMs/1000)});},
    };
  };
  const perform=async(existing?:ImportJob)=>{
    if(busy)return;
    if(!existing&&(!file||!parsed||parsed.errors.length))return;
    setBusy(true);setError('');setDetail('');setRetrying(null);const options=operation();
    try {
      if(existing){setJob(existing);await commitImport(existing,options);}
      else await uploadImport({filename:file!.name,bytes:file!.size,fileHash:parsed!.fileHash,rows:parsed!.rows,keep},options);
      if(alive.current)await load();
    } catch(problem) {
      if(alive.current){
        setError(options.signal.aborted?'Import paused. You can resume from the saved rows.':errorLabel(problem));
        if(problem instanceof TeachingRequestError)setDetail(['HTTP '+problem.status,problem.requestId?'ID: '+problem.requestId:'',...problem.fields].filter(Boolean).join(' · '));
        await load();
      }
    } finally {if(alive.current){setBusy(false);setRetrying(null);}}
  };
  const download=()=>{const url=URL.createObjectURL(new Blob([IMPORT_TEMPLATE],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='questions-template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const matching=parsed?jobs.find(j=>j.fileHash===parsed.fileHash&&j.duplicatePolicy===(keep?'keep':'skip')):undefined;
  return <section className="authoring-page learning-page import-page" data-no-translate>
    <header><h1>{t('Import questions')}</h1><p>{t('CSV or XLSX, up to 5 MB and 1000 rows. Imported questions remain drafts.')}</p></header>
    <section className="card learning-card">
      <Button variant="secondary" icon="download" onClick={download}>{t('Download CSV template')}</Button>
      <label className="field"><span>{t('Choose file')}</span><input ref={picker} type="file" accept=".csv,.xlsx" disabled={busy} onClick={event=>{if(event.isTrusted)target.current=null;}} onChange={event=>{void choose(event.target.files?.[0]);}} /></label>
      {parsing&&<p role="status">{t('Reading and checking the file…')}</p>}
      {parsed&&<>
        <p>{t('Valid rows')}: <strong>{parsed.rows.length}</strong> · {t('Duplicate rows')}: {parsed.duplicates}</p>
        {matching&&<div className="import-resume-notice"><Icon name="cloudCheck" /><p>{t(matching.status==='complete'?'This exact file has already been imported. No new drafts will be created.':'A saved import was found. Only missing rows will be uploaded.')}</p></div>}
        <label><input type="checkbox" checked={keep} disabled={busy} onChange={event=>setKeep(event.target.checked)} /> {t('Keep duplicate rows')}</label>
        {parsed.warnings.length>0&&<ul>{parsed.warnings.slice(0,10).map(w=><li key={w}>{w}</li>)}</ul>}
        {parsed.errors.length>0&&<div role="alert"><p>{t('Fix the source file before importing.')}</p><ul>{parsed.errors.slice(0,20).map(e=><li key={e}>{e}</li>)}</ul></div>}
        <details className="import-preview"><summary>{t('Preview shows the first 10 rows.')}</summary><div className="report-table"><table><thead><tr><th>{t('Row')}</th><th>{t('Question')}</th><th>{t('Topic')}</th></tr></thead><tbody>{parsed.rows.slice(0,10).map(row=><tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.content.stem}</td><td>{t(TOPICS[row.content.topic].name)}</td></tr>)}</tbody></table></div></details>
        <Button disabled={busy||parsed.errors.length>0||!parsed.rows.length||matching?.status==='complete'} onClick={()=>{void perform();}}>{t(matching?'Resume import':'Import as drafts')}</Button>
      </>}
      {busy&&!parsing&&<div className="import-running"><p role="status">{retrying?t('Retry {attempt} in {seconds} seconds',{attempt:retrying.attempt,seconds:retrying.seconds}):t(phase==='validating'?'Validating uploaded questions':'Processing import…')}</p><Button variant="secondary" onClick={()=>controller.current?.abort()}>{t('Pause import')}</Button></div>}
      {error&&<div className="import-error" role="alert"><strong>{t(error)}</strong>{detail&&<p className="fn">{detail}</p>}{file&&parsed&&!busy&&<Button variant="secondary" onClick={()=>{void perform();}}>{t('Retry import')}</Button>}</div>}
      {job&&<div role="status"><Progress job={job} /></div>}
    </section>
    <h2>{t('Import history')}</h2>
    {historyError&&<div role="alert"><p>{t('Could not load import history.')}</p><Button variant="secondary" onClick={()=>{void load();}}>{t('Try again')}</Button></div>}
    {jobs.map(j=><article key={j.id} className="card learning-card import-history-item"><h3>{j.filename}</h3><Progress job={j} />
      {['ready','committing'].includes(j.status)&&<Button disabled={busy} onClick={()=>{void perform(j);}}>{t('Resume import')}</Button>}
      {j.status==='uploading'&&<><p>{t('Select the same file to resume.')}</p><Button variant="secondary" icon="upload" disabled={busy} onClick={()=>{target.current=j;if(picker.current){picker.current.value='';picker.current.click();}}}>{t('Continue upload')}</Button></>}
      {j.status==='complete'&&<><span className="import-complete"><Icon name="checkCircle" size="s" />{t('Import complete')}</span><p>{t('Imported questions are saved as drafts.')}</p><Button to="/admin/bank" variant="secondary" icon="forward">{t('Review imported questions')}</Button></>}
    </article>)}
    {next&&<Button disabled={busy} onClick={()=>{void load(next);}}>{t('Load more')}</Button>}
    <Button to="/admin/bank" variant="secondary">{t('Question bank')}</Button>
  </section>;
}
