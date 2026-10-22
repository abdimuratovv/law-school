import type { ChoiceQuestion, ListItem, Question, TopicId, WrittenQuestion } from './types';

/*
 * Seed question bank. Text comes from the design artboards; definitions from the
 * matching question are reused to build single-choice and written items.
 * Questions marked `placeholder` keep their stem from the design but have bracketed
 * options — replace them with real content from the bank (Excel import or API).
 */

const LEX_ART_17 = { label: 'Constitution, Art. 17', url: 'https://lex.uz' };

const TERMS: ListItem[] = [
  { k: '1.', t: 'Deputat' },
  { k: '2.', t: 'Legitimlik' },
  { k: '3.', t: 'Ministr' },
  { k: '4.', t: 'Referendum' },
  { k: '5.', t: 'Nızam ústinligi' }
];

const DEF = {
  ministr: 'Húkimet aǵzası, mámleketlik basqarıwdıń belgili bir tarawın basqaratuǵın lawazımlı shaxs.',
  legitimlik: 'Mámleketlik hákimiyattıń xalıq tárepinen tán alınıwı hám nızamlı dep esaplanıwı.',
  nizam: 'Barlıq mámleketlik organlar, lawazımlı shaxslar hám puqaralardıń nızamǵa birdey boysınıwı.',
  deputat: 'Saylawshılar tárepinen wákillik organına saylanǵan xalıq wákili.',
  referendum: 'Mámleket hám jámiyet turmısınıń eń áhmiyetli máseleleri boyınsha ulıwma xalıqlıq dawıs beriw.'
};

const DEFS: ListItem[] = [
  { k: 'a)', t: DEF.ministr },
  { k: 'b)', t: DEF.legitimlik },
  { k: 'c)', t: DEF.nizam },
  { k: 'd)', t: DEF.deputat },
  { k: 'e)', t: DEF.referendum }
];

const EXPLAIN = {
  deputat: 'Deputat — saylawshılar saylaǵan xalıq wákili.',
  legitimlik: 'Legitimlik — hákimiyattıń xalıq tárepinen tán alınıwı.',
  ministr: 'Ministr — húkimet aǵzası.',
  referendum: 'Referendum — ulıwma xalıqlıq dawıs beriw.',
  nizam: 'Nızam ústinligi — hámmeniń nızamǵa birdey boysınıwı.'
};

const single = (q: Omit<ChoiceQuestion, 'kind'>): ChoiceQuestion => ({ kind: 'single', ...q });
const written = (q: Omit<WrittenQuestion, 'kind'>): WrittenQuestion => ({ kind: 'written', ...q });

const ph = (id: string, topic: TopicId, stem: string): ChoiceQuestion =>
  single({
    id,
    topic,
    stem,
    placeholder: true,
    options: ['[Answer option A]', '[Answer option B]', '[Answer option C]', '[Answer option D]'],
    correct: 'A'
  });

