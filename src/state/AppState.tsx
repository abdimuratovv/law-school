import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Attempt, ExamSession } from '@/data/types';
import { load as loadPreference, save as savePreference } from '@/lib/storage';
import { accountStore } from '@/lib/accountStorage';
import { useAuth } from './AuthState';
import type { AuthenticatedUser } from '../../shared/contracts/auth';
import { sessionAttemptId, submissionSnapshot } from '@/lib/assessment';

export type ThemePref = 'system' | 'light' | 'dark';

export interface User extends AuthenticatedUser {
  group: string;
}

interface AppStateValue {
  user: User | null;
  signOut: () => Promise<boolean>;

  theme: ThemePref;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: ThemePref) => boolean;
  reduceTransparency: boolean;
  setReduceTransparency: (v: boolean) => boolean;

  sessions: Record<string, ExamSession>;
  saveSession: (s: ExamSession) => boolean;
  beginSession: (s: ExamSession) => boolean;
  dropSession: (testId: string) => boolean;
  retrySession: (testId: string) => boolean;
  sessionSaveErrors: Record<string, boolean>;
  frozenAttempts: Record<string, Attempt>;
  finishSession: (testId: string) => { ok: boolean; resultSaved: boolean; id: string };

  attempts: Attempt[];
  addAttempt: (a: Attempt) => void;

  mistakes: string[];
  toggleMistake: (questionId: string) => boolean;

  introductionComplete: boolean;
  completeIntroduction: () => boolean;
  restartIntroduction: () => void;

  resetDemo: () => void;
}

