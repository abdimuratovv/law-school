import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { formatPhone } from '@/lib/format';
import { Icon } from './Icon';
import { cx } from './basic';
import { useFormatting, useText } from '@/i18n/LanguageProvider';

export function PhoneInput({ id, value, onChange, error, autoFocus, describedBy }: { id: string; value: string; onChange: (digits: string) => void; error?: string; autoFocus?: boolean; describedBy?: string }) {
  const t = useText();
  return (
    <div className="field">
      <label className="flab gl2" htmlFor={id}>
        {t('Phone number')}
      </label>
      <div className={cx('input', error && 'err')}>
        <span className="prefix">+998</span>
        <input
          id={id}
          className="num"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="90 123 45 67"
          value={formatPhone(value)}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={[describedBy, error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
        />
      </div>
      {error && (
        <span id={`${id}-err`} className="fn badc row" style={{ gap: 6 }}>
          <Icon name="alertCircle" size="xs" />
          {t(error)}
        </span>
      )}
    </div>
  );
}

/** Six boxes that behave like one field: type, paste, backspace across boxes, autofill from SMS. */
export function OtpInput({ value, onChange, small, groupGap, errorId, describedBy }: { value: string; onChange: (v: string) => void; small?: boolean; groupGap?: boolean; errorId?: string; describedBy?: string }) {
  const t = useText();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  useEffect(() => {
    refs.current[Math.min(value.length, 5)]?.focus();
    // focus only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAt = (i: number, d: string) => {
    const arr = digits.slice();
    arr[i] = d;
    onChange(arr.join('').replace(/\s/g, '').slice(0, 6));
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) setAt(i, '');
      else if (i > 0) {
        const arr = digits.slice();
        arr[i - 1] = '';
        onChange(arr.join(''));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!d) return;
    e.preventDefault();
    onChange(d);
    refs.current[Math.min(d.length, 5)]?.focus();
  };

  return (
    <div className={cx('otp', small && 'sm')} role="group" aria-label={t('One-time code, {count} of 6 digits entered', { count: value.length })}>
      {digits.map((d, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {groupGap && i === 3 && <span className="gap" />}
          <input
            ref={(el) => (refs.current[i] = el)}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={t('Digit {number}', { number: i + 1 })}
            aria-invalid={!!errorId}
            aria-describedby={[describedBy, errorId].filter(Boolean).join(' ') || undefined}
            maxLength={6}
            onPaste={onPaste}
            onKeyDown={(e) => onKey(i, e)}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              if (raw.length > 1) {
                // SMS autofill drops the whole code into one box.
                onChange((value.slice(0, i) + raw).slice(0, 6));
                refs.current[Math.min(i + raw.length, 5)]?.focus();
                return;
              }
              setAt(i, raw);
              if (raw && i < 5) refs.current[i + 1]?.focus();
            }}
          />
        </span>
      ))}
    </div>
  );
}

/** `.stp` − n + counter. */
export function Counter({ value, onChange, min = 0, max = 999, step = 1, label, small }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string; small?: boolean }) {
  const t = useText();
  const format = useFormatting();
  return (
    <span className="stp" role="group" aria-label={t(label)}>
      <button type="button" aria-label={t('Decrease {label}', { label: t(label) })} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        <Icon name="minus" size={small ? 'xs' : 's'} />
      </button>
      <span aria-live="polite">{format.number(value)}</span>
      <button type="button" aria-label={t('Increase {label}', { label: t(label) })} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
        <Icon name="plusSm" size={small ? 'xs' : 's'} />
      </button>
    </span>
  );
}
