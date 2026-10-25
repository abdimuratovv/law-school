import { useCallback, useEffect, useRef, useState } from 'react';
import { type ServerAttempt, type Snapshot } from '../../shared/contracts/exams';
import { useAuth } from './AuthState';
import { ExamError, examRequest, fetchAttempt } from '@/lib/examApi';
import { deleteDraft, draftKey, readDraft, writeDraft, type Draft } from '@/lib/examDrafts';
import { pendingSave, resolveSaveResponse } from '@/lib/attemptSync';

export function useServerAttempt(id: string) {
  const { user, csrfToken } = useAuth();
  const [attempt, setAttempt] = useState<ServerAttempt>(); const [snapshot, setSnapshot] = useState<Snapshot>();
  const [message, setMessage] = useState('Loading'); const [conflict, setConflict] = useState(false); const [busy, setBusy] = useState(false);
  const state = useRef<{ server?: ServerAttempt; draft?: Draft; sending: boolean; blocked: boolean; epoch: number }>({ sending: false, blocked: false, epoch: 0 });
  const credentials = useRef(csrfToken); credentials.current = csrfToken;
  const load = useCallback(async (discard = false) => {
    if (!user) return;
    if (state.current.server && state.current.server.id !== id) {
      state.current.server = undefined; state.current.draft = undefined;
      setAttempt(undefined); setSnapshot(undefined); setMessage('Loading');
    }
    const ticket = ++state.current.epoch;
    try {
      const server = await fetchAttempt(id); const key = draftKey(user.id,id);
      let saved: Draft | undefined; let storageOk = true;
      try { saved = discard ? undefined : await readDraft(key); } catch { storageOk = false; }
      if (ticket !== state.current.epoch) return;
      const draft: Draft = saved ?? { key, revision:server.revision, snapshot:server.snapshot, dirty:false };
      if (server.state !== 'active') { await deleteDraft(key).catch(() => {}); draft.snapshot = server.snapshot; draft.dirty = false; draft.pending = undefined; }
      const blocked = server.state === 'active' && draft.dirty && !draft.pending && draft.revision !== server.revision;
      if (!draft.dirty && !draft.pending) { draft.snapshot = server.snapshot; draft.revision = server.revision; }
      state.current = { server, draft, sending:false, blocked, epoch:ticket };
      setAttempt(server); setSnapshot(draft.snapshot); setConflict(blocked);
      setMessage(blocked ? 'Another tab changed this attempt.' : !storageOk ? 'Local storage is unavailable. Keep this tab open.' : draft.dirty || draft.pending ? 'Changes are waiting to sync.' : 'Saved on server');
      if (discard) await writeDraft(draft).catch(() => {});
    } catch { if (ticket === state.current.epoch) setMessage('Could not load this attempt.'); }
  }, [id,user?.id]);
  useEffect(() => { void load(); return () => { state.current.epoch++; }; }, [load]);
  const change = useCallback((next: Snapshot) => {
    const current = state.current;
    if (!current.draft || current.blocked || current.server?.state !== 'active' || current.draft.pending?.action === 'submit') return;
    current.draft = { ...current.draft, snapshot:next, dirty:true };
    setSnapshot(next); setMessage('Changes are waiting to sync.');
    void writeDraft(current.draft).catch(() => setMessage('Local storage is unavailable. Keep this tab open.'));
  }, []);
  const sync = useCallback(async (action: 'save' | 'submit' | 'check' = 'save', questionId?: string) => {
    const current = state.current;
    if (!current.server || current.server.id !== id || !current.draft || current.sending || current.blocked || current.server.state !== 'active') return;
    if (action === 'save' && !current.draft.dirty && !current.draft.pending) return;
    current.sending = true; setBusy(true);
    const epoch = current.epoch;
    try {
      const pending = current.draft.pending ?? (action === 'save' ? pendingSave(current.server, current.draft) : { action, body: { ...current.draft.snapshot, revision:current.draft.revision, operationId:crypto.randomUUID(), ...(questionId ? { questionId } : {}) } });
      current.draft = { ...current.draft, pending };
      await writeDraft(current.draft).catch(() => {});
      const endpoint = pending.action === 'save' && 'deletedAnswerIds' in pending.body ? 'save-changes' : pending.action;
      const raw = await examRequest('/attempts/' + id + '/' + endpoint, credentials.current, pending.body);
      const server = await resolveSaveResponse(raw, current.server, pending, () => fetchAttempt(id));
      if (epoch !== state.current.epoch) return;
      const changedDuringRequest = JSON.stringify(current.draft.snapshot) !== JSON.stringify(pending.snapshot ?? { answers:pending.body.answers, flags:pending.body.flags, ...(pending.body.currentQuestionId ? { currentQuestionId:pending.body.currentQuestionId } : {}) });
      // A replay may return a newer tab's state. Never rebase additional local
      // edits onto a revision this operation did not create.
      if (changedDuringRequest && server.state === 'active' && server.revision !== pending.body.revision + 1) {
        current.server = server; current.blocked = true;
        current.draft = { ...current.draft, pending:undefined, dirty:true };
        setAttempt(server); setConflict(true); setMessage('Another tab changed this attempt.');
        await writeDraft(current.draft).catch(() => {});
        return;
      }
      const keep = changedDuringRequest && server.state === 'active';
      const draft: Draft = { key:current.draft.key, revision:server.revision, snapshot:keep ? current.draft.snapshot : server.snapshot, dirty:keep };
      current.server = server; current.draft = draft;
      setAttempt(server); setSnapshot(draft.snapshot); setMessage(keep ? 'Changes are waiting to sync.' : 'Saved on server');
      if (server.state === 'active') await writeDraft(draft).catch(() => setMessage('Local storage is unavailable. Keep this tab open.'));
      else await deleteDraft(draft.key).catch(() => {});
      // An uncertain save is replayed first; an explicit submit/check remains explicit.
      if (pending.action !== action) setMessage('Previous save recovered. Repeat your action.');
    } catch (error) {
      if (epoch !== state.current.epoch) return;
      if (error instanceof ExamError && error.status === 409) { current.blocked = true; setConflict(true); setMessage('Another tab changed this attempt.'); }
      else setMessage('Could not sync. Your local draft is waiting.');
    } finally { current.sending = false; if (epoch === state.current.epoch) setBusy(false); }
  }, [id]);
  useEffect(() => {
    const tick = () => { void sync(); };
    const interval = window.setInterval(tick,15000 + Math.floor(Math.random()*2000));
    window.addEventListener('online',tick);
    return () => { clearInterval(interval); window.removeEventListener('online',tick); };
  }, [sync]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (state.current.draft?.dirty || state.current.draft?.pending) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload',guard); return () => window.removeEventListener('beforeunload',guard);
  }, []);
  return { attempt, snapshot, message, conflict, busy, change, sync, reload: () => load(true), retryLoad: () => load() };
}
