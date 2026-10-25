import { z } from 'zod';
export const testLanguageSchema = z.enum(['uz', 'kaa']);
export type TestLanguage = z.infer<typeof testLanguageSchema>;
export const testLanguageLabel = (language: TestLanguage) => language === 'kaa' ? 'Qaraqalpaqsha' : 'O‘zbekcha';
