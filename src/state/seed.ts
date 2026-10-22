import { MOCK_7_IDS } from '@/data/questions';
import type { Attempt, ExamSession } from '@/data/types';

const DAY = 86_400_000;

/** Mock exam No. 7 resumed at question 12 with 1:48:20 left — the state drawn in the design. */
export function seedSession(now = Date.now()): ExamSession {
  const answered = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 20, 21, 23, 36, 37];
  const flagged = [9, 14, 22];
  const sample: Record<number, string> = { 1: 'A', 2: 'B', 3: 'B', 4: 'A', 5: 'C', 6: 'B', 7: 'A', 8: 'B', 10: 'D', 11: 'B', 12: 'C', 13: 'A', 15: 'C', 16: 'D', 20: 'B', 21: 'A', 23: 'C' };
  const answers: Record<string, string> = {};
  for (const n of answered) {
    const id = MOCK_7_IDS[n - 1];
    answers[id] = n >= 36 ? (n === 36 ? 'Legitimlik' : 'Deputat') : sample[n];
  }
  const flags: Record<string, true> = {};
  for (const n of flagged) flags[MOCK_7_IDS[n - 1]] = true;
  const limit = 150 * 60;
  const left = 1 * 3600 + 48 * 60 + 20;
  return { testId: 'mock-7', mode: 'mock', startedAt: now - (limit - left) * 1000, endsAt: now + left * 1000, answers, flags, current: 11 };
}

/** Ten past attempts: scores climbing from 52 % to 69 % (the dashboard progress chart). */
export function seedAttempts(now = Date.now()): Attempt[] {
  const scores = [52, 57, 54, 59, 58, 62, 60, 65, 64, 69];
  const ids = ['history', 'history', 'history', 'history', 'history', 'history', 'practice-2', 'history', 'history', 'mock-6'];
  return scores.map((p, i) => {
    const total = ids[i] === 'practice-2' ? 20 : ids[i] === 'mock-6' ? 45 : 100;
    const correct = ids[i] === 'practice-2' ? 11 : Math.round((p / 100) * total);
    return {
      id: `seed-${i}`,
      testId: ids[i],
      mode: ids[i].startsWith('practice') ? 'practice' : 'mock',
      submittedAt: now - (31 - Math.round(i * 3.3)) * DAY,
      durationSec: 7200,
      answers: {},
      flags: {},
      seedScore: { correct, total }
    } satisfies Attempt;
  });
}
