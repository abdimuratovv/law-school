import { useRef, useState, type ReactNode } from 'react';
import { CharBar, OptionButton } from '@/components/exam/parts';
import { Screen } from '@/components/layout/StudentShell';
import { Button, Checkbox, Chip, IconButton, Mark, Segmented, Switch, Tabs, Tag } from '@/components/ui/basic';
import { Progress } from '@/components/ui/data';
import { Counter, OtpInput, PhoneInput } from '@/components/ui/form';
import { Overlay } from '@/components/ui/overlay';
import { DataTable, EmptyState, LoadingState, Notice, TextField, TrendChart } from '@/components/ui/patterns';
import { getQuestion } from '@/data/questions';
import { LETTERS, type Letter } from '@/data/types';
import { LanguageSwitcher, useText } from '@/i18n/LanguageProvider';
import { useApp, type ThemePref } from '@/state/AppState';

const STATES = ['Default', 'Hover', 'Pressed', 'Focus', 'Selected', 'Disabled', 'Loading', 'Error', 'Success'] as const;
const TOKENS = [['Background', '--bg'], ['Reading surface', '--surface'], ['Inset surface', '--surface-2'], ['Primary text', '--label'], ['Secondary text', '--label-2'], ['Quiet text', '--label-3'], ['Accent', '--accent'], ['Control border', '--control-border'], ['Focus', '--focus'], ['Correct', '--ok'], ['Incorrect', '--bad'], ['Navigation material', '--glass']];
const SECTIONS = ['Foundations', 'Controls', 'Feedback and recovery', 'Student reading preview', 'Teacher table preview', 'Dialogs and panels', 'Data and alternatives'];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className="ds-section" aria-labelledby={`${id}-title`}><h2 id={`${id}-title`} className="t1">{title}</h2>{children}</section>;
}

