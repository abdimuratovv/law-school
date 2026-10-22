import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Screen } from '@/components/layout/StudentShell';
import { Button, Tag } from '@/components/ui/basic';
import { Notice } from '@/components/ui/patterns';
import { getTest } from '@/data/tests';
import { discoveryOrigin, testReadiness } from '@/lib/discovery';
import { clock } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import { useApp } from '@/state/AppState';
import { LanguageSwitcher, useFormatting, useText } from '@/i18n/LanguageProvider';

export default function Lobby() {
  const { testId } = useParams(); const test = getTest(testId);
  const { sessions, beginSession } = useApp(); const nav = useNavigate();
  const t = useText(); const format = useFormatting(); const location = useLocation();
  const now = useNow(1000); const [error, setError] = useState(false);
  const origin = discoveryOrigin(location.state, '/tests' + (test ? '?mode=' + test.mode : ''));
  const back = <Link className="btn btn-plain" to={origin.from} state={{ restore: origin }}>{t(origin.from === '/' ? 'Back home' : 'Back to tests')}</Link>;
  if (!test) return <Screen calm><main id="main-content" tabIndex={-1} className="focus-page prep-page" data-no-translate><div className="prep-card card"><h1 className="lt">{t('Unavailable content')}</h1><p className="callout l2">{t('This test is unavailable.')}</p>{back}</div></main></Screen>;
  const existing = sessions[test.id]; const readiness = testReadiness(test);
  const timed = test.mode === 'mock' && test.timeLimit != null;
  const expired = existing?.endsAt != null && existing.endsAt <= now;
  const action = expired ? 'Review expired test' : readiness.preview ? existing ? 'Resume preview' : 'Open preview' : existing ? timed ? 'Resume timed exam' : 'Resume practice' : timed ? 'Start timed exam' : 'Start practice';
  const start = () => {
    if (readiness.missing) return;
    if (!existing) {
      const startedAt = Date.now();
      if (!beginSession({ testId: test.id, mode: test.mode, startedAt, endsAt: timed ? startedAt + test.timeLimit! * 1000 : null, answers: {}, flags: {}, current: 0 })) { setError(true); return; }
    }
    nav('/exam/' + test.id, { state: { from: location.pathname, origin } });
  };
  return <Screen calm><div className="focus-page prep-page" data-no-translate>
    <div className="focus-top lobby-top">{back}<LanguageSwitcher compact /></div>
    <main id="main-content" tabIndex={-1} className="prep-card card">
      <header className="col"><div className="row wrap"><Tag tone="acc">{t(test.mode === 'practice' ? 'Practice' : 'Mock exam')}</Tag>{readiness.preview && <Tag>{t('Content preview')}</Tag>}{existing && <Tag>{t('In progress')}</Tag>}</div><h1 className="lt">{t(test.name)}</h1><p className="callout l2">{t('Question material is in Karakalpak.')}</p></header>
      <dl className="prep-stats"><div><dt className="fn l2">{t('Questions')}</dt><dd className="t2 num">{format.number(test.questionIds.length)}</dd></div><div><dt className="fn l2">{t('Time limit')}</dt><dd className="t2">{timed ? t('Duration: {minutes} min', { minutes: test.timeLimit! / 60 }) : t('Untimed')}</dd></div></dl>
      <p className="fn l2">{t('{single} choice questions · {written} written questions', { single: readiness.single, written: readiness.written })}</p>
      {existing?.endsAt != null && !expired && <p className="hl num" role="timer">{t('Remaining: {time}', { time: clock((existing.endsAt - now) / 1000) })}</p>}
      {expired && <Notice tone="warning" title={t('The deadline has passed. Opening this test completes its existing attempt; it does not restart the timer.')} />}
      <section className="col"><h2 className="t2">{t('Before you start')}</h2><ol className="prep-rules"><li>{t(test.mode === 'practice' ? 'After checking a practice answer, it is locked. Read the feedback before moving on.' : 'You can change answers until you finish. Use All questions to return to a question.')}</li><li>{t(timed ? 'The timer starts on entry and continues while you are away. At zero, the attempt finishes automatically.' : 'Answers are saved on this device. You can return later.')}</li><li>{t('Saving is local to this browser. Keep its data to return to your answers; there is no online account sync.')}</li>{readiness.written > 0 && <li>{t('Written answers use sample answer checks. Some remain pending; teacher review is not connected in this preview.')}</li>}</ol></section>
      {readiness.missing ? <Notice tone="error" title={t('Some questions are unavailable. This test cannot be started.')} /> : readiness.preview && <Notice tone="warning" title={t('Preview only — some questions are incomplete.')}>{t('Preview results are not a reliable assessment.')}</Notice>}
      {error && <Notice tone="error" title={t('Could not create a saved test. Allow browser storage and try again.')} />}
      <div className="prep-actions"><Link className="btn btn-plain" to="/getting-started" state={{ from: location.pathname, lobbyOrigin: origin }}>{t('Try a sample')}</Link>{!readiness.missing && <Button size="lg" iconEnd="forward" onClick={start}>{t(action)}</Button>}</div>
    </main>
  </div></Screen>;
}
