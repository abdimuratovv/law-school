import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { examSummarySchema, attemptSchema, type ExamSummary } from '../../../shared/contracts/exams';
import { Screen } from '@/components/layout/StudentShell';
import { Button, Segmented, Switch, Tag } from '@/components/ui/basic';
import { OptionButton, Timer } from '@/components/exam/parts';
import { useText, LanguageSwitcher, useFormatting } from '@/i18n/LanguageProvider';
import { useAuth } from '@/state/AuthState';
import { useApp, type ThemePref } from '@/state/AppState';
import { useServerAttempt } from '@/state/useServerAttempt';
import { examRequest } from '@/lib/examApi';
import { SaveQuestion } from './ServerLearning';
import { useNow } from '@/lib/hooks';

function Page({ children, focused = false }: { children: ReactNode; focused?: boolean }) {
  const content = <main id="main-content" tabIndex={-1} className={focused ? 'focus-page prep-page' : 's-main learning-page'} data-no-translate>{children}</main>;
  return focused ? <Screen calm>{content}</Screen> : content;
}
function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) { const t = useText(); return <div className="card learning-card" role="alert"><p>{t(message)}</p>{retry && <Button onClick={retry}>{t('Try again')}</Button>}</div>; }

export function ServerCatalog() {
  const t = useText(); const [items,setItems] = useState<ExamSummary[]>([]); const [next,setNext] = useState<string | null>(null);
  const [loading,setLoading] = useState(true); const [error,setError] = useState(false); const [filter,setFilter] = useState<'all' | 'practice' | 'mock'>('all');
  const load = async (after = '') => {
    setLoading(true); setError(false);
    try { const data = z.object({ items:z.array(examSummarySchema), next:z.string().nullable() }).parse(await examRequest('/exams?after=' + encodeURIComponent(after)));
      setItems(previous => after ? [...previous,...data.items] : data.items); setNext(data.next);
    } catch { setError(true); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  return <Page><header className="learning-head"><div><p className="eyebrow">Huqıq Mektebi</p><h1 className="lt">{t('Find a test')}</h1><p className="callout l2">{t('Open practice and tests assigned to your groups.')}</p></div><LanguageSwitcher compact /></header>
    <Segmented label={t('Test type')} value={filter} onChange={setFilter} options={[{value:'all',label:t('All')},{value:'practice',label:t('Practice')},{value:'mock',label:t('Mock exam')}]} />
    {error && <ErrorNotice message="Could not load tests." retry={() => { void load(); }} />}
    <div className="cat-grid">{items.filter(item => filter === 'all' || item.mode === filter).map(item => <article className="card test-card" key={item.id}><Tag tone="acc">{t(item.mode === 'practice' ? 'Practice' : 'Mock exam')}</Tag><h2 className="t2">{item.name}</h2><p>{t('Questions: {count}',{count:item.questionCount})} · {item.durationSeconds ? t('Duration: {minutes} min',{ minutes:item.durationSeconds/60 }) : t('Untimed')}</p><Button to={'/tests/'+item.id}>{t('Open test')}</Button></article>)}</div>
    {loading && <p role="status">{t('Loading')}</p>}{!loading && !error && !items.length && <section className="card learning-card"><h2 className="t2">{t('No tests are available yet.')}</h2><p>{t('Your teacher will publish test content here.')}</p></section>}
    {next && <Button disabled={loading} onClick={() => { void load(next); }}>{t('Load more')}</Button>}
  </Page>;
}
export function ServerLobby() {
  const { testId = '' } = useParams(); const { csrfToken } = useAuth(); const t = useText(); const nav = useNavigate();
  const [test,setTest] = useState<ExamSummary>(); const [error,setError] = useState(false); const [busy,setBusy] = useState(false);
  const operation = useRef(crypto.randomUUID());
  const load = async () => { setError(false); try { setTest(examSummarySchema.parse(await examRequest('/exams/'+encodeURIComponent(testId)))); } catch { setError(true); } };
  useEffect(() => { void load(); }, [testId]);
  const start = async () => { setBusy(true); setError(false); try {
    const attempt = attemptSchema.parse(await examRequest('/exams/'+encodeURIComponent(testId)+'/start',csrfToken,{ operationId:operation.current }));
    nav('/exam/'+attempt.id);
  } catch { setError(true); } finally { setBusy(false); } };
  return <Page focused><div className="focus-top"><Button to="/tests" variant="plain">{t('Back to tests')}</Button><LanguageSwitcher compact /></div>
    {error && <ErrorNotice message="This test is unavailable or the request failed." retry={() => { void load(); }} />}
    {test && <section className="prep-card card"><Tag tone="acc">{t(test.mode === 'practice'?'Practice':'Mock exam')}</Tag><h1 className="lt">{test.name}</h1><p>{t('Questions: {count}',{count:test.questionCount})} · {test.durationSeconds ? t('Duration: {minutes} min',{minutes:test.durationSeconds/60}) : t('Untimed')}</p>
      <h2 className="t2">{t('Before you start')}</h2><ol className="prep-rules"><li>{t('Answers sync to the server every 15–17 seconds while you work.')}</li><li>{t('Keep this account signed in to recover local unsynced answers.')}</li><li>{t('The server deadline continues while you are away. Late changes are not accepted.')}</li><li>{t('Written answers may remain provisional until teacher review.')}</li></ol><Button disabled={busy} onClick={() => { void start(); }}>{t(busy?'Loading':'Start or resume')}</Button></section>}
  </Page>;
}
export function ServerExam() {
  const { testId, attemptId } = useParams(); const id = attemptId ?? testId ?? ''; const t = useText(); const format = useFormatting();
  const { attempt:a,snapshot:s,message,conflict,busy,change,sync,reload,retryLoad } = useServerAttempt(id);
  const [position,setPosition] = useState(0); const [confirm,setConfirm] = useState(false); const now = useNow(1000);
  const [offset,setOffset] = useState(0); const expiryRequested = useRef(false);
  const restored = useRef(false);
  useEffect(() => { if (a && s && !restored.current) { restored.current = true; setPosition(Math.max(0,a.questions.findIndex(q=>q.id===s.currentQuestionId))); } }, [a,s]);
  useEffect(() => { if (a) setOffset(a.serverNow-Date.now()); }, [a?.serverNow]);
  useEffect(() => { if (a?.state === 'active' && a.endsAt !== null && now+offset >= a.endsAt && !expiryRequested.current) { expiryRequested.current = true; void sync('submit'); } }, [now,offset,a,sync]);
  if (!a || !s) return <Page focused><ErrorNotice message={message} retry={() => { void retryLoad(); }} /><Button to="/tests">{t('Back to tests')}</Button></Page>;
  const index = Math.max(0,position); const question = a.questions[index] ?? a.questions[0]!;
  const feedback = a.feedback[question.id]; const final = a.state !== 'active'; const locked = final || conflict || a.checked.includes(question.id) || busy;
  const go = (n: number) => { setPosition(n); if (!final) change({ ...s,currentQuestionId:a.questions[n]!.id }); };
  const answer = (value: string) => { if (!locked) change({ ...s,answers:{...s.answers,[question.id]:value},currentQuestionId:question.id }); };
  return <Page focused><div className="focus-top"><Button to="/progress" variant="plain">{t('View attempt history')}</Button><LanguageSwitcher compact />{a.endsAt !== null && !final && <Timer secondsLeft={(a.endsAt-now-offset)/1000} />}</div>
    <section className="prep-card card"><header className="col"><Tag tone="acc">{t(a.mode === 'practice'?'Practice':'Mock exam')}</Tag><h1 className="t2">{a.name}</h1></header>
    {final && <section className="learning-card"><h2 className="t2">{t(a.result?.final?'Completed':'Awaiting grading')}</h2>{a.result && <p className="hl">{format.number(a.result.units/2)} / {format.number(a.result.maxUnits/2)}{a.result.pending > 0 && ' · '+t('Pending: {count}',{count:a.result.pending})}</p>}<p>{t(a.result?.final?'Feedback is shown when its release conditions are met.':'This result is provisional. Pending answers are not marked incorrect.')}</p></section>}
    <div className="learning-actions" aria-label={t('All questions')}>{a.questions.map((q,n) => <button className={'btn btn-'+(n===index?'primary':'secondary')} key={q.id} onClick={() => go(n)} aria-current={n===index?'step':undefined} aria-label={t('Question')+' '+(n+1)+(s.answers[q.id]?' ✓':'')}>{n+1}{s.answers[q.id]?' ✓':''}{s.flags.includes(q.id)?' ⚑':''}</button>)}</div>
    <h2 className="hl">{t('Question')} {index+1} / {a.questions.length}</h2><p className="body" lang="kaa">{question.stem}</p>
    {question.kind === 'single' && <>{question.terms && <ul>{question.terms.map(item => <li key={item.k}>{item.k} {item.t}</li>)}</ul>}{question.defs && <ul>{question.defs.map(item => <li key={item.k}>{item.k} {item.t}</li>)}</ul>}<div className="assessment-answers" role="radiogroup" aria-label={t('Answer options')}>{question.options.map((option,n) => <OptionButton key={option.id} letter={'ABCD'[n]} text={option.text} selected={s.answers[question.id]===option.id} disabled={locked} state={feedback?.correctOptionId===option.id?'right':s.answers[question.id]===option.id?feedback?'wrong':'sel':''} onClick={() => answer(option.id)} />)}</div></>}
    {question.kind === 'written' && <label className="field"><span className="flab">{t('Your answer')}</span><textarea className="ux-textarea" lang="kaa" rows={4} value={s.answers[question.id]??''} readOnly={locked} onChange={event => { if ([...event.target.value].length <= 1000) answer(event.target.value); }} /><span className="fn l2">{[...(s.answers[question.id]??'')].length} / 1000</span></label>}
    {feedback && <div className="learning-card" role="status"><h3>{t(feedback.verdict==='correct'?'Correct':feedback.verdict==='partial'?'Partial':feedback.verdict==='pending'?'Awaiting grading':feedback.verdict==='unanswered'?'Not answered':'Incorrect')}</h3><p lang="kaa">{feedback.explanation}</p>{feedback.reviewComment&&<p>{feedback.reviewComment}</p>}{feedback.accepted.length>0 && <p>{feedback.accepted.join(' · ')}</p>}<SaveQuestion key={question.id} attemptId={a.id} questionId={question.id} /></div>}
    {!final && <div className="learning-actions"><Button variant="secondary" disabled={locked} onClick={() => change({...s,flags:s.flags.includes(question.id)?s.flags.filter(flag=>flag!==question.id):[...s.flags,question.id]})}>{t(s.flags.includes(question.id)?'Unflag question':'Flag question')}</Button>{a.mode==='practice' && a.examId.startsWith('p_') && !a.checked.includes(question.id) && <Button disabled={locked || !s.answers[question.id]?.trim()} onClick={() => { void sync('check',question.id); }}>{t('Check answer')}</Button>}</div>}
    <div className="learning-actions"><Button variant="secondary" disabled={index===0} onClick={() => go(index-1)}>{t('Previous')}</Button><Button variant="secondary" disabled={index===a.questions.length-1} onClick={() => go(index+1)}>{t('Next')}</Button></div>
    <p role={conflict?'alert':'status'}>{t(message)}</p><p className="fn l2">{t('Last server save')}: {format.date(a.savedAt,true)}</p>
    {conflict ? <div className="learning-card"><p>{t('Loading the server version discards this tab’s unsynced draft. Your saved server answers are kept.')}</p><Button onClick={() => { void reload(); }}>{t('Use server version')}</Button></div> : !final && <div className="learning-actions"><Button variant="secondary" disabled={busy} onClick={() => { void sync(); }}>{t('Sync now')}</Button><Button disabled={busy} onClick={() => setConfirm(true)}>{t('Finish test')}</Button></div>}
    {confirm && !final && <section className="learning-card" role="alertdialog" aria-modal="false" aria-labelledby="finish-title"><h2 id="finish-title">{t('Finish test?')}</h2><p>{t('Unanswered: {count}',{count:a.questions.filter(q=>!s.answers[q.id]?.trim()).length})}</p><p>{t('After submission, your answers cannot be changed.')}</p><Button disabled={busy||conflict} onClick={() => { setConfirm(false); void sync('submit'); }}>{t('Submit answers')}</Button><Button variant="plain" onClick={() => setConfirm(false)}>{t('Keep working')}</Button></section>}
    </section></Page>;
}
const historySchema = z.object({items:z.array(z.object({ id:z.string(),name:z.string(),state:z.string(),startedAt:z.number(),result:z.object({ units:z.number(),maxUnits:z.number(),pending:z.number(),final:z.boolean() }).nullable() })),next:z.string().nullable()});
export function ServerHistory() {
  const t = useText(); const format = useFormatting(); const [data,setData] = useState<z.infer<typeof historySchema>>(); const [error,setError] = useState(false);
  const load = async (before?:string) => { setError(false); try { const next = historySchema.parse(await examRequest('/attempts'+(before?'?before='+encodeURIComponent(before):''))); setData(previous => before&&previous?{...next,items:[...previous.items,...next.items]}:next); } catch { setError(true); } };
  useEffect(() => { void load(); },[]);
  return <Page><h1 className="lt">{t('View attempt history')}</h1>{error&&<ErrorNotice message="Could not load tests." retry={() => { void load(); }} />}{data?.items.map(a=><article key={a.id} className="card learning-card"><h2 className="t2">{a.name}</h2><p>{format.date(a.startedAt,true)} · {t(a.state==='active'?'In progress':a.result?.final?'Completed':'Awaiting grading')}</p>{a.result&&<p>{format.number(a.result.units/2)} / {format.number(a.result.maxUnits/2)}</p>}<Button to={(a.state==='active'?'/exam/':'/results/')+a.id}>{t(a.state==='active'?'Resume test':'View results')}</Button></article>)}{data&&!data.items.length&&<p>{t('No attempts yet.')}</p>}{data?.next&&<Button onClick={()=>{void load(data.next!);}}>{t('Load more')}</Button>}</Page>;
}
export function ServerProfile() {
  const { user,signOut } = useAuth(); const {theme,setTheme,reduceTransparency,setReduceTransparency} = useApp(); const t=useText(); const nav=useNavigate(); const [error,setError]=useState(false); const [confirm,setConfirm]=useState(false);
  return <Page><h1 className="lt">{t('Profile')}</h1><section className="card learning-card"><h2 className="t2">{user?.name}</h2><p>{user?.email}</p><p className="fn l2">{t('Account ID')}: <code>{user?.id}</code></p><LanguageSwitcher /><Segmented<ThemePref> label={t('Theme')} value={theme} onChange={value=>setTheme(value)} options={[{value:'system',label:t('Auto')},{value:'light',label:t('Light')},{value:'dark',label:t('Dark')}]} /><Switch on={reduceTransparency} onChange={value=>setReduceTransparency(value)} label={t('Reduce transparency')} /></section><section className="card learning-card"><p>{t('Signing out clears local drafts. Sync unfinished work before signing out.')}</p><Button id="profile-signout" onClick={()=>setConfirm(true)}>{t('Sign out')}</Button>{confirm&&<><p>{t('Sign out with active work?')}</p><Button onClick={()=>{void signOut().then(ok=>{if(ok)nav('/sign-in');else setError(true);});}}>{t('Confirm sign out')}</Button><Button variant="plain" onClick={()=>setConfirm(false)}>{t('Stay signed in')}</Button></>}{error&&<p role="alert">{t('Could not sign out. Check your connection and try again.')}</p>}</section></Page>;
}
export function PendingFeature() { const t=useText(); return <Page><h1 className="lt">{t('This section is being connected.')}</h1><p>{t('Tests and attempt history are available now.')}</p><Button to="/tests">{t('Find a test')}</Button><Button to="/progress" variant="secondary">{t('View attempt history')}</Button></Page>; }
