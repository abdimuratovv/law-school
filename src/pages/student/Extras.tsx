import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CharBar, OptionButton, QuestionBody } from '@/components/exam/parts';
import { Explanation } from '@/components/exam/LearningParts';
import { Avatar, Button, Segmented, Tag } from '@/components/ui/basic';
import { Overlay } from '@/components/ui/overlay';
import { getQuestion } from '@/data/questions';
import { LETTERS } from '@/data/types';
import { sessionAttemptId } from '@/lib/assessment';
import { verdict } from '@/lib/grading';
import { initials } from '@/lib/format';
import { useApp, type ThemePref } from '@/state/AppState';
import { LanguageSwitcher, useLanguage, useText } from '@/i18n/LanguageProvider';
export { default as ProgressPage } from './Progress';

export function Mistakes() {
  const { mistakes, toggleMistake } = useApp(); const t = useText(); const [params] = useSearchParams();
  const [active, setActive] = useState<string | null>(null); const [status, setStatus] = useState<boolean | null>(null);
  const remove = (id: string) => { const ok = toggleMistake(id); setStatus(ok); if (ok) { if (active === id) setActive(null); requestAnimationFrame(() => document.querySelector<HTMLElement>('main h1')?.focus()); } };
  useEffect(() => { const id = params.get('question'); if (id && mistakes.includes(id)) requestAnimationFrame(() => { const target = document.getElementById('saved-' + id); target?.scrollIntoView({ block:'center' }); target?.focus(); }); }, [params]);
  return <main id="main-content" tabIndex={-1} className="s-main learning-page" data-no-translate>
    <header className="learning-head"><div><h1 className="lt" tabIndex={-1}>{t('My mistakes')}</h1><p className="body l2">{t('These are questions you saved for practice, not a list of every incorrect answer.')}</p></div><Button variant="secondary" to="/progress">{t('View attempt history')}</Button></header>
    <p className="fn l2">{t('{count} saved questions', { count: mistakes.length })}</p><p role={status === false ? 'alert' : 'status'} className="fn">{status != null && t(status ? 'Saved questions updated on this device.' : 'Could not update saved questions. Your list is unchanged; try again.')}</p>
    {!mistakes.length && <section className="card learning-card"><h2 className="t2">{t('No saved questions yet')}</h2><p className="body l2">{t('Open a result, review a question, then choose Save question for practice.')}</p><Button to="/tests?mode=practice">{t('Find a practice test')}</Button></section>}
    <div className="learning-stack">{mistakes.map(id => { const q = getQuestion(id); return <section key={id} id={'saved-' + id} tabIndex={-1} className="card learning-card saved-question">
      {q ? <><QuestionBody q={q} n={1} numbered={false} /><Tag>{t(q.kind === 'single' ? 'Single choice' : 'Written')}</Tag>{q.placeholder && <p className="learning-note">{t('Some questions are still being prepared. This is an interface preview.')}</p>}<div className="learning-actions"><Button id={'retry-' + id} variant="secondary" aria-expanded={active === id} aria-controls={active === id ? 'practice-' + id : undefined} onClick={() => { const closing = active === id; setActive(closing ? null : id); if (!closing) requestAnimationFrame(() => document.getElementById('practice-heading-' + id)?.focus()); }}>{t(active === id ? 'Close retry' : 'Practice this question')}</Button><Button variant="plain" onClick={() => remove(id)}>{t('Remove from saved questions')}</Button></div>{active === id && <RetryQuestion key={id} id={id} onClose={() => { setActive(null); requestAnimationFrame(() => document.getElementById('retry-' + id)?.focus()); }} />}</> : <><h2 className="hl">{t('Unavailable saved question')}</h2><p className="fn l2">{t('Question {id} is unavailable. You can remove this saved entry.', { id })}</p><Button variant="secondary" onClick={() => remove(id)}>{t('Remove from saved questions')}</Button></>}
    </section>; })}</div>
  </main>;
}

