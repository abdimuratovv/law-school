import type { QStatus } from '@/components/ui/data';
import type { Tone } from '@/components/ui/basic';

/* Teacher workspace seed data — values match the admin artboards. */

export interface BankRow {
  id: string;
  stem: string;
  topic: string;
  type: 'Matching' | 'Single choice' | 'Written';
  diff: 1 | 2 | 3;
  status: QStatus;
  used: string;
  updated: string;
}

export const BANK: BankRow[] = [
  { id: 'Q-0412', stem: 'Huqıqıy atamalar hám olardıń anıqlamaları ortasındaǵı durıs sáykeslikti anıqlań.', topic: 'Constitutional', type: 'Matching', diff: 2, status: 'pub', used: '4', updated: 'Oct 2' },
  { id: 'Q-0413', stem: 'Qaraqalpaqstan Respublikası Joqarǵı Keńesiniń wákillikleri qaysı juwapta durıs kórsetilgen?', topic: 'Constitutional', type: 'Single choice', diff: 3, status: 'pub', used: '3', updated: 'Oct 2' },
  { id: 'Q-0414', stem: 'Málim bir siyasiy talaplardı bildiriw maqsetindegi ǵalabalıq shıǵıw ne dep ataladı?', topic: 'Constitutional', type: 'Written', diff: 1, status: 'pub', used: '2', updated: 'Sep 30' },
  { id: 'Q-0422', stem: 'Puqaralıq huqıqıy qatnasıqlardıń subyektleri kimler?', topic: 'Civil', type: 'Single choice', diff: 2, status: 'rev', used: '5', updated: 'Oct 3' },
  { id: 'Q-0387', stem: 'Administrativlik huqıqbuzarlıq ushın qollanılatuǵın jazalar túrlerin kórsetiń.', topic: 'Administrative', type: 'Single choice', diff: 2, status: 'rev', used: '3', updated: 'Oct 1' },
  { id: 'Q-0431', stem: 'Miynet shártnamasınıń sınaq múddeti neshe aydan aspawı kerek?', topic: 'Labor', type: 'Single choice', diff: 1, status: 'draft', used: '—', updated: 'Today' },
  { id: 'Q-0432', stem: 'Neke dúziw ushın qanday shártler talap etiledi?', topic: 'Family', type: 'Single choice', diff: 2, status: 'draft', used: '—', updated: 'Today' },
  { id: 'Q-0433', stem: 'Tómendegi I hám II toparlardaǵı principlerdi sáykeslendiriń.', topic: 'Legal theory', type: 'Matching', diff: 3, status: 'draft', used: '—', updated: 'Today' },
  { id: 'Q-0051', stem: 'Insan huqıqları ulıwma deklaraciyası qashan qabıl etilgen?', topic: 'Human rights', type: 'Single choice', diff: 1, status: 'pub', used: '6', updated: 'Aug 14' },
  { id: 'Q-0119', stem: 'Neke jasın tómenletiw qanday jaǵdaylarda ruxsat etiledi?', topic: 'Family', type: 'Written', diff: 2, status: 'rev', used: '2', updated: 'Sep 21' },
  { id: 'Q-0402', stem: 'Prezident saylawı neshe jılda bir ret ótkeriledi?', topic: 'Constitutional', type: 'Single choice', diff: 1, status: 'pub', used: '5', updated: 'Sep 18' },
  { id: 'Q-0398', stem: 'Konstituciyanıń qabıl etiliw tártibi qaysı juwapta durıs?', topic: 'Constitutional', type: 'Single choice', diff: 2, status: 'pub', used: '3', updated: 'Sep 12' },
  { id: 'Q-0388', stem: 'Referendum degen ne?', topic: 'Constitutional', type: 'Single choice', diff: 1, status: 'pub', used: '4', updated: 'Sep 10' },
  { id: 'Q-0377', stem: 'Puqaralardıń múráját etiw huqıqı qaysı nızam menen tártiplestiriledi?', topic: 'Administrative', type: 'Single choice', diff: 2, status: 'pub', used: '2', updated: 'Sep 8' }
];

export const BANK_TOTALS = { all: 1284, pub: 1162, draft: 85, rev: 37 };

export const WEEK = [['Mon', 38], ['Tue', 52], ['Wed', 47], ['Thu', 74], ['Fri', 61], ['Sat', 44], ['Sun', 26]] as const;

