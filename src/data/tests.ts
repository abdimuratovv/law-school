import { MOCK_7_IDS, MOCK_8_IDS } from './questions';
import type { TestDef } from './types';

const DAY = 86_400_000;
const inDays = (n: number) => {
  const d = new Date(Date.now() + n * DAY);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
};

const CONSTITUTIONAL_SET = ['Q-0412', 'Q-0388', 'Q-0389', 'Q-0390', 'Q-0402', 'Q-0413', 'Q-0398', 'Q-0436', 'Q-0437', 'Q-0414', 'Q-0415', 'Q-0417'];
const CRIMINAL_SET = ['Q-0902', 'Q-0904', 'Q-0908', 'Q-0910', 'Q-0912', 'Q-0914', 'Q-0951'];
const HUMAN_RIGHTS_SET = ['Q-0051', 'Q-0435', 'Q-0393', 'Q-0418', 'Q-0905', 'Q-0913'];
const CIVIL_SET = ['Q-0422', 'Q-0432', 'Q-0431', 'Q-0901', 'Q-0906', 'Q-0909', 'Q-0119', 'Q-0952'];

export const TESTS: TestDef[] = [
  { id: 'mock-7', name: 'Mock exam No. 7', mode: 'mock', topic: 'all', questionIds: MOCK_7_IDS, timeLimit: 150 * 60 },
  { id: 'practice-3', name: 'Practice set 3', mode: 'practice', topic: 'constitutional', questionIds: CONSTITUTIONAL_SET, timeLimit: null, due: inDays(4), assigned: true },
  { id: 'mock-8', name: 'Mock exam No. 8', mode: 'mock', topic: 'all', questionIds: MOCK_8_IDS, timeLimit: 150 * 60, due: inDays(8), assigned: true },
  { id: 'mock-6', name: 'Mock exam No. 6', mode: 'mock', topic: 'all', questionIds: MOCK_8_IDS, timeLimit: 150 * 60 },
  { id: 'practice-2', name: 'Practice set 2', mode: 'practice', topic: 'criminal', questionIds: CRIMINAL_SET, timeLimit: null },
  { id: 'practice-1', name: 'Practice set 1', mode: 'practice', topic: 'human-rights', questionIds: HUMAN_RIGHTS_SET, timeLimit: null },
  { id: 'practice-4', name: 'Practice set 4', mode: 'practice', topic: 'civil', questionIds: CIVIL_SET, timeLimit: null }
];

export const TEST_MAP: Record<string, TestDef> = Object.fromEntries(TESTS.map((t) => [t.id, t]));
export const getTest = (id: string | undefined) => (id ? TEST_MAP[id] : undefined);

/** Full display name, e.g. “Constitutional law · Practice set 3”. */
export const longName = (t: TestDef, topicName: (id: TestDef['topic']) => string) =>
  t.mode === 'practice' && t.topic !== 'all' ? `${topicName(t.topic).replace(/^./, (c) => c.toUpperCase())} · ${t.name}` : t.name;
