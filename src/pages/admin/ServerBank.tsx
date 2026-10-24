import { useEffect,useRef,useState } from 'react';
import { useNavigate,useSearchParams } from 'react-router-dom';
import type { BankQuestion,QuestionBankPage } from '../../../shared/contracts/teaching';
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
  const {csrfToken}=useAuth();const navigate=useNavigate();
  const [selected,setSelected]=useState<Map<string,BankQuestion>>(new Map());
  const [bulkBusy,setBulkBusy]=useState(false),[bulkMessage,setBulkMessage]=useState('');
  const controller=useRef<AbortController>();
  const query=params.toString();
  const searchPending=search.trim()!==(params.get('search')??'');
  const filters=new URLSearchParams(query);filters.delete('page');const filterKey=filters.toString();
  useEffect(()=>{setSelected(new Map());setBulkMessage('');},[filterKey]);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const toggle=(q:BankQuestion,on:boolean)=>setSelected(previous=>{const next=new Map(previous);if(on)next.set(q.id,q);else next.delete(q.id);return next;});
  async function selectAll(){
    if(bulkBusy||!data)return;
    setBulkBusy(true);setBulkMessage('');controller.current=new AbortController();
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
  async function createSelectedCollection(){
    if(bulkBusy||!selected.size||selected.size>100)return;
    setBulkBusy(true);setBulkMessage('');
    try{
      const operationId=crypto.randomUUID();
      const data=await teachingRequest<{id:string}>('/staff/tests',csrfToken,{operationId,content:{name:'',mode:'mock',durationSeconds:null,isPublic:false,questionVersionIds:[],questionDraftIds:[...selected.keys()],opensAt:null,closesAt:null}});
      navigate('/admin/builder?draft='+data.id);
    }catch{setBulkMessage('Could not save. Keep this page open and try again.');}finally{setBulkBusy(false);}
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
    <header><div><h1>{t('Question bank')}</h1><p>{t('Manage questions and use them in your test collections.')}</p></div><div className="authoring-actions"><Button to="/admin/import" variant="secondary" icon="upload">{t('Import')}</Button><Button to="/admin/editor" icon="plus">{t('New question')}</Button></div></header>
    <aside className="bank-guide"><Icon name="info"/><div><strong>{t('Questions are ready for your collections.')}</strong><p>{t('Choose questions and create a collection. They are published automatically with it.')}</p></div><Button to="/admin/builder" variant="secondary" size="sm" icon="forward">{t('Create collection')}</Button></aside>
    <div className="bank-panel">
      <fieldset className="bank-filters" disabled={bulkBusy}><legend className="sr-only">{t('Filters')}</legend>
        <label className="bank-search"><span>{t('Search questions')}</span><div><Icon name="search"/><input type="search" maxLength={200} value={search} placeholder={t('Search question text…')} onChange={e=>setSearch(e.target.value)}/></div></label>
        <SystemSelect label={t('Question type')} icon="tests" value={params.get('kind')??'all'} onChange={value=>change('kind',value)} options={[{value:'all',label:t('All')},{value:'single',label:t('Single choice')},{value:'written',label:t('Written')}]}/>
        <SystemSelect label={t('Topic')} icon="logo" value={params.get('topic')??'all'} onChange={value=>change('topic',value)} options={[{value:'all',label:t('All')},...Object.entries(TOPICS).map(([value,topic])=>({value,label:t(topic.name)}))]}/>
      </fieldset>
      <div className="bank-bulk">
        <div><Button variant="secondary" size="sm" disabled={bulkBusy||busy||searchPending||error||!data?.total||data.total>1000} onClick={()=>{void selectAll();}}>{t('Select all results ({count})',{count:data?.total??0})}</Button><span>{t('{count} selected',{count:selected.size})}</span></div>
        <div><Button size="sm" variant="plain" disabled={bulkBusy||!selected.size} onClick={()=>{setSelected(new Map());setBulkMessage('');}}>{t('Clear selection')}</Button><Button size="sm" icon="plus" disabled={bulkBusy||busy||searchPending||!selected.size||selected.size>100} onClick={()=>{void createSelectedCollection();}}>{t('Create collection ({count})',{count:selected.size})}</Button></div>
      </div>
      {!!data&&data.total>1000&&<p className="bank-bulk-feedback">{t('Select up to 1000 questions. Narrow your filters.')}</p>}
      {(bulkMessage||bulkBusy)&&<div className="bank-bulk-feedback" role="status">{bulkBusy&&<p>{t('Loading')}</p>}{bulkMessage&&<p>{t(bulkMessage)}</p>}</div>}
      {selected.size>100&&<p className="bank-bulk-feedback">{t('A test can contain up to 100 questions. Narrow the number range.')}</p>}
      <div className="bank-list-heading"><span role="status">{busy?t('Loading'):t('{count} questions',{count:data?.total??0})}</span><span>{t('Newest imports first · original file order')}</span></div>
      {error?<div className="authoring-empty" role="alert"><p>{t('Could not load staff data.')}</p><Button variant="secondary" onClick={()=>setRetry(value=>value+1)}>{t('Try again')}</Button></div>:<div className="bank-list" aria-busy={busy} style={busy?{opacity:.55}:undefined}>
        {data?.items.map(q=><article key={q.id} className="bank-row">
          <label className="bank-checkbox"><input type="checkbox" disabled={bulkBusy} checked={selected.has(q.id)} onChange={e=>toggle(q,e.target.checked)} aria-label={t('Select question')+' '+(q.sourceNumber??q.stem)}/></label>
          <span className="bank-number" aria-label={t('Question')}>{q.sourceNumber??'—'}</span>
          <div className="bank-row-body"><div className="bank-meta"><span className="bank-kind">{t(q.kind==='single'?'Single choice':'Written')}</span><span>{t(TOPICS[q.topic].name)}</span></div>
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
