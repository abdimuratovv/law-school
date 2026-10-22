import { getQuestion } from '@/data/questions';
import type { TestDef } from '@/data/types';
import { safeStudentReturn } from './navigation';

/** Missing content cannot start; placeholders remain an explicitly labelled preview. */
export function testReadiness(test: TestDef) {
  const questions = test.questionIds.map(getQuestion);
  return { missing: !questions.length || questions.some(q => !q), preview: questions.some(q => q?.placeholder), single: questions.filter(q => q?.kind === 'single').length, written: questions.filter(q => q?.kind === 'written').length };
}
export interface DiscoveryOrigin { from: string; card?: string; scroll?: number }
export function discoveryOrigin(value: unknown, fallback: string): DiscoveryOrigin {
  if (!value || typeof value !== 'object') return { from: fallback };
  const item = value as Partial<DiscoveryOrigin>;
  if (typeof item.from !== 'string' || safeStudentReturn(item.from) !== item.from) return { from: fallback };
  const from = safeStudentReturn(item.from);
  const path = from.split(/[?#]/)[0];
  if (!['/', '/profile', '/tests'].includes(path) && !/^\/tests\/[^/]+$/.test(path)) return { from: fallback };
  return { from, card: typeof item.card === 'string' ? item.card : undefined, scroll: typeof item.scroll === 'number' && Number.isFinite(item.scroll) ? Math.max(0, item.scroll) : undefined };
}
