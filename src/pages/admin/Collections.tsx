import { useEffect,useState } from 'react';
import { Button } from '@/components/ui/basic';
import { Schedule } from '@/components/exam/Schedule';
import { useText } from '@/i18n/LanguageProvider';
import { useAuth } from '@/state/AuthState';
import { useNow } from '@/lib/hooks';
import { teachingRequest } from '@/lib/teachingApi';
import { ReopenAssignment } from './ReopenAssignment';

export type Collection={id:string;draftId:string;name:string;questionCount:number;opensAt:number|null;closesAt:number|null;retired:number;startEnabled:number|boolean;availabilityRevision:number;createdAt:number;attempts:number;completed:number};
type Draft={id:string;name:string;questionCount:number};
export default function Collections(){
 const t=useText(),{user,csrfToken}=useAuth(),now=useNow(1000);const [items,setItems]=useState<Collection[]>([]),[drafts,setDrafts]=useState<Draft[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[history,setHistory]=useState(false),[generation,setGeneration]=useState(0);
 const [busyId,setBusyId]=useState<string|null>(null),[notice,setNotice]=useState('');
 async function toggle(c:Collection){
  setBusyId(c.id);setNotice('');
  try{const updated=await teachingRequest<{startEnabled:boolean;availabilityRevision:number}>('/staff/collections/'+c.id+'/availability',csrfToken,{enabled:!c.startEnabled,revision:c.availabilityRevision});setItems(items=>items.map(item=>item.id===c.id?{...item,...updated}:item));setNotice(updated.startEnabled?'New attempts enabled.':'New attempts paused. Existing attempts can continue.');}
  catch{setNotice('Could not change availability. Reloaded the latest state; try again.');setGeneration(v=>v+1);}
  finally{setBusyId(null);}
 }
 useEffect(()=>{let active=true;setLoading(true);setError(false);void(async()=>{
  try{
   const all:Collection[]=[],saved:Draft[]=[];let after:string|null='';
   do{const data:{items:Collection[];next:string|null}=await teachingRequest('/staff/collections?limit=100&after='+after);all.push(...data.items);after=data.next;}while(after);
   after='';do{const data:{items:Draft[];next:string|null}=await teachingRequest('/staff/collections/drafts?limit=100&after='+after);saved.push(...data.items);after=data.next;}while(after);
   if(active){setItems(all.sort((a,b)=>b.createdAt-a.createdAt));setDrafts(saved);}
  }catch{if(active)setError(true);}finally{if(active)setLoading(false);}
 })();return()=>{active=false;};},[generation]);
 return <section className="authoring-page collections-page" data-no-translate><header><div><h1>{t('Test collections')}</h1><p>{t('Control when users can start each test. New collections start paused.')}</p></div><Button to="/admin/builder" icon="plus">{t('Create collection')}</Button></header>
  {notice&&<p role="status">{t(notice)}</p>}
  {loading&&<p role="status">{t('Loading')}</p>}{error&&<div role="alert"><p>{t('Could not load staff data.')}</p><Button onClick={()=>setGeneration(v=>v+1)}>{t('Try again')}</Button></div>}
  {!loading&&!error&&!items.length&&!drafts.length&&<div className="authoring-card authoring-empty"><h2>{t('Create your first collection')}</h2><p>{t('Import a question file or choose questions from the bank, then publish once.')}</p><Button to="/admin/builder">{t('Create collection')}</Button></div>}
  {!!drafts.length&&<section className="collection-drafts"><h2>{t('Drafts')}</h2>{drafts.map(d=><article className="collection-draft" key={d.id}><div><strong>{d.name||t('Untitled draft')}</strong><p>{t('Questions: {count}',{count:d.questionCount})}</p></div><Button variant="secondary" size="sm" to={'/admin/builder?draft='+d.id}>{t('Continue editing')}</Button></article>)}</section>}
  <div className="collection-grid">{items.filter(c=>history||!c.retired).map(c=>{
   const closed=c.retired||c.closesAt!==null&&c.closesAt<=now;
   return <article className="authoring-card collection-card" key={c.id}><div className="collection-card-head"><span className="bank-status">{t(c.retired?'Archived':closed?'Closed':!c.startEnabled?'New attempts paused':c.opensAt!==null&&c.opensAt>now?'Not open yet':'Available now')}</span><span className="fn">{t('Questions: {count}',{count:c.questionCount})}</span></div><h2>{c.name}</h2><Schedule opensAt={c.opensAt} closesAt={c.closesAt}/>{c.opensAt===null&&<p>{t('Untimed')}</p>}<p>{t('Attempts')}: <strong>{c.attempts}</strong> · {t('Completed')}: <strong>{c.completed}</strong></p>
    <div className="authoring-actions">{user?.role==='admin'&&!closed&&<Button size="sm" variant={c.startEnabled?'secondary':'primary'} icon={c.startEnabled?'pause':'play'} disabled={!!busyId} aria-pressed={!!c.startEnabled} aria-label={t(c.startEnabled?'Pause new attempts':'Enable new attempts')+': '+c.name} onClick={()=>{void toggle(c);}}>{t(busyId===c.id?'Loading':c.startEnabled?'Pause new attempts':'Enable new attempts')}</Button>}<Button size="sm" to={'/admin/results?collection='+c.id}>{t('View results')}</Button><Button size="sm" variant="plain" to={'/admin/builder?draft='+c.draftId}>{t('Edit collection')}</Button>{!closed&&<Button size="sm" variant="plain" to={'/tests/c_'+c.id}>{t('Open test')}</Button>}</div>
    {user?.role==='admin'&&!c.retired&&c.closesAt!==null&&closed&&<ReopenAssignment id={c.id} collection onReopened={()=>setGeneration(v=>v+1)}/>}
   </article>;
  })}</div>
  {items.some(c=>c.retired)&&<Button variant="plain" onClick={()=>setHistory(v=>!v)}>{t(history?'Hide archived collections':'Show archived collections')}</Button>}
 </section>;
}
