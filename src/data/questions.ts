import type { Question } from './types';

/** Public controls tutorial only. Real examinations are fetched from /api/v1.
 * These deliberately trivial examples expose their example answers in /design.
 * The former artboard bank is archived outside the browser source tree.
 */
export const QUESTIONS: Question[] = [
  { id:'Q-0051', kind:'single', topic:'theory', stem:'Sample: select SAMPLE.', options:['SAMPLE','BUTTON','TIMER','DRAFT'], correct:'A', explanation:[{ k:'',t:'This is only a controls tutorial.' }] },
  { id:'Q-0388', kind:'single', topic:'theory', stem:'Sample: select NEXT.', options:['BACK','NEXT','SAVE','FLAG'], correct:'B' },
  { id:'Q-0414', kind:'written', topic:'theory', stem:'Sample: type sample.', accepted:['sample'] },
];
export const QUESTION_MAP: Record<string,Question> = Object.fromEntries(QUESTIONS.map(q=>[q.id,q]));
export const getQuestion = (id: string): Question => QUESTION_MAP[id] ?? { ...QUESTIONS[0]!, id, placeholder:true };
export const MOCK_7_IDS = QUESTIONS.map(q=>q.id);
export const MOCK_8_IDS = [...MOCK_7_IDS].reverse();
