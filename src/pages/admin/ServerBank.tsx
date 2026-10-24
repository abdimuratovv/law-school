import { useEffect,useRef,useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { BankQuestion,BulkPublishResult,QuestionBankPage } from '../../../shared/contracts/teaching';
import { Button } from '@/components/ui/basic';
import { Icon } from '@/components/ui/Icon';
import { SystemSelect } from '@/components/ui/SystemSelect';
import { TOPICS } from '@/data/topics';
import { useText } from '@/i18n/LanguageProvider';
import { teachingRequest } from '@/lib/teachingApi';
import { useAuth } from '@/state/AuthState';

export default function ServerBank(){
  const t=useText();const [params,setParams]=useSearchParams();
  const [search,setSearch]=useState(params.get('search')??'');
  const [data,setData]=useState<QuestionBankPage>(),[error,setError]=useState(false),[busy,setBusy]=useState(true),[retry,setRetry]=useState(0);
  const {csrfToken}=useAuth();
  const [selected,setSelected]=useState<Map<string,BankQuestion>>(new Map());
  const [bulkBusy,setBulkBusy]=useState(false),[progress,setProgress]=useState<{done:number;total:number}>(),[bulkMessage,setBulkMessage]=useState('');
  const [failures,setFailures]=useState<{question:BankQuestion;reason:string}[]>([]);
  const controller=useRef<AbortController>();
  const query=params.toString();
  const searchPending=search.trim()!==(params.get('search')??'');
  const filters=new URLSearchParams(query);filters.delete('page');const filterKey=filters.toString();
  useEffect(()=>{setSelected(new Map());setBulkMessage('');setFailures([]);},[filterKey]);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const toggle=(q:BankQuestion,on:boolean)=>setSelected(previous=>{const next=new Map(previous);if(on)next.set(q.id,q);else next.delete(q.id);return next;});
  async function selectAll(){
    if(bulkBusy||!data)return;
    setBulkBusy(true);setProgress(undefined);setBulkMessage('');setFailures([]);controller.current=new AbortController();
    try{
      const all=new Map<string,BankQuestion>();let page=1,total=data.total;
      do{
        const p=new URLSearchParams(query);p.set('page',String(page));
        const result=await teachingRequest<QuestionBankPage>('/staff/question-bank?'+p.toString(),null,undefined,'GET',controller.current.signal);
        for(const q of result.items)all.set(q.id,q);
        total=result.total;page++;
      }while((page-1)*20<total&&all.size<1000);
      if(total>1000){setBulkMessage('Select up to 1000 questions. Narrow your filters.');return;}
      setSelected(all);
    }catch{if(!controller.current.signal.aborted)setBulkMessage('Could not select all questions. Try again.');}
    finally{setBulkBusy(false);}
  }
  async function publishSelected(){
    if(bulkBusy||!selected.size)return;
    const snapshot=[...selected.values()];const failed:{question:BankQuestion;reason:string}[]=[];
    const remaining=new Map(selected);let done=0,published=0;
    setBulkBusy(true);setBulkMessage('');setFailures([]);setProgress({done:0,total:snapshot.length});controller.current=new AbortController();
    try{
      for(let i=0;i<snapshot.length;i+=5){
        const batch=snapshot.slice(i,i+5);
        const response=await teachingRequest<BulkPublishResult>('/staff/question-bank/publish',csrfToken,{items:batch.map(q=>({id:q.id,revision:q.revision}))},'POST',controller.current.signal);
        for(const result of response.results){
          const question=batch.find(q=>q.id===result.id)!;
          if(result.status==='published'){published++;remaining.delete(result.id);}
          else failed.push({question,reason:result.code==='invalid'?'Complete the required question fields.':result.code==='changed'?'This question changed. Clear selection and select it again.':'This question is unavailable.'});
          done++;
        }
        setProgress({done,total:snapshot.length});setSelected(new Map(remaining));
      }
      setBulkMessage(failed.length?'Some questions could not be published. Fix the listed questions and retry.':'Selected questions published. You can now add them to a test.');
    }catch{
      if(!controller.current.signal.aborted)setBulkMessage('Publishing stopped. Your selection keeps unfinished questions. Try again; published versions will not be duplicated.');
    }finally{
      setFailures(failed);setSelected(remaining);setProgress({done:published,total:snapshot.length});setBulkBusy(false);setRetry(value=>value+1);
    }
  }
  function change(key:string,value:string){setParams(previous=>{const next=new URLSearchParams(previous);next.delete('page');if(value&&value!=='all')next.set(key,value);else next.delete(key);return next;},{replace:true});}
  useEffect(()=>{setSearch(params.get('search')??'');},[query]);
  useEffect(()=>{if(bulkBusy)return;const timer=setTimeout(()=>{if(search!==(params.get('search')??''))change('search',search.trim());},300);return()=>clearTimeout(timer);},[search,query,bulkBusy]);
  useEffect(()=>{
    let active=true;setBusy(true);setError(false);
    teachingRequest<QuestionBankPage>('/staff/question-bank?'+query).then(value=>{if(active)setData(value);}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[query,retry]);
  const currentPage=data?.page??1,pages=Math.max(1,Math.ceil((data?.total??0)/20));
  const go=(page:number)=>setParams(previous=>{const next=new URLSearchParams(previous);next.set('page',String(page));return next;});
  return <section className="authoring-page bank-page" data-no-translate>
    <header><div><h1>{t('Question bank')}</h1><p>{t('Review questions, then publish them for your tests.')}</p></div><div className="authoring-actions"><Button to="/admin/import" variant="secondary" icon="upload">{t('Import')}</Button><Button to="/admin/editor" icon="plus">{t('New question')}</Button></div></header>
    <aside className="bank-guide"><Icon name="info"/><div><strong>{t('Imported questions are saved as drafts.')}</strong><p>{t('Publish the questions you need, create a test, then publish it as open practice or assign it to a group.')}</p></div><Button to="/admin/builder" variant="secondary" size="sm" icon="forward">{t('Test builder')}</Button></aside>
    <div className="bank-panel">
      <fieldset className="bank-filters" disabled={bulkBusy}><legend className="sr-only">{t('Filters')}</legend>
        <label className="bank-search"><span>{t('Search questions')}</span><div><Icon name="search"/><input type="search" maxLength={200} value={search} placeholder={t('Search question text…')} onChange={e=>setSearch(e.target.value)}/></div></label>
        <SystemSelect label={t('Question type')} icon="tests" value={params.get('kind')??'all'} onChange={value=>change('kind',value)} options={[{value:'all',label:t('All')},{value:'single',label:t('Single choice')},{value:'written',label:t('Written')}]}/>
        <SystemSelect label={t('Topic')} icon="logo" value={params.get('topic')??'all'} onChange={value=>change('topic',value)} options={[{value:'all',label:t('All')},...Object.entries(TOPICS).map(([value,topic])=>({value,label:t(topic.name)}))]}/>
        <SystemSelect label={t('Status')} icon="check" value={params.get('status')??'all'} onChange={value=>change('status',value)} options={[{value:'all',label:t('All')},{value:'draft',label:t('Draft')},{value:'published',label:t('Published')}]}/>
      </fieldset>
      <div className="bank-bulk">
        <div><Button variant="secondary" size="sm" disabled={bulkBusy||busy||searchPending||error||!data?.total||data.total>1000} onClick={()=>{void selectAll();}}>{t('Select all results ({count})',{count:data?.total??0})}</Button><span>{t('{count} selected',{count:selected.size})}</span></div>
        <div><Button size="sm" variant="plain" disabled={bulkBusy||!selected.size} onClick={()=>{setSelected(new Map());setFailures([]);setBulkMessage('');setProgress(undefined);}}>{t('Clear selection')}</Button><Button size="sm" icon="check" disabled={bulkBusy||busy||searchPending||!selected.size} onClick={()=>{void publishSelected();}}>{t('Publish selected ({count})',{count:selected.size})}</Button></div>
      </div>
      {!!data&&data.total>1000&&<p className="bank-bulk-feedback">{t('Select up to 1000 questions. Narrow your filters.')}</p>}
      {(progress||bulkMessage||bulkBusy)&&<div className="bank-bulk-feedback" role="status">{progress&&<><p>{t(bulkBusy?'Publishing questions: {done} / {total}':'Published: {done} / {total}',progress)}</p><progress max={progress.total} value={progress.done}/></>}{bulkBusy&&!progress&&<p>{t('Selecting questions…')}</p>}{bulkMessage&&<p>{t(bulkMessage)}</p>}</div>}
      {failures.length>0&&<ul className="bank-bulk-errors">{failures.map(({question,reason})=><li key={question.id}><a href={'/admin/editor/'+question.id}>{t('Question')} {question.sourceNumber??'—'}</a>: {t(reason)}</li>)}</ul>}
      <div className="bank-list-heading"><span role="status">{busy?t('Loading'):t('{count} questions',{count:data?.total??0})}</span><span>{t('Newest imports first · original file order')}</span></div>
      {error?<div className="authoring-empty" role="alert"><p>{t('Could not load staff data.')}</p><Button variant="secondary" onClick={()=>setRetry(value=>value+1)}>{t('Try again')}</Button></div>:<div className="bank-list" aria-busy={busy} style={busy?{opacity:.55}:undefined}>
        {data?.items.map(q=><article key={q.id} className="bank-row">
          <label className="bank-checkbox"><input type="checkbox" disabled={bulkBusy} checked={selected.has(q.id)} onChange={e=>toggle(q,e.target.checked)} aria-label={t('Select question')+' '+(q.sourceNumber??q.stem)}/></label>
          <span className="bank-number" aria-label={t('Question')}>{q.sourceNumber??'—'}</span>
          <div className="bank-row-body"><div className="bank-meta"><span className="bank-kind">{t(q.kind==='single'?'Single choice':'Written')}</span><span>{t(TOPICS[q.topic].name)}</span><span className={'bank-status'+(q.published?' is-published':'')}>{t(q.published?'Published':'Draft')}</span></div>
            <details className="bank-question"><summary><span>{q.stem||t('Untitled draft')}</span><Icon name="down" size="s"/></summary><p className="bank-full-text">{q.stem}</p></details>
            <div className="bank-source" title={q.sourceName??''}>{q.sourceName??t('Created manually')}</div>
          </div><Button variant="plain" size="sm" icon="pencil" to={'/admin/editor/'+q.id} aria-label={t('Edit question')+' '+(q.sourceNumber??'')}>{t('Edit question')}</Button>
        </article>)}
        {!busy&&data?.total===0&&<div className="authoring-empty"><Icon name="tests"/><h2>{t('No matching questions')}</h2><p>{t('Change the filters or import a question file.')}</p><Button variant="secondary" onClick={()=>{setSearch('');setParams({});}}>{t('Clear filters')}</Button></div>}
      </div>}
      <footer className="bank-pagination"><span>{t('Page {page} of {pages}',{page:currentPage,pages})}</span><div><Button size="sm" variant="secondary" icon="back" disabled={bulkBusy||busy||error||currentPage<=1} onClick={()=>go(currentPage-1)}>{t('Previous')}</Button><Button size="sm" variant="secondary" iconEnd="forward" disabled={bulkBusy||busy||error||currentPage>=pages} onClick={()=>go(currentPage+1)}>{t('Next')}</Button></div></footer>
    </div>
  </section>;
}