const Ctx = createContext<AppStateValue | null>(null);
function useSystemDark() {
  const q = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => setDark(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return dark;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  return <AccountState key={user?.id ?? 'guest'} user={user ? { ...user, group: '' } : null} signOut={signOut}>{children}</AccountState>;
}

function AccountState({ children, user, signOut }: { children: ReactNode; user: User | null; signOut: () => Promise<boolean> }) {
  const { load, save, remove } = accountStore(user?.id ?? null);
  const [theme, setThemeState] = useState<ThemePref>(() => loadPreference('theme', 'system'));
  const [reduceTransparency, setRT] = useState<boolean>(() => loadPreference('rt', false));
  const [sessions, setSessions] = useState<Record<string, ExamSession>>(() => load('sessions', {}));
  const [attempts, setAttempts] = useState<Attempt[]>(() => load('attempts', []));
  const sessionsRef = useRef(sessions);
  const attemptsRef = useRef(attempts);
  const [sessionSaveErrors, setSessionSaveErrors] = useState<Record<string, boolean>>({});
  const [frozenAttempts, setFrozenAttempts] = useState<Record<string, Attempt>>({});
  const frozenRef = useRef(frozenAttempts);
  const [mistakes, setMistakes] = useState<string[]>(() => load('mistakes', []));
  const mistakesRef = useRef(mistakes);
  const [introductionComplete, setIntroductionComplete] = useState<boolean>(() => load('introductionComplete', false));
  const systemDark = useSystemDark();
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  // Tokens live on .t-light / .t-dark — apply to <html> so portals and body inherit them.
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle('t-light', resolvedTheme === 'light');
    el.classList.toggle('t-dark', resolvedTheme === 'dark');
    el.classList.toggle('rt-on', reduceTransparency);
  }, [resolvedTheme, reduceTransparency]);

  const setTheme = useCallback((t: ThemePref) => {
    if (!savePreference('theme', t)) return false;
    setThemeState(t);
    return true;
  }, []);
  const setReduceTransparency = useCallback((v: boolean) => {
    if (!savePreference('rt', v)) return false;
    setRT(v);
    return true;
  }, []);

  const saveSession = useCallback((s: ExamSession) => {
    if (frozenRef.current[s.testId]) return false;
    const next = { ...sessionsRef.current, [s.testId]: s };
    const ok = save('sessions', next);
    sessionsRef.current = next;
    setSessions(next);
    setSessionSaveErrors(prev => ok ? {} : { ...prev, [s.testId]: true });
    return ok;
  }, []);
  const dropSession = useCallback((testId: string) => {
    const next = { ...sessionsRef.current };
    delete next[testId];
    if (!save('sessions', next)) { setSessionSaveErrors(prev => ({ ...prev, [testId]: true })); return false; }
    sessionsRef.current = next;
    setSessions(next);
    setSessionSaveErrors({});
    return true;
  }, []);

  const beginSession = useCallback((s: ExamSession) => {
    if (sessionsRef.current[s.testId]) return true;
    const next = { ...sessionsRef.current, [s.testId]: s };
    if (!save('sessions', next)) return false;
    sessionsRef.current = next;
    setSessions(next);
    setSessionSaveErrors({});
    return true;
  }, []);

  const retrySession = useCallback((testId: string) => {
    const ok = save('sessions', sessionsRef.current);
    setSessionSaveErrors(prev => ok ? {} : { ...prev, [testId]: true });
    return ok;
  }, []);

  const finishSession = useCallback((testId: string) => {
    const session = sessionsRef.current[testId];
    if (!session) return { ok: false, resultSaved: false, id: '' };
    const id = sessionAttemptId(session);
    const durable = load<Attempt[]>('attempts', attemptsRef.current);
    const known = [...new Map([...attemptsRef.current, ...(Array.isArray(durable) ? durable : [])].map(attempt => [attempt.id, attempt])).values()];
    const alreadySaved = known.find(attempt => attempt.id === id);
    attemptsRef.current = known;
    setAttempts(known);
    const snapshot = alreadySaved ?? frozenRef.current[testId] ?? submissionSnapshot(session, Date.now());
    if (!frozenRef.current[testId]) {
      frozenRef.current = { ...frozenRef.current, [testId]: snapshot };
      setFrozenAttempts(frozenRef.current);
    }
    if (!alreadySaved) {
      const next = [...known, snapshot];
      if (!save('attempts', next)) return { ok: false, resultSaved: false, id };
      attemptsRef.current = next;
      setAttempts(next);
    }
    if (!dropSession(testId)) return { ok: false, resultSaved: true, id };
    const pending = { ...frozenRef.current };
    delete pending[testId];
    frozenRef.current = pending;
    setFrozenAttempts(pending);
    return { ok: true, resultSaved: true, id };
  }, [dropSession]);

  const addAttempt = useCallback((a: Attempt) => {
    const next = [...attemptsRef.current.filter(attempt => attempt.id !== a.id), a];
    if (!save('attempts', next)) return;
    attemptsRef.current = next;
    setAttempts(next);
  }, []);

  const toggleMistake = useCallback((id: string) => {
    const next = mistakesRef.current.includes(id) ? mistakesRef.current.filter(x => x !== id) : [id, ...mistakesRef.current];
    if (!save('mistakes', next)) return false;
    mistakesRef.current = next;
    setMistakes(next);
    return true;
  }, []);

  const completeIntroduction = useCallback(() => {
    if (!save('introductionComplete', true)) return false;
    setIntroductionComplete(true);
    return true;
  }, []);
  const restartIntroduction = useCallback(() => {
    save('introductionComplete', false);
    setIntroductionComplete(false);
  }, []);

  const resetDemo = useCallback(() => {
    remove('seed');
    save('sessions', {}); save('attempts', []); save('mistakes', []);
    setSessions(load('sessions', {}));
    setAttempts(load('attempts', []));
    sessionsRef.current = load('sessions', {});
    attemptsRef.current = load('attempts', []);
    frozenRef.current = {};
    setFrozenAttempts({});
    setSessionSaveErrors({});
    mistakesRef.current = load('mistakes', []);
    setMistakes(mistakesRef.current);
    remove('introductionComplete');
    setIntroductionComplete(false);
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      user, signOut,
      theme, resolvedTheme, setTheme, reduceTransparency, setReduceTransparency,
      sessions, saveSession, beginSession, dropSession, retrySession, sessionSaveErrors, frozenAttempts, finishSession,
      attempts, addAttempt,
      mistakes, toggleMistake,
      introductionComplete, completeIntroduction, restartIntroduction,
      resetDemo
    }),
    [user, signOut, theme, resolvedTheme, setTheme, reduceTransparency, setReduceTransparency, sessions, saveSession, beginSession, dropSession, retrySession, sessionSaveErrors, frozenAttempts, finishSession, attempts, addAttempt, mistakes, toggleMistake, introductionComplete, completeIntroduction, restartIntroduction, resetDemo]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppStateProvider');
  return v;
}
