import { z } from 'zod';
import { MAX_TEST_QUESTIONS, MAX_WRITTEN_CHARACTERS } from './constants';
export { API_PREFIX, MAX_JSON_BYTES, MAX_TEST_QUESTIONS, MAX_WRITTEN_CHARACTERS } from './constants';

export const roleSchema = z.enum(['student', 'teacher', 'admin']);
export type Role = z.infer<typeof roleSchema>;

export const errorCodeSchema = z.enum([
  'INVALID_JSON', 'UNSUPPORTED_MEDIA_TYPE', 'VALIDATION_ERROR', 'PAYLOAD_TOO_LARGE',
  'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'METHOD_NOT_ALLOWED', 'CONFLICT',
  'RATE_LIMITED', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    issues: z.array(z.object({ path: z.string(), code: z.string() })).optional(),
  }),
  requestId: z.uuid(),
});
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

export const healthSchema = z.object({ status: z.literal('ok'), requestId: z.uuid() });

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().regex(/^[A-Za-z0-9_-]+$/).max(256).optional(),
});

const idSchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
const writtenAnswerSchema = z.string().refine(
  value => [...value].length <= MAX_WRITTEN_CHARACTERS,
  { message: 'Written answer is too long.' },
);

export const saveAnswersSchema = z.strictObject({
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  operationId: z.uuid(),
  answers: z.record(idSchema, writtenAnswerSchema).refine(
    value => Object.keys(value).length <= MAX_TEST_QUESTIONS,
    { message: 'Too many answers.' },
  ),
  flags: z.array(idSchema).max(MAX_TEST_QUESTIONS),
  currentQuestionId: idSchema.optional(),
});
export type SaveAnswersRequest = z.infer<typeof saveAnswersSchema>;
// Answers contains only replacements; deletion is explicit so empty text remains valid.
export const saveAnswerChangesSchema = saveAnswersSchema.extend({
  deletedAnswerIds: z.array(idSchema).max(MAX_TEST_QUESTIONS),
});
export type SaveAnswerChangesRequest = z.infer<typeof saveAnswerChangesSchema>;
