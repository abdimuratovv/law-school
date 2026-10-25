ALTER TABLE question_drafts ADD COLUMN language TEXT NOT NULL DEFAULT 'uz' CHECK(language IN ('uz','kaa'));
ALTER TABLE import_jobs ADD COLUMN language TEXT NOT NULL DEFAULT 'uz' CHECK(language IN ('uz','kaa'));
-- Use explicit existing variant associations, never guess language from text.
UPDATE question_drafts SET language='kaa' WHERE id IN (
 SELECT p.question_id FROM collection_languages l JOIN test_versions t ON t.id=l.test_version_id
 JOIN json_each(t.question_ids) j JOIN question_publications p ON p.version_id=j.value WHERE l.language='kaa'
);
UPDATE import_jobs SET language='kaa' WHERE EXISTS(
 SELECT 1 FROM import_rows r JOIN question_drafts q ON q.id=r.draft_id WHERE r.job_id=import_jobs.id AND q.language='kaa'
) AND NOT EXISTS(
 SELECT 1 FROM import_rows r JOIN question_drafts q ON q.id=r.draft_id WHERE r.job_id=import_jobs.id AND q.language<>'kaa'
);