export default function DesignSystem() {
  const t = useText();
  const { theme, setTheme } = useApp();
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [state, setState] = useState<typeof STATES[number]>('Default');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<'practice' | 'mock'>('practice');
  const [checked, setChecked] = useState(false);
  const [mixed, setMixed] = useState(true);
  const [mixedOn, setMixedOn] = useState(false);
  const [switched, setSwitched] = useState(false);
  const [count, setCount] = useState(1);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [tab, setTab] = useState<'details' | 'guidance'>('details');
  const [modal, setModal] = useState(false);
  const [popover, setPopover] = useState(false);
  const [message, setMessage] = useState(false);
  const [answer, setAnswer] = useState<Letter | ''>('');
  const [answerChecked, setAnswerChecked] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const q = getQuestion('Q-0051');
  const rows = ['Q-0051', 'Q-0388', 'Q-0414'].map(id => getQuestion(id)).filter(item => `${item.id} ${item.stem}`.toLowerCase().includes(query.toLowerCase().trim()));
  const stateClass = state === 'Hover' ? 'is-hover' : state === 'Pressed' ? 'is-pressed' : state === 'Focus' ? 'focus-ring' : state === 'Selected' ? 'is-selected' : state === 'Error' ? 'is-error' : state === 'Success' ? 'is-success' : '';

  return <Screen calm><main id="main-content" tabIndex={-1} className="ds-root" data-no-translate data-density={density}>
    <a className="ds-skip" href="#section-1">{t('Controls')}</a>
    <header className="ds-hero"><div className="ds-hero-copy"><div className="row" style={{ gap: 12 }}><Mark /><span className="eyebrow">{t('Design reference')}</span></div><h1>{t('A calmer learning workspace')}</h1><p className="body l2 measure">{t('Solid reading surfaces, clear controls and one consistent system for students and teachers.')}</p></div><Button variant="plain" to="/" icon="back">{t('Back home')}</Button></header>
    <div className="ds-controls glass" aria-label={t('Design reference')} role="region">
      <div className="field"><span className="flab">{t('Theme')}</span><Segmented<ThemePref> label={t('Theme')} value={theme} onChange={setTheme} options={[{ value: 'system', label: t('Auto') }, { value: 'light', label: t('Light') }, { value: 'dark', label: t('Dark') }]} /></div>
      <div className="field"><span className="flab">{t('Density')}</span><Segmented label={t('Density')} value={density} onChange={setDensity} options={[{ value: 'comfortable', label: t('Comfortable') }, { value: 'compact', label: t('Compact') }]} /></div>
      <LanguageSwitcher />
    </div>
    <nav className="ds-index" aria-label={t('Design reference')}>{SECTIONS.map((title, i) => <a href={`#section-${i}`} key={title}>{t(title)}</a>)}</nav>
    <p className="fn l2">{t('Interactive examples only. No answers, questions or grades are saved here.')}</p>
    <Section id="section-0" title={t('Foundations')}>
      <div className="ds-token-grid">{TOKENS.map(([name, token]) => <div className="ds-token" key={token}><span className="ds-swatch" style={{ background: `var(${token})` }} aria-hidden="true" /><div><strong>{t(name)}</strong><code>{token}</code></div></div>)}</div>
      <div className="ds-card"><h3 className="hl">{t('Typography and spacing')}</h3><p className="ds-question" lang="kaa">Á á · Ǵ ǵ · Í ı · Ń ń · Ó ó · Ú ú · Ў ў · Қ қ · Ғ ғ · Ҳ ҳ</p><p className="body">{t('Body text')} · 1.0625rem / 1.6</p><p className="fn l2">{t('Short supporting text')} · 0.8125rem / 1.45</p><div className="ds-space-scale">{[4, 8, 12, 16, 24, 32, 48].map(v => <span key={v}><i style={{ width: v }} /><code>{v}</code></span>)}</div></div>
    </Section>
    <Section id="section-1" title={t('Controls')}>
      <label className="field ds-state-picker"><span className="flab">{t('Example state')}</span><select id="example-state" className="ux-select" value={state} onChange={e => setState(e.target.value as typeof state)}>{STATES.map(v => <option key={v} value={v}>{t(v)}</option>)}</select></label>
      <div className="ds-grid">
        <div className="ds-card"><h3 className="hl">{t('Buttons')}</h3><div className="row wrap" style={{ gap: 12 }}><Button id="state-button" className={stateClass} disabled={state === 'Disabled'} loading={state === 'Loading'} onClick={() => setMessage(true)}>{t('Continue learning')}</Button><Button variant="secondary" onClick={() => setMessage(true)}>{t('Review unanswered')}</Button><Button variant="plain" onClick={() => setMessage(true)}>{t('Change number')}</Button><IconButton icon="close" label={t('Close')} onClick={() => setMessage(false)} /><Button to="/tests" disabled>{t('Tests')}</Button></div>{message && <Notice tone="success" title={t('Example action completed')} />}</div>
        <div className="ds-card"><h3 className="hl">{t('Example selection')}</h3><Segmented label={t('Choose a display mode')} value={mode} onChange={setMode} options={[{ value: 'practice', label: t('Practice') }, { value: 'mock', label: t('Mock exam') }]} /><div className="row wrap" style={{ gap: 16 }}><Chip on={checked} onClick={() => setChecked(!checked)}>{t('Selected')}</Chip><Checkbox on={checked} onChange={setChecked} label={t('Select sample question')} /><Switch on={switched} onChange={setSwitched} label={t('Example selection')} /><Counter value={count} min={1} max={5} onChange={setCount} label={t('Example count')} /></div><div className="row wrap" style={{ gap: 12 }}><Checkbox mixed={mixed} on={mixedOn} onChange={on => { setMixed(false); setMixedOn(on); }} label={t('Example selection')} /><Switch on disabled onChange={setSwitched} label={t('Disabled')} /><Chip disabled>{t('Disabled')}</Chip></div></div>
        <div className="ds-card"><h3 className="hl">{t('Phone number')}</h3><PhoneInput id="demo-phone" value={phone} onChange={setPhone} error={state === 'Error' ? 'Enter all 9 digits' : undefined} /><OtpInput value={otp} onChange={setOtp} /></div>
        <div className="ds-card"><h3 className="hl">{t('Your answer')}</h3><label htmlFor="demo-written" className="flab">{t('Question material is in Karakalpak.')}</label><div className="input area"><textarea id="demo-written" ref={textRef} lang="kaa" value={text} onChange={e => setText(e.target.value)} rows={3} /></div><CharBar target={textRef} onInsert={setText} /></div>
      </div>
      <Tabs label={t('Sample tabs')} value={tab} onChange={setTab} options={[{ value: 'details', label: t('Question details'), content: <p className="body">{t('Read the question before choosing an answer.')}</p> }, { value: 'guidance', label: t('Answer guidance'), content: <p className="body">{t('You can change your choice before checking.')}</p> }]} />
    </Section>
    <Section id="section-2" title={t('Feedback and recovery')}><div className="ds-grid"><div className="ds-card"><TextField label={t('Required field example')} value={text} onChange={e => setText(e.target.value)} required error={text.trim() ? undefined : t('Enter a title to continue.')} /><LoadingState label={t('Loading example')} /><Notice tone="success" title={t('Example saved state')} /><Notice tone="warning" title={t('Example warning')} /></div><Notice tone="error" title={t('Example save failure')}><p>{t('Keep your work open and retry. This is a demonstration, not a real save.')}</p><Button variant="secondary" onClick={() => setMessage(true)}>{t('Retry example')}</Button></Notice></div></Section>
    <Section id="section-3" title={t('Student reading preview')}>
      <article className="ds-card ds-reading" data-testid="student-preview"><div className="row wrap" style={{ gap: 8 }}><Tag tone="acc">{t('Practice')}</Tag><span className="fn l2">{t('Question material is in Karakalpak.')}</span></div><h3 className="hl">{t('Question')} 1</h3><p className="ds-question" lang="kaa">{q.stem}</p>
        {q.kind === 'single' && <div role="radiogroup" aria-label={t('Answer options')} className="ds-options">{LETTERS.map((letter, i) => <OptionButton key={letter} letter={letter} text={q.options[i]} selected={answer === letter} disabled={answerChecked} state={answerChecked ? letter === q.correct ? 'right' : letter === answer ? 'wrong' : '' : answer === letter ? 'sel' : ''} onClick={() => setAnswer(letter)} />)}</div>}
        {answerChecked && <Notice tone={q.kind === 'single' && answer === q.correct ? 'success' : 'warning'} title={t(q.kind === 'single' && answer === q.correct ? 'Correct' : 'Not quite — the correct answer is marked')} />}
        <div className="row wrap ds-exam-actions" style={{ gap: 12 }}><Button disabled={!answer || answerChecked} onClick={() => setAnswerChecked(true)}>{t('Check answer')}</Button><Button variant="plain" onClick={() => { setAnswer(''); setAnswerChecked(false); }}>{t('Clear answer')}</Button></div>
      </article>
    </Section>
    <Section id="section-4" title={t('Teacher table preview')}>
      <div className="ds-card" data-testid="teacher-preview"><div className="row wrap" style={{ gap: 16, justifyContent: 'space-between' }}><div><h3 className="hl">{t('Question bank')}</h3><p className="fn l2">{t('Sample questions')}</p></div><Tag>{t('{count} sample questions selected', { count: selectedRows.length })}</Tag></div><TextField type="search" label={t('Search example')} placeholder={t('Type a question or ID')} value={query} onChange={e => setQuery(e.target.value)} />
        {rows.length ? <DataTable caption={t('Sample questions')} columns={[t('Selected'), 'ID', t('Question text'), t('Type')]} emptyLabel={t('No matching examples')} rows={rows.map(item => ({ id: item.id, cells: [<Checkbox on={selectedRows.includes(item.id)} label={`${t('Select sample question')} ${item.id}`} onChange={on => setSelectedRows(prev => on ? [...prev, item.id] : prev.filter(id => id !== item.id))} />, item.id, <span lang="kaa">{item.stem}</span>, t(item.kind === 'single' ? 'Single choice' : 'Written')] }))} /> : <EmptyState title={t('No matching examples')} description={t('Clear the search to see the sample questions.')} action={{ label: t('Clear filters'), onClick: () => setQuery('') }} />}
      </div>
    </Section>
    <Section id="section-5" title={t('Dialogs and panels')}>
      <div className="ds-card"><div className="row wrap" style={{ gap: 12 }}><Button id="open-modal" onClick={() => setModal(true)}>{t('Open modal example')}</Button><Button id="open-nonmodal" variant="secondary" onClick={() => setPopover(true)}>{t('Open nonmodal example')}</Button></div>
        <Overlay open={modal} onClose={() => setModal(false)} variant="dialog" labelledBy="example-modal-title" alert initialFocus="#example-modal-cancel"><h2 className="t2" id="example-modal-title">{t('Modal example')}</h2><p>{t('Focus stays inside this dialog until it closes.')}</p><TextField label={t('Question text')} /><div className="row wrap" style={{ gap: 12 }}><Button id="example-modal-cancel" variant="secondary" onClick={() => setModal(false)}>{t('Cancel')}</Button><Button onClick={() => setModal(false)}>{t('Close')}</Button></div></Overlay>
        <Overlay open={popover} onClose={() => setPopover(false)} variant="pop" modal={false} labelledBy="example-nonmodal-title"><h2 className="t2" id="example-nonmodal-title">{t('Nonmodal example')}</h2><p>{t('The rest of the page remains available.')}</p><Button onClick={() => setPopover(false)}>{t('Close')}</Button></Overlay>
      </div>
    </Section>
    <Section id="section-6" title={t('Data and alternatives')}><div className="ds-card"><span className="flab">{t('Sample progress')} · 3 / 5</span><Progress value={3} max={5} label={t('Sample progress')} /><TrendChart label={t('Sample score history')} xLabel={t('Attempt')} yLabel={t('Score (%)')} points={[{ label: '1', value: 45 }, { label: '2', value: 62 }, { label: '3', value: 57 }, { label: '4', value: 76 }]} /></div></Section>
  </main></Screen>;
}
