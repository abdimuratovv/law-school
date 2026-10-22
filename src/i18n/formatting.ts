import type { Language } from './LanguageProvider';

// Browsers lack complete Karakalpak Intl data. Use Uzbek numeric conventions;
// localized words remain explicit Karakalpak messages, never Uzbek month names.
export const NUMERIC_LOCALES: Record<Language, string> = { uz: 'uz-UZ', kaa: 'uz-Latn-UZ', ru: 'ru-RU' };
const numbers = Object.fromEntries(Object.entries(NUMERIC_LOCALES).map(([key, locale]) => [key, new Intl.NumberFormat(locale, { maximumFractionDigits: 20 })])) as Record<Language, Intl.NumberFormat>;
export const localizedNumber = (value: number, language: Language) => numbers[language].format(value);
export function localizedDate(value: Date | number | string, language: Language, withTime = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(NUMERIC_LOCALES[language], { day: '2-digit', month: '2-digit', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}) }).format(date);
}
