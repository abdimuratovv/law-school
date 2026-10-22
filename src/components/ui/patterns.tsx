import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Button } from './basic';
import { Icon } from './Icon';
import { useText } from '@/i18n/LanguageProvider';

/** Labels and messages are supplied by useText at the call site. */
export function TextField({ label, hint, error, id, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = [input['aria-describedby'], hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ') || undefined;
  return <div className="field">
    <label className="flab" htmlFor={fieldId}>{label}</label>
    <div className={`input${error ? ' err' : ''}`}>{input.type === 'search' && <Icon name="search" size="s" />}<input {...input} id={fieldId} aria-invalid={!!error} aria-describedby={describedBy} /></div>
    {hint && <span className="fn l2" id={`${fieldId}-hint`}>{hint}</span>}
    {error && <span className="fn badc" id={`${fieldId}-error`}>{error}</span>}
  </div>;
}

export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'success' | 'warning' | 'error'; title: string; children?: ReactNode }) {
  const t = useText();
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <Icon name={tone === 'success' ? 'checkCircle' : tone === 'error' || tone === 'warning' ? 'warning' : 'info'} />
    <div><strong>{t(title)}</strong>{children && <div className="notice-detail">{typeof children === 'string' ? t(children) : children}</div>}</div>
  </div>;
}

export function LoadingState({ label }: { label: string }) {
  const t = useText();
  return <div className="loading-state" role="status"><span className="spinner" aria-hidden="true" />{t(label)}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: { label: string; onClick: () => void } }) {
  const t = useText();
  return <section className="empty-state"><Icon name="tests" /><h3 className="t2">{t(title)}</h3><p className="body l2">{t(description)}</p>{action && <Button onClick={action.onClick}>{action.label}</Button>}</section>;
}

export function DataTable({ caption, columns, rows, emptyLabel }: { caption: string; columns: string[]; rows: { id: string; cells: ReactNode[] }[]; emptyLabel: string }) {
  return <div className="data-table-scroll" role="region" aria-label={caption} tabIndex={0}><table className="data-table">
    <caption>{caption}</caption><thead><tr>{columns.map((column, i) => <th key={i} scope="col">{column}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.id}>{row.cells.map((cell, i) => i === 0 ? <th scope="row" key={i}>{cell}</th> : <td key={i}>{cell}</td>)}</tr>)}{!rows.length && <tr><td colSpan={columns.length}>{emptyLabel}</td></tr>}</tbody>
  </table></div>;
}

/** Fixed 0–100 score axis; the adjacent table is the accessible data alternative. */
export function TrendChart({ label, xLabel, yLabel, points }: { label: string; xLabel: string; yLabel: string; points: { label: string; value: number }[] }) {
  const id = useId();
  const values = points.map(p => Math.min(100, Math.max(0, p.value)));
  return <figure className="trend-chart"><figcaption className="hl">{label}</figcaption>
    <svg viewBox="0 0 480 180" role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{label}</title><desc id={`${id}-description`}>{points.map(p => `${p.label}: ${p.value}%`).join('; ')}</desc>
      {[0, 50, 100].map(value => <g key={value}><text x="0" y={142 - value * 1.2}>{value}%</text><line x1="48" x2="460" y1={138 - value * 1.2} y2={138 - value * 1.2} /></g>)}
      <polyline points={values.map((value, i) => `${48 + i * 412 / Math.max(1, points.length - 1)},${138 - value * 1.2}`).join(' ')} />
      {points.map((point, i) => <g key={i}><circle cx={48 + i * 412 / Math.max(1, points.length - 1)} cy={138 - values[i] * 1.2} r="4" /><text x={48 + i * 412 / Math.max(1, points.length - 1)} y="162" textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>{point.label}</text></g>)}
    </svg><p className="fn l2">{xLabel} · {yLabel}</p>
    <DataTable caption={label} columns={[xLabel, yLabel]} rows={points.map((point, i) => ({ id: String(i), cells: [point.label, `${point.value}%`] }))} emptyLabel="—" />
  </figure>;
}
