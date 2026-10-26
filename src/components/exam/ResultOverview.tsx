import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Grade, ServerAttempt } from '../../../shared/contracts/exams';
import { useFormatting, useText } from '@/i18n/LanguageProvider';
import { testLanguageLabel } from '../../../shared/contracts/languages';
import { Button } from '@/components/ui/basic';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SaveQuestion } from '@/pages/student/ServerLearning';
import './ResultOverview.css';

type Verdict = Grade['verdict'];
const outcomes: { key: Verdict; label: string; icon: IconName; mark: string }[] = [
  { key: 'correct', label: 'Correct', icon: 'checkCircle', mark: '✓' },
  { key: 'incorrect', label: 'Incorrect', icon: 'errorCircle', mark: '×' },
  { key: 'partial', label: 'Partial', icon: 'halfCircle', mark: '½' },
  { key: 'pending', label: 'Awaiting grading', icon: 'clock', mark: '…' },
  { key: 'unanswered', label: 'Not answered', icon: 'dashedCircle', mark: '−' },
];

/** A result is confirmed by the server before this screen is mounted. */
export function ResultOverview({ attempt: a }: { attempt: ServerAttempt }) {
  const t = useText(); const format = useFormatting();
  const [selected, setSelected] = useState<Verdict | null>(null);
  const [review, setReview] = useState<number | null>(null);
  const reviewTitle = useRef<HTMLHeadingElement>(null);
  const completionTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => { completionTitle.current?.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'auto'}); }, [a.id]);
  const total = a.questions.length;
  const answered = a.questions.filter(q => a.snapshot.answers[q.id]?.trim()).length;
  const counts = a.answerCounts;
  const percent = a.result && a.result.maxUnits > 0 ? Math.min(100, Math.max(0, a.result.units / a.result.maxUnits * 100)) : null;
  const categories = counts ? outcomes.filter(item => counts[item.key] > 0 || item.key === 'correct' || item.key === 'incorrect' || item.key === 'unanswered') : [];
  const active = categories.find(item => item.key === selected);
  const activeCount = active && counts ? counts[active.key] : null;
  const activePercent = activeCount !== null && total > 0 ? activeCount / total * 100 : null;
  const ringPercent = activePercent ?? percent ?? 0;
  const hasFeedback = a.questions.some(q => !!a.feedback[q.id]);
  const question = review === null ? undefined : a.questions[review];
  const feedback = question ? a.feedback[question.id] : undefined;
  const answer = question ? a.snapshot.answers[question.id] : undefined;
  const answerText = question?.kind === 'single' ? question.options.find(option => option.id === answer)?.text : answer;
  const correctAnswer = question?.kind === 'single' && feedback?.correctOptionId ? question.options.find(option => option.id === feedback.correctOptionId)?.text : undefined;
  const status = (id: string): Verdict | 'answered' => a.feedback[id]?.verdict ?? (a.snapshot.answers[id]?.trim() ? 'answered' : 'unanswered');
  const selectQuestion = (index: number) => {
    setReview(index);
    requestAnimationFrame(() => { reviewTitle.current?.focus({ preventScroll: true }); reviewTitle.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' }); });
  };
  const matching = selected ? a.questions.filter(q => status(q.id) === selected).length : total;
  // Aggregate grades do not authorize revealing per-question grades before release.
  const canFilter = selected === 'unanswered' || hasFeedback;

  return <div className="result-report">
    <nav className="result-topbar" aria-label={t('Results')}><Button to="/progress" variant="plain" icon="back">{t('View attempt history')}</Button><span className="result-readonly"><Icon name="checkCircle" size="s" />{t('Answers submitted')}</span></nav>
    <header className="result-completion">
      <span className="result-completion-seal" aria-hidden="true"><svg viewBox="0 0 64 64"><circle className="result-seal-circle" cx="32" cy="32" r="28" /><path className="result-seal-check" d="m20 32 8 8 16-17" /></svg></span>
      <div><p className="result-eyebrow">{t('Test completed')}</p><h1 ref={completionTitle} tabIndex={-1}>{t(a.result ? 'Your result is ready' : 'Answers submitted')}</h1><p className="result-completion-description">{t(a.result ? 'Your answers have been submitted. This attempt is complete.' : 'Your answers were received. The score is being prepared.')}</p></div>
    </header>

    <section className="result-identity" aria-label={a.name}><div><span className="result-eyebrow">{t(a.examId.startsWith('c_') ? 'Test collection' : a.mode === 'practice' ? 'Practice' : 'Mock exam')}</span><h2>{a.name}</h2></div><span className="result-language" lang={a.language}><Icon name="globe" size="s" />{testLanguageLabel(a.language)}</span></section>

    <div className="result-dashboard">
      <section className="result-card result-score-card" aria-labelledby="result-score-title">
        <div className="result-card-heading"><h2 id="result-score-title">{t(a.result?.final ? 'Your score' : 'Preliminary score')}</h2><span className={'result-status'+(a.result?.final ? '' : ' is-pending')}><Icon name={a.result?.final ? 'checkCircle' : 'clock'} size="s" />{t(a.result?.final ? 'Final result' : 'Awaiting grading')}</span></div>
        <div className="result-score-body">
          <div className="result-score-ring" style={{ '--ring-offset': 100 - ringPercent } as CSSProperties} role="img" aria-label={percent === null && !active ? t('Your answers were received. The score is being prepared.') : (active ? t(active.label) : t('Score percentage'))+': '+format.number(Math.round(ringPercent))+'%'}>
            <svg viewBox="0 0 200 200" aria-hidden="true"><circle className="result-ring-track" cx="100" cy="100" r="85" /><circle className={'result-ring-fill'+(active ? ' result-tone-'+active.key : '')} cx="100" cy="100" r="85" pathLength="100" /></svg>
            <div className="result-ring-value" aria-hidden="true"><strong>{percent === null && !active ? '—' : format.number(Math.round(ringPercent))+'%'}</strong><span>{active ? t(active.label) : t('Score percentage')}</span></div>
          </div>
          <div className="result-score-numbers"><p>{t('Points earned')}</p><div><strong>{a.result ? format.number(a.result.units / 2) : '—'}</strong><span>/ {a.result ? format.number(a.result.maxUnits / 2) : '—'}</span></div><span>{t('Maximum score')}: {a.result ? format.number(a.result.maxUnits / 2) : '—'}</span></div>
        </div>
        <p className="result-score-note">{t(a.result?.final ? 'This attempt is complete. Your answers cannot be changed.' : 'This result is provisional. Pending answers are not marked incorrect.')}</p>
      </section>

      <section className="result-card result-breakdown" aria-labelledby="result-breakdown-title">
        <div className="result-card-heading"><h2 id="result-breakdown-title">{t('Answer breakdown')}</h2><Icon name="bars" /></div>
        {counts ? <>
          <p className="result-description">{t('Select a category to explore your result.')}</p>
          <div className="result-distribution" aria-label={t('Answer breakdown')}>{categories.filter(item => counts[item.key] > 0).map(item => <button key={item.key} type="button" className={'result-distribution-segment result-tone-'+item.key} style={{ flexGrow: counts[item.key] }} aria-label={t(item.label)+': '+counts[item.key]} aria-pressed={selected === item.key} onClick={() => setSelected(selected === item.key ? null : item.key)} title={t(item.label)+': '+counts[item.key]} />)}</div>
          <div className="result-outcomes result-counts">{categories.map(item => <button type="button" key={item.key} className={'result-outcome result-tone-'+item.key} aria-pressed={selected === item.key} onClick={() => setSelected(selected === item.key ? null : item.key)}><span className="result-outcome-icon"><Icon name={item.icon} /></span><span>{t(item.label)}</span><strong>{format.number(counts[item.key])}</strong><small>{format.number(total > 0 ? Math.round(counts[item.key] / total * 100) : 0)}%</small></button>)}</div>
        </> : <div className="result-awaiting"><Icon name="clock" size="l" /><p>{t('Your answers were received. The score is being prepared.')}</p></div>}
        <p className="result-category-detail" role="status">{active && activeCount !== null ? t('{count} of {total} questions: {category}',{count:activeCount,total,category:t(active.label).toLocaleLowerCase()}) : t('All categories are shown.')}</p>
      </section>
    </div>

    <dl className="result-facts">
      <div><dt><Icon name="tests" />{t('Total questions')}</dt><dd>{format.number(total)}</dd></div>
      <div><dt><Icon name="pencil" />{t('Answered')}</dt><dd>{format.number(answered)}<span> / {format.number(total)}</span></dd></div>
      <div><dt><Icon name="calendar" />{t('Test date')}</dt><dd className="result-fact-date">{format.date(a.startedAt)}</dd></div>
    </dl>

    <section className="result-card result-review" aria-labelledby="result-review-title">
      <div className="result-card-heading"><div><p className="result-eyebrow">{t('Next step')}</p><h2 id="result-review-title">{t('Review your answers')}</h2></div>{selected && <Button variant="plain" onClick={() => setSelected(null)}>{t('Show all questions')}</Button>}</div>
      <p className="result-description">{t(hasFeedback ? 'Select a question to see your answer and feedback.' : 'You can review your answers. Detailed feedback will appear when it is released.')}</p>
      {selected && canFilter && <p className="result-filter-note" role="status">{t('{count} matching questions',{count:matching})}</p>}
      <div className="result-question-map" aria-label={t('All questions')}>{a.questions.map((q, n) => {
        const verdict = status(q.id); const mark = outcomes.find(item => item.key === verdict)?.mark ?? '•';
        return <button key={q.id} type="button" className={'result-question result-tone-'+verdict} hidden={!!selected && canFilter && verdict !== selected} aria-label={t('Question')+' '+(n+1)+' · '+t(outcomes.find(item => item.key === verdict)?.label ?? 'Answered')} aria-pressed={review === n} onClick={() => selectQuestion(n)}><span>{n+1}</span><small aria-hidden="true">{mark}</small></button>;
      })}</div>
      <div className="result-map-legend">{(hasFeedback ? outcomes.filter(item => a.questions.some(q => status(q.id) === item.key)) : [{key:'answered',label:'Answered',mark:'•'},outcomes[4]]).map(item => <span key={item.key}><b className={'result-tone-'+item.key} aria-hidden="true">{item.mark}</b>{t(item.label)}</span>)}</div>
      {question && <article className="result-question-detail" key={question.id}>
        <div className="result-card-heading"><h3 ref={reviewTitle} tabIndex={-1}>{t('Question')} {review!+1} / {total}</h3><button type="button" className="result-close-review" aria-label={t('Close')} onClick={()=>setReview(null)}><Icon name="close" /></button></div>
        <p className="result-question-stem" lang={a.language}>{question.stem}</p>
        {question.kind === 'single' && <>{question.terms && <ul>{question.terms.map(item=><li key={item.k}>{item.k} {item.t}</li>)}</ul>}{question.defs && <ul>{question.defs.map(item=><li key={item.k}>{item.k} {item.t}</li>)}</ul>}</>}
        <dl className="result-answer-detail"><div><dt>{t('Your answer')}</dt><dd lang={a.language}>{answerText?.trim() || t('Not answered')}</dd></div>{correctAnswer && <div className="result-correct-answer"><dt>{t('Correct answer')}</dt><dd lang={a.language}>{correctAnswer}</dd></div>}</dl>
        {feedback && <div className="result-feedback"><strong>{t(outcomes.find(item=>item.key===feedback.verdict)!.label)}</strong>{feedback.explanation&&<p lang={a.language}>{feedback.explanation}</p>}{feedback.reviewComment&&<p lang={a.language}>{feedback.reviewComment}</p>}{feedback.accepted.length>0&&<p lang={a.language}>{feedback.accepted.join(' · ')}</p>}<SaveQuestion attemptId={a.id} questionId={question.id}/></div>}
      </article>}
    </section>
    <footer className="result-footer"><p><Icon name="checkCircle" size="s" />{t('This attempt is complete. Your answers cannot be changed.')}</p><Button to="/tests" iconEnd="forward">{t('Back to tests')}</Button></footer>
  </div>;
}
