import type { Grade, PrivateQuestion } from '../../shared/contracts/exams';

export const ALGORITHM = 'nfc-distance2-v1';
export const normalize = (value: string) => value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('und');
// Banded distance, O(5*n), bounded input and no unbounded quadratic matrix.
export function closeEnough(a: string, b: string): boolean {
  const x = [...a]; const y = [...b];
  if (Math.abs(x.length - y.length) > 2) return false;
  let previous = new Uint16Array(y.length + 1);
  let row = new Uint16Array(y.length + 1);
  for (let j = 0; j <= Math.min(y.length,2); j++) previous[j] = j;
  for (let i = 1; i <= x.length; i++) {
    row[0] = Math.min(i,3);
    const start = Math.max(1,i-2);
    if (start > 1) row[start-1] = 3;
    let best = row[0]!;
    for (let j = start; j <= Math.min(y.length, i + 2); j++) {
      row[j] = Math.min((j <= i+1 ? previous[j]! : 3) + 1, row[j - 1]! + 1, previous[j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1));
      best = Math.min(best, row[j]!);
    }
    if (best > 2) return false;
    [previous,row] = [row,previous];
  }
  return previous[y.length]! <= 2;
}
export function grade(item: PrivateQuestion, answer = ''): Grade {
  const value = normalize(answer);
  if (!value) return { verdict: 'unanswered', units: 0 };
  if (item.question.kind === 'single') return item.correctOptionId === answer ? { verdict: 'correct', units: 2 } : { verdict: 'incorrect', units: 0 };
  const accepted = item.accepted.map(normalize);
  if (accepted.includes(value)) return { verdict: 'correct', units: 2 };
  if (!accepted.length || accepted.some(model => closeEnough(value, model))) return { verdict: 'pending', units: null };
  return { verdict: 'incorrect', units: 0 };
}
