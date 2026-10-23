CREATE TABLE import_jobs (
 id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),filename TEXT NOT NULL,file_hash TEXT NOT NULL,
 source_bytes INTEGER NOT NULL CHECK(source_bytes BETWEEN 1 AND 5242880),total_rows INTEGER NOT NULL CHECK(total_rows BETWEEN 1 AND 1000),
 duplicate_policy TEXT NOT NULL CHECK(duplicate_policy IN('skip','keep')),status TEXT NOT NULL DEFAULT 'uploading' CHECK(status IN('uploading','ready','committing','complete')),
 uploaded_rows INTEGER NOT NULL DEFAULT 0,payload_bytes INTEGER NOT NULL DEFAULT 0 CHECK(payload_bytes<=5242880),cursor INTEGER NOT NULL DEFAULT 1,
 created_count INTEGER NOT NULL DEFAULT 0,skipped_count INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
 UNIQUE(owner_id,file_hash,duplicate_policy)
) STRICT;
CREATE INDEX import_jobs_owner ON import_jobs(owner_id,id);
CREATE TABLE import_rows (
 job_id TEXT NOT NULL REFERENCES import_jobs(id),row_number INTEGER NOT NULL CHECK(row_number BETWEEN 2 AND 1001),
 content TEXT NOT NULL CHECK(json_valid(content)),content_hash TEXT NOT NULL,content_bytes INTEGER NOT NULL,draft_id TEXT NOT NULL UNIQUE,
 PRIMARY KEY(job_id,row_number)
) STRICT;
CREATE INDEX import_rows_duplicates ON import_rows(job_id,content_hash,row_number);
CREATE TABLE saved_questions (
 user_id TEXT NOT NULL REFERENCES users(id),question_version_id TEXT NOT NULL REFERENCES question_versions(id),source_attempt_id TEXT NOT NULL REFERENCES attempts(id),saved_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,question_version_id)
) STRICT;
CREATE INDEX saved_questions_source ON saved_questions(source_attempt_id);
CREATE TABLE attempt_reports (
 attempt_id TEXT PRIMARY KEY REFERENCES attempts(id),user_id TEXT NOT NULL REFERENCES users(id),assignment_id TEXT REFERENCES assignments(id),
 submitted_at INTEGER NOT NULL,grade_revision INTEGER NOT NULL,units INTEGER NOT NULL,max_units INTEGER NOT NULL,pending INTEGER NOT NULL,
 outcomes TEXT NOT NULL CHECK(json_valid(outcomes)),algorithm TEXT NOT NULL
) STRICT;
CREATE INDEX attempt_reports_owner ON attempt_reports(user_id,submitted_at DESC,attempt_id);
CREATE INDEX attempt_reports_assignment ON attempt_reports(assignment_id,submitted_at DESC,attempt_id);
CREATE TABLE report_backfill (singleton INTEGER PRIMARY KEY CHECK(singleton=1),cursor TEXT NOT NULL DEFAULT '',done INTEGER NOT NULL DEFAULT 0 CHECK(done IN(0,1))) STRICT;
INSERT INTO report_backfill(singleton) VALUES(1);