export const FLAGGED = [
  { id: 'Q-0422', stem: 'Puqaralıq huqıqıy qatnasıqlardıń subyektleri kimler?', topic: 'Civil law', issue: 'Likely key error', tone: 'bad' as Tone, pc: '18 %' },
  { id: 'Q-0387', stem: 'Administrativlik huqıqbuzarlıq ushın qollanılatuǵın jazalar túrlerin kórsetiń.', topic: 'Administrative', issue: 'Ambiguous · B/C split', tone: 'warn' as Tone, pc: '41 %' },
  { id: 'Q-0119', stem: 'Neke jasın tómenletiw qanday jaǵdaylarda ruxsat etiledi?', topic: 'Family law', issue: '6 student reports', tone: 'warn' as Tone, pc: '52 %' },
  { id: 'Q-0051', stem: 'Insan huqıqları ulıwma deklaraciyası qashan qabıl etilgen?', topic: 'Human rights', issue: 'Too easy', tone: '' as Tone, pc: '97 %' }
];

export const QUEUE_SUMMARY = [
  { test: 'Mock exam No. 7', sub: '11-B · submitted today', n: 9 },
  { test: 'Mock exam No. 6', sub: '11-A · oldest 2 days', n: 3 },
  { test: 'Constitutional law · Practice set 3', sub: '11-A, 11-B', n: 2 }
];

export const ASSIGNED = [
  { name: 'Constitutional law · Practice set 3', due: 'Due Oct 8', tone: 'warn' as Tone, pct: 71, done: '44 / 62 done' },
  { name: 'Mock exam No. 8', due: 'Due Oct 12', tone: '' as Tone, pct: 18, done: '11 / 62 done' },
  { name: 'Criminal law · Practice set 2', due: 'Closed', tone: 'ok' as Tone, pct: 95, done: '59 / 62 done' }
];

/* Grading queue: written answers waiting for a teacher. */
export type Grade = 'ok' | 'part' | 'bad';
export interface GradeItem {
  id: string;
  q: number;
  student: string;
  group: string;
  answer: string;
  stem: string;
  accepted: string[];
  note?: string;
  grade?: Grade;
}

// Harmless public controls examples. Real review records come from the server in stage 4.
export const GRADING: GradeItem[] = [
  { id:'g1',q:1,student:'#sample',group:'Sample',answer:'sample',stem:'Sample: type sample.',accepted:['sample'],grade:'ok' },
  { id:'g2',q:1,student:'#sample2',group:'Sample',answer:'sampl',stem:'Sample: type sample.',accepted:['sample'],note:'Public tutorial: possible typo' },
  { id:'g3',q:2,student:'#sample3',group:'Sample',answer:'free text',stem:'Sample: write any text.',accepted:[],note:'Public tutorial: manual review' },
];

/* Students */
export interface StudentRow {
  ini: string;
  name: string;
  group: string;
  last: string;
  avg: number;
  trend: number;
}

export const STUDENTS: StudentRow[] = [
  { ini: 'AT', name: 'Aybek Tursınbaev', group: '11-B', last: 'today', avg: 63, trend: 17 },
  { ini: 'GE', name: 'Gúlnara Esbergenova', group: '11-A', last: 'today', avg: 78, trend: 6 },
  { ini: 'DA', name: 'Dawran Allambergenov', group: '11-B', last: 'yesterday', avg: 55, trend: -4 },
  { ini: 'ZS', name: 'Zuxra Saparova', group: '11-A', last: 'today', avg: 71, trend: 2 },
  { ini: 'BJ', name: 'Bekzat Jumabaev', group: '11-B', last: '5 days ago', avg: 48, trend: 0 },
  { ini: 'AQ', name: 'Aruwxan Qayratova', group: '11-A', last: 'today', avg: 82, trend: 9 },
  { ini: 'RE', name: 'Ruslan Ermekov', group: '11-B', last: '2 days ago', avg: 59, trend: -1 },
  { ini: 'MS', name: 'Mádina Seytmuratova', group: '11-A', last: 'today', avg: 67, trend: 3 },
  { ini: 'NA', name: 'Nurlan Abdiraxmanov', group: '11-B', last: 'today', avg: 61, trend: 5 },
  { ini: 'SJ', name: 'Sanjar Jaqsılıqov', group: '11-A', last: '3 days ago', avg: 52, trend: -2 }
];

/* Analytics */
export interface AnalyticsRow {
  id: string;
  stem: string;
  topic: string;
  n: string;
  correct: number;
  dist: [number, number, number, number];
  key: 0 | 1 | 2 | 3;
  disc: number;
  flag: string;
  tone: Tone;
  top?: [number, number, number, number];
  note?: string;
  cta?: string;
}

