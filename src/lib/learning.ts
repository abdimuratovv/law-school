import { getQuestion } from '@/data/questions';
import { getTest } from '@/data/tests';
import type { Attempt, Verdict } from '@/data/types';
import { gradeAttempt } from './grading';

/** Missing records are recoverable UI states, never fabricated grading rows. */
export function learningResult(attempt?: Attempt) {
  if (!attempt || attempt.seedScore) return null;
  const ids = getTest(attempt.testId)?.questionIds ?? Object.keys(attempt.answers);
  return ids.length && ids.every(id => !!getQuestion(id)) ? gradeAttempt(attempt) : null;
}
export const verdictLabel: Record<Verdict, string> = { correct: 'Correct', incorrect: 'Incorrect', unanswered: 'Not answered', pending: 'Awaiting grading' };
export const resultFilters = ['all', 'incorrect', 'pending', 'unanswered', 'flagged'] as const;
export type ResultFilter = typeof resultFilters[number];
export function resultFilter(value: string | null): ResultFilter { return resultFilters.includes(value as ResultFilter) ? value as ResultFilter : 'all'; }
export function reviewReturn(attemptId: string, value: string | null) {
  const base = '/results/' + attemptId;
  if (!value) return base;
  try { const url = new URL(value, 'https://local.invalid'); return url.origin === 'https://local.invalid' && url.pathname === base ? url.pathname + url.search + (/^#result-question-\d+$/.test(url.hash) ? url.hash : '') : base; } catch { return base; }
}
