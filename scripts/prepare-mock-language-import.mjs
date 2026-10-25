// Prepare a reviewable, idempotent D1 import file. This script never contacts D1.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const [csv, collection, baseVersion, owner, output] = process.argv.slice(2);
if (!output || ![collection, baseVersion, owner].every(v => /^[0-9a-f-]{36}$/i.test(v)))
  throw new Error('Usage: node scripts/prepare-mock-language-import.mjs CSV COLLECTION BASE_VERSION OWNER OUTPUT_SQL');
await build({ entryPoints: ['src/lib/importParser.ts', 'server/teaching/content.ts'], bundle: true,
  platform: 'node', format: 'esm', outdir: '.worker-build/karakalpak-import/validated', logLevel: 'silent' });
const { parseImport } = await import('../.worker-build/karakalpak-import/validated/src/lib/importParser.js');
const { publishedQuestion } = await import('../.worker-build/karakalpak-import/validated/server/teaching/content.js');
const bytes = readFileSync(csv), filename = csv.split(/[\\/]/).at(-1);
const parsed = await parseImport(new Uint8Array(bytes), filename);
if (parsed.errors.length || parsed.warnings.length || parsed.rows.length !== 45) throw new Error(JSON.stringify(parsed.errors.concat(parsed.warnings)));
const hash = value => createHash('sha256').update(value).digest('hex');
const uuid = value => { const h = hash(`${collection}:${parsed.fileHash}:${value}`);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`; };
const q = value => value == null ? 'NULL' : typeof value === 'number' ? String(value) : "'" + String(value).replaceAll("'", "''") + "'";
const now = Date.now(), job = uuid('job'), draft = uuid('test-draft'), version = uuid('test-version');
const statements = [], ids = parsed.rows.map((_, i) => ({ draft: uuid(`draft-${i}`), version: uuid(`version-${i}`) }));
const totalBytes = parsed.rows.reduce((sum, row) => sum + Buffer.byteLength(JSON.stringify(row.content)), 0);
const guard = `SELECT 1 FROM test_collections c JOIN users u ON u.id=c.owner_id JOIN test_versions t ON t.id=c.test_version_id WHERE c.id=${q(collection)} AND c.owner_id=${q(owner)} AND c.test_version_id=${q(baseVersion)} AND c.retired=0 AND u.status='active' AND u.role IN ('teacher','admin') AND json_array_length(t.question_ids)=45 AND t.mode='mock'`;
statements.push(`INSERT OR IGNORE INTO import_jobs(id,owner_id,filename,file_hash,source_bytes,total_rows,duplicate_policy,status,uploaded_rows,payload_bytes,cursor,created_count,skipped_count,created_at,updated_at) SELECT ${[job,owner,filename,parsed.fileHash,bytes.length,45,'keep','uploading',0,0,1,0,0,now,now].map(q)} WHERE EXISTS(${guard});`);
for (let i = 0; i < parsed.rows.length; i++) {
  const row = parsed.rows[i], id = ids[i], content = JSON.stringify(row.content);
  const payload = JSON.stringify(publishedQuestion(row.content, id.version));
  statements.push(`INSERT OR IGNORE INTO question_drafts(id,owner_id,revision,content,created_at,updated_at) SELECT ${[id.draft,owner,0,content,now,now].map(q)} WHERE EXISTS(SELECT 1 FROM import_jobs WHERE id=${q(job)});`);
  statements.push(`INSERT OR IGNORE INTO question_versions(id,payload,created_at) SELECT ${[id.version,payload,now].map(q)} WHERE EXISTS(SELECT 1 FROM question_drafts WHERE id=${q(id.draft)} AND owner_id=${q(owner)});`);
  statements.push(`INSERT OR IGNORE INTO question_publications(question_id,draft_revision,version_id,created_at) SELECT ${[id.draft,0,id.version,now].map(q)} WHERE EXISTS(SELECT 1 FROM question_versions WHERE id=${q(id.version)});`);
  statements.push(`INSERT OR IGNORE INTO import_rows(job_id,row_number,content,content_hash,content_bytes,draft_id) SELECT ${[job,i+2,content,hash(content),Buffer.byteLength(content),id.draft].map(q)} WHERE EXISTS(SELECT 1 FROM question_drafts WHERE id=${q(id.draft)});`);
}
const name = 'Huqıqtanıw mock test 1 · Qaraqalpaqsha';
statements.push(`UPDATE import_jobs SET status='complete',uploaded_rows=45,payload_bytes=${totalBytes},cursor=46,created_count=45,updated_at=${now} WHERE id=${q(job)} AND (SELECT count(*) FROM import_rows WHERE job_id=${q(job)})=45 AND (SELECT count(*) FROM import_rows r JOIN question_publications p ON p.question_id=r.draft_id WHERE r.job_id=${q(job)} AND p.draft_revision=0)=45;`);
const content = JSON.stringify({ name, mode: 'mock', durationSeconds: null, questionVersionIds: ids.map(id => id.version), questionDraftIds: ids.map(id => id.draft), isPublic: false });
statements.push(`INSERT OR IGNORE INTO test_drafts(id,owner_id,revision,content,created_at,updated_at) SELECT ${[draft,owner,0,content,now,now].map(q)} WHERE EXISTS(SELECT 1 FROM import_jobs WHERE id=${q(job)} AND status='complete');`);
statements.push(`INSERT OR IGNORE INTO test_versions(id,name,mode,duration_seconds,question_ids,is_public,created_at) SELECT ${[version,name,'mock',86400,JSON.stringify(ids.map(id => id.version)),0,now].map(q)} WHERE EXISTS(SELECT 1 FROM test_drafts WHERE id=${q(draft)});`);
statements.push(`INSERT OR IGNORE INTO test_publications(test_id,draft_revision,version_id,created_at) SELECT ${[draft,0,version,now].map(q)} WHERE EXISTS(SELECT 1 FROM test_versions WHERE id=${q(version)});`);
// Mapping is last. Never overwrite another translation or reopen the window.
statements.push(`INSERT OR IGNORE INTO collection_languages(collection_id,language,test_version_id) SELECT ${[collection,'kaa',version].map(q)} WHERE EXISTS(${guard}) AND EXISTS(SELECT 1 FROM test_publications WHERE version_id=${q(version)});`);
statements.push(`INSERT OR IGNORE INTO audit_events(id,actor_id,action,target_id,metadata_json,created_at) SELECT ${[uuid('audit'),null,'collection.language.import',collection,JSON.stringify({ operator: 'owner-authorized-import', language: 'kaa', testVersionId: version, fileHash: parsed.fileHash, questions: 45 }),now].map(q)} WHERE EXISTS(SELECT 1 FROM collection_languages WHERE collection_id=${q(collection)} AND language='kaa' AND test_version_id=${q(version)});`);
writeFileSync(output, statements.join('\n') + '\n');
const manifest = { collection, baseVersion, owner, job, draft, version, questions: 45, fileHash: parsed.fileHash, output };
writeFileSync(output + '.manifest.json', JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest));