export const ANALYTICS: AnalyticsRow[] = [
  { id: 'Q-0422', stem: 'Puqaralıq huqıqıy qatnasıqlardıń subyektleri kimler?', topic: 'Civil law', n: '312', correct: 18, dist: [18, 61, 12, 9], key: 0, disc: -0.21, flag: 'Likely key error', tone: 'bad', top: [11, 74, 9, 6], note: 'The strongest students chose B (74 %) far more than the key A (11 %), and discrimination is negative. The answer key is probably wrong.', cta: 'Change key to B and regrade 312 attempts' },
  { id: 'Q-0387', stem: 'Administrativlik huqıqbuzarlıq ushın qollanılatuǵın jazalar túrlerin kórsetiń.', topic: 'Administrative', n: '288', correct: 41, dist: [12, 41, 38, 9], key: 1, disc: 0.08, flag: 'Ambiguous', tone: 'warn', top: [4, 48, 44, 4], note: 'B (key) and C are chosen almost equally, even by top students (48 % vs 44 %). Option C may also be defensible — check the wording against the code.', cta: 'Rewrite option C' },
  { id: 'Q-0119', stem: 'Neke jasın tómenletiw qanday jaǵdaylarda ruxsat etiledi?', topic: 'Family law', n: '140', correct: 52, dist: [52, 22, 14, 12], key: 0, disc: 0.15, flag: '6 reports', tone: 'warn', top: [70, 14, 9, 7], note: 'Six students reported this question as unclear. Read the reports before the next mock exam.', cta: 'Read 6 reports' },
  { id: 'Q-0413', stem: 'Qaraqalpaqstan Respublikası Joqarǵı Keńesiniń wákillikleri qaysı juwapta durıs kórsetilgen?', topic: 'Constitutional', n: '980', correct: 44, dist: [44, 20, 21, 15], key: 0, disc: 0.38, flag: '', tone: '' },
  { id: 'Q-0412', stem: 'Huqıqıy atamalar hám olardıń anıqlamaları ortasındaǵı durıs sáykeslikti anıqlań.', topic: 'Constitutional', n: '1,240', correct: 58, dist: [9, 6, 58, 27], key: 2, disc: 0.42, flag: '', tone: '' },
  { id: 'Q-0398', stem: 'Konstituciyanıń qabıl etiliw tártibi qaysı juwapta durıs?', topic: 'Constitutional', n: '412', correct: 49, dist: [49, 30, 21, 0], key: 0, disc: 0.31, flag: 'Option D unused', tone: '', note: 'Nobody picked option D. Replace it with a plausible distractor so the question discriminates better.', cta: 'Edit option D' },
  { id: 'Q-0051', stem: 'Insan huqıqları ulıwma deklaraciyası qashan qabıl etilgen?', topic: 'Human rights', n: '1,510', correct: 97, dist: [97, 1, 1, 1], key: 0, disc: 0.04, flag: 'Too easy', tone: '', note: 'Almost everyone answers correctly, so it barely separates strong and weak students. Consider retiring it from mock exams.', cta: 'Move to practice only' },
  { id: 'Q-0402', stem: 'Prezident saylawı neshe jılda bir ret ótkeriledi?', topic: 'Constitutional', n: '760', correct: 83, dist: [3, 83, 9, 5], key: 1, disc: 0.22, flag: '', tone: '' }
];

export const BLUEPRINT = [
  { t: 'Constitutional law', av: 412, sc: 9, w: 2 },
  { t: 'Civil law', av: 288, sc: 7, w: 2 },
  { t: 'Administrative law', av: 196, sc: 6, w: 2 },
  { t: 'Criminal law', av: 231, sc: 6, w: 2 },
  { t: 'Human rights', av: 98, sc: 4, w: 1 },
  { t: 'Labor law', av: 61, sc: 2, w: 1 },
  { t: 'Family law', av: 54, sc: 1, w: 0 }
];

