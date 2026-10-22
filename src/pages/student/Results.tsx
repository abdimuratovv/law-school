import { useEffect } from 'react';
import { useLocation, useParams, useSearchParams, Link } from 'react-router-dom';
import { Button, Segmented, Tag } from '@/components/ui/basic';
import { ScoreRing } from '@/components/ui/data';
import { LearningUnavailable } from '@/components/exam/LearningParts';
import { getTest } from '@/data/tests';
import { TOPICS } from '@/data/topics';
import { useText, useFormatting } from '@/i18n/LanguageProvider';
import { clock } from '@/lib/format';
import { learningResult, resultFilter, verdictLabel, type ResultFilter } from '@/lib/learning';
import { testReadiness } from '@/lib/discovery';
import { useApp } from '@/state/AppState';

export default function Results() {
  const { attemptId } = useParams(); const { attempts, sessions } = useApp();
  const [params, setParams] = useSearchParams(); const location = useLocation(); const t = useText(); const format = useFormatting();
  const attempt = attempts.find(a => a.id === attemptId); const result = learningResult(attempt);
  useEffect(() => { if (!/^#result-question-\d+$/.test(location.hash)) return; const frame = requestAnimationFrame(() => requestAnimationFrame(() => { const target = document.getElementById(location.hash.slice(1)); target?.scrollIntoView({ block:'center' }); target?.focus(); })); return () => cancelAnimationFrame(frame); }, [location.hash]);
  if (!attempt || !result) return <LearningUnavailable summary={!!attempt?.seedScore} />;
  const test = getTest(attempt.testId); const preliminary = result.pending.length > 0;
  const filter = resultFilter(params.get('filter'));
  const issues = result.rows.filter(r => r.verdict === 'incorrect' || r.verdict === 'unanswered');
  const first = issues[0] ?? result.pending[0] ?? result.rows[0];
  const rows = result.rows.filter(r => filter === 'all' || (filter === 'flagged' ? r.flagged : r.verdict === filter));
  const back = '/results/' + attempt.id + (params.size ? '?' + params.toString() : '');
  const toReview = (n: number) => '/results/' + attempt.id + '/q/' + n + '?return=' + encodeURIComponent(back + '#result-question-' + n);
  const scoreLabel = t(preliminary ? 'Preliminary score: {correct} of {total}, {percent} percent' : 'Final score: {correct} of {total}, {percent} percent', { correct: result.correct, total: result.total, percent: result.percent });
  return <main id="main-content" tabIndex={-1} className="s-main wide learning-page" data-no-translate>
    <header className="learning-head"><div><p className="fn l2">{t(test?.name ?? 'Earlier test')} · {t(attempt.mode === 'practice' ? 'Practice' : 'Mock exam')} · {format.date(attempt.submittedAt, true)}</p><h1 className="lt">{t(preliminary ? 'Preliminary result' : 'Final result')}</h1></div><Button variant="secondary" to={params.get('progressMode') === 'practice' || params.get('progressMode') === 'mock' ? '/progress?mode=' + params.get('progressMode') : '/progress'}>{t('Back to progress')}</Button></header>
    {test && testReadiness(test).preview && <p className="learning-note">{t('Preview results are not a reliable assessment.')}</p>}
    <div className="learning-results-grid"><div className="col learning-stack">
      <section className="card learning-card"><h2 className="t2">{t('Your score')}</h2><figure className="learning-score"><ScoreRing correct={result.correct} total={result.total} label={scoreLabel} /><figcaption><strong className="hl">{t(preliminary ? 'Preliminary score' : 'Final score')}</strong><p className="fn l2">{t('Score = correct answers ÷ all questions. Pending answers are not marked incorrect.')}</p></figcaption></figure>
      <dl className="learning-counts">{(['correct','incorrect','unanswered','pending'] as const).map(verdict => <div key={verdict} data-verdict={verdict}><dt>{t(verdictLabel[verdict])}</dt><dd>{format.number(result.rows.filter(r => r.verdict === verdict).length)}</dd></div>)}</dl>
      <p className="fn l2">{t('Time taken')}: <span className="num">{clock(attempt.durationSec)}</span> · {t('{answered} of {total} answered', { answered: result.answered, total: result.total })}</p>
      {preliminary && <div className="learning-note" data-pending><h3 className="hl">{t('{count} answers need review. This score is preliminary.', { count: result.pending.length })}</h3><p className="fn">{t('Written answers use sample checks. Teacher review is not connected in this preview.')}</p></div>}
      <Button to={toReview(first.n)}>{t(issues.length ? 'Review mistakes' : preliminary ? 'Review written answers' : 'Review answers')}</Button></section>
      <section className="card learning-card"><h2 className="hl">{t('By topic')}</h2>{result.byTopic.map(topic => <div key={topic.topic} className="learning-topic"><span>{t(topic.name)}</span><span className="num">{t('{correct} of {total} correct', { correct: topic.correct, total: topic.total })}</span></div>)}<p className="fn l2">{t(preliminary ? 'Topic counts are preliminary while answers await grading.' : 'Topic counts include every question in this attempt.')}</p></section>
      <section className="card learning-card"><h2 className="hl">{t('Keep learning')}</h2><p className="body l2">{t('Review an explanation, save a question, then practice it without changing this result.')}</p><div className="learning-actions">{test && <Button variant="secondary" to={'/tests/' + test.id}>{t(sessions[test.id] ? 'Open test details to resume' : 'Open test details to retake')}</Button>}<Button variant="plain" to="/tests?mode=practice">{t('Find a practice test')}</Button></div></section>
    </div><section className="card learning-card learning-answers"><h2 className="t2">{t('Review answers')}</h2><Segmented<ResultFilter> label={t('Filter answers')} value={filter} onChange={value => { const next = new URLSearchParams(params); if (value === 'all') next.delete('filter'); else next.set('filter', value); setParams(next, { replace: true }); }} options={[{ value:'all',label:t('All') },{ value:'incorrect',label:t('Incorrect') },{ value:'unanswered',label:t('Not answered') },{ value:'pending',label:t('Awaiting grading') },{ value:'flagged',label:t('Flagged') }]} />
      <p className="fn l2" role="status">{t('{count} questions shown', { count: rows.length })}</p>
      <div className="learning-question-list">{rows.map(row => <Link id={'result-question-' + row.n} className="learning-question-link" key={row.n} to={toReview(row.n)}><strong>{t('Question {number}', { number:row.n })}</strong><span className="learning-row-detail"><span>{t(verdictLabel[row.verdict])}</span><span className="fn l2">{t(TOPICS[row.q.topic].name)}</span></span>{row.flagged && <Tag>{t('Flagged')}</Tag>}<span aria-hidden="true">→</span></Link>)}</div>
      {!rows.length && <div className="learning-empty"><p>{t('No questions match this filter.')}</p><Button variant="secondary" onClick={() => setParams({}, { replace:true })}>{t('Show all answers')}</Button></div>}
    </section></div>
  </main>;
}
