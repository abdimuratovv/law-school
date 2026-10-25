import { saveAcknowledgementSchema, attemptSchema, type ServerAttempt } from '../../shared/contracts/exams';
import type { Draft } from './attemptDraft';

export function pendingSave(server: ServerAttempt, draft: Draft): NonNullable<Draft['pending']> {
  const answers = Object.fromEntries(Object.entries(draft.snapshot.answers).filter(([id, answer]) => server.snapshot.answers[id] !== answer));
  const deletedAnswerIds = Object.keys(server.snapshot.answers).filter(id => !Object.prototype.hasOwnProperty.call(draft.snapshot.answers, id));
  return { action: 'save', snapshot: draft.snapshot, body: {
    ...draft.snapshot, answers, deletedAnswerIds, revision: draft.revision, operationId: crypto.randomUUID(),
  } };
}

/** A late replay may acknowledge another tab's newer revision: fetch before merging. */
export async function resolveSaveResponse(raw: unknown, previous: ServerAttempt, pending: NonNullable<Draft['pending']>, fetchLatest: () => Promise<ServerAttempt>): Promise<ServerAttempt> {
  if (pending.action !== 'save' || !('deletedAnswerIds' in pending.body)) return attemptSchema.parse(raw);
  const ack = saveAcknowledgementSchema.parse(raw);
  if (ack.id !== previous.id) throw new Error('Unexpected attempt acknowledgement');
  if (ack.state !== 'active' || ack.revision !== pending.body.revision + 1 || !pending.snapshot) return fetchLatest();
  return { ...previous, ...ack, snapshot: pending.snapshot };
}
