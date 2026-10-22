import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { QuestionBody, OptionButton } from '@/components/exam/parts';
import { Explanation, LearningUnavailable } from '@/components/exam/LearningParts';
import { Screen } from '@/components/layout/StudentShell';
import { Button, Tag } from '@/components/ui/basic';
import { LETTERS, type Letter } from '@/data/types';
import { useText } from '@/i18n/LanguageProvider';
import { learningResult, reviewReturn, verdictLabel } from '@/lib/learning';
import { useHotkeys } from '@/lib/hooks';
import { useApp } from '@/state/AppState';

export default function Review() {
  const { attemptId, n } = useParams(); const [params] = useSearchParams();
  const { attempts, mistakes, toggleMistake } = useApp(); const t = useText(); const nav = useNavigate();
  const [saveStatus, setSaveStatus] = useState<boolean | null>(null);
  const attempt = attempts.find(a => a.id === attemptId); const result = learningResult(attempt);
  const num = Number(n); const row = Number.isInteger(num) && num > 0 ? result?.rows[num - 1] : undefined;
  const back = reviewReturn(attemptId ?? '', params.get('return'));
  const go = (number: number) => { if (!result || number < 1 || number > result.total) return; setSaveStatus(null); nav('/results/' + attemptId + '/q/' + number + '?return=' + encodeURIComponent(back), { replace:true }); };
  useHotkeys({ ArrowLeft: () => go(num - 1), ArrowRight: () => go(num + 1) }, !!row);
  if (!attempt || !result || !row) return <Screen calm><LearningUnavailable summary={!!attempt?.seedScore} to={attempt && !attempt.seedScore ? '/results/' + attempt.id : '/progress'} /></Screen>;
  const { q, answer, verdict } = row;
  const nextIssue = result.rows.find(r => r.n > num && (r.verdict === 'incorrect' || r.verdict === 'unanswered' || r.verdict === 'pending'));
  const saved = mistakes.includes(q.id);
  return <Screen calm><main id="main-content" tabIndex={-1} className="learning-review learning-page" data-no-translate>
    <header className="learning-head"><Button variant="secondary" to={back}>{t('Back to results')}</Button><span>{t('Question {number} of {total}', { number:num,total:result.total })}</span></header>
    <article className="card learning-card"><h1 className="t1">{t('Review question {number}', { number:num })}</h1><Tag tone={verdict === 'correct' ? 'ok' : verdict === 'incorrect' ? 'bad' : undefined}>{t(verdictLabel[verdict])}</Tag><QuestionBody q={q} n={num} numbered={false} />
      {q.placeholder && <p className="learning-note">{t('Preview results are not a reliable assessment.')}</p>}
      <section className="learning-response"><h2 className="hl">{t('Your answer')}</h2>{q.kind === 'single' && answer && LETTERS.includes(answer as Letter) ? <OptionButton asStatic letter={answer} text={q.options[LETTERS.indexOf(answer as Letter)]} state={verdict === 'correct' ? 'right' : 'wrong'} /> : <p className="learning-answer-text" lang={answer ? 'kaa' : undefined}>{answer?.trim() || t('Not answered')}</p>}</section>
      <section className="learning-response"><h2 className="hl">{t(q.kind === 'single' ? 'Correct answer' : 'Accepted answers')}</h2>{q.kind === 'single' ? <OptionButton asStatic letter={q.correct} text={q.options[LETTERS.indexOf(q.correct)]} state="right" /> : q.accepted.length ? <ul className="learning-models" lang="kaa">{q.accepted.map(value => <li key={value}>{value}</li>)}</ul> : <p className="body l2">{t('No model answer is available for this question.')}</p>}{verdict === 'pending' && <p className="learning-note" data-pending>{t('Written answer awaiting review. The score is preliminary.')} {t('Teacher review is not connected in this preview.')}</p>}</section>
      <Explanation q={q} />
      <section className="learning-response"><h2 className="hl">{t('Save for practice')}</h2><p className="fn l2">{t('Saving a question does not change your grade. Retry practice is not added to test history.')}</p><div className="learning-actions"><Button variant="secondary" aria-pressed={saved} onClick={() => setSaveStatus(toggleMistake(q.id))}>{t(saved ? 'Remove from saved questions' : 'Save question for practice')}</Button><Button variant="plain" to={'/mistakes?question=' + encodeURIComponent(q.id)}>{t('Open saved questions')}</Button></div><p className="fn" role={saveStatus === false ? 'alert' : 'status'}>{saveStatus != null && t(saveStatus ? 'Saved questions updated on this device.' : 'Could not update saved questions. Your list is unchanged; try again.')}</p></section>
    </article>
    <nav className="learning-actions learning-review-nav" aria-label={t('Review navigation')}><Button variant="secondary" disabled={num === 1} onClick={() => go(num - 1)}>{t('Previous')}</Button>{nextIssue ? <Button onClick={() => go(nextIssue.n)}>{t('Next question to review')}</Button> : num < result.total ? <Button onClick={() => go(num + 1)}>{t('Next question')}</Button> : <Button to={back}>{t('Back to results')}</Button>}{nextIssue && nextIssue.n !== num + 1 && num < result.total && <Button variant="secondary" onClick={() => go(num + 1)}>{t('Next question')}</Button>}</nav>
  </main></Screen>;
}
