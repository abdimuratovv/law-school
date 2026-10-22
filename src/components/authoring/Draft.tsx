import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { Button } from '@/components/ui/basic';
import { Overlay } from '@/components/ui/overlay';
import { useFormatting, useText } from '@/i18n/LanguageProvider';
import { commitDraft, compatibleDraft, fingerprint, readDraftStore, type DraftKind, type DraftRecord } from '@/lib/authoring';

export function Confirm({ open, title, children, onCancel, onConfirm, action = 'Continue', safe = 'Keep editing' }: { open: boolean; title: string; children: ReactNode; onCancel: () => void; onConfirm: () => void; action?: string; safe?: string }) {
  const t = useText();
  const cancel = () => {
    onCancel();
    requestAnimationFrame(() => {
      // A navigation drawer can unmount the original link before this decision.
      if (document.activeElement === document.body || !document.activeElement?.isConnected) document.querySelector<HTMLElement>('main h1')?.focus();
    });
  };
  return <Overlay open={open} variant="dialog" alert labelledBy="authoring-confirm" initialFocus="#authoring-safe" onClose={cancel} className="authoring-dialog"><div data-no-translate className="col authoring-confirm"><h2 id="authoring-confirm">{t(title)}</h2><div>{children}</div><div className="authoring-actions"><Button id="authoring-safe" variant="secondary" onClick={cancel}>{t(safe)}</Button><Button onClick={onConfirm}>{t(action)}</Button></div></div></Overlay>;
}

