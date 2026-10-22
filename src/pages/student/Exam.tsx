import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CharBar, MapGrid, OptionButton, QuestionBody, Timer, type OptState } from '@/components/exam/parts';
import { Screen } from '@/components/layout/StudentShell';
import { Button, Segmented, Tag, cx } from '@/components/ui/basic';
import { Progress } from '@/components/ui/data';
import { Overlay } from '@/components/ui/overlay';
import { Notice } from '@/components/ui/patterns';
import { getQuestion } from '@/data/questions';
import { getTest } from '@/data/tests';
import { LETTERS, type ExamSession, type Letter } from '@/data/types';
import { sessionAttemptId } from '@/lib/assessment';
import { discoveryOrigin, testReadiness } from '@/lib/discovery';
import { gradeAttempt } from '@/lib/grading';
import { useHotkeys, useNow, useOnline } from '@/lib/hooks';
import { useApp } from '@/state/AppState';
import { LanguageSwitcher, useText } from '@/i18n/LanguageProvider';

export default function Exam() {
  const { testId } = useParams(); const test = getTest(testId);
  const { sessions, attempts } = useApp(); const t = useText();
  const session = test && sessions[test.id];
  const missing = test && testReadiness(test).missing;
  if (!test || !session || missing) {
    const last = [...attempts].reverse().find(a => a.testId === testId && !a.seedScore);
    return <Screen calm><main id="main-content" tabIndex={-1} className="assessment-fallback" data-no-translate><h1 className="t1">{t('Unavailable content')}</h1><p className="body l2">{t(missing ? 'Some questions are unavailable. This test cannot be started.' : 'There is no active session for this test. Open its details to start or choose another test.')}</p><Button to={test ? '/tests/' + test.id : '/tests'}>{t(test ? 'Return to test details' : 'Back to tests')}</Button>{last && <Button variant="secondary" to={'/results/' + last.id}>{t('Open results')}</Button>}</main></Screen>;
  }
  return <Player key={test.id} session={session} />;
}

