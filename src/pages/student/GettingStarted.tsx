import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CharBar, OptionButton, QuestionBody } from '@/components/exam/parts';
import { Button, Tag } from '@/components/ui/basic';
import { Overlay } from '@/components/ui/overlay';
import { Notice } from '@/components/ui/patterns';
import { discoveryOrigin } from '@/lib/discovery';
import { getQuestion } from '@/data/questions';
import { LETTERS, type Letter } from '@/data/types';
import { useText } from '@/i18n/LanguageProvider';
import { useApp } from '@/state/AppState';

const QUESTIONS = [getQuestion('Q-0051'), getQuestion('Q-0388'), getQuestion('Q-0414')];
const STEPS = [
  { title: 'Select an option', text: 'Click an answer. You can change your choice before checking.' },
  { title: 'Change your answer', text: 'Choose an option, then try another. Press Check answer when you are ready.' },
  { title: 'Write an answer and use the map', text: 'Type a short answer. Use All questions to move between questions.' }
] as const;

export default function GettingStarted() {
  const t = useText();
  const nav = useNavigate();
  const location = useLocation();
  const origin = discoveryOrigin(location.state, '/');
  const fromLobby = /^\/tests\/[^/?#]+$/.test(origin.from);
  const lobbyOrigin = discoveryOrigin((location.state as { lobbyOrigin?: unknown } | null)?.lobbyOrigin, '/tests?mode=practice');
  const returnState = fromLobby ? lobbyOrigin : { restore: origin };
  const { completeIntroduction } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [mapOpen, setMapOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const mapReturn = useRef(true);
  const go = (index: number) => {
    mapReturn.current = false;
    setStep(index); setMapOpen(false);
    requestAnimationFrame(() => document.getElementById('sample-step-title')?.focus());
  };
  const textRef = useRef<HTMLTextAreaElement>(null);
  const q = QUESTIONS[step];
  const answer = answers[step] ?? '';
  const update = (value: string) => setAnswers(previous => ({ ...previous, [step]: value }));
  const check = () => setChecked(previous => ({ ...previous, [step]: true }));
  const finishIntroduction = () => {
    if (!completeIntroduction()) { setSaveError(true); return; }
    nav(fromLobby ? origin.from : '/tests?mode=practice', { state: fromLobby ? returnState : undefined });
  };
  if (!q) return <main id="main-content" tabIndex={-1} className="s-main tutorial-page" data-no-translate><h1 className="lt">{t('Try a sample')}</h1><Notice tone="warning" title={t('Unavailable content')} /><Link className="btn btn-secondary" to={origin.from} state={returnState}>{t('Skip sample')}</Link></main>;
  return <main id="main-content" tabIndex={-1} className="s-main tutorial-page" data-no-translate>
    <div><Link className="btn btn-plain" to={origin.from} state={returnState}>← {t(fromLobby ? 'Back to test details' : origin.from === '/' ? 'Back home' : 'Back')}</Link></div>
    <header className="col" style={{ gap: 10 }}><Tag tone="acc">{t('Start here')}</Tag><h1 className="lt">{t('Try a sample')}</h1><p className="callout l2">{t('Learn the controls in three simple steps. No timer and no score.')}</p></header>
    <p className="fn l2">{t('This sample resets on reload. It never creates a score or test attempt.')}</p>
    <div className="tutorial-steps" aria-hidden="true">{STEPS.map((_, i) => <span key={i} className={i === step ? 'on' : ''} />)}</div>
    <div className="tutorial-layout"><section className="card tutorial-note"><span className="eyebrow">{t('Step {step} of 3', { step: step + 1 })}</span><h2 className="t2" id="sample-step-title" tabIndex={-1}>{t(STEPS[step].title)}</h2><p className="callout l2">{t(STEPS[step].text)}</p><p className="fn l2">{t('Choose any step. You can finish without writing an answer.')}</p></section>
      <section className="card tutorial-question"><QuestionBody n={step + 1} q={q} />
        {q.kind === 'single' ? <>
          <div className="col" style={{ gap: 10, width: '100%' }} role="radiogroup" aria-label={t('Answer options')}>
            {LETTERS.map((letter: Letter, index) => <OptionButton key={letter} letter={letter} text={q.options[index]} state={checked[step] ? letter === q.correct ? 'right' : letter === answer ? 'wrong' : '' : letter === answer ? 'sel' : ''} selected={letter === answer} disabled={checked[step]} onClick={() => update(letter)} />)}
          </div>
          {checked[step] && <div className="inset col" style={{ padding: 16, gap: 8, alignSelf: 'stretch' }} role="status"><strong className="callout">{t(answer === q.correct ? 'Correct' : 'Not quite — the correct answer is marked')}</strong>{q.explanation?.map((line, i) => <span key={i} className="fn" lang="kaa">{line.t}</span>)}</div>}
        </> : <>
          <label className="field" style={{ width: '100%' }}><span className="flab">{t('Your answer')}</span><textarea ref={textRef} className="ux-textarea" lang="kaa" value={answer} onChange={event => update(event.target.value)} placeholder={t('Type your answer')} /></label>
          <CharBar target={textRef} onInsert={update} />
          {checked[step] && <div className="inset callout" style={{ padding: 16, alignSelf: 'stretch' }}><span>{t('Example answer')}: </span><span lang="kaa">{q.accepted[0]}</span></div>}
        </>}
      </section>
    </div>
    {saveError && <Notice tone="error" title={t('Sample completion could not be saved. Try again or skip the sample.')} />}
    <div className="tutorial-actions">
      <Link className="btn btn-plain" to={origin.from} state={returnState}>{t('Skip sample')}</Link>
      <Button variant="secondary" onClick={() => { mapReturn.current = true; setMapOpen(true); }} aria-haspopup="dialog" aria-expanded={mapOpen}>{t('All questions')}</Button>
      {step > 0 && <Button variant="secondary" onClick={() => go(step - 1)}>{t('Previous')}</Button>}
      {q.kind === 'single' && !checked[step] && <Button disabled={!answer} onClick={check}>{t('Check answer')}</Button>}
      {q.kind === 'single' && checked[step] && <Button onClick={() => go(step + 1)}>{t('Next')}</Button>}
      {q.kind === 'written' && !checked[step] && <Button variant="secondary" onClick={check}>{t('See example answer')}</Button>}
      {q.kind === 'written' && <Button onClick={finishIntroduction} iconEnd="forward">{t('Ready to practice')}</Button>}
    </div>
    <Overlay open={mapOpen} onClose={() => setMapOpen(false)} variant="dialog" labelledBy="tutorial-map-title" initialFocus='[aria-current="step"]' restoreFocus={mapReturn.current}><h2 className="t2" id="tutorial-map-title">{t('All questions')}</h2><p className="callout l2">{t('Choose a question to open it.')}</p><div className="tutorial-map">{QUESTIONS.map((item, index) => <button type="button" key={item?.id ?? index} disabled={!item} className={index === step ? 'on' : ''} aria-label={t('Question {number}', { number: index + 1 })} aria-current={index === step ? 'step' : undefined} onClick={() => go(index)}>{index + 1}</button>)}</div><Button variant="secondary" onClick={() => setMapOpen(false)}>{t('Close')}</Button></Overlay>
  </main>;
}
