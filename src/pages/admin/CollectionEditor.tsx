import { useEffect,useRef,useState } from 'react';
import { useBlocker,useSearchParams } from 'react-router-dom';
import type { BankQuestion,BulkPublishResult,QuestionBankPage,TeachingDraft,TestDraftContent } from '../../../shared/contracts/teaching';
import { Button } from '@/components/ui/basic';
import { SystemSelect } from '@/components/ui/SystemSelect';
import { useText } from '@/i18n/LanguageProvider';
import { useAuth } from '@/state/AuthState';
import { teachingRequest,tashkentInput,tashkentTimestamp } from '@/lib/teachingApi';
import { CollectionQuestionPicker } from './CollectionQuestionPicker';

const empty=():TestDraftContent=>({name:'',mode:'mock',durationSeconds:null,questionVersionIds:[],questionDraftIds:[],isPublic:false,opensAt:null,closesAt:null});
export default function CollectionEditor(){const [params]=useSearchParams();return <Editor key={params.toString()} draftId={params.get('draft')} importId={params.get('import')}/>;}
function Editor({draftId,importId}:{draftId:string|null;importId:string|null}){
 const t=useText(),{csrfToken}=useAuth();const [value,setValue]=useState(empty),[items,setItems]=useState<BankQuestion[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[progress,setProgress]=useState('');
 const [saved,setSaved]=useState(()=>JSON.stringify(empty())),[collection,setCollection]=useState<string>();
 const [failedIds,setFailedIds]=useState<string[]>([]);const [availability,setAvailability]=useState('always');
 const draft=useRef<TeachingDraft<TestDraftContent>>(),operation=useRef(crypto.randomUUID());
 const selected=value.questionDraftIds??[];const dirty=JSON.stringify(value)!==saved;
 const blocker=useBlocker(dirty&&!busy);
 useEffect(()=>{let active=true;void(async()=>{
  try{
   const all:BankQuestion[]=[];let page=1,total=1;
   while(all.length<total){const data=await teachingRequest<QuestionBankPage>('/staff/question-bank?page='+page);all.push(...data.items);total=data.total;if(!data.items.length)break;page++;}
   if(!active)return;setItems(all);
   if(draftId){const data=await teachingRequest<TeachingDraft<TestDraftContent>>('/staff/collections/draft/'+draftId);if(!active)return;draft.current=data;setAvailability(data.content.opensAt==null?'always':'scheduled');setValue(data.content);setSaved(JSON.stringify(data.content));}
   else if(importId){const data=await teachingRequest<{ids:string[];name:string}>('/staff/collections/import/'+importId);if(active)setValue({...empty(),name:data.name,questionDraftIds:data.ids});}
  }catch{if(active)setError('Could not load staff data.');}finally{if(active)setLoading(false);}
 })();return()=>{active=false;};},[draftId,importId]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 async function persist(content:TestDraftContent){
  let data:TeachingDraft<TestDraftContent>;
  if(draft.current&&JSON.stringify(draft.current.content,Object.keys(draft.current.content).sort())===JSON.stringify(content,Object.keys(content).sort()))return draft.current;
  if(draft.current)data=await teachingRequest('/staff/tests/'+draft.current.id,csrfToken,{revision:draft.current.revision,content},'PATCH');
  else{
   try{data=await teachingRequest('/staff/tests',csrfToken,{operationId:operation.current,content});}
   catch(original){
    try{const known=await teachingRequest<TeachingDraft<TestDraftContent>>('/staff/tests/'+operation.current);draft.current=known;
     data=JSON.stringify(known.content)===JSON.stringify(content)?known:await teachingRequest('/staff/tests/'+known.id,csrfToken,{revision:known.revision,content},'PATCH');
    }catch{throw original;}
   }
  }
  draft.current=data;setValue(content);setSaved(JSON.stringify(content));return data;
 }
 async function save(){setBusy(true);setError('');try{await persist(value);setMessage('Draft saved on server.');}catch{setError('Could not save. Keep this page open and try again.');}finally{setBusy(false);}}
 async function publish(){
  if(!selected.length||selected.length>100)return;setBusy(true);setError('');setMessage('');setCollection(undefined);setFailedIds([]);
  try{
   if(!value.name.trim()||(availability==='scheduled'&&(value.opensAt==null||value.closesAt==null))||((value.opensAt==null)!==(value.closesAt==null))||(value.closesAt!=null&&(value.closesAt<=Date.now()||value.closesAt<=(value.opensAt??0)))){setError('Enter a collection name and a valid availability window.');return;}
   const versions=new Map<string,string>();
   for(let i=0;i<selected.length;i+=5){
    const batch=selected.slice(i,i+5).map(id=>{const q=items.find(q=>q.id===id);if(!q)throw new Error('Missing question');return {id,revision:q.revision};});
    setProgress(t('Preparing questions: {done} / {total}',{done:i,total:selected.length}));
    const result=await teachingRequest<BulkPublishResult>('/staff/question-bank/publish',csrfToken,{items:batch});
    const failed=result.results.filter(r=>r.status==='failed');
    if(failed.length){setFailedIds(failed.map(r=>r.id));setError('Some questions need attention before this collection can be published.');setMessage(failed.map(r=>t('Question')+' '+(items.find(q=>q.id===r.id)?.sourceNumber??'—')).join(', '));return;}
    for(const r of result.results)if(r.status==='published')versions.set(r.id,r.versionId);
   }
   setProgress(t('Publishing collection…'));
   const content={...value,isPublic:false,questionVersionIds:selected.map(id=>versions.get(id)!)};
   const savedDraft=await persist(content);
   const result=await teachingRequest<{id:string}>('/staff/collections',csrfToken,{draftId:savedDraft.id,revision:savedDraft.revision});
   setCollection(result.id);setMessage('Collection published. Every registered user can now see it.');
  }catch{setError('Could not publish the collection. Saved progress is safe; try again.');}finally{setBusy(false);setProgress('');}
 }
 return <section className="authoring-page collection-editor" data-no-translate><header><div><h1>{t('Create collection')}</h1><p>{t('Publish once. All registered users can access the collection.')}</p></div><div className="authoring-actions"><Button to="/admin" variant="plain">{t('Test collections')}</Button><Button to="/admin/import" variant="secondary" icon="upload">{t('Import questions')}</Button></div></header>
  {error&&<div className="authoring-card" role="alert"><p>{t(error)}</p>{error==='Could not load staff data.'&&<Button onClick={()=>window.location.reload()}>{t('Try again')}</Button>}{failedIds.map(id=><a href={'/admin/editor/'+id} target="_blank" rel="noreferrer" key={id}>{t('Edit question')} {items.find(q=>q.id===id)?.sourceNumber??'—'}</a>)}{!!failedIds.length&&<Button variant="secondary" onClick={()=>{void Promise.all(failedIds.map(id=>teachingRequest<{id:string;revision:number}>('/staff/questions/'+id))).then(rows=>{setItems(old=>old.map(q=>{const row=rows.find(r=>r.id===q.id);return row?{...q,revision:row.revision}:q;}));setFailedIds([]);setError('');}).catch(()=>setError('Could not load staff data.'));}}>{t('Refresh questions')}</Button>}</div>}
  <fieldset className="authoring-form" disabled={busy||loading}><legend className="sr-only">{t('Collection settings')}</legend><section className="authoring-card"><label>{t('Collection name')}<input value={value.name} maxLength={200} onChange={e=>setValue(v=>({...v,name:e.target.value}))}/></label>
   <SystemSelect label={t('Availability')} icon="clock" value={availability} options={[{value:'always',label:t('Always available')},{value:'scheduled',label:t('Scheduled window')}]} onChange={mode=>{setAvailability(mode);setValue(v=>({...v,opensAt:mode==='always'?null:Math.floor(Date.now()/60000)*60000-60000,closesAt:mode==='always'?null:Math.floor(Date.now()/60000)*60000+7200000}));}}/>
   {availability==='scheduled'&&<><p>{t('This test uses a shared opening time and deadline. There is no personal timer.')}</p><div className="authoring-grid"><label>{t('Available from')}<input type="datetime-local" value={value.opensAt!=null?tashkentInput(value.opensAt):''} onChange={e=>setValue(v=>({...v,opensAt:e.target.value?Date.parse(tashkentTimestamp(e.target.value)):null}))}/></label><label>{t('Available until')}<input type="datetime-local" value={value.closesAt!=null?tashkentInput(value.closesAt):''} onChange={e=>setValue(v=>({...v,closesAt:e.target.value?Date.parse(tashkentTimestamp(e.target.value)):null}))}/></label></div><p>{t('Tashkent time (UTC+05:00)')}</p></>}
  </section><CollectionQuestionPicker items={items} selected={selected} loading={loading} onChange={ids=>setValue(v=>({...v,questionDraftIds:ids}))}/></fieldset>
  <footer className="collection-save"><p role="status">{progress||t(message)}</p><div className="authoring-actions"><Button variant="secondary" disabled={busy||loading} onClick={()=>{void save();}}>{t('Save draft')}</Button><Button disabled={busy||loading||!value.name.trim()||!selected.length||selected.length>100} icon="check" onClick={()=>{void publish();}}>{t('Publish collection')}</Button></div></footer>
  {collection&&<div className="authoring-actions"><Button to={'/tests/c_'+collection} variant="secondary">{t('Open test')}</Button><Button to={'/admin/results?collection='+collection} variant="secondary">{t('View results')}</Button></div>}
  {blocker.state==='blocked'&&<section className="authoring-card" role="alertdialog" aria-labelledby="collection-unsaved"><h2 id="collection-unsaved">{t('Leave with unsaved changes?')}</h2><p>{t('Save this draft before leaving, or discard these unsaved edits.')}</p><div className="authoring-actions"><Button onClick={()=>blocker.reset()}>{t('Keep working')}</Button><Button variant="secondary" onClick={()=>blocker.proceed()}>{t('Discard and leave')}</Button></div></section>}
 </section>;
}
