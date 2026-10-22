const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');

/** 1:48:20 or 9:41 — the exam timer format. */
export function clock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** “1 hour 48 minutes left” for screen readers. */
export function clockLabel(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
  if (m) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
  if (!h && sec && m < 10) parts.push(`${sec} second${sec > 1 ? 's' : ''}`);
  return `${parts.join(' ') || '0 seconds'} left`;
}

/** “2 h 30 min” / “45 min” / “Untimed” */
export function duration(sec: number | null) {
  if (sec == null) return 'Untimed';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

export const shortDate = (d: Date | number | string) => {
  const x = new Date(d);
  return `${MONTHS[x.getMonth()]} ${x.getDate()}`;
};

export const dateTime = (d: Date | number) => {
  const x = new Date(d);
  return `${MONTHS[x.getMonth()]} ${x.getDate()}, ${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

/** Numeric date avoids mixed-language month abbreviations in the three UI languages. */
export const numericDate = (d: Date | number | string) => {
  const x = new Date(d);
  return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`;
};
export const numericDateTime = (d: Date | number) => {
  const x = new Date(d);
  return `${numericDate(x)} ${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

/** “Sunday, 4 October” */
export const longToday = (d = new Date()) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Whole days from today until the given date (0 = today). */
export function daysUntil(iso: string) {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(iso);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function dueLabel(iso: string, withRelative = false) {
  const n = daysUntil(iso);
  const base = `Due ${shortDate(iso)}`;
  if (!withRelative) return base;
  if (n === 0) return `${base} · today`;
  if (n === 1) return `${base} · tomorrow`;
  return n > 0 ? `${base} · in ${n} days` : `${base} · overdue`;
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

/** Formats a 9-digit local number as “90 123 45 67”. */
export function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, '').slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
