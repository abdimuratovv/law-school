import { useEffect,useRef,useState,type ReactNode } from 'react';
import { useBlocker,useNavigate,useParams,useSearchParams } from 'react-router-dom';
import type { QuestionDraftContent,TeachingDraft,TestDraftContent } from '../../../shared/contracts/teaching';
import { questionDraftContentSchema,testDraftContentSchema } from '../../../shared/contracts/teaching';
import type { StudentQuestion } from '../../../shared/contracts/questions';
import { Button,Checkbox,Segmented } from '@/components/ui/basic';
import { useAuth } from '@/state/AuthState';
import { useText } from '@/i18n/LanguageProvider';
import { TOPICS } from '@/data/topics';
import { ExamError } from '@/lib/examApi';
import { teachingRequest,tashkentInput,tashkentTimestamp } from '@/lib/teachingApi';
import { ReopenAssignment } from './ReopenAssignment';
import { PublishedQuestionPicker } from './PublishedQuestionPicker';
import { useNow } from '@/lib/hooks';

type Page<T>={items:T[];next:string|null};
function Status({message}:{message:string}){const t=useText();return message?<p role="status" className="review-feedback">{t(message)}</p>:null;}
function usePage<T>(path:string){
  const [items,setItems]=useState<T[]>([]),[next,setNext]=useState<string|null>(null),[message,setMessage]=useState('Loading'),[busy,setBusy]=useState(false);
  const epoch=useRef(0);
  async function load(after=''){
    const ticket=++epoch.current;setBusy(true);
    try{const data=await teachingRequest<Page<T>>(path+(path.includes('?')?'&':'?')+'after='+encodeURIComponent(after));if(ticket!==epoch.current)return;setItems(previous=>after?[...previous,...data.items]:data.items);setNext(data.next);setMessage('');}
    catch{if(ticket===epoch.current)setMessage('Could not load staff data.');}finally{if(ticket===epoch.current)setBusy(false);}
  }
  useEffect(()=>{setItems([]);setNext(null);void load();return()=>{epoch.current++;};},[path]);
  return {items,next,message,busy,load};
}
function More<T>({page}:{page:ReturnType<typeof usePage<T>>}){const t=useText();return <><Status message={page.message}/>{page.next&&<Button variant="secondary" disabled={page.busy} onClick={()=>{void page.load(page.next!);}}>{t('Load more')}</Button>}{page.message==='Could not load staff data.'&&<Button onClick={()=>{void page.load();}}>{t('Try again')}</Button>}</>;}
function UnsavedGuard({dirty}:{dirty:boolean}){
  const t=useText();const blocker=useBlocker(dirty);
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  return blocker.state==='blocked'?<section className="authoring-card" role="alertdialog" aria-labelledby="unsaved-title"><h2 id="unsaved-title">{t('Leave with unsaved changes?')}</h2><p>{t('Save this draft before leaving, or discard these unsaved edits.')}</p><Button onClick={()=>blocker.reset()}>{t('Keep working')}</Button><Button variant="secondary" onClick={()=>blocker.proceed()}>{t('Discard and leave')}</Button></section>:null;
}
const emptyQuestion=():QuestionDraftContent=>({kind:'single',topic:'constitutional',stem:'',options:[{id:'o1',text:''},{id:'o2',text:''},{id:'o3',text:''},{id:'o4',text:''}],correctOptionId:null,accepted:[],explanation:''});
function useDraft<T>(kind:'questions'|'tests',id:string|undefined,initial:()=>T,parse:(value:unknown)=>T){
  const {csrfToken}=useAuth();const t=useText();const [draft,setDraft]=useState<TeachingDraft<T>>(),[value,setValue]=useState<T>(initial),[saved,setSaved]=useState(()=>JSON.stringify(initial()));
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(!id),[version,setVersion]=useState<string|null>(null),[conflict,setConflict]=useState(false);
  const operation=useRef(crypto.randomUUID());const epoch=useRef(0);
  const dirty=JSON.stringify(value)!==saved;
  const accept=(data:TeachingDraft<T>)=>{const content=parse(data.content);setDraft({...data,content});setValue(content);setSaved(JSON.stringify(content));setVersion(data.publishedVersionId);setConflict(false);setLoaded(true);};
  async function load(discard=false){
    if(discard&&!window.confirm(t('Discard unsaved edits and load the saved server version?')))return;
    const target=id??draft?.id??operation.current;const ticket=++epoch.current;setBusy(true);
    try{const data=await teachingRequest<TeachingDraft<T>>('/staff/'+kind+'/'+target);if(ticket===epoch.current){accept(data);setMessage('Saved draft loaded.');}}
    catch{if(ticket===epoch.current)setMessage('Could not load staff data.');}finally{if(ticket===epoch.current)setBusy(false);}
  }
  useEffect(()=>{if(id)void load();return()=>{epoch.current++;};},[id]);
  async function save(){
    setBusy(true);setMessage('');try{
      const content=parse(value);const data=await teachingRequest<TeachingDraft<T>>('/staff/'+kind+(draft?'/'+draft.id:''),csrfToken,draft?{revision:draft.revision,content}:{operationId:operation.current,content},draft?'PATCH':'POST');
      accept(data);setMessage('Draft saved on server.');
    }catch(error){setMessage(error instanceof ExamError&&error.status===409?'This draft changed. Your unsaved edits are still here.':'Could not save. Keep this page open and try again.');if(error instanceof ExamError&&error.status===409)setConflict(true);}finally{setBusy(false);}
  }
  async function publish(){
    if(!draft||dirty)return;setBusy(true);setMessage('');try{const data=await teachingRequest<{versionId:string}>('/staff/'+kind+'/'+draft.id+'/publish',csrfToken,{revision:draft.revision});setVersion(data.versionId);setDraft({...draft,publishedRevision:draft.revision,publishedVersionId:data.versionId});setMessage('Published. Existing attempts keep their earlier versions.');}
    catch(error){setMessage(error instanceof ExamError&&error.status===409?'This draft changed. Your unsaved edits are still here.':'Could not publish. Complete all required fields and check access.');}finally{setBusy(false);}
  }
  return {draft,value,setValue,dirty,message,busy,loaded,version,conflict,save,publish,load};
}
function DraftActions<T>({draft}:{draft:ReturnType<typeof useDraft<T>>}){
  const t=useText();return <><Status message={draft.message}/><div className="authoring-actions"><Button data-testid="save-draft" disabled={draft.busy||draft.conflict} onClick={()=>{void draft.save();}}>{t('Save draft')}</Button><Button data-testid="publish-draft" variant="secondary" disabled={draft.busy||draft.dirty||!draft.draft||draft.conflict} onClick={()=>{void draft.publish();}}>{t('Publish saved version')}</Button><Button variant="plain" disabled={draft.busy} onClick={()=>{void draft.load(true);}}>{t('Reload saved version')}</Button></div><p className="fn l2">{t(draft.dirty?'Unsaved changes':'Saved changes only can be published')}</p><UnsavedGuard dirty={draft.dirty}/></>;
}
export { default as ServerBank } from './ServerBank';
export function ServerEditor(){const {id}=useParams();return <QuestionEditor key={id??'new'} id={id}/>;}
function QuestionEditor({id}:{id?:string}){
  const t=useText();const draft=useDraft('questions',id,emptyQuestion,value=>questionDraftContentSchema.parse(value));const v=draft.value;
  const [models,setModels]=useState('');const [blocksText,setBlocksText]=useState({terms:'',defs:''});
  useEffect(()=>{setModels(v.accepted.join('\n'));setBlocksText({terms:(v.terms??[]).map(item=>item.t).join('\n'),defs:(v.defs??[]).map(item=>item.t).join('\n')});},[draft.draft]);
  const set=<K extends keyof QuestionDraftContent>(key:K,value:QuestionDraftContent[K])=>draft.setValue(previous=>({...previous,[key]:value}));
  const blocks=(key:'terms'|'defs',text:string)=>set(key,text.split('\n').filter(line=>line.trim()).map((line,i)=>({k:String(i+1),t:line})));
  if(!draft.loaded)return <div className="authoring-page"><Status message={draft.message||'Loading'}/><Button onClick={()=>{void draft.load();}}>{t('Try again')}</Button></div>;
  return <div className="authoring-page" data-no-translate><header><h1>{t(id?'Edit question':'New question')}</h1><Button variant="secondary" to="/admin/bank">{t('Question bank')}</Button></header>
    <fieldset disabled={draft.busy} className="authoring-form"><legend className="sr-only">{t('Question fields')}</legend><section className="authoring-card"><h2>{t('Question content')}</h2>
    <Segmented label={t('Question type')} value={v.kind} onChange={value=>set('kind',value)} options={[{value:'single',label:t('Single choice')},{value:'written',label:t('Written')}]}/>
    <label htmlFor="md">{t('Full question text')}</label><textarea id="md" lang="kaa" rows={5} value={v.stem} onChange={e=>set('stem',e.target.value)}/>
    <label htmlFor="question-topic">{t('Topic')}</label><select id="question-topic" value={v.topic} onChange={e=>set('topic',e.target.value as typeof v.topic)}>{Object.entries(TOPICS).map(([key,topic])=><option key={key} value={key}>{t(topic.name)}</option>)}</select></section>
    <section className="authoring-card"><h2>{t('Answer key')}</h2>{v.kind==='single'?<><fieldset><legend>{t('Enter four options and choose one correct answer.')}</legend>{v.options.map((option,i)=><div className="authoring-option" key={option.id}><label><input type="radio" name="correct-option" checked={v.correctOptionId===option.id} onChange={()=>set('correctOptionId',option.id)}/>{t('Correct answer')} {'ABCD'[i]}</label><label className="sr-only" htmlFor={'option-'+i}>{t('Option')} {'ABCD'[i]}</label><input id={'option-'+i} lang="kaa" value={option.text} onChange={e=>set('options',v.options.map(o=>o.id===option.id?{...o,text:e.target.value}:o) as typeof v.options)}/></div>)}</fieldset><details><summary>{t('Matching blocks (optional)')}</summary>{(['terms','defs'] as const).map(key=><label key={key}>{t(key==='terms'?'Terms':'Definitions')}<textarea rows={3} lang="kaa" value={blocksText[key]} onChange={e=>{setBlocksText(previous=>({...previous,[key]:e.target.value}));blocks(key,e.target.value);}}/></label>)}</details></>:<><label htmlFor="accepted">{t('Accepted answers, one per line')}</label><textarea id="accepted" lang="kaa" rows={4} value={models} onChange={e=>{setModels(e.target.value);set('accepted',e.target.value.split('\n').map(line=>line.trim()).filter(Boolean));}}/><p>{t('Leave accepted answers empty to require manual review.')}</p></>}
    <label htmlFor="explanation">{t('Explanation')}</label><textarea id="explanation" lang="kaa" rows={3} value={v.explanation} onChange={e=>set('explanation',e.target.value)}/></section>
    <section className="authoring-card"><h2>{t('Legal basis (optional)')}</h2><label>{t('Legal label')}<input value={v.legal?.label??''} onChange={e=>set('legal',e.target.value||v.legal?.url?{label:e.target.value,url:v.legal?.url??''}:undefined)}/></label><label>{t('Source link')}<input type="url" value={v.legal?.url??''} onChange={e=>set('legal',e.target.value||v.legal?.label?{url:e.target.value,label:v.legal?.label??''}:undefined)}/></label><p>{t('Source links must use HTTPS.')}</p></section></fieldset>
    <Status message={draft.message}/><div className="authoring-actions"><Button disabled={draft.busy||draft.conflict} onClick={()=>{void draft.save();}}>{t('Save question')}</Button><Button variant="secondary" to="/admin/bank">{t('Question bank')}</Button></div><UnsavedGuard dirty={draft.dirty}/>
  </div>;
}
const emptyTest=():TestDraftContent=>({name:'',mode:'mock',durationSeconds:null,questionVersionIds:[],isPublic:false});
type Group={id:string;name:string};
function useGroups(){const [groups,setGroups]=useState<Group[]>([]),[error,setError]=useState(false);async function load(){setError(false);try{const all:Group[]=[];let cursor:string|null=null;do{const page:{groups:Group[];nextCursor:string|null}=await teachingRequest<{groups:Group[];nextCursor:string|null}>('/groups?limit=100'+(cursor?'&cursor='+cursor:''));all.push(...page.groups);cursor=page.nextCursor;}while(cursor&&all.length<1000);setGroups(all);}catch{setError(true);}}useEffect(()=>{void load();},[]);return {groups,error,load};}
export function ServerBuilder(){const [params]=useSearchParams();const id=params.get('draft')??undefined;return <TestBuilder key={id??'new'} id={id}/>;}
function TestBuilder({id}:{id?:string}){
  const t=useText();const {csrfToken}=useAuth();const draft=useDraft('tests',id,emptyTest,value=>testDraftContentSchema.parse(value));const v=draft.value;
  const groups=useGroups();const tests=usePage<TeachingDraft<TestDraftContent>>('/staff/tests');
  const [groupId,setGroupId]=useState(''),[opens,setOpens]=useState(()=>tashkentInput(Date.now()-60000)),[closes,setCloses]=useState(()=>tashkentInput(Date.now()+86400000)),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const operation=useRef<{body:string;id:string}>();const navigate=useNavigate();
  const set=<K extends keyof TestDraftContent>(key:K,value:TestDraftContent[K])=>draft.setValue(previous=>({...previous,[key]:value}));
  async function assign(){if(!draft.version||draft.dirty)return;setBusy(true);try{
    const body={testVersionId:draft.version,groupId,timeZone:'Asia/Tashkent',opensAt:tashkentTimestamp(opens),closesAt:tashkentTimestamp(closes)};const serialized=JSON.stringify(body);
    if(operation.current?.body!==serialized)operation.current={body:serialized,id:crypto.randomUUID()};
    await teachingRequest('/staff/assignments',csrfToken,{...body,operationId:operation.current.id});setMessage('Test assigned to the group.');
  }catch{setMessage('Could not assign. Check the group, published version and Tashkent schedule.');}finally{setBusy(false);}}
  return <div className="authoring-page" data-no-translate><header><h1>{t('Test builder')}</h1><Button to="/admin" variant="secondary">{t('Overview')}</Button></header>
    <section className="authoring-card"><label>{t('Open a saved test')}<select value={id??''} onChange={e=>navigate('/admin/builder'+(e.target.value?'?draft='+e.target.value:''))}><option value="">{t('New test')}</option>{tests.items.map(test=><option key={test.id} value={test.id}>{test.content.name||t('Untitled draft')}</option>)}</select></label><More page={tests}/></section>
    {!draft.loaded?<><Status message={draft.message||'Loading'}/><Button onClick={()=>{void draft.load();}}>{t('Try again')}</Button></>:<><fieldset className="authoring-form" disabled={draft.busy}><legend className="sr-only">{t('Test fields')}</legend><section className="authoring-card"><h2>{t('Details')}</h2><label htmlFor="tn">{t('Name')}</label><input id="tn" value={v.name} onChange={e=>set('name',e.target.value)}/><Segmented label={t('Mode')} value={v.mode} onChange={value=>draft.setValue(previous=>({...previous,mode:value,isPublic:value==='mock'?false:previous.isPublic,durationSeconds:null}))} options={[{value:'mock',label:t('Mock exam')},{value:'practice',label:t('Practice')}]}/>{v.mode==='mock'&&<p>{t('This test uses a shared opening time and deadline. There is no personal timer.')}</p>}{v.mode==='practice'&&<Checkbox on={v.isPublic} label={t('Publish as open practice')} onChange={value=>set('isPublic',value)}/>}</section>
    <PublishedQuestionPicker selected={v.questionVersionIds} onChange={ids=>set('questionVersionIds',ids)}/></fieldset>
    <DraftActions draft={draft}/><section className="authoring-card"><h2>{t('Assign to group')}</h2><p>{t('This test uses a shared opening time and deadline. There is no personal timer.')}</p><p>{t('All schedule times are Asia/Tashkent (UTC+05:00).')}</p><p>{t('Questions follow the selected number order. Group feedback waits until closing and final grading.')}</p><label>{t('Group')}<select id="assign-group" value={groupId} onChange={e=>setGroupId(e.target.value)}><option value="">{t('Choose a group')}</option>{groups.groups.map(group=><option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
    <div className="authoring-grid"><label>{t('Available from')}<input id="opens" type="datetime-local" value={opens} onChange={e=>setOpens(e.target.value)}/></label><label>{t('Available until')}<input id="closes" type="datetime-local" value={closes} onChange={e=>setCloses(e.target.value)}/></label></div>{groups.error&&<Button variant="secondary" onClick={()=>{void groups.load();}}>{t('Try again')}</Button>}<Button data-testid="assign-test" disabled={busy||draft.busy||!draft.version||draft.dirty||draft.draft?.publishedRevision!==draft.draft?.revision||!groupId} onClick={()=>{void assign();}}>{t('Assign published test')}</Button><Status message={message}/></section></>}
  </div>;
}
type Assignment={id:string;name:string;groupName:string;opensAt:number;closesAt:number};
type Result={units:number;maxUnits:number;pending:number;final:boolean};
export function ServerOverview(){
  const t=useText();const {user}=useAuth();const now=useNow(1000);const page=usePage<Assignment>('/staff/assignments');const [selected,setSelected]=useState<string>();
  return <div className="authoring-page" data-no-translate><header><h1>{t('Overview')}</h1><div className="authoring-actions"><Button to="/admin/editor">{t('New question')}</Button><Button to="/admin/builder" variant="secondary">{t('Test builder')}</Button><Button to="/admin/grading" variant="secondary">{t('Grading')}</Button></div></header><h2>{t('Group assignments')}</h2>{!page.busy&&!page.message&&!page.items.length&&<section className="authoring-card authoring-empty"><h3>{t('No tests assigned to groups yet.')}</h3><p>{t('Imported questions live in the question bank. This page shows tests after you assign them to a group.')}</p><div className="authoring-actions"><Button to="/admin/bank">{t('Question bank')}</Button><Button to="/admin/builder" variant="secondary">{t('Test builder')}</Button></div></section>}{page.items.map(a=><article key={a.id} className="authoring-card"><h3>{a.name}</h3><p>{a.groupName} · {tashkentInput(a.opensAt).replace('T',' ')} — {tashkentInput(a.closesAt).replace('T',' ')} (Asia/Tashkent)</p><Button variant="secondary" onClick={()=>setSelected(a.id)}>{t('View student attempts')}</Button>{selected===a.id&&<AssignmentAttempts id={a.id}/>}<p className="fn l2">{t(a.closesAt<=now?'Closed':a.opensAt>now?'Not open yet':'Available now')}</p>{user?.role==='admin'&&a.closesAt<=now&&<ReopenAssignment id={a.id} onReopened={()=>{void page.load();}}/>}</article>)}<More page={page}/></div>;
}
function AssignmentAttempts({id}:{id:string}){const t=useText();const page=usePage<{id:string;student:string;state:string;result:Result|null}>('/staff/assignments/'+id+'/attempts');return <><ul>{page.items.map(a=><li key={a.id}><strong>{a.student}</strong> · {t(a.state==='active'?'In progress':a.result?.final?'Completed':'Awaiting grading')} {a.result&&`${a.result.units/2} / ${a.result.maxUnits/2}`} <Button variant="plain" to={'/admin/grading?attempt='+a.id}>{t('Open review')}</Button></li>)}</ul><More page={page}/></>;}
type Review={id:string;revision:number;result:Result;items:{question:StudentQuestion;correctOptionId?:string;accepted:string[];explanation:string;answer:string;grade:{units:number|null;verdict:string};review:{units:number;comment:string;revision:number;updatedAt:number}|null}[]};
export function ServerGrading(){
  const t=useText();const page=usePage<{id:string;name:string;student:string;result:Result}>('/staff/reviews');const [params,setParams]=useSearchParams();const id=params.get('attempt');
  return <div className="authoring-page teacher-review-page" data-no-translate><header><h1>{t('Grading')}</h1><Button variant="secondary" to="/admin">{t('Overview')}</Button></header><section className="authoring-card"><h2>{t('Awaiting grading')}</h2><ul>{page.items.map(item=><li key={item.id}><Button variant="plain" onClick={()=>setParams({attempt:item.id})}>{item.name} · {item.student} · {item.result.pending}</Button></li>)}</ul>{!page.busy&&!page.items.length&&!page.message&&<p>{t('No responses are awaiting review.')}</p>}<More page={page}/></section>{id&&<ReviewForm key={id} id={id} onApplied={()=>{void page.load();}}/>}</div>;
}
function ReviewForm({id,onApplied}:{id:string;onApplied:()=>void}){
  const t=useText();const {csrfToken}=useAuth();const [review,setReview]=useState<Review>(),[message,setMessage]=useState('Loading'),[busy,setBusy]=useState(false),[position,setPosition]=useState(0),[units,setUnits]=useState<number|null>(null),[comment,setComment]=useState(''),[dirty,setDirty]=useState(false),[conflict,setConflict]=useState(false);
  const operation=useRef<{body:string;id:string}>();const item=review?.items[position];
  function accept(data:Review){setReview(data);setUnits(data.items[position]?.review?.units??null);setComment(data.items[position]?.review?.comment??'');setDirty(false);setConflict(false);}
  async function load(){setBusy(true);try{accept(await teachingRequest<Review>('/staff/reviews/'+id));setMessage('');}catch{setMessage('This review is unavailable or the attempt is still in progress.');}finally{setBusy(false);}}
  useEffect(()=>{void load();},[id]);
  function move(index:number){if(busy)return;if(dirty&&!window.confirm(t('Discard this unapplied review?')))return;setPosition(index);setUnits(review?.items[index]?.review?.units??null);setComment(review?.items[index]?.review?.comment??'');setDirty(false);}
  async function apply(){if(!review||!item||units===null)return;setBusy(true);try{
    const body={revision:review.revision,questionId:item.question.id,units,comment};const serialized=JSON.stringify(body);if(operation.current?.body!==serialized)operation.current={body:serialized,id:crypto.randomUUID()};
    const data=await teachingRequest<Review>('/staff/reviews/'+id,csrfToken,{...body,operationId:operation.current.id});accept(data);setMessage('Grade saved. The student result is updated.');onApplied();
  }catch(error){setMessage(error instanceof ExamError&&error.status===409?'Another reviewer changed this result. Reload before grading.':'Could not save. Keep this page open and try again.');if(error instanceof ExamError&&error.status===409)setConflict(true);}finally{setBusy(false);}}
  return <section className="authoring-card review-card"><Status message={message}/>{review&&item&&<><h2>{t('Review result')}: {review.result.units/2} / {review.result.maxUnits/2}</h2><div className="authoring-actions">{review.items.map((q,i)=><Button key={q.question.id} variant={i===position?'primary':'secondary'} disabled={busy} onClick={()=>move(i)}>{i+1} · {t(q.grade.verdict==='pending'?'Awaiting grading':q.grade.verdict==='partial'?'Partial':q.grade.verdict==='correct'?'Correct':'Incorrect')}</Button>)}</div><h3>{t('Question')}</h3><p lang="kaa">{item.question.stem}</p><h3>{t('Student answer')}</h3><p className="review-answer" lang="kaa">{(item.question.kind==='single'?item.question.options.find(option=>option.id===item.answer)?.text:item.answer)||t('Not answered')}</p><h3>{t(item.question.kind==='single'?'Correct answer':'Accepted answers')}</h3><p lang="kaa">{item.question.kind==='single'?item.question.options.find(option=>option.id===item.correctOptionId)?.text:item.accepted.join(' · ')||t('Manual grading')}</p><p lang="kaa">{item.explanation}</p>
    {item.question.kind==='written'?<fieldset disabled={busy||conflict}><legend>{t('Teacher decision')}</legend><Segmented label={t('Points')} value={units===null?'':String(units)} onChange={value=>{setUnits(Number(value));setDirty(true);}} options={[{value:'2',label:'1'},{value:'1',label:'0.5'},{value:'0',label:'0'}]}/><label htmlFor="review-note">{t('Review comment')}<textarea id="review-note" maxLength={2000} rows={3} value={comment} onChange={e=>{setComment(e.target.value);setDirty(true);}}/></label><p>{t('Applying a decision updates the result and records an audit entry.')}</p><Button data-testid="apply-review" disabled={units===null||!dirty} onClick={()=>{void apply();}}>{t('Apply grade')}</Button></fieldset>:<p>{t('Choice questions are graded automatically.')}</p>}</>}
    <Button variant="secondary" disabled={busy} onClick={()=>{if(!dirty||window.confirm(t('Discard this unapplied review?')))void load();}}>{t('Reload result')}</Button><UnsavedGuard dirty={dirty}/></section>;
}
export function TeacherPending({children}:{children?:ReactNode}){const t=useText();return <div className="authoring-page"><h1>{t('This section is being connected.')}</h1><p>{t('Import and analytics will be connected in the next stage.')}</p>{children}<Button to="/admin">{t('Overview')}</Button></div>;}
export function ServerGroups(){
  const t=useText();const {user,csrfToken}=useAuth();const groups=useGroups();const [selected,setSelected]=useState('');
  const [student,setStudent]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[name,setName]=useState(''),[teacher,setTeacher]=useState(''),[rosterRevision,setRosterRevision]=useState(0);
  async function change(path:string,body:unknown,method='POST'){
    setBusy(true);try{await teachingRequest(path,csrfToken,body,method);setMessage('Group updated.');setRosterRevision(value=>value+1);setStudent('');await groups.load();}
    catch{setMessage('Could not update the group. Check the account ID and your access.');}finally{setBusy(false);}
  }
  return <div className="authoring-page" data-no-translate><header><h1>{t('Groups and students')}</h1></header><section className="authoring-card"><label>{t('Group')}<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">{t('Choose a group')}</option>{groups.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>{groups.error&&<Button onClick={()=>{void groups.load();}}>{t('Try again')}</Button>}
    {selected&&<><GroupMembers key={selected+rosterRevision} id={selected} csrf={csrfToken}/><label>{t('Student account ID')}<input value={student} onChange={e=>setStudent(e.target.value.trim())}/></label><p>{t('Ask the registered student for the account ID shown in their profile.')}</p><Button disabled={busy||!student} onClick={()=>{void change('/groups/'+selected+'/members',{studentId:student});}}>{t('Enroll student')}</Button></>}</section>
    {user?.role==='admin'&&<section className="authoring-card"><h2>{t('Group administration')}</h2><label>{t('Group name')}<input value={name} onChange={e=>setName(e.target.value)}/></label><Button disabled={busy||!name.trim()} onClick={()=>{void change('/groups',{name});}}>{t('Create group')}</Button>{selected&&<><label>{t('Teacher account ID')}<input value={teacher} onChange={e=>setTeacher(e.target.value.trim())}/></label><Button disabled={busy||!teacher} onClick={()=>{void change('/groups/'+selected+'/teacher',{teacherId:teacher},'PUT');}}>{t('Assign teacher')}</Button></>}</section>}<Status message={message}/></div>;
}
function GroupMembers({id,csrf}:{id:string;csrf:string|null}){
  const t=useText();const [members,setMembers]=useState<{id:string;name:string;email:string}[]>([]),[cursor,setCursor]=useState<string|null>(null),[message,setMessage]=useState('');
  async function load(after=''){try{const result=await teachingRequest<{members:typeof members;nextCursor:string|null}>('/groups/'+id+'/members?limit=100'+(after?'&cursor='+after:''));setMembers(previous=>after?[...previous,...result.members]:result.members);setCursor(result.nextCursor);}catch{setMessage('Could not load staff data.');}}
  useEffect(()=>{void load();},[id]);
  async function remove(student:string){if(!window.confirm(t('Remove this student from the group?')))return;try{await teachingRequest('/groups/'+id+'/members/'+student,csrf,{},'DELETE');await load();}catch{setMessage('Could not update the group. Check the account ID and your access.');}}
  return <><ul>{members.map(member=><li key={member.id}>{member.name} · {member.email} <Button variant="plain" onClick={()=>{void remove(member.id);}}>{t('Remove')}</Button></li>)}</ul>{cursor&&<Button onClick={()=>{void load(cursor);}}>{t('Load more')}</Button>}<Status message={message}/></>;
}
