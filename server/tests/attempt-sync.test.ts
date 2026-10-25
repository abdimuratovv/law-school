import { expect, it, vi } from 'vitest';
import { pendingSave, resolveSaveResponse } from '../../src/lib/attemptSync';
import type { ServerAttempt } from '../../shared/contracts/exams';
import type { Draft } from '../../src/lib/attemptDraft';

const server: ServerAttempt = { id: '117fc717-0167-4569-852d-cb6744d04562', examId: 'p_test', name: 'Fixture', mode: 'practice',
  state: 'active', revision: 3, startedAt: 1, endsAt: null, savedAt: 2, serverNow: 3,
  snapshot: { answers: { a: 'one', b: 'two' }, flags: [] }, questions: [], checked: [], feedback: {}, result: null };

it('sends only answer replacements/deletions and reconstructs the acknowledged snapshot', async () => {
  const draft: Draft = { key: 'fixture', revision: 3, dirty: true, snapshot: { answers: { a: '', c: 'new' }, flags: ['a'], currentQuestionId: 'c' } };
  const pending = pendingSave(server, draft);
  expect(pending.body.answers).toEqual({ a: '', c: 'new' }); expect(pending.body.deletedAnswerIds).toEqual(['b']);
  const fetch = vi.fn();
  const next = await resolveSaveResponse({ id: server.id, state: 'active', revision: 4, savedAt: 4, serverNow: 5 }, server, pending, fetch);
  expect(next.snapshot).toEqual(draft.snapshot); expect(next.questions).toBe(server.questions); expect(fetch).not.toHaveBeenCalled();
});

it('fetches the authoritative attempt after newer-tab replays or deadline finalization', async () => {
  const pending = pendingSave(server, { key: 'fixture', revision: 3, dirty: true, snapshot: server.snapshot });
  const latest = { ...server, revision: 5, snapshot: { answers: { a: 'other tab' }, flags: [] } };
  const fetch = vi.fn(async () => latest);
  expect(await resolveSaveResponse({ id: server.id, state: 'active', revision: 5, savedAt: 4, serverNow: 5 }, server, pending, fetch)).toBe(latest);
  await resolveSaveResponse({ id: server.id, state: 'final', revision: 4, savedAt: 4, serverNow: 5 }, server, pending, fetch);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('recovers legacy full-snapshot pending operations from IndexedDB', async () => {
  const pending: NonNullable<Draft['pending']> = { action: 'save', body: { ...server.snapshot, revision: 2, operationId: crypto.randomUUID() } };
  expect(await resolveSaveResponse(server, server, pending, vi.fn())).toEqual(server);
});
