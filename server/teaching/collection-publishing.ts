import type { TestDraftContent } from '../../shared/contracts/teaching';
import { ApiError } from '../http/errors';
import { hash } from '../auth/crypto';
import { audit, changed, ownerScope } from './access';
import { publishTest, type DraftRow } from './content';

const invalid = () => new ApiError(422, 'VALIDATION_ERROR', 'Select separate questions for each language. Both languages must have the same question count.');
async function validateLanguage(db: D1Database, ids: string[], language: string, actor: string) {
  if (!ids.length) throw invalid();
  const count = await db.prepare(`SELECT count(*) n FROM question_publications p JOIN question_drafts q ON q.id=p.question_id
    WHERE p.version_id IN(SELECT value FROM json_each(?)) AND q.language=? AND ${ownerScope('q')}`)
    .bind(JSON.stringify(ids), language, actor).first<number>('n');
  if (count !== ids.length) throw invalid();
}

/** Publish one catalog entry only after both immutable language versions exist. */
export async function publishCollection(db: D1Database, row: DraftRow, actor: string, content: TestDraftContent) {
  const translated = content.translations?.kaa;
  await validateLanguage(db, content.questionVersionIds, 'uz', actor);
  if (translated) {
    if (translated.questionVersionIds.length !== content.questionVersionIds.length) throw invalid();
    await validateLanguage(db, translated.questionVersionIds, 'kaa', actor);
  }
  const known = await db.prepare(`SELECT c.id FROM test_collections c JOIN test_publications p ON p.version_id=c.id
    WHERE p.test_id=? AND p.draft_revision=?`).bind(row.id, row.revision).first<{ id: string }>();
  if (known) return known.id;
  const opens = content.opensAt ?? null, closes = content.closesAt ?? null;
  if ((opens === null) !== (closes === null) || (opens !== null && closes !== null && (closes <= opens || closes <= Date.now())))
    throw new ApiError(422, 'VALIDATION_ERROR', 'Choose a valid future deadline.');
  const version = await publishTest(db, row.id, actor, row.revision);
  const digest = await hash('collection-kaa:' + version);
  const kaa = `${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-8${digest.slice(17,20)}-${digest.slice(20,32)}`;
  const statements: D1PreparedStatement[] = [];
  if (translated) statements.push(db.prepare(`INSERT OR IGNORE INTO test_versions(id,name,mode,duration_seconds,question_ids,is_public,created_at)
    SELECT ?,?,?,?,?,0,? FROM test_drafts d WHERE d.id=? AND d.revision=? AND ${ownerScope('d')}`)
    .bind(kaa, content.name.trim(), content.mode, content.mode === 'mock' ? 86400 : null,
      JSON.stringify(translated.questionVersionIds), Date.now(), row.id, row.revision, actor));
  statements.push(
    db.prepare(`INSERT OR IGNORE INTO test_collections(id,test_id,test_version_id,owner_id,opens_at,closes_at,created_at)
      SELECT ?,d.id,?,d.owner_id,?,?,? FROM test_drafts d WHERE d.id=? AND d.revision=? AND ${ownerScope('d')}
      AND (? IS NULL OR EXISTS(SELECT 1 FROM test_versions WHERE id=?))`)
      .bind(version, version, opens, closes, Date.now(), row.id, row.revision, actor, translated ? kaa : null, kaa),
    audit(db, actor, 'collection.publish', version, { testId: row.id, revision: row.revision, languages: translated ? ['uz', 'kaa'] : ['uz'] }),
    db.prepare(`INSERT OR IGNORE INTO collection_languages SELECT id,'uz',test_version_id FROM test_collections WHERE id=?`).bind(version),
  );
  if (translated) statements.push(db.prepare(`INSERT OR IGNORE INTO collection_languages SELECT id,'kaa',? FROM test_collections WHERE id=?`).bind(kaa, version));
  statements.push(db.prepare(`UPDATE test_collections SET retired=1 WHERE test_id=? AND id<>?
    AND EXISTS(SELECT 1 FROM test_collections n WHERE n.id=? AND n.test_id=?)`)
    .bind(row.id, version, version, row.id));
  await db.batch(statements);
  if (!await db.prepare('SELECT id FROM test_collections WHERE id=?').bind(version).first()) throw changed();
  return version;
}