export const PICKABLE = [
  { id: 'Q-0412', stem: 'Huqıqıy atamalar hám olardıń anıqlamaları ortasındaǵı durıs sáykeslikti anıqlań.', type: 'Matching', rate: '58 %', on: true, kind: 'single' },
  { id: 'Q-0413', stem: 'Qaraqalpaqstan Respublikası Joqarǵı Keńesiniń wákillikleri qaysı juwapta durıs kórsetilgen?', type: 'Single choice', rate: '44 %', on: true, kind: 'single' },
  { id: 'Q-0414', stem: 'Málim bir siyasiy talaplardı bildiriw maqsetindegi ǵalabalıq shıǵıw ne dep ataladı?', type: 'Written', rate: '71 %', on: true, kind: 'written' },
  { id: 'Q-0402', stem: 'Prezident saylawı neshe jılda bir ret ótkeriledi?', type: 'Single choice', rate: '83 %', on: false, kind: 'single' },
  { id: 'Q-0398', stem: 'Konstituciyanıń qabıl etiliw tártibi qaysı juwapta durıs?', type: 'Single choice', rate: '49 %', on: true, kind: 'single' },
  { id: 'Q-0391', stem: 'Tómendegi I hám II toparlardaǵı principlerdi sáykeslendiriń.', type: 'Matching', rate: '37 %', on: false, kind: 'single' },
  { id: 'Q-0388', stem: 'Referendum degen ne?', type: 'Single choice', rate: '91 %', on: false, kind: 'single' },
  { id: 'Q-0377', stem: 'Puqaralardıń múráját etiw huqıqı qaysı nızam menen tártiplestiriledi?', type: 'Single choice', rate: '62 %', on: true, kind: 'single' }
] as const;

export interface ImportRow {
  n: number;
  s: 'ok' | 'w' | 'e';
  stem: string;
  topic: string;
  key: string;
  msg: string;
  action?: string;
}

export const IMPORT_ROWS: ImportRow[] = [
  { n: 3, s: 'ok', stem: 'Huqıqıy atamalar hám olardıń anıqlamaları ortasındaǵı durıs sáykeslikti anıqlań.', topic: 'Constitutional', key: 'C', msg: 'Ready' },
  { n: 4, s: 'e', stem: 'Tómendegi wákillikler hám organlar ortasındaǵı sáykeslikti anıqlań.', topic: 'Constitutional', key: 'B', msg: 'Option B references item 6, which doesn’t exist (stem lists 1–5)', action: 'Edit row' },
  { n: 5, s: 'ok', stem: 'Qaraqalpaqstan Respublikası Joqarǵı Keńesiniń wákillikleri qaysı juwapta durıs kórsetilgen?', topic: 'Constitutional', key: 'A', msg: 'Ready' },
  { n: 6, s: 'ok', stem: 'Prezident saylawı neshe jılda bir ret ótkeriledi?', topic: 'Constitutional', key: 'D', msg: 'Ready' },
  { n: 7, s: 'w', stem: 'Referendum degenimiz ne?', topic: 'Constitutional', key: 'A', msg: 'Possible duplicate of Q5 · 94 % text match', action: 'Compare' },
  { n: 8, s: 'ok', stem: 'Administrativlik juwapkershilik qashan payda boladı?', topic: 'Administrative', key: 'B', msg: 'Ready' },
  { n: 9, s: 'e', stem: 'Lawazımlı shaxstıń wákillikten tıs háreketi qalay ataladı?', topic: 'Administrative', key: '—', msg: 'Correct answer is empty', action: 'Edit row' },
  { n: 10, s: 'ok', stem: 'Puqaralardıń múráját etiw huqıqı qaysı nızam menen tártiplestiriledi?', topic: 'Administrative', key: 'C', msg: 'Ready' },
  { n: 12, s: 'w', stem: 'Insan huqıqları boyınsha wákil (ombudsman) kim tárepinen saylanadı?', topic: 'Konstituciya huqıqı', key: 'B', msg: 'Unknown topic “Konstituciya huqıqı” — map to Constitutional law?', action: 'Map topic' },
  { n: 15, s: 'e', stem: 'Siyasiy partiyanı dúziw ushın neshe aǵza kerek?', topic: 'Constitutional', key: 'written', msg: 'Written question has no accepted answers', action: 'Edit row' }
];

export const TEMPLATE_COLS = [
  { k: 'type', v: 'single or written' },
  { k: 'topic', v: 'One of your topic names' },
  { k: 'difficulty', v: 'easy · medium · hard' },
  { k: 'question', v: 'Full text; use line breaks for 1–7, a)–g), I/II' },
  { k: 'A … D', v: 'Options (single choice)' },
  { k: 'correct', v: 'A, B, C or D' },
  { k: 'accepted', v: 'Written answers, separated by |' },
  { k: 'act · article · link', v: 'Legal basis (optional)' }
];