export const QUESTIONS: Question[] = [
  // ---- Single choice with full content ------------------------------------
  single({
    id: 'Q-0412',
    topic: 'constitutional',
    stem: 'Huqıqıy atamalar hám olardıń anıqlamaları ortasındaǵı durıs sáykeslikti anıqlań.',
    terms: TERMS,
    defs: DEFS,
    options: ['1-b; 2-d; 3-a; 4-c; 5-e', '1-d; 2-b; 3-g; 4-e; 5-f', '1-d; 2-b; 3-a; 4-e; 5-c', '1-b; 2-a; 3-d; 4-e; 5-c'],
    correct: 'C',
    explanation: [
      { k: '1-d', t: EXPLAIN.deputat },
      { k: '2-b', t: EXPLAIN.legitimlik },
      { k: '3-a', t: EXPLAIN.ministr },
      { k: '4-e', t: EXPLAIN.referendum },
      { k: '5-c', t: EXPLAIN.nizam }
    ],
    legal: LEX_ART_17
  }),
  single({
    id: 'Q-0051',
    topic: 'human-rights',
    stem: 'Insan huqıqları ulıwma deklaraciyası qashan qabıl etilgen?',
    options: ['1948-jıl 10-dekabr', '1966-jıl 16-dekabr', '1945-jıl 24-oktyabr', '1950-jıl 4-noyabr'],
    correct: 'A'
  }),
  single({
    id: 'Q-0402',
    topic: 'constitutional',
    stem: 'Prezident saylawı neshe jılda bir ret ótkeriledi?',
    options: ['5 jılda', '7 jılda', '4 jılda', '6 jılda'],
    correct: 'B'
  }),
  single({
    id: 'Q-0431',
    topic: 'labor',
    stem: 'Miynet shártnamasınıń sınaq múddeti neshe aydan aspawı kerek?',
    options: ['1 ay', '3 ay', '6 ay', '12 ay'],
    correct: 'B'
  }),
  single({
    id: 'Q-0388',
    topic: 'constitutional',
    stem: 'Referendum degen ne?',
    options: [DEF.legitimlik, DEF.referendum, DEF.deputat, DEF.nizam],
    correct: 'B',
    explanation: [{ k: '', t: EXPLAIN.referendum }]
  }),
  single({
    id: 'Q-0389',
    topic: 'constitutional',
    stem: 'Legitimlik degen ne?',
    options: [DEF.nizam, DEF.ministr, DEF.legitimlik, DEF.referendum],
    correct: 'C',
    explanation: [{ k: '', t: EXPLAIN.legitimlik }]
  }),
  single({
    id: 'Q-0390',
    topic: 'constitutional',
    stem: 'Deputat degen kim?',
    options: [DEF.deputat, DEF.ministr, DEF.legitimlik, DEF.referendum],
    correct: 'A',
    explanation: [{ k: '', t: EXPLAIN.deputat }]
  }),
  single({
    id: 'Q-0392',
    topic: 'administrative',
    stem: 'Ministr degen kim?',
    options: [DEF.deputat, DEF.nizam, DEF.referendum, DEF.ministr],
    correct: 'D',
    explanation: [{ k: '', t: EXPLAIN.ministr }]
  }),
  single({
    id: 'Q-0393',
    topic: 'theory',
    stem: 'Nızam ústinligi degen ne?',
    options: [DEF.referendum, DEF.nizam, DEF.legitimlik, DEF.ministr],
    correct: 'B',
    explanation: [{ k: '', t: EXPLAIN.nizam }]
  }),

  // ---- Single choice, stem from the design, options pending ----------------
  ph('Q-0413', 'constitutional', 'Qaraqalpaqstan Respublikası Joqarǵı Keńesiniń wákillikleri qaysı juwapta durıs kórsetilgen?'),
  ph('Q-0422', 'civil', 'Puqaralıq huqıqıy qatnasıqlardıń subyektleri kimler?'),
  ph('Q-0387', 'administrative', 'Administrativlik huqıqbuzarlıq ushın qollanılatuǵın jazalar túrlerin kórsetiń.'),
  ph('Q-0398', 'constitutional', 'Konstituciyanıń qabıl etiliw tártibi qaysı juwapta durıs?'),
  ph('Q-0432', 'family', 'Neke dúziw ushın qanday shártler talap etiledi?'),
  ph('Q-0433', 'theory', 'Tómendegi I hám II toparlardaǵı principlerdi sáykeslendiriń.'),
  ph('Q-0434', 'administrative', 'Administrativlik juwapkershilik qashan payda boladı?'),
  ph('Q-0377', 'administrative', 'Puqaralardıń múráját etiw huqıqı qaysı nızam menen tártiplestiriledi?'),
  ph('Q-0435', 'human-rights', 'Insan huqıqları boyınsha wákil (ombudsman) kim tárepinen saylanadı?'),
  ph('Q-0436', 'constitutional', 'Siyasiy partiyanı dúziw ushın neshe aǵza kerek?'),
  ph('Q-0437', 'constitutional', 'Tómendegi wákillikler hám organlar ortasındaǵı sáykeslikti anıqlań.'),

  // ---- Written ---------------------------------------------------------------
  written({
    id: 'Q-0414',
    topic: 'constitutional',
    stem: 'Málim bir siyasiy talaplardı bildiriw maqsetindegi ǵalabalıq shıǵıw ne dep ataladı?',
    accepted: ['Demonstraciya', 'Ǵalabalıq demonstraciya']
  }),
  written({ id: 'Q-0415', topic: 'constitutional', stem: `${DEF.legitimlik.replace(/\.$/, '')} qalay ataladı?`, accepted: ['Legitimlik'] }),
  written({ id: 'Q-0416', topic: 'constitutional', stem: `${DEF.deputat.replace(/\.$/, '')} qalay ataladı?`, accepted: ['Deputat'] }),
  written({ id: 'Q-0417', topic: 'constitutional', stem: `${DEF.referendum.replace(/\.$/, '')} qalay ataladı?`, accepted: ['Referendum'] }),
  written({ id: 'Q-0418', topic: 'theory', stem: `${DEF.nizam.replace(/\.$/, '')} qalay ataladı?`, accepted: ['Nızam ústinligi'] }),
  written({ id: 'Q-0419', topic: 'administrative', stem: `${DEF.ministr.replace(/\.$/, '')} qalay ataladı?`, accepted: ['Ministr'] }),
  written({ id: 'Q-0119', topic: 'family', stem: 'Neke jasın tómenletiw qanday jaǵdaylarda ruxsat etiledi?', accepted: [] }),
  written({ id: 'Q-0438', topic: 'administrative', stem: 'Lawazımlı shaxstıń wákillikten tıs háreketi qalay ataladı?', accepted: [] })
];

