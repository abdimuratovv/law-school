import { useEffect,useState } from 'react';
import { Button } from '@/components/ui/basic';
import { useText } from '@/i18n/LanguageProvider';
import { teachingRequest } from '@/lib/teachingApi';

type Version={id:string;questionId:string;revision:number;stem:string;kind:'single'|'written';sourceNumber:number|null;sourceName:string|null;sourceId:string;sourceCreated:number};
export function PublishedQuestionPicker({selected,onChange}:{selected:string[];onChange:(ids:string[])=>void}){
  const t=useText();const [items,setItems]=useState<Version[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  const [from,setFrom]=useState(''),[until,setUntil]=useState('');
  useEffect(()=>{
    if(loading||error||!items.length)return;
    const ids=new Set(selected),known=new Set(items.map(q=>q.id));
    const ordered=[...items.filter(q=>ids.has(q.id)).map(q=>q.id),...selected.filter(id=>!known.has(id))];
    if(JSON.stringify(ordered)!==JSON.stringify(selected))onChange(ordered);
  },[items,loading,error,selected,onChange]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError(false);
    void(async()=>{
      try{
        const all:Version[]=[];let after='';
        do{
          const page=await teachingRequest<{items:Version[];next:string|null}>('/staff/question-versions?limit=100&after='+encodeURIComponent(after),null,undefined,'GET',controller.signal);
          all.push(...page.items);after=page.next??'';
        }while(after);
        // Keep each source file together; its row number is the authoritative order.
        const number=(q:Version)=>q.sourceNumber??Number(q.stem.match(/^\s*(\d+)[.)\s]/)?.[1]??Number.MAX_SAFE_INTEGER);
        all.sort((a,b)=>b.sourceCreated-a.sourceCreated||a.sourceId.localeCompare(b.sourceId)||number(a)-number(b)||a.id.localeCompare(b.id));
        setItems(all);
      }catch{if(!controller.signal.aborted)setError(true);}
      finally{if(!controller.signal.aborted)setLoading(false);}
    })();return()=>controller.abort();
  },[retry]);
  const number=(q:Version)=>q.sourceNumber??Number(q.stem.match(/^\s*(\d+)[.)\s]/)?.[1]??NaN);
  const invalid=!!from&&!!until&&Number(from)>Number(until);
  const visible=invalid?[]:items.filter(q=>(!from||number(q)>=Number(from))&&(!until||number(q)<=Number(until)));
  const selectedSet=new Set(selected),union=new Set([...selected,...visible.map(q=>q.id)]);
  function apply(ids:Set<string>){onChange([...items.filter(q=>ids.has(q.id)).map(q=>q.id),...selected.filter(id=>ids.has(id)&&!items.some(q=>q.id===id))]);}
  return <section className="authoring-card question-picker"><h2>{t('Published questions')}</h2>
    <p>{t('Selected: {count}',{count:selected.length})} / 100</p><p>{t('Questions appear to students in the order shown here. The selected published versions are preserved.')}</p>
    <div className="picker-tools"><div className="picker-range"><label>{t('From question number')}<input type="number" min="1" step="1" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>{t('To question number')}<input type="number" min={from||1} step="1" value={until} onChange={e=>setUntil(e.target.value)}/></label><Button size="sm" variant="plain" disabled={!from&&!until} onClick={()=>{setFrom('');setUntil('');}}>{t('Clear filters')}</Button></div>
    <div className="authoring-actions"><Button size="sm" variant="secondary" disabled={loading||error||!visible.length||union.size>100} onClick={()=>apply(union)}>{t('Select all results ({count})',{count:visible.length})}</Button><Button size="sm" variant="plain" disabled={!selected.length} onClick={()=>onChange([])}>{t('Clear selection')}</Button></div></div>
    {invalid&&<p role="alert">{t('The last question number must not be smaller than the first.')}</p>}
    {union.size>100&&<p role="status">{t('A test can contain up to 100 questions. Narrow the number range.')}</p>}
    {loading?<p role="status">{t('Loading')}</p>:error?<div role="alert"><p>{t('Could not load staff data.')}</p><Button onClick={()=>setRetry(value=>value+1)}>{t('Try again')}</Button></div>:<ul className="picker-list">{visible.map(q=><li key={q.id}><label className="picker-check"><input type="checkbox" checked={selectedSet.has(q.id)} disabled={!selectedSet.has(q.id)&&selected.length>=100} onChange={e=>{const next=new Set(selected);if(e.target.checked)next.add(q.id);else next.delete(q.id);apply(next);}} aria-label={t('Select question')+' '+(number(q)||q.stem)}/></label><span className="bank-number">{Number.isFinite(number(q))?number(q):'—'}</span><div><details><summary>{q.stem}</summary><p className="picker-full-text">{q.stem}</p></details><p className="fn l2">{t(q.kind==='single'?'Single choice':'Written')}{q.sourceName?' · '+q.sourceName:''}</p></div></li>)}</ul>}
    {!loading&&!error&&!visible.length&&<p>{t('No matching questions')}</p>}
  </section>;
}
