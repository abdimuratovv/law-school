import { privateQuestionSchema, type PrivateQuestion } from '../../shared/contracts/exams';
import type { QuestionDraftContent, TestDraftContent } from '../../shared/contracts/teaching';
import { ApiError } from '../http/errors';
import { validate } from '../http/validation';
import { audit, changed, ownerScope, unavailable } from './access';

export type DraftTable = 'question'|'test';
export interface DraftRow { id:string;owner_id:string;revision:number;content:string }
export async function draftRow(db:D1Database,kind:DraftTable,id:string,actor:string) {
  const row=await db.prepare(`SELECT d.* FROM ${kind}_drafts d WHERE d.id=? AND ${ownerScope('d')}`).bind(id,actor).first<DraftRow>();
  if(!row) throw unavailable(); return row;
}
export async function draftView(db:D1Database,kind:DraftTable,row:DraftRow) {
  const published=await db.prepare(`SELECT version_id,draft_revision FROM ${kind}_publications WHERE ${kind}_id=? ORDER BY draft_revision DESC LIMIT 1`).bind(row.id).first<{version_id:string;draft_revision:number}>();
  return {id:row.id,revision:row.revision,content:JSON.parse(row.content) as QuestionDraftContent|TestDraftContent,publishedVersionId:published?.version_id??null,publishedRevision:published?.draft_revision??null};
}
export function publishedQuestion(content:QuestionDraftContent,version:string):PrivateQuestion {
  if(!content.stem.trim()) throw new ApiError(422,'VALIDATION_ERROR','Enter the question text.');
  return validate(privateQuestionSchema,{
    question:{id:version,kind:content.kind,topic:content.topic,stem:content.stem.trim(),...(content.legal?{legal:content.legal}:{}),
      ...(content.kind==='single'?{options:content.options,terms:content.terms,defs:content.defs}:{})},
    correctOptionId:content.kind==='single'?content.correctOptionId:undefined,accepted:content.kind==='written'?content.accepted:[],explanation:content.explanation,
  });
}
export async function publishQuestion(db:D1Database,id:string,actor:string,revision:number) {
  const row=await draftRow(db,'question',id,actor);
  const known=await db.prepare('SELECT version_id FROM question_publications WHERE question_id=? AND draft_revision=?').bind(id,revision).first<{version_id:string}>();
  if(known) return known.version_id;
  if(row.revision!==revision) throw changed();
  const version=crypto.randomUUID(); const payload=publishedQuestion(JSON.parse(row.content) as QuestionDraftContent,version);
  await db.batch([
    db.prepare(`INSERT INTO question_versions(id,payload,created_at) SELECT ?,?,? FROM question_drafts d WHERE d.id=? AND d.revision=? AND ${ownerScope('d')}
      AND NOT EXISTS(SELECT 1 FROM question_publications WHERE question_id=d.id AND draft_revision=d.revision)`)
      .bind(version,JSON.stringify(payload),Date.now(),id,revision,actor),
    db.prepare(`INSERT INTO question_publications SELECT ?,?,?,? WHERE changes()>0`).bind(id,revision,version,Date.now()),
    audit(db,actor,'question.publish',id,{versionId:version,revision}),
  ]);
  const result=await db.prepare('SELECT version_id FROM question_publications WHERE question_id=? AND draft_revision=?').bind(id,revision).first<{version_id:string}>();
  if(!result) throw changed(); return result.version_id;
}
export async function publishTest(db:D1Database,id:string,actor:string,revision:number) {
  const row=await draftRow(db,'test',id,actor);
  const known=await db.prepare('SELECT version_id FROM test_publications WHERE test_id=? AND draft_revision=?').bind(id,revision).first<{version_id:string}>();
  if(known) return known.version_id;
  if(row.revision!==revision) throw changed();
  const content=JSON.parse(row.content) as TestDraftContent;
  if(!content.name.trim() || !content.questionVersionIds.length || (content.mode==='mock' && !content.durationSeconds) || (content.isPublic && content.mode!=='practice'))
    throw new ApiError(422,'VALIDATION_ERROR','Set a name, published questions and valid test mode/duration.');
  const accessible=`NOT EXISTS(SELECT 1 FROM json_each(?) ids WHERE NOT EXISTS(SELECT 1 FROM question_publications p JOIN question_drafts q ON q.id=p.question_id WHERE p.version_id=ids.value AND ${ownerScope('q')}))`;
  const allowed=await db.prepare(`SELECT 1 WHERE ${accessible}`).bind(JSON.stringify(content.questionVersionIds),actor).first();
  if(!allowed) throw unavailable();
  const version=crypto.randomUUID();
  await db.batch([
    db.prepare(`INSERT INTO test_versions(id,name,mode,duration_seconds,question_ids,is_public,created_at)
      SELECT ?,?,?,?,?,?,? FROM test_drafts d WHERE d.id=? AND d.revision=? AND ${ownerScope('d')} AND ${accessible}
      AND NOT EXISTS(SELECT 1 FROM test_publications WHERE test_id=d.id AND draft_revision=d.revision)`)
      .bind(version,content.name.trim(),content.mode,content.durationSeconds,JSON.stringify(content.questionVersionIds),Number(content.isPublic),Date.now(),id,revision,actor,JSON.stringify(content.questionVersionIds),actor),
    db.prepare('INSERT INTO test_publications(test_id,draft_revision,version_id,created_at) SELECT ?,?,?,? WHERE changes()>0').bind(id,revision,version,Date.now()),
    audit(db,actor,'test.publish',id,{versionId:version,revision}),
    db.prepare(`UPDATE test_publications SET archived=1 WHERE test_id=? AND version_id<>? AND archived=0 AND EXISTS(SELECT 1 FROM test_publications WHERE test_id=? AND version_id=?)`).bind(id,version,id,version),
  ]);
  const result=await db.prepare('SELECT version_id FROM test_publications WHERE test_id=? AND draft_revision=?').bind(id,revision).first<{version_id:string}>();
  if(!result) throw changed(); return result.version_id;
}
