import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { authenticatedUserSchema, currentUserSchema, type AuthenticatedUser, type PersonalProfile } from '../../shared/contracts/auth';
import { clearDraftsExcept } from '@/lib/examDrafts';
import { clearAccountCaches } from '@/lib/accountStorage';

type AuthState = { user: AuthenticatedUser | null; csrfToken: string | null; status: 'loading' | 'ready' | 'error'; googleEnabled: boolean };
type AuthContext = AuthState & { refresh: () => Promise<void>; signOut: () => Promise<boolean>; saveProfile: (profile: PersonalProfile) => Promise<void> };
const Context = createContext<AuthContext | null>(null);
const initial: AuthState = { user: null, csrfToken: null, status: 'loading', googleEnabled: false };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initial);
  const current = useRef(state); current.current = state;
  const generation = useRef(0); const leaving = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const refresh = useCallback(async () => {
    if (leaving.current) return;
    const ticket = ++generation.current;
    try {
      const [me, configuration] = await Promise.all([
        fetch('/api/v1/auth/me', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) }),
        fetch('/api/v1/auth/config', { cache: 'no-store', signal: AbortSignal.timeout(10000) }),
      ]);
      if (!configuration.ok || !(me.ok || me.status === 401)) throw new Error('Authentication unavailable');
      const settings: unknown = await configuration.json();
      const enabled = !!settings && typeof settings === 'object' && 'googleEnabled' in settings && settings.googleEnabled === true;
      const account = me.ok ? currentUserSchema.parse(await me.json()) : null;
      if (ticket !== generation.current) return;
      clearAccountCaches(account?.user.id);
      await clearDraftsExcept(account?.user.id).catch(() => {});
      if (ticket !== generation.current) return;
      setState({ user: account?.user ?? null, csrfToken: account?.csrfToken ?? null, googleEnabled: enabled, status: 'ready' });
    } catch {
      if (ticket === generation.current) setState({ ...initial, status: 'error' });
    }
  }, []);
  useEffect(() => {
    void refresh();
    const recheck = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('hm-auth');
      channel.current.onmessage = () => { void refresh(); };
    }
    return () => {
      generation.current++;
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
      channel.current?.close(); channel.current = null;
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    if (leaving.current) return false;
    leaving.current = true; generation.current++;
    try {
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': current.current.csrfToken ?? '' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok && response.status !== 401) return false;
      generation.current++;
      clearAccountCaches();
      await clearDraftsExcept().catch(() => {});
      setState({ ...initial, status: 'ready', googleEnabled: current.current.googleEnabled });
      channel.current?.postMessage('changed');
      return true;
    } catch { return false; }
    finally { leaving.current = false; }
  }, []);

  const saveProfile = async (profile: PersonalProfile) => {
    const owner = current.current.user;
    if (!owner || leaving.current) throw new Error('Sign in to continue');
    const response = await fetch('/api/v1/auth/profile', {
      method: 'PUT', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': current.current.csrfToken ?? '' },
      body: JSON.stringify({ ...profile, revision: owner.revision }),
    });
    if (!response.ok) {
      if (response.status === 409) { void refresh(); throw new Error('Profile changed. Try saving again.'); }
      throw new Error('Could not save your profile. Check the fields and try again.');
    }
    const user = authenticatedUserSchema.parse((await response.json() as { user: unknown }).user);
    if (leaving.current || current.current.user?.id !== owner.id) throw new Error('Sign in to continue');
    generation.current++;
    setState(previous => ({ ...previous, user }));
    channel.current?.postMessage('changed');
  };
  return <Context.Provider value={{ ...state, refresh, signOut, saveProfile }}>{children}</Context.Provider>;
}
export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error('useAuth requires AuthProvider');
  return auth;
}
