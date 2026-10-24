import { useEffect,useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { QuestionBankPage } from '../../../shared/contracts/teaching';
import { Button } from '@/components/ui/basic';
import { Icon } from '@/components/ui/Icon';
import { SystemSelect } from '@/components/ui/SystemSelect';
import { TOPICS } from '@/data/topics';
import { useText } from '@/i18n/LanguageProvider';
import { teachingRequest } from '@/lib/teachingApi';

export default function ServerBank(){
  const t=useText();const [params,setParams]=useSearchParams();
  const [search,setSearch]=useState(params.get('search')??'');
  const [data,setData]=useState<QuestionBankPage>(),[error,setError]=useState(false),[busy,setBusy]=useState(true),[retry,setRetry]=useState(0);
  const query=params.toString();
  function change(key:string,value:string){setParams(previous=>{const next=new URLSearchParams(previous);next.delete('page');if(value&&value!=='all')next.set(key,value);else next.delete(key);return next;},{replace:true});}
  useEffect(()=>{setSearch(params.get('search')??'');},[query]);
  useEffect(()=>{const timer=setTimeout(()=>{if(search!==(params.get('search')??''))change('search',search.trim());},300);return()=>clearTimeout(timer);},[search,query]);
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
      <div className="bank-filters">
        <label className="bank-search"><span>{t('Search questions')}</span><div><Icon name="search"/><input type="search" maxLength={200} value={search} placeholder={t('Search question text…')} onChange={e=>setSearch(e.target.value)}/></div></label>
        <SystemSelect label={t('Question type')} icon="tests" value={params.get('kind')??'all'} onChange={value=>change('kind',value)} options={[{value:'all',label:t('All')},{value:'single',label:t('Single choice')},{value:'written',label:t('Written')}]}/>
        <SystemSelect label={t('Topic')} icon="logo" value={params.get('topic')??'all'} onChange={value=>change('topic',value)} options={[{value:'all',label:t('All')},...Object.entries(TOPICS).map(([value,topic])=>({value,label:t(topic.name)}))]}/>
        <SystemSelect label={t('Status')} icon="check" value={params.get('status')??'all'} onChange={value=>change('status',value)} options={[{value:'all',label:t('All')},{value:'draft',label:t('Draft')},{value:'published',label:t('Published')}]}/>
      </div>
      <div className="bank-list-heading"><span role="status">{busy?t('Loading'):t('{count} questions',{count:data?.total??0})}</span><span>{t('Newest imports first · original file order')}</span></div>
      {error?<div className="authoring-empty" role="alert"><p>{t('Could not load staff data.')}</p><Button variant="secondary" onClick={()=>setRetry(value=>value+1)}>{t('Try again')}</Button></div>:<div className="bank-list" aria-busy={busy} style={busy?{opacity:.55}:undefined}>
        {data?.items.map(q=><article key={q.id} className="bank-row">
          <span className="bank-number" aria-label={t('Question')}>{q.sourceNumber??'—'}</span>
          <div className="bank-row-body"><div className="bank-meta"><span className="bank-kind">{t(q.kind==='single'?'Single choice':'Written')}</span><span>{t(TOPICS[q.topic].name)}</span><span className={'bank-status'+(q.published?' is-published':'')}>{t(q.published?'Published':'Draft')}</span></div>
            <details className="bank-question"><summary><span>{q.stem||t('Untitled draft')}</span><Icon name="down" size="s"/></summary><p className="bank-full-text">{q.stem}</p></details>
            <div className="bank-source" title={q.sourceName??''}>{q.sourceName??t('Created manually')}</div>
          </div><Button variant="plain" size="sm" icon="pencil" to={'/admin/editor/'+q.id} aria-label={t('Edit question')+' '+(q.sourceNumber??'')}>{t('Edit question')}</Button>
        </article>)}
        {!busy&&data?.total===0&&<div className="authoring-empty"><Icon name="tests"/><h2>{t('No matching questions')}</h2><p>{t('Change the filters or import a question file.')}</p><Button variant="secondary" onClick={()=>{setSearch('');setParams({});}}>{t('Clear filters')}</Button></div>}
      </div>}
      <footer className="bank-pagination"><span>{t('Page {page} of {pages}',{page:currentPage,pages})}</span><div><Button size="sm" variant="secondary" icon="back" disabled={busy||error||currentPage<=1} onClick={()=>go(currentPage-1)}>{t('Previous')}</Button><Button size="sm" variant="secondary" iconEnd="forward" disabled={busy||error||currentPage>=pages} onClick={()=>go(currentPage+1)}>{t('Next')}</Button></div></footer>
    </div>
  </section>;
}
