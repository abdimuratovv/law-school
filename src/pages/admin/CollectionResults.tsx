import { useEffect,useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/basic';
import { SystemSelect } from '@/components/ui/SystemSelect';
import { useText,useFormatting } from '@/i18n/LanguageProvider';
import { teachingRequest } from '@/lib/teachingApi';
import { ServerGrading } from './ServerTeaching';
import type { Collection } from './Collections';
import { testLanguageLabel, type TestLanguage } from '../../../shared/contracts/languages';

type ResultRow={id:string;name?:string;language?:TestLanguage;student:string;email:string;state:string;startedAt:number;submittedAt:number|null;result:{units:number;maxUnits:number;pending:number;final:boolean}|null};
export default function CollectionResults(){
 const t=useText(),format=useFormatting();const [params,setParams]=useSearchParams(),id=params.get('collection');
 const [collections,setCollections]=useState<Collection[]>([]),[items,setItems]=useState<ResultRow[]>([]),[next,setNext]=useState<string|null>(null),[summary,setSummary]=useState<{participants:number;averagePercent:number|null}>(),[loading,setLoading]=useState(false),[error,setError]=useState(false),[generation,setGeneration]=useState(0);
 useEffect(()=>{let active=true;void(async()=>{try{const all:Collection[]=[];let after:string|null='';do{const data:{items:Collection[];next:string|null}=await teachingRequest('/staff/collections?limit=100&after='+after);all.push(...data.items);after=data.next;}while(after);if(active)setCollections(all);}catch{if(active)setError(true);}})();return()=>{active=false;};},[generation]);
 const path=id?'/staff/collections/'+id+'/results':'/staff/collections/results';
 async function load(after=''){setLoading(true);setError(false);try{const data=await teachingRequest<{items:ResultRow[];next:string|null;summary?:{participants:number;averagePercent:number|null}}>(path+'?after='+encodeURIComponent(after));setItems(old=>after?[...old,...data.items]:data.items);setNext(data.next);setSummary(data.summary);}catch{setError(true);}finally{setLoading(false);}}
 useEffect(()=>{let active=true;setLoading(true);setError(false);setItems([]);setSummary(undefined);void teachingRequest<{items:ResultRow[];next:string|null;summary?:{participants:number;averagePercent:number|null}}>(path).then(data=>{if(active){setItems(data.items);setNext(data.next);setSummary(data.summary);}}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[path,generation]);
 if(params.has('attempt')||params.has('review'))return <><div className="authoring-page"><Button variant="secondary" to="/admin/results">{t('All results')}</Button></div><ServerGrading/></>;
 return <section className="authoring-page" data-no-translate><header><h1>{t('Results')}</h1><Button variant="secondary" to="/admin/results?review=1" icon="pencil">{t('Awaiting grading')}</Button></header><section className="authoring-card"><SystemSelect label={t('Test collection')} icon="tests" value={id??''} options={[{value:'',label:t('All collections')},...collections.map(c=>({value:c.id,label:c.name+' · '+format.date(c.opensAt??c.createdAt,true)}))]} onChange={value=>setParams(value?{collection:value}:{})}/>{summary&&<p>{t('Participants')}: <strong>{summary.participants}</strong> · {t('Average result')}: <strong>{summary.averagePercent==null?'—':format.number(Math.round(summary.averagePercent))+'%'}</strong></p>}</section>
  {error&&<div role="alert"><p>{t('Could not load staff data.')}</p><Button onClick={()=>setGeneration(v=>v+1)}>{t('Try again')}</Button></div>}{loading&&<p role="status">{t('Loading')}</p>}
  <div className="authoring-table"><table><thead><tr><th>{t('Student')}</th><th>{t('Test collection')}</th><th>{t('Test language')}</th><th>{t('Score')}</th><th>{t('Status')}</th><th>{t('Submitted at')}</th><th>{t('Actions')}</th></tr></thead><tbody>{items.map(row=><tr key={row.id}><td><strong>{row.student}</strong><div className="fn">{row.email}</div></td><td>{row.name??collections.find(c=>c.id===id)?.name??'—'}</td><td>{testLanguageLabel(row.language??'uz')}</td><td>{row.result?format.number(row.result.units/2)+' / '+format.number(row.result.maxUnits/2):'—'}</td><td>{t(row.state==='active'?'In progress':row.result?.pending?'Awaiting grading':'Completed')}</td><td>{format.date(row.submittedAt??row.startedAt,true)}</td><td>{row.state==='final'&&<Button size="sm" variant="plain" to={'/admin/results?attempt='+row.id}>{t('Open review')}</Button>}</td></tr>)}</tbody></table></div>
  {!loading&&!error&&!items.length&&<p>{t('No results yet. Results appear automatically after users take a test.')}</p>}{next&&<Button variant="secondary" disabled={loading} onClick={()=>{void load(next);}}>{t('Load more')}</Button>}
 </section>;
}
