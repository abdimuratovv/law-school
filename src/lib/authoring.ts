/** Additive local drafts. Never writes the bank, student sessions or attempts. */
export const AUTHORING_KEY = 'hm.authoringDrafts.v1';
export type DraftKind = 'question' | 'builder' | 'import';
export interface DraftRecord<T = unknown> { kind: DraftKind; sourceVersion: string; updatedAt: number; revision: string; payload: T }
type Store = { version: 1; drafts: Record<string, unknown> };
export function readDraftStore(): Store {
  const raw = localStorage.getItem(AUTHORING_KEY);
  if (raw === null) return { version: 1, drafts: {} };
  const value = JSON.parse(raw);
  if (!value || value.version !== 1 || !value.drafts || typeof value.drafts !== 'object' || Array.isArray(value.drafts)) throw new Error('Invalid draft store');
  return value;
}
export function compatibleDraft<T>(value: unknown, kind: DraftKind, sourceVersion: string, validate: (x: unknown) => x is T): value is DraftRecord<T> {
  const r = value as DraftRecord<T> | undefined;
  return !!r && r.kind === kind && r.sourceVersion === sourceVersion && Number.isFinite(r.updatedAt) && Number.isFinite(new Date(r.updatedAt).getTime()) && typeof r.revision === 'string' && !!r.revision && validate(r.payload);
}
export const fingerprint = (value: unknown) => value === undefined ? '' : JSON.stringify(value);
/** Synchronous compare immediately before write. Unrelated route drafts are preserved. */
export function commitDraft<T>(key: string, expected: string, record: DraftRecord<T> | null): 'saved' | 'conflict' | 'failed' {
  try {
    const store = readDraftStore();
    if (fingerprint(store.drafts[key]) !== expected) return 'conflict';
    if (record) store.drafts[key] = record; else delete store.drafts[key];
    localStorage.setItem(AUTHORING_KEY, JSON.stringify(store));
    return 'saved';
  } catch { return 'failed'; }
}
export const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
export const strings = (x: unknown): x is string[] => Array.isArray(x) && x.every(v => typeof v === 'string');