// Generic placeholders so mock exams reach the certificate format (35 + 10).
const FILL_TOPICS: TopicId[] = ['civil', 'criminal', 'administrative', 'criminal', 'human-rights', 'civil', 'labor', 'criminal'];
for (let i = 1; i <= 16; i++) {
  QUESTIONS.push(ph(`Q-09${String(i).padStart(2, '0')}`, FILL_TOPICS[i % FILL_TOPICS.length], '[Question text from the question bank]'));
}
QUESTIONS.push(
  written({ id: 'Q-0951', topic: 'criminal', stem: '[Written question text from the question bank]', accepted: [], placeholder: true }),
  written({ id: 'Q-0952', topic: 'civil', stem: '[Written question text from the question bank]', accepted: [], placeholder: true })
);

export const QUESTION_MAP: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
export const getQuestion = (id: string) => QUESTION_MAP[id];

const fill = (n: number) => `Q-09${String(n).padStart(2, '0')}`;

/** Mock exam layout: positions 1–35 single choice, 36–45 written. Q12 is the matching item. */
export const MOCK_7_IDS = [
  'Q-0051', 'Q-0402', 'Q-0388', 'Q-0413', 'Q-0389', 'Q-0422', 'Q-0390', 'Q-0431', 'Q-0387', 'Q-0392',
  'Q-0393', 'Q-0412', 'Q-0398', 'Q-0432', 'Q-0433', 'Q-0434', 'Q-0377', 'Q-0435', 'Q-0436', 'Q-0437',
  fill(1), fill(2), fill(3), fill(4), fill(5), fill(6), fill(7), fill(8), fill(9), fill(10),
  fill(11), fill(12), fill(13), fill(14), fill(15),
  'Q-0415', 'Q-0416', 'Q-0414', 'Q-0417', 'Q-0418', 'Q-0119', 'Q-0419', 'Q-0438', 'Q-0951', 'Q-0952'
];

export const MOCK_8_IDS = [
  'Q-0412', 'Q-0389', 'Q-0051', 'Q-0390', 'Q-0402', 'Q-0413', 'Q-0388', 'Q-0422', 'Q-0392', 'Q-0431',
  'Q-0393', 'Q-0387', 'Q-0398', 'Q-0432', 'Q-0433', 'Q-0434', 'Q-0377', 'Q-0435', 'Q-0436', 'Q-0437',
  fill(16), fill(15), fill(14), fill(13), fill(12), fill(11), fill(10), fill(9), fill(8), fill(7),
  fill(6), fill(5), fill(4), fill(3), fill(2),
  'Q-0414', 'Q-0418', 'Q-0415', 'Q-0119', 'Q-0416', 'Q-0417', 'Q-0438', 'Q-0419', 'Q-0952', 'Q-0951'
];
