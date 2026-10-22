import { Link } from 'react-router-dom';
import { Button, Tag } from '@/components/ui/basic';
import { Progress } from '@/components/ui/data';
import { Notice } from '@/components/ui/patterns';
import { TESTS, getTest } from '@/data/tests';
import { gradeAttempt } from '@/lib/grading';
import { clock } from '@/lib/format';
import { testReadiness } from '@/lib/discovery';
import { useNow } from '@/lib/hooks';
import { answeredCount } from '@/lib/tests';
import { useApp } from '@/state/AppState';
import { useText, useFormatting } from '@/i18n/LanguageProvider';

export default function Dashboard() {
  const { user, sessions, attempts, mistakes, introductionComplete } = useApp();
  const t = useText(); const format = useFormatting(); const now = useNow(1000);
  const ordered = Object.values(sessions).sort((a, b) => b.startedAt - a.startedAt);
  const usable = (id: string) => { const test = getTest(id); return !!test && !testReadiness(test).missing; };
  const active = ordered.find(session => usable(session.testId)); const activeTest = active && getTest(active.testId);
  const unavailable = ordered.some(session => !usable(session.testId));
  const latest = [...attempts].filter(a => !a.seedScore && usable(a.testId)).sort((a, b) => b.submittedAt - a.submittedAt)[0];
  const result = latest && gradeAttempt(latest);
  const expired = active?.endsAt != null && active.endsAt <= now;
  const preview = activeTest && testReadiness(activeTest).preview;
  const next = active && activeTest ? { title: t(activeTest.name), copy: 'Continue where you left off', to: '/exam/' + activeTest.id, label: expired ? 'Review expired test' : preview ? 'Resume preview' : activeTest.mode === 'practice' ? 'Resume practice' : 'Resume timed exam' }
    : !introductionComplete ? { title: t('First time taking a test online?'), copy: 'Learn the controls in three simple steps. No timer and no score.', to: '/getting-started', label: 'Try a sample' }
    : { title: t('Practice at your own pace'), copy: 'Check each answer and learn from the explanation.', to: '/tests?mode=practice', label: 'Find a practice test' };
  return <main id="main-content" tabIndex={-1} className="s-main wide discovery-home" data-no-translate>
    <header className="page-head"><div className="col"><p className="eyebrow">Huqıq Mektebi</p><h1 className="lt">{user?.name ? t('Welcome') + ', ' + user.name.split(' ')[0] : t('Your learning starts here')}</h1><p className="callout l2">{t('Choose your next step')}</p></div></header>
    {unavailable && <Notice tone="warning" title={t('An unfinished test is unavailable. Its saved answers have been kept.')} />}
    <section className="card learning-next" aria-labelledby="next-task-title">
      <div className="col"><Tag tone="acc">{t(active ? 'In progress' : 'Start here')}</Tag><h2 id="next-task-title" className="t1">{next.title}</h2><p className="callout l2">{t(next.copy)}</p>
        {active && activeTest && <><p className="fn l2">{t('{answered} of {total} answered', { answered: answeredCount(active), total: activeTest.questionIds.length })}</p><Progress value={answeredCount(active)} max={activeTest.questionIds.length} label={t('Answered')} />{active.endsAt != null && !expired && <p className="hl num">{t('Remaining: {time}', { time: clock((active.endsAt - now) / 1000) })}</p>}{expired && <p className="fn l2">{t('The deadline has passed. Opening this test completes its existing attempt; it does not restart the timer.')}</p>}{preview && <p className="fn l2">{t('Preview only — some questions are incomplete.')}</p>}</>}
      </div><div className="learning-next-actions"><Link className="btn btn-primary" to={next.to} state={{ from: '/' }}>{t(next.label)}</Link>{!active && !introductionComplete && <Button variant="plain" to="/tests?mode=practice">{t('Find a practice test')}</Button>}</div>
    </section>
    <section className="journey-grid" aria-label={t('Tests')}>
      <article className="card journey-card"><p className="eyebrow">{t('Practice')}</p><h2 className="t2">{t('Practice at your own pace')}</h2><p className="callout l2">{t('Check each answer and learn from the explanation.')}</p><Button variant="secondary" to="/tests?mode=practice">{t('Choose practice')}</Button></article>
      <article className="card journey-card"><p className="eyebrow">{t('Mock exam')}</p><h2 className="t2">{t('Prepare for the exam')}</h2><p className="callout l2">{t('Timed tests. See your results after finishing.')}</p><Button variant="secondary" to="/tests?mode=mock">{t('Choose an exam')}</Button></article>
    </section>
    <section className="card learning-history" aria-labelledby="recent-learning"><h2 id="recent-learning" className="t2">{t('Recent learning')}</h2>{latest && result ? <div className="learning-history-row"><div className="col"><Tag tone={result.pending.length ? 'warn' : ''}>{t(result.pending.length ? 'Preliminary result' : 'Results')}</Tag><h3 className="hl">{t(getTest(latest.testId)!.name)}</h3><p className="fn l2">{t('{correct} of {total} correct', { correct: result.correct, total: result.total })} · {format.date(latest.submittedAt)}</p>{result.pending.length > 0 && <p className="fn l2">{t('{count} answers need review. This score is preliminary.', { count: result.pending.length })}</p>}{testReadiness(getTest(latest.testId)!).preview && <p className="fn l2">{t('Preview results are not a reliable assessment.')}</p>}</div><Button variant="secondary" to={'/results/' + latest.id}>{t('Open results')}</Button></div> : <div className="col"><h3 className="hl">{t('No scored work yet')}</h3><p className="callout l2">{t('Your first completed test will appear here.')}</p></div>}{mistakes.length > 0 && <div className="learning-saved"><span className="fn l2">{t('Saved for practice: {count}', { count: mistakes.length })}</span><Button variant="plain" to="/mistakes">{t('My mistakes')}</Button></div>}</section>
    {TESTS.some(test => test.assigned) && <section className="col learning-assignments"><h2 className="t2">{t('Sample assignments')}</h2><p className="fn l2">{t('These are sample assignments, not messages from your teacher.')}</p><div className="journey-grid">{TESTS.filter(test => test.assigned).map(test => <article className="card journey-card" key={test.id}><Tag>{t('Sample data')}</Tag><h3 className="hl">{t(test.name)}</h3>{test.due && <p className="fn l2">{t('Due: {date}', { date: format.date(test.due) })}</p>}{testReadiness(test).preview && <p className="fn l2">{t('Preview only — some questions are incomplete.')}</p>}<Link className="btn btn-secondary" to={'/tests/' + test.id} state={{ from: '/' }}>{t('Open test')}</Link></article>)}</div></section>}
  </main>;
}
