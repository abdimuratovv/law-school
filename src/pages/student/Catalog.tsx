import { useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Button, Segmented, Tag } from '@/components/ui/basic';
import { TESTS } from '@/data/tests';
import { CATALOG_TOPICS, TOPICS } from '@/data/topics';
import type { TestMode, TopicId } from '@/data/types';
import { testReadiness } from '@/lib/discovery';
import { useApp } from '@/state/AppState';
import { useFormatting, useText } from '@/i18n/LanguageProvider';

type ModeFilter = 'all' | TestMode;
export default function Catalog() {
  const { sessions, attempts } = useApp();
  const t = useText(); const format = useFormatting();
  const [params, setParams] = useSearchParams();
  const location = useLocation(); const nav = useNavigate();
  const mode: ModeFilter = params.get('mode') === 'practice' ? 'practice' : params.get('mode') === 'mock' ? 'mock' : 'all';
  const topicParam = params.get('topic');
  const topic = CATALOG_TOPICS.includes(topicParam as TopicId) ? topicParam as TopicId : 'all';
  const query = params.get('q') ?? '';
  const changeFilter = (key: string, value: string) => { const next = new URLSearchParams(params); !value || value === 'all' ? next.delete(key) : next.set(key, value); setParams(next, { replace: true }); };
  const clear = () => { const next = new URLSearchParams(params); ['mode', 'topic', 'q'].forEach(key => next.delete(key)); setParams(next, { replace: true }); };
  const topicName = (id: typeof TESTS[number]['topic']) => t(id === 'all' ? 'All topics' : TOPICS[id].name);
  const list = TESTS.filter(test => (mode === 'all' || test.mode === mode) && (topic === 'all' || test.topic === topic || test.topic === 'all'))
    .filter(test => [t(test.name), topicName(test.topic), t(test.mode === 'mock' ? 'Mock exam' : 'Practice')].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  useEffect(() => {
    const restore = (location.state as { restore?: { card?: string; scroll?: number } } | null)?.restore;
    if (!restore) return;
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => {
      if (typeof restore.scroll === 'number' && Number.isFinite(restore.scroll)) window.scrollTo(0, Math.max(0, restore.scroll));
      if (typeof restore.card === 'string') document.getElementById(`open-${restore.card}`)?.focus({ preventScroll: true });
    }); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
    // Restore an originating card once; filter and language changes retain task focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <main id="main-content" tabIndex={-1} className="s-main wide discovery-catalog" data-no-translate>
    <header className="page-head"><div className="col"><p className="eyebrow">{t('Tests')}</p><h1 className="lt">{t('Find a test')}</h1><p className="callout l2">{t('Choose practice to learn, or a timed exam to check your preparation.')}</p></div></header>
    <div className="discovery-mode-guide"><p><strong>{t('Practice')}</strong><span>{t('Check each answer and learn from the explanation.')}</span></p><p><strong>{t('Mock exam')}</strong><span>{t('Timed tests. See your results after finishing.')}</span></p></div>
    <section className="card catalog-filters" aria-label={t('Filters')}>
      <div className="field"><span className="flab">{t('Test type')}</span><Segmented<ModeFilter> label={t('Test type')} value={mode} onChange={value => changeFilter('mode', value)} options={[{ value: 'all', label: t('All') }, { value: 'practice', label: t('Practice') }, { value: 'mock', label: t('Mock exam') }]} /></div>
      <label className="field"><span className="flab">{t('Topic')}</span><select className="ux-select" value={topic} onChange={e => changeFilter('topic', e.target.value)}><option value="all">{t('All topics')}</option>{CATALOG_TOPICS.map(id => <option key={id} value={id}>{t(TOPICS[id].name)}</option>)}</select></label>
      <label className="field"><span className="flab">{t('Search tests')}</span><span className="input"><Icon name="search" size="s" /><input type="search" value={query} placeholder={t('Search tests')} onChange={e => changeFilter('q', e.target.value)} /></span></label>
    </section>
    <div className="catalog-summary"><div><p className="hl" role="status">{t('{count} tests found', { count: list.length })}</p><p className="fn l2">{t('Mode: {mode} · Topic: {topic}', { mode: t(mode === 'all' ? 'All' : mode === 'practice' ? 'Practice' : 'Mock exam'), topic: topicName(topic) })}</p></div>{(mode !== 'all' || topic !== 'all' || query) && <Button variant="plain" onClick={clear}>{t('Clear filters')}</Button>}</div>
    <div className="cat-grid">{list.map(test => {
      const active = sessions[test.id]; const readiness = testReadiness(test);
      const expired = active?.endsAt != null && active.endsAt <= Date.now();
      const action = readiness.missing ? 'Test details' : expired ? 'Review expired test' : readiness.preview ? active ? 'Resume preview' : 'Open preview' : active ? test.mode === 'practice' ? 'Resume practice' : 'Resume timed exam' : 'Open test';
      return <article id={`test-${test.id}`} key={test.id} className="card test-card">
        <div className="row wrap"><Tag tone="acc">{t(test.mode === 'practice' ? 'Practice' : 'Mock exam')}</Tag><Tag>{t(active ? 'In progress' : attempts.some(a => a.testId === test.id && !a.seedScore) ? 'Completed' : 'Not started')}</Tag></div>
        <p className="eyebrow">{topicName(test.topic)}</p><h2 className="t2">{t(test.name)}</h2>
        <p className="callout l2">{t('Questions: {count}', { count: test.questionIds.length })} · {test.timeLimit ? t('Duration: {minutes} min', { minutes: test.timeLimit / 60 }) : t('Untimed')}</p>
        <p className="fn l2">{t('{single} choice questions · {written} written questions', { single: readiness.single, written: readiness.written })}</p>
        {test.assigned && <span className="fn l2">{t('Sample assignments')}{test.due ? ' · ' + t('Due: {date}', { date: format.date(test.due) }) : ''}</span>}
        {readiness.missing ? <p className="fn badc">{t('Some questions are unavailable. This test cannot be started.')}</p> : readiness.preview && <p className="fn l2 preview-label">{t('Preview only — some questions are incomplete.')}</p>}
        <Link id={`open-${test.id}`} className={`btn btn-${active ? 'primary' : 'secondary'}`} to={'/tests/' + test.id} state={{ from: location.pathname + location.search + location.hash, card: test.id }} onClick={event => {
          if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
          event.preventDefault(); nav('/tests/' + test.id, { state: { from: location.pathname + location.search + location.hash, card: test.id, scroll: window.scrollY } });
        }}>{t(action)}<Icon name="forward" size="s" /></Link>
      </article>;
    })}</div>
    {!list.length && <section className="card journey-card"><h2 className="t2">{t(TESTS.length ? 'No tests match' : 'No tests are available yet.')}</h2><p className="callout l2">{t(TESTS.length ? 'Try another topic or clear the search.' : 'Learn the controls in three simple steps. No timer and no score.')}</p>{TESTS.length ? <Button variant="secondary" onClick={clear}>{t('Clear filters')}</Button> : <Button to="/getting-started">{t('Try a sample')}</Button>}</section>}
  </main>;
}