export function useDraft<T>({ identity, kind, sourceVersion, initial, validate }: { identity: string; kind: DraftKind; sourceVersion: string; initial: T; validate: (x: unknown) => x is T }) {
  const [entry] = useState(() => {
    try { const raw = readDraftStore().drafts[identity]; return { raw, blocked: false }; }
    catch { return { raw: undefined, blocked: true }; }
  });
  const [value, setValue] = useState(initial);
  const [gate, setGate] = useState(entry.raw !== undefined);
  const [status, setStatus] = useState<'idle' | 'saved' | 'failed' | 'conflict' | 'invalid'>(entry.blocked || (entry.raw !== undefined && !compatibleDraft(entry.raw, kind, sourceVersion, validate)) ? 'invalid' : 'idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [discard, setDiscard] = useState(false);
  const [conflict, setConflict] = useState(false);
  const expected = useRef(fingerprint(entry.raw));
  const competing = useRef('');
  const durable = useRef(JSON.stringify(initial));
  const latest = useRef(value); latest.current = value;
  const [savedJSON, setSavedJSON] = useState(durable.current);
  const dirty = JSON.stringify(value) !== savedJSON;
  const compatible = compatibleDraft(entry.raw, kind, sourceVersion, validate);
  const save = useCallback(() => {
    if (gate) return;
    if (!validate(latest.current)) { setStatus('invalid'); return; }
    const record: DraftRecord<T> = { kind, sourceVersion, updatedAt: Date.now(), revision: crypto.randomUUID(), payload: latest.current };
    const result = commitDraft(identity, expected.current, record);
    if (result === 'saved') { expected.current = fingerprint(record); durable.current = JSON.stringify(latest.current); setSavedJSON(durable.current); setSavedAt(record.updatedAt); setStatus('saved'); }
    else { setStatus(result); if (result === 'conflict') { try { competing.current = fingerprint(readDraftStore().drafts[identity]); } catch { competing.current = ''; } setConflict(true); } }
  }, [gate, identity, kind, sourceVersion, validate]);
  useEffect(() => {
    if (!dirty || gate || status === 'failed' || status === 'conflict' || status === 'invalid') return;
    const timer = setTimeout(save, 700); return () => clearTimeout(timer);
  }, [dirty, value, gate, save, status]);
  useEffect(() => { if (!dirty) return; const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', unload); return () => window.removeEventListener('beforeunload', unload); }, [dirty]);
  const blocker = useBlocker(dirty);
  const resume = () => { if (compatible) { const record = entry.raw as DraftRecord<T>; setValue(record.payload); durable.current = JSON.stringify(record.payload); setSavedJSON(durable.current); setSavedAt(record.updatedAt); setStatus('saved'); setGate(false); } };
  const reset = () => {
    const result = commitDraft<T>(identity, expected.current, null);
    setDiscard(false);
    if (result !== 'saved') { setStatus(result); if (result === 'conflict') { try { competing.current = fingerprint(readDraftStore().drafts[identity]); } catch { competing.current = ''; } setConflict(true); } return; }
    expected.current = ''; setValue(initial); durable.current = JSON.stringify(initial); setSavedJSON(durable.current); setSavedAt(null); setStatus('idle'); setGate(false);
  };
  const adopt = () => {
    try { const raw = readDraftStore().drafts[identity]; if (!compatibleDraft(raw, kind, sourceVersion, validate)) { setStatus('invalid'); setConflict(false); return; } expected.current = fingerprint(raw); setValue(raw.payload); durable.current = JSON.stringify(raw.payload); setSavedJSON(durable.current); setSavedAt(raw.updatedAt); setStatus('saved'); setGate(false); setConflict(false); }
    catch { setStatus('invalid'); setConflict(false); }
  };
  // Replace only the competing record observed when the conflict was presented.
  const retain = () => {
    if (!validate(latest.current)) { setStatus('invalid'); setConflict(false); return; }
    const record: DraftRecord<T> = { kind, sourceVersion, updatedAt: Date.now(), revision: crypto.randomUUID(), payload: latest.current };
    const result = commitDraft(identity, competing.current, record);
    if (result === 'saved') { expected.current = fingerprint(record); durable.current = JSON.stringify(latest.current); setSavedJSON(durable.current); setSavedAt(record.updatedAt); setGate(false); setConflict(false); setStatus('saved'); }
    else { setStatus(result); if (result === 'conflict') { try { competing.current = fingerprint(readDraftStore().drafts[identity]); } catch { competing.current = ''; } } }
  };
  return { value, setValue, dirty, gate, compatible, status, savedAt, save, resume, reset, discard, setDiscard, conflict, setConflict, adopt, retain, blocker };
}

export function DraftPanel<T>({ draft }: { draft: ReturnType<typeof useDraft<T>> }) {
  const t = useText(); const f = useFormatting();
  return <><section className="authoring-save" aria-label={t('Local draft')}><div role="status"><strong>{t(draft.status === 'invalid' ? 'Draft storage is unavailable or incompatible' : draft.gate ? 'Local draft found' : draft.status === 'conflict' ? 'Another version needs your decision' : draft.status === 'failed' ? 'Unable to save. Keep this tab open.' : draft.dirty ? 'Unsaved changes on this device' : draft.savedAt ? 'Draft saved on this device' : 'Local draft')}</strong>{draft.savedAt && !draft.dirty && <span> · {f.date(draft.savedAt, true)}</span>}</div><p>{t('Local drafts do not publish questions or assign tests.')}</p>{draft.gate ? <div className="authoring-actions"><Button disabled={!draft.compatible} onClick={draft.resume}>{t('Resume local draft')}</Button><Button variant="secondary" onClick={() => draft.setDiscard(true)}>{t('Start fresh')}</Button></div> : <div className="authoring-actions"><Button variant="secondary" onClick={draft.save}>{t(draft.status === 'failed' || draft.status === 'invalid' ? 'Retry saving' : 'Save local draft')}</Button>{draft.status === 'conflict' && <Button onClick={() => draft.setConflict(true)}>{t('Review versions')}</Button>}<Button variant="plain" onClick={() => draft.setDiscard(true)}>{t('Discard local draft')}</Button></div>}</section>
    <Confirm open={draft.discard} title="Discard this local draft?" action="Discard draft" onCancel={() => draft.setDiscard(false)} onConfirm={draft.reset}><p>{t('This route returns to its source. Other drafts and student work are kept.')}</p></Confirm>
    <Confirm open={draft.conflict && !draft.discard && draft.blocker.state !== 'blocked'} title="Another tab changed this draft" safe="Keep current in memory" action="Use saved version" onCancel={() => draft.setConflict(false)} onConfirm={draft.adopt}><p>{t('Your current fields remain in memory. Use the saved version or explicitly replace it with these fields.')}</p><Button variant="secondary" onClick={draft.retain}>{t('Replace saved version with mine')}</Button></Confirm>
    <Confirm open={draft.blocker.state === 'blocked'} title="Leave with unsaved changes?" action="Leave anyway" onCancel={() => draft.blocker.state === 'blocked' && draft.blocker.reset()} onConfirm={() => draft.blocker.state === 'blocked' && draft.blocker.proceed()}><p>{t('Changes have not been saved. Leaving can lose this draft. Keep editing to retry saving.')}</p></Confirm>
  </>;
}
