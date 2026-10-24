import { z } from 'zod';
import { studentQuestionSchema } from './questions';

const id = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const option = z.object({ id, text:z.string().max(20000) });
const list = z.array(z.object({ k:z.string().max(100),t:z.string().max(20000) })).max(100);
export const questionDraftContentSchema = z.strictObject({
  kind:z.enum(['single','written']), topic:studentQuestionSchema.options[0].shape.topic,
  stem:z.string().max(20000), options:z.tuple([option,option,option,option]).refine(options=>new Set(options.map(o=>o.id)).size===4),
  correctOptionId:id.nullable(), accepted:z.array(z.string().trim().min(1).max(1000)).max(20),
  explanation:z.string().max(20000), terms:list.optional(),defs:list.optional(),
  legal:z.object({label:z.string().max(300),url:z.url({protocol:/^https$/})}).optional(),
});
export type QuestionDraftContent = z.infer<typeof questionDraftContentSchema>;
export const testDraftContentSchema = z.strictObject({
  name:z.string().max(200),mode:z.enum(['mock','practice']),durationSeconds:z.number().int().min(1).max(86400).nullable(),
  questionVersionIds:z.array(id).max(100).refine(ids=>new Set(ids).size===ids.length),isPublic:z.boolean(),
  questionDraftIds:z.array(z.uuid()).max(100).refine(ids=>new Set(ids).size===ids.length).optional(),
  opensAt:z.number().int().min(0).max(4102444800000).nullable().optional(),closesAt:z.number().int().min(0).max(4102444800000).nullable().optional(),
});
export type TestDraftContent = z.infer<typeof testDraftContentSchema>;
export const createQuestionSchema = z.strictObject({operationId:z.uuid(),content:questionDraftContentSchema});
export const updateQuestionSchema = z.strictObject({revision:z.number().int().min(0),content:questionDraftContentSchema});
export const createTestSchema = z.strictObject({operationId:z.uuid(),content:testDraftContentSchema});
export const updateTestSchema = z.strictObject({revision:z.number().int().min(0),content:testDraftContentSchema});
export const publishSchema = z.strictObject({revision:z.number().int().min(0)});
export const teachingPageSchema = z.object({limit:z.coerce.number().int().min(1).max(100).default(25),after:z.string().max(100).default('')});
const tashkentDate = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+05:00$/).refine(value=>{
  const time=Date.parse(value);
  return Number.isFinite(time) && new Date(time+5*3600000).toISOString().slice(0,16)===value.slice(0,16);
});
export const assignTestSchema = z.strictObject({
  operationId:z.uuid(),testVersionId:id,groupId:z.uuid(),timeZone:z.literal('Asia/Tashkent'),opensAt:tashkentDate,closesAt:tashkentDate,
}).refine(value=>Date.parse(value.closesAt)>Date.parse(value.opensAt));
export const reviewItemSchema = z.strictObject({
  revision:z.number().int().min(0),operationId:z.uuid(),questionId:id,units:z.number().int().min(0).max(2),comment:z.string().trim().max(2000),
});
export const reopenAssignmentSchema = z.strictObject({operationId:z.uuid(),timeZone:z.literal('Asia/Tashkent'),opensAt:tashkentDate,closesAt:tashkentDate})
  .refine(value=>Date.parse(value.closesAt)>Date.parse(value.opensAt));
export type ReviewItemRequest = z.infer<typeof reviewItemSchema>;
export interface TeachingDraft<T> { id:string; revision:number; content:T; publishedVersionId:string|null; publishedRevision:number|null }
export const questionBankSchema = z.object({
  page:z.coerce.number().int().min(1).max(50000).default(1),
  search:z.string().trim().max(200).default(''),
  kind:z.enum(['all','single','written']).default('all'),
  topic:z.union([z.literal('all'),studentQuestionSchema.options[0].shape.topic]).default('all'),
  status:z.enum(['all','draft','published']).default('all'),
});
export interface BankQuestion {
  id:string; stem:string; kind:QuestionDraftContent['kind']; topic:QuestionDraftContent['topic'];
  revision:number; published:number; sourceName:string|null; sourceNumber:number|null;
}
export interface QuestionBankPage { items:BankQuestion[]; total:number; page:number; pageSize:number }
export const bulkPublishQuestionsSchema=z.strictObject({
  items:z.array(z.strictObject({id:z.uuid(),revision:z.number().int().min(0)})).min(1).max(5)
    .refine(items=>new Set(items.map(item=>item.id)).size===items.length),
});
export interface BulkPublishResult { results:({id:string;versionId:string;status:'published'}|{id:string;status:'failed';code:'invalid'|'changed'|'unavailable'})[] }
