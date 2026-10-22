import type { Tone } from '@/components/ui/basic';
import { TOPICS } from '@/data/topics';
import type { Attempt, ExamSession, TestDef } from '@/data/types';
import { attemptScore } from './grading';
import { dueLabel, pct } from './format';

export const answeredCount = (s: ExamSession) => Object.values(s.answers).filter((v) => v && v.trim()).length;

export function bestPercent(testId: string, attempts: Attempt[]) {
  const mine = attempts.filter((a) => a.testId === testId);
  if (!mine.length) return null;
  return Math.max(...mine.map((a) => {
    const s = attemptScore(a);
    return pct(s.correct, s.total);
  }));
}

export function testStatus(t: TestDef, session: ExamSession | undefined, attempts: Attempt[]): { label: string; tone: Tone } {
  if (session) return { label: `In progress · ${session.current + 1}/${t.questionIds.length}`, tone: 'acc' };
  const done = attempts.some((a) => a.testId === t.id);
  if (done) return { label: 'Completed', tone: 'ok' };
  if (t.due) return { label: dueLabel(t.due), tone: 'warn' };
  return { label: 'Not started', tone: '' };
}

/** “Mock exam · all topics” / “Practice · constitutional law” */
export const kindLine = (t: TestDef) =>
  `${t.mode === 'mock' ? 'Mock exam' : 'Practice'} · ${t.topic === 'all' ? 'all topics' : TOPICS[t.topic].name.toLowerCase()}`;

/** “Constitutional law · Practice set 3” for practice sets, plain name for mock exams. */
export const fullName = (t: TestDef) => (t.mode === 'practice' && t.topic !== 'all' ? `${TOPICS[t.topic].name} · ${t.name}` : t.name);

export function composition(t: TestDef, questionKind: (id: string) => 'single' | 'written') {
  const w = t.questionIds.filter((id) => questionKind(id) === 'written').length;
  return { single: t.questionIds.length - w, written: w };
}
