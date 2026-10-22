import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cx } from '@/components/ui/basic';
import type { Question } from '@/data/types';
import { TOPICS } from '@/data/topics';
import { clock } from '@/lib/format';
import { useText } from '@/i18n/LanguageProvider';

export type OptState = '' | 'sel' | 'right' | 'wrong';

/** `.opt` answer row. Selected = fill + 2 px border + filled badge + check (never color alone). */
export function OptionButton({ letter, text, state, selected, onClick, disabled, asStatic }: { letter: string; text: string; state: OptState; selected?: boolean; onClick?: () => void; disabled?: boolean; asStatic?: boolean }) {
  const t = useText();
  const ref = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const group = ref.current?.closest('[role="radiogroup"]');
    const items = group ? [...group.querySelectorAll<HTMLButtonElement>('button[role="radio"]:not(:disabled)')] : [];
    const entry = items.find(item => item.getAttribute('aria-checked') === 'true') ?? items[0];
    items.forEach(item => { item.tabIndex = item === entry ? 0 : -1; });
  });
  const end = state === 'sel' || state === 'right' ? 'check' : state === 'wrong' ? 'close' : null;
  const inner = (
    <>
      <span className="lt-badge">{letter}</span>
      <span className="txt" lang="kaa">{text}</span>
      <span className="end">{end && <Icon name={end} />}</span>
    </>
  );
  const label = state === 'right' ? t('{letter}, correct answer: {text}', { letter, text }) : state === 'wrong' ? t('{letter}, your answer, incorrect: {text}', { letter, text }) : undefined;
  if (asStatic)
    return (
      <div className={cx('opt', state)} role={label ? 'group' : undefined} aria-label={label}>
        {inner}
      </div>
    );
  return (
    <button
      ref={ref}
      type="button"
      className={cx('opt', state)}
      role="radio"
      aria-checked={selected ?? state === 'sel'}
      aria-label={label}
      tabIndex={-1}
      onKeyDown={event => {
        const group = event.currentTarget.closest('[role="radiogroup"]');
        const items = group ? [...group.querySelectorAll<HTMLButtonElement>('button[role="radio"]:not(:disabled)')] : [];
        const index = items.indexOf(event.currentTarget);
        let next = index;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = items.length - 1;
        else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % items.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
        else return;
        event.preventDefault();
        if (items[next]) { items[next].focus(); items[next].click(); }
      }}
      onClick={onClick}
      disabled={disabled}
      style={disabled ? { cursor: 'default' } : undefined}
    >
      {inner}
    </button>
  );
}

export function Timer({ secondsLeft }: { secondsLeft: number }) {
  const t = useText();
  const total = Math.max(0, Math.floor(secondsLeft));
  const tone = secondsLeft <= 120 ? 'danger' : secondsLeft <= 600 ? 'warn' : '';
  // Announce only at thresholds, not every second.
  return (
    <span className={cx('timer', tone)} role="timer" aria-label={t('{hours} hours {minutes} minutes {seconds} seconds remaining', { hours: Math.floor(total / 3600), minutes: Math.floor(total % 3600 / 60), seconds: total % 60 })}>
      <Icon name="clock" size="s" />
      <span aria-hidden="true">{clock(secondsLeft)}</span>
    </span>
  );
}

/** Question header tags + stem + matching blocks. */
export function QuestionBody({ n, q, extraTag, wide, numbered = true }: { n: number; q: Question; extraTag?: ReactNode; wide?: boolean; numbered?: boolean }) {
  const t = useText();
  return (
    <>
      <div className="row wrap" style={{ gap: 8 }}>
        {numbered && <span className="hl num">{t('Question')} {n}</span>}
        <span className="tag acc">{t(TOPICS[q.topic].name)}</span>
        {extraTag}
      </div>
      <p className="body measure" lang="kaa" style={q.kind === 'written' && wide ? { fontSize: 19, lineHeight: '28px' } : undefined}>
        {q.stem}
      </p>
      {q.kind === 'single' && q.terms && (
        <div className="col" style={{ gap: 8 }} lang="kaa">
          <p className="eyebrow">Atamalar</p>
          <ol className="ql body ex-terms grid3">
            {q.terms.map((t) => (
              <li key={t.k}>
                <span className="k">{t.k}</span>
                <span>{t.t}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {q.kind === 'single' && q.defs && (
        <div className="col" style={{ gap: 8 }} lang="kaa">
          <p className="eyebrow">Anıqlamalar</p>
          <ol className="ql body measure" style={{ gap: 10 }}>
            {q.defs.map((t) => (
              <li key={t.k}>
                <span className="k">{t.k}</span>
                <span>{t.t}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

const LOWER = ['ǵ', 'ń', 'ı', 'á', 'ó', 'ú'];
const UPPER = ['Ǵ', 'Ń', 'I', 'Á', 'Ó', 'Ú'];

/** Karakalpak letter bar — inserts at the caret of the target textarea. */
export function CharBar({ target, onInsert, style }: { target: RefObject<HTMLTextAreaElement>; onInsert: (next: string) => void; style?: CSSProperties }) {
  const t = useText();
  const [upper, setUpper] = useState(false);
  const keys = upper ? UPPER : LOWER;
  const insert = (c: string) => {
    const el = target.current;
    if (!el) return;
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, s) + c + el.value.slice(e);
    onInsert(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + c.length, s + c.length);
    });
  };
  return (
    <div className="glass charbar" role="group" aria-label={t('Karakalpak letters')} style={style}>
      {keys.map((c) => (
        <button
          key={c}
          type="button"
          className="key press"
          lang="kaa"
          aria-label={t('Insert {letter}', { letter: c })}
          // Keep focus (and the caret) in the textarea.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(c)}
        >
          {c}
        </button>
      ))}
      <button
        type="button"
        className={cx('key mod press', upper && 'on')}
        aria-label={t(upper ? 'Show lowercase letters' : 'Show uppercase letters')}
        aria-pressed={upper}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setUpper((u) => !u)}
      >
        <Icon name="shift" fill={upper} />
      </button>
    </div>
  );
}

export type CellState = 'ans' | 'un' | 'ok' | 'no';

const WORD: Record<CellState, string> = { ans: 'Answered', un: 'Not answered', ok: 'Correct', no: 'Incorrect' };

export function MapGrid({ cells, current, onPick }: { cells: { n: number; s: CellState; flagged?: boolean; checked?: boolean }[]; current: number; onPick: (n: number) => void }) {
  const t = useText();
  return (
    <div className="grid7 fluid" style={{ gap: 6 }}>
      {cells.map((c) => (
        <button
          key={c.n}
          type="button"
          className={cx('cell press', c.s, c.n === current && 'cur', c.flagged && 'is-flagged', c.checked && 'is-checked')}
          aria-label={t('Question {number}: {state}', { number: c.n, state: [t(WORD[c.s]), c.flagged && t('Flagged'), c.checked && t('Checked'), c.n === current && t('Current question')].filter(Boolean).join(' · ') })}
          aria-current={c.n === current ? 'step' : undefined}
          onClick={() => onPick(c.n)}
        >
          {c.n}
          {c.flagged && <Icon name="flagFill" size="xs" />}
          {c.checked && <span className="map-checked" aria-hidden="true">✓</span>}
        </button>
      ))}
    </div>
  );
}
