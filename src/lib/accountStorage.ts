import { load, remove, save } from './storage';

export function accountStore(userId: string | null) {
  const scope = `account.${userId}.demo.`;
  return {
    load: <T>(key: string, fallback: T): T => userId ? load(scope + key, fallback) : fallback,
    save: (key: string, value: unknown) => !!userId && save(scope + key, value),
    remove: (key: string) => { if (userId) remove(scope + key); },
  };
}

/** Never touches original hm.* demo records or appearance/language preferences. */
export function clearAccountCaches(exceptUserId?: string) {
  try {
    const keep = exceptUserId ? `hm.account.${exceptUserId}.demo.` : null;
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    for (const key of keys) if (key?.startsWith('hm.account.') && (!keep || !key.startsWith(keep))) localStorage.removeItem(key);
  } catch { /* A revoked server session remains revoked when storage is blocked. */ }
}
