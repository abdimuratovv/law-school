import { useId, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { useText } from '@/i18n/LanguageProvider';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

type BtnVariant = 'primary' | 'secondary' | 'tinted' | 'plain' | 'glass' | 'surface' | 'danger';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: BtnVariant;
  size?: 'sm' | 'lg';
  block?: boolean;
  pill?: boolean;
  icon?: IconName;
  iconEnd?: IconName;
  to?: string;
  href?: string;
  children?: ReactNode;
  loading?: boolean;
}

/** `.btn` — renders a router Link when `to` is set, an <a> for `href`, else a <button>. */
export function Button({ variant = 'primary', size, block, pill, icon, iconEnd, to, href, className, style, children, type = 'button', disabled, loading = false, ...rest }: ButtonProps) {
  const t = useText();
  const cls = cx('btn', `btn-${variant}`, size, block && 'block', 'press', className);
  const st: CSSProperties | undefined = pill ? { borderRadius: 999, ...style } : style;
  const iconSize = size === 'sm' ? 's' : undefined;
  const inner = (
    <>
      {loading && <span className="spinner" aria-hidden="true" />}
      {icon && <Icon name={icon} size={iconSize} fill={icon === 'play'} />}
      {typeof children === 'string' ? t(children) : children}
      {iconEnd && <Icon name={iconEnd} size={iconSize} />}
    </>
  );
  const unavailable = disabled || loading;
  const linkAttributes = Object.fromEntries(Object.entries(rest).filter(([key]) => key.startsWith('aria-') || key.startsWith('data-') || ['id', 'title', 'role'].includes(key)));
  if (to) return <Link to={to} className={cls} style={st} {...linkAttributes} aria-disabled={unavailable || undefined} aria-busy={loading || undefined} tabIndex={unavailable ? -1 : rest.tabIndex} onClick={e => { if (unavailable) e.preventDefault(); }}>{inner}</Link>;
  if (href)
    return (
      <a href={href} className={cls} style={st} {...linkAttributes} target="_blank" rel="noreferrer" aria-disabled={unavailable || undefined} aria-busy={loading || undefined} tabIndex={unavailable ? -1 : rest.tabIndex} onClick={e => { if (unavailable) e.preventDefault(); }}>
        {inner}
      </a>
    );
  return (
    <button type={type} className={cls} style={st} {...rest} disabled={unavailable} aria-busy={loading || undefined}>
      {inner}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  glass?: boolean;
  size?: 'xs' | 's';
  to?: string;
}

export function IconButton({ icon, label, glass, size, to, className, disabled, ...rest }: IconButtonProps) {
  const t = useText();
  const cls = cx('icon-btn', glass && 'glass', 'press', className);
  if (to)
    return (
      <Link to={to} className={cls} aria-label={t(label)} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : rest.tabIndex} onClick={e => { if (disabled) e.preventDefault(); }}>
        <Icon name={icon} size={size} />
      </Link>
    );
  return (
    <button type="button" className={cls} aria-label={t(label)} disabled={disabled} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  );
}

export type Tone = 'acc' | 'ok' | 'bad' | 'warn' | '';

export function Tag({ tone = '', lg, icon, iconFill, children, className, style }: { tone?: Tone; lg?: boolean; icon?: IconName; iconFill?: boolean; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={cx('tag', tone, lg && 'lg', className)} style={style}>
      {icon && <Icon name={icon} size="xs" fill={iconFill} />}
      {children}
    </span>
  );
}

export function Chip({ on, children, onClick, icon, disabled }: { on?: boolean; children: ReactNode; onClick?: () => void; icon?: IconName; disabled?: boolean }) {
  return (
    <button type="button" className={cx('chip', on && 'on')} aria-pressed={on} onClick={onClick} disabled={disabled}>
      {children}
      {icon && <Icon name={icon} size="xs" />}
    </button>
  );
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: ReactNode; disabled?: boolean; panelId?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  kind?: 'tablist' | 'radiogroup';
  style?: CSSProperties;
  className?: string;
  id?: string;
}

