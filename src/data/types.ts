export type TopicId =
  | 'constitutional'
  | 'civil'
  | 'criminal'
  | 'administrative'
  | 'human-rights'
  | 'labor'
  | 'family'
  | 'theory';

export type Letter = 'A' | 'B' | 'C' | 'D';
export const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

export interface ListItem {
  k: string;
  t: string;
}

export interface LegalBasis {
  label: string;
  url: string;
}

interface QuestionBase {
  id: string;
  topic: TopicId;
  /** Main question text (Karakalpak). */
  stem: string;
  legal?: LegalBasis;
  /** Seed content that still needs real text from the question bank. */
  placeholder?: boolean;
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'single';
  /** Optional matching blocks: “Atamalar” (terms) and “Anıqlamalar” (definitions). */
  terms?: ListItem[];
  defs?: ListItem[];
  options: [string, string, string, string];
  correct: Letter;
  explanation?: ListItem[];
}

export interface WrittenQuestion extends QuestionBase {
  kind: 'written';
  /** Any one counts as correct. Empty = always graded manually. */
  accepted: string[];
}

export type Question = ChoiceQuestion | WrittenQuestion;

export type TestMode = 'mock' | 'practice';

export interface TestDef {
  id: string;
  name: string;
  mode: TestMode;
  /** “all topics” or a single topic */
  topic: TopicId | 'all';
  questionIds: string[];
  /** Seconds; null = untimed. */
  timeLimit: number | null;
  /** ISO date when assigned by a teacher. */
  due?: string;
  assigned?: boolean;
}

/** An exam in progress, persisted per test. */
export interface ExamSession {
  testId: string;
  mode: TestMode;
  startedAt: number;
  /** Epoch ms when time runs out; null when untimed. */
  endsAt: number | null;
  answers: Record<string, string>;
  flags: Record<string, true>;
  /** Practice answers confirmed by the learner. */
  checked?: Record<string, true>;
  current: number;
}

export interface Attempt {
  id: string;
  testId: string;
  mode: TestMode;
  submittedAt: number;
  durationSec: number;
  answers: Record<string, string>;
  flags: Record<string, true>;
  /** For seeded history without full answers. */
  seedScore?: { correct: number; total: number };
}

export type Verdict = 'correct' | 'incorrect' | 'pending' | 'unanswered';
