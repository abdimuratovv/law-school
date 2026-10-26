import { z } from 'zod';
import { studentQuestionSchema } from './questions';
import { saveAnswersSchema } from './api';
import { testLanguageSchema } from './languages';

export const privateQuestionSchema = z.object({
  question: studentQuestionSchema,
  correctOptionId: z.string().max(100).optional(),
  accepted: z.array(z.string().max(1000)).max(20).default([]),
  explanation: z.string().max(20000).default(''),
}).superRefine((value, ctx) => {
  if (value.question.kind === 'single' && !value.question.options.some(o => o.id === value.correctOptionId))
    ctx.addIssue({ code: 'custom', message: 'The correct option must exist.' });
});
export type PrivateQuestion = z.infer<typeof privateQuestionSchema>;
export const startSchema = z.strictObject({ operationId: z.uuid(), language: testLanguageSchema.optional() });
export const checkSchema = saveAnswersSchema.extend({ questionId: z.string().min(1).max(100) });
export const gradeSchema = z.object({
  verdict: z.enum(['correct', 'incorrect', 'pending', 'unanswered', 'partial']),
  units: z.number().int().min(0).max(2).nullable(),
});
export type Grade = z.infer<typeof gradeSchema>;
export const feedbackSchema = gradeSchema.extend({ correctOptionId: z.string().optional(), accepted: z.array(z.string()), explanation: z.string(), reviewComment:z.string().optional() });
export const snapshotSchema = z.object({ answers: z.record(z.string(), z.string()), flags: z.array(z.string()), currentQuestionId: z.string().optional() });
export type Snapshot = z.infer<typeof snapshotSchema>;
export const examSummarySchema = z.object({ id: z.string(), name: z.string(), mode: z.enum(['practice', 'mock']), questionCount: z.number(), durationSeconds: z.number().nullable(),opensAt:z.number().nullable().default(null), closesAt: z.number().nullable(),serverNow:z.number().optional(), startEnabled:z.boolean().default(true), languages:z.array(testLanguageSchema).default(['uz']), attemptLanguage:testLanguageSchema.nullable().optional(),
  attempt:z.object({id:z.uuid(),state:z.enum(['active','submitted','final']),language:testLanguageSchema}).nullable().optional(),
});
export type ExamSummary = z.infer<typeof examSummarySchema>;
export const attemptSchema = z.object({
  id: z.uuid(), examId: z.string(), name: z.string(), mode: z.enum(['practice', 'mock']),
  language: testLanguageSchema.default('uz'),
  state: z.enum(['active', 'submitted', 'final']), revision: z.number(), startedAt: z.number(), endsAt: z.number().nullable(), savedAt: z.number(), serverNow: z.number(),
  snapshot: snapshotSchema, questions: z.array(studentQuestionSchema).max(100), checked: z.array(z.string()),
  feedback: z.record(z.string(), feedbackSchema),
  answerCounts:z.object({correct:z.number(),incorrect:z.number(),partial:z.number(),pending:z.number(),unanswered:z.number()}).optional(),
  result: z.object({ units: z.number(), maxUnits: z.number(), pending: z.number(), final: z.boolean(), algorithm: z.string() }).nullable(),
});
export type ServerAttempt = z.infer<typeof attemptSchema>;
export const saveAcknowledgementSchema = attemptSchema.pick({
  id: true, state: true, revision: true, savedAt: true, serverNow: true,
});
export type SaveAcknowledgement = z.infer<typeof saveAcknowledgementSchema>;
