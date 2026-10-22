import { z } from 'zod';
import { roleSchema } from './api';

export const authenticatedUserSchema = z.object({
  id: z.uuid(), name: z.string().max(100), email: z.email(), role: roleSchema,
  revision: z.number().int().nonnegative(),
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export const currentUserSchema = z.object({
  user: authenticatedUserSchema, csrfToken: z.string().regex(/^[a-f0-9]{64}$/),
});
export const groupSchema = z.object({ id: z.uuid(), name: z.string().min(1).max(100) });
export const createGroupSchema = z.strictObject({ name: z.string().trim().min(1).max(100) });
export const enrollmentSchema = z.strictObject({ studentId: z.uuid() });
export const staffAssignmentSchema = z.strictObject({ teacherId: z.uuid() });
export const accessChangeSchema = z.strictObject({
  role: roleSchema, status: z.enum(['active', 'suspended']),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