function RetryQuestion({ id, onClose }: { id:string; onClose:()=>void }) {
  const q = getQuestion(id); const t = useText(); const [answer, setAnswer] = useState(''); const [checked, setChecked] = useState(false); const textRef = useRef<HTMLTextAreaElement>(null);
  const result = verdict(q, answer);
  return <section id={'practice-' + id} className="learning-retry" aria-labelledby={'practice-heading-' + id} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } }}>
    <h2 id={'practice-heading-' + id} tabIndex={-1} className="hl">{t('Practice this question')}</h2><p className="fn l2">{t('This retry is not saved as a test attempt. Closing it clears only this practice response.')}</p>
    {q.kind === 'single' ? <div className="assessment-answers" role="radiogroup" aria-label={t('Answer options')}>{LETTERS.map((letter,i) => <OptionButton key={letter} letter={letter} text={q.options[i]} selected={answer === letter} state={checked ? letter === q.correct ? 'right' : letter === answer ? 'wrong' : '' : answer === letter ? 'sel' : ''} disabled={checked} onClick={() => setAnswer(letter)} />)}</div> : <div className="assessment-written"><label htmlFor={'retry-answer-' + id} className="flab">{t('Your answer')}</label><textarea ref={textRef} id={'retry-answer-' + id} className="ux-textarea" lang="kaa" value={answer} readOnly={checked} onChange={event => setAnswer(event.target.value)} rows={4} />{!checked && <CharBar target={textRef} onInsert={setAnswer} />}</div>}
    {!checked ? <div className="learning-actions">{(q.kind === 'single' || q.accepted.length > 0) && <Button disabled={!answer.trim()} onClick={() => setChecked(true)}>{t('Check answer')}</Button>}{q.kind === 'written' && <Button variant={q.accepted.length ? 'secondary' : 'primary'} onClick={() => setChecked(true)}>{t('Reveal example')}</Button>}</div> : <div className="learning-stack"><p className="hl" role="status">{t(result === 'correct' ? 'Correct' : result === 'pending' ? 'Awaiting grading' : result === 'unanswered' ? 'Not answered' : q.kind === 'single' ? 'Not quite — the correct answer is marked' : 'Incorrect')}</p>{q.kind === 'written' && <section><h3 className="hl">{t('Accepted answers')}</h3>{q.accepted.length ? <ul lang="kaa" className="learning-models">{q.accepted.map(value => <li key={value}>{value}</li>)}</ul> : <p>{t('No model answer is available for this question.')}</p>}{result === 'pending' && <p className="fn l2">{t('Teacher review is not connected in this preview.')}</p>}</section>}<Explanation q={q} /><Button variant="secondary" onClick={() => { setAnswer(''); setChecked(false); requestAnimationFrame(() => document.getElementById('practice-heading-' + id)?.focus()); }}>{t('Try again')}</Button></div>}
    <Button variant="plain" onClick={onClose}>{t('Close retry')}</Button>
  </section>;
}

