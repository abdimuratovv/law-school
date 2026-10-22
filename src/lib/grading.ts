import { getQuestion } from '@/data/questions';
import { getTest } from '@/data/tests';
import { TOPICS } from '@/data/topics';
import type { Attempt, Question, TopicId, Verdict } from '@/data/types';

/** Normalizes a written answer: case, extra spaces. Karakalpak letters are kept as-is. */
export const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('kaa');

/** Levenshtein distance, used to route near-misses to manual grading. */
function distance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export function verdict(q: Question, answer: string | undefined): Verdict {
  if (!answer || !answer.trim()) return 'unanswered';
  if (q.kind === 'single') return answer === q.correct ? 'correct' : 'incorrect';
  if (!q.accepted.length) return 'pending';
  const a = normalize(answer);
  if (q.accepted.some((x) => normalize(x) === a)) return 'correct';
  // Near misses (a letter or two off) go to the teacher instead of being marked wrong.
  if (q.accepted.some((x) => distance(normalize(x), a) <= 2)) return 'pending';
  return 'incorrect';
}

export interface ResultRow {
  n: number;
  q: Question;
  answer?: string;
  verdict: Verdict;
  flagged: boolean;
}

export interface AttemptResult {
  rows: ResultRow[];
  correct: number;
  total: number;
  answered: number;
  pending: ResultRow[];
  percent: number;
  byTopic: { topic: TopicId; name: string; correct: number; total: number }[];
}

export function gradeAttempt(a: Attempt): AttemptResult {
  const test = getTest(a.testId);
  const ids = test?.questionIds ?? Object.keys(a.answers);
  const rows: ResultRow[] = ids.map((id, i) => {
    const q = getQuestion(id);
    return { n: i + 1, q, answer: a.answers[id], verdict: verdict(q, a.answers[id]), flagged: !!a.flags[id] };
  });
  const correct = rows.filter((r) => r.verdict === 'correct').length;
  const answered = rows.filter((r) => r.verdict !== 'unanswered').length;
  const pending = rows.filter((r) => r.verdict === 'pending');
  const topics = new Map<TopicId, { correct: number; total: number }>();
  for (const r of rows) {
    const t = topics.get(r.q.topic) ?? { correct: 0, total: 0 };
    t.total++;
    if (r.verdict === 'correct') t.correct++;
    topics.set(r.q.topic, t);
  }
  const byTopic = [...topics.entries()]
    .map(([topic, v]) => ({ topic, name: TOPICS[topic].name, ...v }))
    .sort((x, y) => y.correct / y.total - x.correct / x.total);
  return { rows, correct, total: rows.length, answered, pending, percent: rows.length ? Math.round((correct / rows.length) * 100) : 0, byTopic };
}

/** Score as a fraction for history charts — works for seeded attempts too. */
export function attemptScore(a: Attempt) {
  if (a.seedScore) return a.seedScore;
  const r = gradeAttempt(a);
  return { correct: r.correct, total: r.total };
}