type Surface = 'map' | 'submit' | 'exit' | null;
function Player({ session }: { session: ExamSession }) {
  const test = getTest(session.testId)!;
  const { saveSession, retrySession, finishSession, sessionSaveErrors, frozenAttempts, attempts } = useApp();
  const t = useText(); const nav = useNavigate(); const location = useLocation();
  const online = useOnline(); const now = useNow(1000, session.endsAt != null);
  const total = test.questionIds.length;
  const [position, setPosition] = useState(Math.max(0, Math.min(total - 1, session.current)));
  const [surface, setSurface] = useState<Surface>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [textSize, setTextSize] = useState<'standard' | 'large'>('standard');
  const [timeAnnouncement, setTimeAnnouncement] = useState<number | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const latest = useRef(session); latest.current = session;
  const allowLeave = useRef(false); const initialCommit = useRef(false); const committing = useRef(false);
  const mapRestore = useRef(true);
  const secondsLeft = session.endsAt != null ? Math.max(0, (session.endsAt - now) / 1000) : null;
  const expired = session.endsAt != null && session.endsAt <= now;
  const previousTime = useRef(secondsLeft);
  const id = sessionAttemptId(session);
  const savedResult = attempts.find(attempt => attempt.id === id);
  const frozen = frozenAttempts[test.id] ?? savedResult;
  const work = frozen ?? session;
  const saveError = !!sessionSaveErrors[test.id];
  const hasUnsaved = !savedResult && (!!frozen || saveError);
  const qid = test.questionIds[position]; const q = getQuestion(qid);
  const answer = work.answers[qid] ?? '';
  const checked = session.mode === 'practice' && !!session.checked?.[qid];
  const origin = discoveryOrigin(location.state, '/tests/' + test.id);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !allowLeave.current && currentLocation.pathname !== nextLocation.pathname);

  const commit = useCallback(() => {
    if (committing.current) return;
    committing.current = true;
    setSurface(null);
    const result = finishSession(test.id);
    if (result.ok) { allowLeave.current = true; nav('/results/' + result.id, { replace: true }); }
    else committing.current = false;
  }, [finishSession, test.id, nav]);

  useEffect(() => {
    if ((expired || savedResult) && !initialCommit.current) { initialCommit.current = true; commit(); }
  }, [expired, savedResult, commit]);
  useEffect(() => { if (blocker.state === 'blocked') setSurface('exit'); }, [blocker.state]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (hasUnsaved) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsaved]);
  useEffect(() => {
    if (!frozen) return;
    const frame = requestAnimationFrame(() => document.getElementById('submission-status')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [!!frozen]);
  useEffect(() => {
    if (secondsLeft == null) return;
    const crossed = [600, 120, 60].filter(n => secondsLeft <= n && previousTime.current != null && previousTime.current > n).pop();
    if (crossed != null && secondsLeft > 0) {
      setTimeAnnouncement(Math.floor(secondsLeft));
    }
    previousTime.current = secondsLeft;
  }, [secondsLeft]);

  const announcement = timeAnnouncement == null ? '' : t('{hours} hours {minutes} minutes {seconds} seconds remaining', { hours: Math.floor(timeAnnouncement / 3600), minutes: Math.floor(timeAnnouncement % 3600 / 60), seconds: timeAnnouncement % 60 });
  const closeOptions = () => { setOptionsOpen(false); requestAnimationFrame(() => document.getElementById('exam-options-toggle')?.focus()); };
  const canEdit = () => {
    if (frozen || committing.current) return false;
    if (session.endsAt != null && Date.now() >= session.endsAt) { commit(); return false; }
    return true;
  };
  const change = (patch: Partial<ExamSession>) => {
    if (!canEdit()) return;
    const next = { ...latest.current, ...patch };
    latest.current = next;
    saveSession(next);
  };
  const focusQuestion = () => requestAnimationFrame(() => document.getElementById('question-heading')?.focus());
  const go = (next: number) => {
    const index = Math.max(0, Math.min(total - 1, next));
    mapRestore.current = false;
    setPosition(index); setSurface(null);
    if (!frozen) change({ current: index });
    focusQuestion();
  };
  const pick = (letter: Letter) => { if (!checked) change({ answers: { ...latest.current.answers, [qid]: letter } }); };
  const clear = () => { if (checked) return; const answers = { ...latest.current.answers }; delete answers[qid]; change({ answers }); };
  const flag = () => { const flags = { ...latest.current.flags }; if (flags[qid]) delete flags[qid]; else flags[qid] = true; change({ flags }); };
  const check = () => change({ checked: { ...latest.current.checked, [qid]: true } });
  const openMap = () => { mapRestore.current = true; setSurface('map'); };
  const next = () => {
    if (session.mode === 'practice' && q.kind === 'single' && answer && !checked) check();
    else if (position === total - 1) setSurface('submit');
    else go(position + 1);
  };
  useHotkeys({ ArrowRight: () => go(position + 1), ArrowLeft: () => go(position - 1), m: openMap, f: flag }, !surface && !optionsOpen && !frozen);
  const stats = useMemo(() => {
    const unanswered = test.questionIds.flatMap((questionId, i) => work.answers[questionId]?.trim() ? [] : [i + 1]);
    const cells = test.questionIds.map((questionId, i) => ({ n: i + 1, s: work.answers[questionId]?.trim() ? 'ans' as const : 'un' as const, flagged: !!work.flags[questionId], checked: session.mode === 'practice' && !!session.checked?.[questionId] }));
    return { unanswered, answered: total - unanswered.length, cells, flagged: cells.filter(cell => cell.flagged).length };
  }, [work.answers, work.flags, session.checked, session.mode, test.questionIds, total]);
  const localResult = frozen && gradeAttempt(frozen);
  const primary = frozen ? 'Retry saving' : session.mode === 'practice' && q.kind === 'single' && !checked ? answer ? 'Check answer' : position === total - 1 ? 'Review and finish' : 'Skip question' : position === total - 1 ? 'Review and finish' : 'Next question';
  const optionState = (letter: Letter): OptState => checked && q.kind === 'single' ? letter === q.correct ? 'right' : letter === answer ? 'wrong' : '' : letter === answer ? 'sel' : '';
  const cancelExit = () => { if (blocker.state === 'blocked') blocker.reset(); setSurface(null); };
  const leave = () => {
    allowLeave.current = true;
    if (blocker.state === 'blocked') blocker.proceed();
    else nav(origin.from, { state: (location.state as { origin?: unknown } | null)?.origin });
  };
  return <Screen calm className={cx('assessment-root', textSize === 'large' && 'assessment-large')}>
    <div className="assessment-frame" data-no-translate>
      <header className="assessment-header"><div className="assessment-identity"><Tag tone="acc">{t(session.mode === 'practice' ? 'Practice' : 'Mock exam')}</Tag><strong className="t2">{t(test.name)}</strong>{testReadiness(test).preview && <span className="fn l2">{t('Content preview')}</span>}</div><div className="assessment-utilities"><Button variant="plain" icon="back" onClick={() => setSurface('exit')}>{t('Leave test')}</Button><Button id="exam-options-toggle" variant="secondary" aria-expanded={optionsOpen} aria-controls={optionsOpen ? 'exam-options' : undefined} onClick={() => setOptionsOpen(!optionsOpen)}>{t('Exam options')}</Button><Button variant="secondary" className="ux-finish" disabled={!!frozen} onClick={() => setSurface('submit')}>{t('Finish test')}</Button></div>
        <div className="assessment-progress"><div className="col"><span className="fn l2">{t('{answered} of {total} answered', { answered: stats.answered, total })}</span><Progress value={stats.answered} max={total} label={t('Answered')} /></div>{secondsLeft != null ? <Timer secondsLeft={secondsLeft} /> : <span className="tag">{t('Untimed')}</span>}</div>
        <p className={cx('fn assessment-save', saveError && !savedResult && 'badc')} role="status">{t(saveError && !savedResult ? 'Unsaved answers' : 'Answers saved on this device')}</p>
      </header>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      {optionsOpen && <section id="exam-options" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeOptions(); } }} className="card assessment-options" aria-label={t('Exam options')}><h2 className="t2">{t('Exam options')}</h2><LanguageSwitcher /><Segmented label={t('Text size')} value={textSize} onChange={setTextSize} options={[{ value: 'standard', label: t('Standard') }, { value: 'large', label: t('Large') }]} /><h3 className="hl">{t('Keyboard shortcuts')}</h3><p className="fn l2">{t('Left and Right arrows move between questions. M opens the map. F toggles a flag. Shortcuts stay inactive in inputs and dialogs.')}</p><Button variant="plain" onClick={closeOptions}>{t('Close')}</Button></section>}
      {!online && <div className="assessment-offline ex-banner" role="status">{t('Offline. You can keep using this loaded page. Reloading may need a connection.')}</div>}
      {saveError && !frozen && <Notice tone="error" title={t('Unsaved answers')}><p>{t('Your latest answers are still in this tab. Allow browser storage, then retry saving. Closing or reloading may lose them.')}</p><Button variant="secondary" onClick={() => retrySession(test.id)}>{t('Retry saving')}</Button></Notice>}
      <main id="main-content" tabIndex={-1} className="assessment-main">
        {frozen && <section className="card assessment-pending" role="alert"><h2 className="t2" id="submission-status" tabIndex={-1}>{t(savedResult ? 'Result saved; session cleanup failed' : 'Submission not saved')}</h2>{expired && <p className="hl">{t('Time is up. Answers are locked.')}</p>}<p className="body">{t(savedResult ? 'Retry finishing. Your saved result will be reused without creating another attempt.' : 'Answers are locked in this tab. Retry saving to finish. Closing or reloading may restore only the last saved answers.')}</p>{localResult && <p className="fn l2">{t('{correct} of {total} correct', { correct: localResult.correct, total: localResult.total })}{localResult.pending.length > 0 && ' · ' + t('{count} answers need review. This score is preliminary.', { count: localResult.pending.length })}</p>}<Button onClick={commit}>{t('Retry saving')}</Button></section>}
        <article className="card assessment-question"><div className="assessment-question-heading"><h1 id="question-heading" tabIndex={-1} className="t1">{t('Question {number} of {total}', { number: position + 1, total })}<span className="sr-only"> · {t(test.name)}</span></h1><Button variant="plain" icon="flag" aria-pressed={!!work.flags[qid]} disabled={!!frozen} onClick={flag}>{t(work.flags[qid] ? 'Remove flag' : 'Flag question')}</Button></div>
          <QuestionBody n={position + 1} q={q} numbered={false} />
          {q.placeholder && <p className="fn l2">{t('Preview results are not a reliable assessment.')}</p>}
          {q.kind === 'single' ? <section className="assessment-answers" role="radiogroup" aria-label={t('Answer options')}><h2 className="hl">{t('Choose one answer')}</h2>{LETTERS.map((letter, i) => <OptionButton key={letter} letter={letter} text={q.options[i]} state={optionState(letter)} selected={answer === letter} disabled={checked || !!frozen} onClick={() => pick(letter)} />)}{answer && !checked && !frozen && <Button variant="plain" className="ux-clear-answer" onClick={clear}>{t('Clear answer')}</Button>}{checked && <div className={cx('assessment-feedback', answer === q.correct ? 'feedback-correct' : 'feedback-incorrect')} role="status"><strong>{t(answer === q.correct ? 'Correct' : 'Not quite — the correct answer is marked')}</strong>{q.explanation?.length ? q.explanation.map((line, i) => <p key={i} lang="kaa">{line.t}</p>) : <p>{t('No explanation is available for this sample question.')}</p>}</div>}</section> : <section className="assessment-written"><label className="flab" htmlFor={`ans-${qid}`}>{t('Your answer')}</label><p id="written-guide" className="fn l2">{t('Use Karakalpak letters where needed. Spaces and letter case are normalized; close matches can remain pending.')}</p><textarea id={`ans-${qid}`} ref={textRef} lang="kaa" className="ux-textarea" rows={4} aria-describedby="written-guide written-review" placeholder={t('Write a short answer')} value={answer} readOnly={!!frozen} onChange={event => change({ answers: { ...latest.current.answers, [qid]: event.target.value } })} spellCheck={false} />{!frozen && <CharBar target={textRef} onInsert={value => change({ answers: { ...latest.current.answers, [qid]: value } })} />}<p id="written-review" className="fn l2">{t('Written answers use sample answer checks. Some remain pending; teacher review is not connected in this preview.')}</p>{answer && !frozen && <Button variant="plain" className="ux-clear-answer" onClick={clear}>{t('Clear answer')}</Button>}</section>}
        </article>
        <nav className="assessment-actions ex-toolbar" aria-label={t('Question navigation')}><Button variant="secondary" icon="back" onClick={() => go(position - 1)} disabled={position === 0}>{t('Previous')}</Button><Button variant="secondary" icon="map" onClick={openMap} aria-haspopup="dialog" aria-expanded={surface === 'map'}>{t('All questions')}</Button>{frozen && position < total - 1 && <Button variant="secondary" onClick={() => go(position + 1)}>{t('Next question')}</Button>}{!frozen && <Button className="assessment-primary" iconEnd="forward" onClick={next}>{t(primary)}</Button>}</nav>
      </main>
      <Overlay open={surface === 'map'} onClose={() => setSurface(null)} variant="dialog" className="assessment-dialog assessment-map" labelledBy="map-title" initialFocus="button.cell.cur" restoreFocus={mapRestore.current}><h2 id="map-title" className="t2">{t('Question map')}</h2><p className="fn l2">{t('{answered} of {total} answered', { answered: stats.answered, total })} · {t('Flagged: {count}', { count: stats.flagged })}</p><MapGrid cells={stats.cells} current={position + 1} onPick={n => go(n - 1)} /><div className="assessment-legend" aria-label={t('Question states')}>{['Current question', 'Answered', 'Not answered', 'Flagged', 'Checked'].map(label => <span className="fn l2" key={label}>{t(label)}</span>)}</div><Button variant="secondary" onClick={() => setSurface(null)}>{t('Close')}</Button></Overlay>
      <Overlay open={surface === 'submit' && !frozen} onClose={() => setSurface(null)} variant="dialog" className="assessment-dialog" labelledBy="submit-title" alert initialFocus="#review-unanswered"><h2 id="submit-title" className="t2">{t('Submit this attempt?')}</h2><p className="body l2">{t('Submitting locks your answers. The result opens only after it has been saved on this device.')}</p><p className="hl">{t('{answered} of {total} answered', { answered: stats.answered, total })}</p><p className="hl">{t('Unanswered: {count}', { count: stats.unanswered.length })}</p>{stats.unanswered.length > 0 && <p className="fn l2">{t('Questions: {numbers}', { numbers: stats.unanswered.join(', ') })}</p>}<div className="assessment-dialog-actions"><Button id="review-unanswered" variant="secondary" onClick={() => stats.unanswered.length ? go(stats.unanswered[0] - 1) : setSurface(null)}>{t(stats.unanswered.length ? 'Review unanswered' : 'Keep solving')}</Button><Button id="submit-now" onClick={commit}>{t('Submit')}</Button></div></Overlay>
      <Overlay open={surface === 'exit'} onClose={cancelExit} variant="dialog" className="assessment-dialog" labelledBy="exit-title" alert initialFocus="#keep-solving"><h2 id="exit-title" className="t2">{t('Leave this test?')}</h2><p className="body l2">{t(hasUnsaved ? 'This attempt has not been saved. Leave only if you accept losing the unsaved work on reload or close.' : secondsLeft != null ? 'Answers are saved on this device. The timer continues if you leave.' : 'Answers are saved on this device. You can return later.')}</p>{hasUnsaved && <Button variant="secondary" onClick={() => frozen ? commit() : retrySession(test.id)}>{t('Retry saving')}</Button>}<div className="assessment-dialog-actions"><Button id="keep-solving" variant="secondary" onClick={cancelExit}>{t('Keep solving')}</Button><Button onClick={leave}>{t(hasUnsaved ? 'Leave anyway' : 'Leave test')}</Button></div></Overlay>
    </div>
  </Screen>;
}
