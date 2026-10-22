import { z } from 'zod';

const itemId = z.string().min(1).max(100);
const listItem = z.object({ k: z.string().max(100), t: z.string().max(20000) });
const common = {
  id: itemId,
  topic: z.enum([
    'constitutional', 'civil', 'criminal', 'administrative',
    'human-rights', 'labor', 'family', 'theory',
  ]),
  stem: z.string().min(1).max(20000),
  legal: z.object({ label: z.string().max(300), url: z.url({ protocol: /^https$/ }) }).optional(),
};

const choice = z.object({ id: itemId, text: z.string().min(1).max(20000) });

// Zod objects deliberately strip unknown fields, including keys and accepted answers.
// Private grading data must never be added to this browser-safe response contract.
export const studentQuestionSchema = z.discriminatedUnion('kind', [
  z.object({
    ...common,
    kind: z.literal('single'),
    terms: z.array(listItem).max(100).optional(),
    defs: z.array(listItem).max(100).optional(),
    options: z.tuple([choice, choice, choice, choice]).refine(
      options => new Set(options.map(option => option.id)).size === 4,
      { message: 'Option IDs must be unique.' },
    ),
  }),
  z.object({ ...common, kind: z.literal('written') }),
]);
export type StudentQuestion = z.infer<typeof studentQuestionSchema>;
