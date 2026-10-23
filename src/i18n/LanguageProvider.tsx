import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { messages, translateDynamic } from './messages';
import { uxCopy } from './uxCopy';
import { designCopy } from './designMessages';
import { shellCopy } from './shellMessages';
import { discoveryCopy } from './discoveryMessages';
import { reviewCopy } from './reviewMessages';
import { authoringCopy } from './authoringMessages';
import { learningCopy } from './learningMessages';
import { assessmentCopy } from './assessmentMessages';
import { teachingCopy } from './teachingMessages';
import { examCopy } from './examMessages';
import { authCopy } from './authMessages';
import { localizedDate, localizedNumber } from './formatting';

export type Language = 'uz' | 'kaa' | 'ru';
type LanguageContextValue = { language: Language; setLanguage: (next: Language) => boolean; languageSaved: boolean | null };
const Context = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'hm.language';
function storedLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'uz' || saved === 'kaa' || saved === 'ru' ? saved : 'uz';
  } catch {
    return 'uz';
  }
}

function translated(source: string, language: Language): string {
  const start = source.match(/^\s*/)?.[0] ?? '';
  const end = source.match(/\s*$/)?.[0] ?? '';
  const key = source.trim().replace(/\s+/g, ' ');
  if (!key) return source;
  const entry = teachingCopy[key] ?? examCopy[key] ?? authCopy[key] ?? reviewCopy[key] ?? authoringCopy[key] ?? learningCopy[key] ?? assessmentCopy[key] ?? discoveryCopy[key] ?? shellCopy[key] ?? designCopy[key] ?? uxCopy[key] ?? messages[key];
  const value = entry?.[language] ?? translateDynamic(key, language);
  return `${start}${value}${end}`;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(storedLanguage);
  const [languageSaved, setLanguageSaved] = useState<boolean | null>(null);
  const setLanguage = (next: Language) => {
    let ok = true;
    try { localStorage.setItem(STORAGE_KEY, next); } catch { ok = false; }
    setLanguageState(next);
    setLanguageSaved(ok);
    return ok;
  };
  useLayoutEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, languageSaved }), [language, languageSaved]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLanguage() {
  const value = useContext(Context);
  if (!value) throw new Error('useLanguage requires LanguageProvider');
  return value;
}

export function useText() {
  const { language } = useLanguage();
  return (source: string, params: Record<string, string | number> = {}) =>
    translated(source, language).replace(/\{(\w+)\}/g, (token, key: string) => typeof params[key] === 'number' ? localizedNumber(params[key] as number, language) : String(params[key] ?? token));
}

export function useFormatting() {
  const { language } = useLanguage();
  return { number: (value: number) => localizedNumber(value, language), date: (value: Date | number | string, withTime = false) => localizedDate(value, language, withTime) };
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return (
    <label className="language-field">
      {!compact && <span className="fn l2">{messages.Language[language]}</span>}
      <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={messages.Language[language]}>
        <option value="uz">O‘zbekcha</option>
        <option value="kaa">Qaraqalpaqsha</option>
        <option value="ru">Русский</option>
      </select>
    </label>
  );
}
