import { z } from 'zod';
import { roleSchema } from './api';

const personalName = z.string().trim().min(1).max(100).refine(value => !/[\u0000-\u001f\u007f]/.test(value));
export const personalProfileSchema = z.strictObject({
  firstName: personalName, lastName: personalName, patronymic: personalName,
  birthDate: z.iso.date().refine(value => value >= '1900-01-01' && value <= new Date().toISOString().slice(0, 10)),
});
export type PersonalProfile = z.infer<typeof personalProfileSchema>;
export const updateProfileSchema = personalProfileSchema.extend({ revision: z.number().int().nonnegative() });

export const authenticatedUserSchema = z.object({
  id: z.uuid(), name: z.string().max(100), email: z.email(), role: roleSchema,
  revision: z.number().int().nonnegative(),
  profile: personalProfileSchema.nullable().default(null),
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