export function Profile() {
  const { user, signOut, theme, setTheme, restartIntroduction, sessions, sessionSaveErrors, frozenAttempts, attempts } = useApp();
  const { language, setLanguage, languageSaved } = useLanguage(); const t = useText(); const nav = useNavigate();
  const [status, setStatus] = useState<boolean | null>(null); const [confirm, setConfirm] = useState(false); const [signOutError, setSignOutError] = useState(false);
  const retry = useRef<null | (() => boolean)>(null);
  const update = (action: () => boolean) => { const ok = action(); setStatus(ok); retry.current = ok ? null : action; };
  const [leaving, setLeaving] = useState(false);
  const leave = async () => { if (leaving) return; setLeaving(true); if (!await signOut()) { setSignOutError(true); setLeaving(false); return; } nav('/sign-in', { replace:true }); };
  if (!user) return null;
  const active = Object.keys(sessions).length > 0; const unsaved = Object.entries(sessionSaveErrors).some(([id,error]) => error && !attempts.some(a => sessions[id] && a.id === sessionAttemptId(sessions[id]))) || Object.values(frozenAttempts).some(snapshot => !attempts.some(a => a.id === snapshot.id));
  return <main id="main-content" tabIndex={-1} className="s-main learning-page learning-profile" data-no-translate>
    <header className="learning-head"><h1 className="lt">{t('Profile')}</h1></header>
    <section className="card learning-card"><h2 className="t2">{t('Identity')}</h2><div className="learning-identity"><Avatar initials={user.name ? initials(user.name) : 'T'} size={52} accent /><div><strong className="hl">{user.name || t('Student')}</strong><p className="fn l2">{user.email}</p>{user.group && <p>{t('Group')} {user.group}</p>}</div></div><p className="fn l2">{t('You are signed in with Google. Exam data is still a local preview until server tests are connected.')}</p></section>
    <section className="card learning-card"><h2 className="t2">{t('Language and appearance')}</h2><p className="fn l2">{t('Preferences apply to this browser. Changes save immediately when storage is available.')}</p><div className="learning-setting"><span className="hl">{t('Language')}</span><LanguageSwitcher compact /></div>{languageSaved != null && <div className="fn" role={languageSaved ? 'status' : 'alert'}>{t(languageSaved ? 'Language saved on this device.' : 'Language changed in this tab only. Retry saving before closing.')} {!languageSaved && <Button variant="secondary" onClick={() => setLanguage(language)}>{t('Retry saving')}</Button>}</div>}
    <div className="learning-setting"><span className="hl">{t('Theme')}</span><Segmented<ThemePref> label={t('Theme')} value={theme} onChange={value => update(() => setTheme(value))} options={[{ value:'system',label:t('Auto') },{ value:'light',label:t('Light') },{ value:'dark',label:t('Dark') }]} /></div>
    <p className="fn" role={status === false ? 'alert' : 'status'}>{status != null && t(status ? 'Preference saved on this device.' : 'Could not save this preference. The previous setting is unchanged.')}</p>{status === false && <Button variant="secondary" onClick={() => retry.current && update(retry.current)}>{t('Retry saving')}</Button>}
    </section>
    <section className="card learning-card"><h2 className="t2">{t('Accessibility')}</h2><p className="fn l2">{t('Use browser zoom to enlarge this interface. Motion follows your system preference; larger exam text is available in Exam options.')}</p></section>
    <section className="card learning-card"><h2 className="t2">{t('Learning and account')}</h2><Button variant="secondary" onClick={() => { restartIntroduction(); nav('/getting-started', { state:{ from:'/profile' } }); }}>{t('Repeat the introduction')}</Button><p className="fn l2">{t('Signing out revokes this session and clears this account’s local preview work.')}</p><Button id="profile-signout" disabled={leaving} variant="plain" onClick={() => active || unsaved ? setConfirm(true) : leave()}>{t('Sign out')}</Button>{signOutError && <p role="alert">{t('Could not sign out. Check your connection and try again.')}</p>}</section>
    <Overlay open={confirm} onClose={() => setConfirm(false)} variant="dialog" className="learning-dialog" labelledBy="signout-title" alert initialFocus="#keep-signed-in"><div className="learning-dialog-content" data-no-translate><h2 id="signout-title" className="t2">{t('Sign out with active work?')}</h2><p className="body">{t(unsaved ? 'Some work is unsaved in this tab. Stay signed in and retry saving before closing or reloading.' : 'Signing out clears this account’s local preview work. Keep working if you want to retain it.')}</p><div className="learning-actions"><Button id="keep-signed-in" variant="secondary" onClick={() => setConfirm(false)}>{t('Stay signed in')}</Button><Button disabled={leaving} onClick={() => { void leave(); }}>{t('Sign out')}</Button></div>{signOutError && <p role="alert">{t('Could not sign out. Check your connection and try again.')}</p>}</div></Overlay>
  </main>;
}