/** `.seg` — tabs or radio group depending on whether it switches content or a setting. */
export function Segmented<T extends string>({ options, value, onChange, label, kind = 'radiogroup', style, className, id }: SegmentedProps<T>) {
  const t = useText();
  const generatedId = useId();
  const groupId = id ?? generatedId;
  const enabled = options.filter(o => !o.disabled);
  const current = enabled.some(o => o.value === value) ? value : enabled[0]?.value;
  const itemRole = kind === 'tablist' ? 'tab' : 'radio';
  return (
    <div id={groupId} className={cx('seg', className)} role={kind} aria-label={t(label)} style={style} aria-orientation={kind === 'tablist' ? 'horizontal' : undefined}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role={itemRole}
            id={`${groupId}-${o.value}`}
            aria-controls={kind === 'tablist' ? o.panelId : undefined}
            disabled={o.disabled}
            tabIndex={o.value === current ? 0 : -1}
            className={on ? 'on' : ''}
            aria-selected={kind === 'tablist' ? on : undefined}
            aria-checked={kind === 'radiogroup' ? on : undefined}
            onClick={() => onChange(o.value)}
            onKeyDown={event => {
              let next = enabled.findIndex(item => item.value === o.value);
              if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = enabled.length - 1;
              else if (event.key === 'ArrowRight' || (kind === 'radiogroup' && event.key === 'ArrowDown')) next = (next + 1) % enabled.length;
              else if (event.key === 'ArrowLeft' || (kind === 'radiogroup' && event.key === 'ArrowUp')) next = (next - 1 + enabled.length) % enabled.length;
              else return;
              event.preventDefault();
              const target = enabled[next];
              if (target) {
                document.getElementById(`${groupId}-${target.value}`)?.focus();
                onChange(target.value);
              }
            }}
          >
            {typeof o.label === 'string' ? t(o.label) : o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const t = useText();
  return <button type="button" className={cx('switch', on && 'on')} role="switch" aria-checked={on} aria-label={t(label)} disabled={disabled} onClick={() => onChange(!on)} />;
}

export function Checkbox({ on, mixed, onChange, label, disabled }: { on: boolean; mixed?: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const t = useText();
  return (
    <button
      type="button"
      className={cx('cbx', (on || mixed) && 'on')}
      role="checkbox"
      disabled={disabled}
      aria-checked={mixed ? 'mixed' : on}
      aria-label={t(label)}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
    >
      <span className="cbx-mark" aria-hidden="true">{mixed ? <Icon name="minus" size="xs" style={{ strokeWidth: 3 }} /> : on ? <Icon name="check" size="xs" style={{ strokeWidth: 3 }} /> : null}</span>
    </button>
  );
}

/** Automatic activation is appropriate for these already-rendered, local panels. */
export function Tabs<T extends string>({ options, value, onChange, label }: { options: { value: T; label: ReactNode; content: ReactNode; disabled?: boolean }[]; value: T; onChange: (v: T) => void; label: string }) {
  const id = useId();
  return <div className="tabs"><Segmented id={id} kind="tablist" options={options.map(o => ({ ...o, panelId: `${id}-panel-${o.value}` }))} value={value} onChange={onChange} label={label} />
    {options.map(o => <section key={o.value} id={`${id}-panel-${o.value}`} role="tabpanel" aria-labelledby={`${id}-${o.value}`} hidden={value !== o.value} tabIndex={0}>{o.content}</section>)}
  </div>;
}

/** The scales logo tile. */
export function Mark({ size = 36, radius = 11, icon = 'logo', style }: { size?: number; radius?: number; icon?: IconName; style?: CSSProperties }) {
  return (
    <span className="mark" style={{ width: size, height: size, borderRadius: radius, ...style }}>
      <Icon name={icon} size={size >= 56 ? 'l' : 's'} />
    </span>
  );
}

export function Brand() {
  return (
    <div className="row" style={{ gap: 12 }}>
      <Mark />
      <span className="hl">Huqıq Mektebi</span>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="kbdk">{children}</span>;
}

export function Avatar({ initials, size = 36, accent, style }: { initials: string; size?: number; accent?: boolean; style?: CSSProperties }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size > 44 ? 17 : undefined, ...(accent ? { background: 'var(--accent-soft)', color: 'var(--accent-text)' } : null), ...style }}
    >
      {initials}
    </span>
  );
}
