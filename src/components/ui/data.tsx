import type { CSSProperties, ReactNode } from 'react';
import { cx } from './basic';
import { useText } from '@/i18n/LanguageProvider';

export function Bar({ value, warn, style, color }: { value: number; warn?: boolean; style?: CSSProperties; color?: string }) {
  return (
    <div className={cx('bar', warn && 'warn')} style={style}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function Progress({ value, max, label, style, height }: { value: number; max: number; label?: string; style?: CSSProperties; height?: number }) {
  const t = useText();
  const limit = Math.max(1, max);
  const current = Math.max(0, Math.min(limit, value));
  return (
    <div
      className="prog"
      style={{ height, ...style }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={current}
      aria-label={t(label ?? 'Progress')}
    >
      <i style={{ width: `${(current / limit) * 100}%` }} />
    </div>
  );
}

export type QStatus = 'pub' | 'draft' | 'rev';
export const STATUS_NAME: Record<QStatus, string> = { pub: 'Published', draft: 'Draft', rev: 'Needs review' };

/** Status uses shape as well as color: hollow = draft, filled = published, diamond = needs review. */
export function StatusDot({ s, label = true }: { s: QStatus; label?: boolean }) {
  const t = useText();
  return (
    <span className={cx('st', s)}>
      <i />
      {label && t(STATUS_NAME[s])}
    </span>
  );
}

export const DIFF_NAME = ['', 'Easy', 'Medium', 'Hard'] as const;

export function Difficulty({ level }: { level: 1 | 2 | 3 }) {
  const t = useText();
  return (
    <span className="diff">
      <b>
        <i className="on" />
        <i className={level >= 2 ? 'on' : ''} />
        <i className={level >= 3 ? 'on' : ''} />
      </b>
      {t(DIFF_NAME[level])}
    </span>
  );
}

export function Kpi({ k, v, sub, href, warn, onClick }: { k: ReactNode; v: ReactNode; sub?: ReactNode; href?: string; warn?: boolean; onClick?: () => void }) {
  const style: CSSProperties | undefined = warn ? { boxShadow: 'inset 0 0 0 2px var(--warn-line), var(--card-shadow)', textDecoration: 'none', color: 'var(--label)', cursor: 'pointer' } : undefined;
  const body = (
    <>
      <span className="k row" style={{ gap: 6 }}>
        {k}
      </span>
      <span className="v">{v}</span>
      {sub && <span className="fn l2 row" style={{ gap: 6 }}>{sub}</span>}
    </>
  );
  if (onClick && !href) return <button type="button" className="kpi" onClick={onClick} style={{ textAlign: 'left', border: 0, color: 'var(--label)', cursor: 'pointer', ...style }}>{body}</button>;
  if (href)
    return (
      <a className="kpi" href={href} onClick={onClick ? (e) => { e.preventDefault(); onClick(); } : undefined} style={style}>
        {body}
      </a>
    );
  return <div className="kpi">{body}</div>;
}

/** Score trend line — same geometry as the dashboard artboard. */
export function LineChart({ points, height = 96, label }: { points: number[]; height?: number; label: string }) {
  const t = useText();
  const W = 320;
  const H = 80;
  if (points.length < 2) return <p className="fn l3">{t('Take a few tests to see your trend.')}</p>;
  const lo = Math.min(...points) - 6;
  const hi = Math.max(...points) + 6;
  const xy = points.map((p, i) => [Math.round((i / (points.length - 1)) * W), Math.round(H - ((p - lo) / (hi - lo)) * H)]);
  const last = xy[xy.length - 1];
  return (
    <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} preserveAspectRatio="none" style={{ width: '100%', height, overflow: 'visible' }} role="img" aria-label={t(label)}>
      <path d={`M0 ${H}H${W}`} style={{ stroke: 'var(--sep-2)', strokeWidth: 1, fill: 'none' }} vectorEffect="non-scaling-stroke" />
      <path d={`M0 ${H / 2}H${W}`} style={{ stroke: 'var(--sep)', strokeWidth: 1, strokeDasharray: '3 4', fill: 'none' }} vectorEffect="non-scaling-stroke" />
      <polyline
        points={xy.map((p) => p.join(',')).join(' ')}
        style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 2.5, strokeLinejoin: 'round', strokeLinecap: 'round' }}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="5" style={{ fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function ScoreRing({ correct, total, size = 148, label }: { correct: number; total: number; size?: number; label?: string }) {
  const t = useText();
  const C = 2 * Math.PI * 56;
  const frac = total ? correct / total : 0;
  const pctv = Math.round(frac * 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg viewBox="0 0 132 132" style={{ width: size, height: size, transform: 'rotate(-90deg)' }} role="img" aria-label={label ?? t('Score {correct} of {total}, {percent} percent', { correct, total, percent: pctv })}>
        <circle cx="66" cy="66" r="56" style={{ fill: 'none', stroke: 'var(--surface-2)', strokeWidth: 11 }} />
        <circle cx="66" cy="66" r="56" style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 11, strokeLinecap: 'round', strokeDasharray: `${(frac * C).toFixed(1)} ${C.toFixed(1)}` }} />
      </svg>
      <div className="col" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <span className="t1 num" style={size < 140 ? { fontSize: 24 } : undefined}>
          {correct} / {total}
        </span>
        <span className="fn l2 num b600">{pctv} %</span>
      </div>
    </div>
  );
}

/** Choice distribution strip: key green, wrong-chosen-more-than-key red, others gray. */
export function Dist({ shares, keyIndex, label }: { shares: number[]; keyIndex: number; label?: string }) {
  const t = useText();
  const keyShare = shares[keyIndex];
  return (
    <div className="dist" role="img" aria-label={label ? t(label) : shares.map((v,i)=>`${String.fromCharCode(65+i)}: ${v}%`).join('; ')}>
      {shares.map((v, i) => (
        <i key={i} className={i === keyIndex ? 'k' : v > keyShare ? 'w2' : 'w'} style={{ width: `${v}%` }} />
      ))}
    </div>
  );
}
