import { useEffect,useState } from 'react';
import { Button,Segmented } from '@/components/ui/basic';
import { SystemSelect } from '@/components/ui/SystemSelect';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/state/AuthState';
import { useText,useFormatting } from '@/i18n/LanguageProvider';
import { TOPICS } from '@/data/topics';
import { examRequest } from '@/lib/examApi';
import type { LearningSummary,ProgressResponse,StudyPage } from '../../../shared/contracts/learning';

export function LearningStats({summary:s}:{summary:LearningSummary}){const t=useText();return <section className="card learning-card"><div className="learning-actions"><p>{t('Completed')}: <strong>{s.completed}</strong></p><p>{t('Final results')}: <strong>{s.final}</strong></p><p>{t('Awaiting grading')}: <strong>{s.provisional}</strong></p><p>{t('Average final score')}: <strong>{s.averagePercent===null?'—':s.averagePercent+'%'}</strong></p></div><div className="report-table"><table><thead><tr><th>{t('Topic')}</th><th>{t('Correct')}</th><th>{t('Partial')}</th><th>{t('Incorrect')}</th><th>{t('Awaiting grading')}</th></tr></thead><tbody>{Object.entries(s.topics).map(([topic,v])=><tr key={topic}><td>{t(TOPICS[topic as keyof typeof TOPICS]?.name??topic)}</td><td>{v.correct}</td><td>{v.partial}</td><td>{v.incorrect}</td><td>{v.pending}</td></tr>)}</tbody></table></div><p className="fn l2">{t('Pending results are excluded from the average. Topic details follow feedback release rules.')}</p></section>;}
export function ReportFilters({ onChange }: { onChange: (query: string) => void }) {
  const t = useText();
  const [from, setFrom] = useState(''); const [until, setUntil] = useState('');
  const [mode, setMode] = useState(''); const [topic, setTopic] = useState('');
  return <form className="card learning-card report-filters" aria-label={t('Filters')} onSubmit={event => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (from) query.set('from', String(Date.parse(from + 'T00:00:00+05:00')));
    if (until) query.set('until', String(Date.parse(until + 'T00:00:00+05:00') + 86400000));
    if (mode) query.set('mode', mode);
    if (topic) query.set('topic', topic);
    onChange(query.toString());
  }}>
    <div className="report-filter-grid">
      <label className="system-field"><span>{t('From date')}</span><input className="system-date" type="date" aria-describedby="report-filter-note" value={from} max={until || undefined} onChange={event => setFrom(event.target.value)} /></label>
      <label className="system-field"><span>{t('Through date')}</span><input className="system-date" type="date" aria-describedby="report-filter-note" value={until} min={from || undefined} onChange={event => setUntil(event.target.value)} /></label>
      <SystemSelect label={t('Test type')} icon="tests" value={mode} onChange={setMode} options={['', 'practice', 'mock'].map((value, index) => ({ value, label: t(['All', 'Practice', 'Mock exam'][index]!) }))} />
      <SystemSelect label={t('Topic')} icon="book" value={topic} onChange={setTopic} options={[{ value: '', label: t('All') }, ...['constitutional', 'civil', 'criminal', 'administrative', 'human-rights', 'labor', 'family', 'theory'].map(value => ({ value, label: t(TOPICS[value as keyof typeof TOPICS]?.name ?? value) }))]} />
    </div>
    <div className="report-filter-footer"><p id="report-filter-note" className="report-filter-note"><Icon name="info" size="s" /><span>{t('Dates use Asia/Tashkent. Topic filters select attempts containing that topic; scores cover the whole attempt.')}</span></p><Button type="submit" icon="check">{t('Apply filters')}</Button></div>
  </form>;
}
export function ServerProgress({dashboard=false}:{dashboard?:boolean}){
 const t=useText();const format=useFormatting();const [data,setData]=useState<ProgressResponse>();const [query,setQuery]=useState('');const [error,setError]=useState(false);const [generation,setGeneration]=useState(0);
 useEffect(()=>{let live=true;setError(false);setData(undefined);void examRequest<ProgressResponse>('/progress?'+query).then(v=>{if(live)setData(v);}).catch(()=>{if(live)setError(true);});return()=>{live=false;};},[query,generation]);
 return <main id="main-content" className="s-main learning-page" data-no-translate><h1>{t(dashboard?'Home':'Progress')}</h1><div className="learning-actions"><Button to="/tests">{t('Find a test')}</Button><Button to="/history" variant="secondary">{t('View attempt history')}</Button><Button to="/mistakes" variant="secondary">{t('My mistakes')}</Button></div>{!dashboard&&<ReportFilters onChange={setQuery} />}
 {error?<p role="alert">{t('The request could not be completed.')} <Button onClick={()=>setGeneration(g=>g+1)}>{t('Try again')}</Button></p>:!data?<p role="status">{t('Loading')}</p>:<><p>{t('Reports cover your latest 100 completed attempts.')}</p>{data.backfillPending&&<p role="status">{t('Earlier results are being prepared. Refresh later for complete coverage.')}</p>}<LearningStats summary={data.summary} />{!data.items.length&&<p>{t('No attempts yet.')}</p>}{data.items.slice(0,dashboard?3:100).map(a=><article className="card learning-card" key={a.id}><h2>{a.name}</h2><p>{format.date(a.submittedAt,true)} · {t(a.pending?'Awaiting grading':'Completed')}</p><p>{format.number(a.units/2)} / {format.number(a.maxUnits/2)}</p><Button to={'/results/'+a.id}>{t('View results')}</Button></article>)}</>}
 </main>;
}
export function SaveQuestion({attemptId,questionId,onRemoved}:{attemptId:string;questionId:string;onRemoved?:()=>void}){
 const {csrfToken}=useAuth();const t=useText();const [busy,setBusy]=useState(false);const [saved,setSaved]=useState(false);const [error,setError]=useState(false);
 useEffect(()=>{setSaved(false);setError(false);},[attemptId,questionId]);
 const act=async()=>{setBusy(true);setError(false);try{await examRequest('/saved-questions',csrfToken,{attemptId,questionId,saved:!onRemoved});setSaved(true);onRemoved?.();}catch{setError(true);}finally{setBusy(false);}};
 return <><Button variant="secondary" disabled={busy||saved} onClick={()=>{void act();}}>{t(onRemoved?'Remove saved question':saved?'Question saved':'Save question')}</Button>{error&&<span role="alert">{t('The request could not be completed.')}</span>}</>;
}
export function ServerMistakes(){
 const t=useText();const [tab,setTab]=useState<'mistakes'|'saved-questions'>('mistakes');const [data,setData]=useState<StudyPage>();const [error,setError]=useState(false);const [busy,setBusy]=useState(false);const [generation,setGeneration]=useState(0);
 const load=async(after='',alive=()=>true)=>{setBusy(true);setError(false);try{const v=await examRequest<StudyPage>('/'+tab+'?after='+encodeURIComponent(after));if(alive())setData(old=>after&&old?{...v,items:[...old.items,...v.items]}:v);}catch{if(alive())setError(true);}finally{if(alive())setBusy(false);}};
 useEffect(()=>{let live=true;setData(undefined);void load('',()=>live);return()=>{live=false;};},[tab,generation]);
 return <main id="main-content" className="s-main learning-page" data-no-translate><h1>{t('My mistakes')}</h1><Segmented label={t('Study collection')} value={tab} onChange={setTab} options={[{value:'mistakes',label:t('My mistakes')},{value:'saved-questions',label:t('Saved questions')}]} /><p>{t('Only released feedback appears here. Mistakes cover the latest 100 completed attempts; pending answers are excluded.')}</p>{error&&<p role="alert">{t('The request could not be completed.')} <Button onClick={()=>setGeneration(g=>g+1)}>{t('Try again')}</Button></p>}{busy&&<p role="status">{t('Loading')}</p>}{data&&!data.items.length&&<p>{t('No questions in this collection yet.')}</p>}
 {data?.items.map((item,i)=><article className="card learning-card" key={item.attemptId+item.question.id+i}><h2>{item.question.stem}</h2>{item.question.kind==='single'&&<ul>{item.question.options.map(o=><li key={o.id}>{o.text}{item.feedback.correctOptionId===o.id?' ✓':''}</li>)}</ul>}<p>{t('Your answer')}: {item.question.kind==='single'?item.question.options.find(o=>o.id===item.answer)?.text??t('Not answered'):item.answer||t('Not answered')}</p><p>{t(item.feedback.verdict==='partial'?'Partial':item.feedback.verdict==='correct'?'Correct':'Incorrect')}</p><p>{item.feedback.explanation}</p>{item.feedback.accepted.length>0&&<p>{item.feedback.accepted.join(' · ')}</p>}{item.feedback.reviewComment&&<p>{item.feedback.reviewComment}</p>}<div className="learning-actions"><SaveQuestion attemptId={item.attemptId} questionId={item.question.id} onRemoved={tab==='saved-questions'?()=>setData(old=>old?{...old,items:old.items.filter(v=>v.question.id!==item.question.id)}:old):undefined} /><Button to={'/results/'+item.attemptId}>{t('View results')}</Button></div></article>)}{data?.next&&<Button disabled={busy} onClick={()=>{void load(data.next!);}}>{t('Load more')}</Button>}</main>;
}
