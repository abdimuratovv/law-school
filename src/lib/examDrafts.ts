import type { Draft } from './attemptDraft';
export type { Draft } from './attemptDraft';
const DATABASE = 'hm-exam-drafts-v1';
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open(DATABASE,1);
    request.onupgradeneeded = () => { request.result.createObjectStore('drafts', { keyPath:'key' }); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('drafts',mode); const request = action(tx.objectStore('drafts'));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export const draftKey = (user: string, attempt: string) => user + ':' + attempt;
export const readDraft = (key: string) => transaction<Draft | undefined>('readonly', store => store.get(key));
export const writeDraft = (draft: Draft) => transaction('readwrite', store => store.put(draft));
export const deleteDraft = (key: string) => transaction('readwrite', store => store.delete(key));
export async function clearDraftsExcept(user?: string) {
  await transaction('readwrite', store => {
    const cursor = store.openCursor();
    cursor.onsuccess = () => { const item = cursor.result; if (!item) return; if (!user || !String(item.key).startsWith(user + ':')) item.delete(); item.continue(); };
    return cursor;
  });
}
