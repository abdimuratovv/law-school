import { useState } from 'react';
import type { BankQuestion } from '../../../shared/contracts/teaching';
import { Button } from '@/components/ui/basic';
import { SystemSelect } from '@/components/ui/SystemSelect';
import { useText } from '@/i18n/LanguageProvider';

export function CollectionQuestionPicker({items,selected,onChange,loading}:{items:BankQuestion[];selected:string[];onChange:(ids:string[])=>void;loading:boolean}){
 const t=useText();const [search,setSearch]=useState(''),[from,setFrom]=useState(''),[until,setUntil]=useState(''),[source,setSource]=useState('');
 const invalid=!!from&&!!until&&Number(until)<Number(from);
 const visible=invalid?[]:items.filter(q=>(!source||q.sourceName===source)&&q.stem.toLocaleLowerCase().includes(search.toLocaleLowerCase())&&(!from||(q.sourceNumber??0)>=Number(from))&&(!until||(q.sourceNumber??Infinity)<=Number(until)));
 const selectedSet=new Set(selected),all=new Set([...selected,...visible.map(q=>q.id)]);
 const apply=(next:Set<string>)=>onChange(items.filter(q=>next.has(q.id)).map(q=>q.id));
 return <section className="authoring-card question-picker"><h2>{t('Questions')}</h2><p>{t('Selected: {count}',{count:selected.length})} / 100</p>
  <p>{t('Choose questions. Publishing them is handled automatically with the collection.')}</p>
  <div className="picker-tools"><label>{t('Search questions')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><SystemSelect label={t('Source file')} icon="tests" value={source} options={[{value:'',label:t('All files')},...[...new Set(items.map(q=>q.sourceName).filter((name):name is string=>!!name))].map(name=>({value:name,label:name}))]} onChange={setSource}/><div className="picker-range"><label>{t('From question number')}<input type="number" min="1" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>{t('To question number')}<input type="number" min={from||1} value={until} onChange={e=>setUntil(e.target.value)}/></label></div>
   <div className="authoring-actions"><Button variant="secondary" size="sm" disabled={loading||!visible.length||all.size>100} onClick={()=>apply(all)}>{t('Select all results ({count})',{count:visible.length})}</Button><Button variant="plain" size="sm" disabled={!selected.length} onClick={()=>onChange([])}>{t('Clear selection')}</Button></div></div>
  {selected.length>100&&<p role="alert">{t('A test can contain up to 100 questions. Narrow the number range.')}</p>}
  {invalid&&<p role="alert">{t('The last question number must not be smaller than the first.')}</p>}
  {loading?<p role="status">{t('Loading')}</p>:<ul className="picker-list">{visible.map(q=><li key={q.id}><label className="picker-check"><input type="checkbox" aria-label={t('Select question')+' '+(q.sourceNumber??q.stem)} checked={selectedSet.has(q.id)} disabled={!selectedSet.has(q.id)&&selected.length>=100} onChange={e=>{const next=new Set(selected);if(e.target.checked)next.add(q.id);else next.delete(q.id);apply(next);}}/></label><span className="bank-number">{q.sourceNumber??'—'}</span><div><details><summary>{q.stem}</summary><p className="picker-full-text">{q.stem}</p></details><p className="fn l2">{q.sourceName??t('Created manually')}</p></div></li>)}</ul>}
 </section>;
}
