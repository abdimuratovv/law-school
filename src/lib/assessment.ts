import type { Attempt, ExamSession } from '@/data/types';

/** Stable across retries/reloads; older timestamp-only result IDs remain valid. */
export const sessionAttemptId = (session: Pick<ExamSession, 'testId' | 'startedAt'>) => `a-${session.startedAt.toString(36)}-${session.testId}`;
export function submissionSnapshot(session: ExamSession, at: number): Attempt {
  return {
    id: sessionAttemptId(session), testId: session.testId, mode: session.mode,
    submittedAt: at,
    durationSec: Math.max(0, Math.round(((session.endsAt != null ? Math.min(at, session.endsAt) : at) - session.startedAt) / 1000)),
    answers: { ...session.answers }, flags: { ...session.flags }
  };
}
