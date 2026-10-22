CREATE TABLE question_versions (
  id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)), created_at INTEGER NOT NULL
) STRICT;
CREATE TRIGGER question_versions_immutable BEFORE UPDATE ON question_versions BEGIN SELECT RAISE(ABORT, 'immutable question version'); END;
CREATE TABLE test_versions (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('practice','mock')),
  duration_seconds INTEGER CHECK(duration_seconds BETWEEN 1 AND 86400),
  question_ids TEXT NOT NULL CHECK(json_valid(question_ids) AND json_array_length(question_ids) BETWEEN 1 AND 100),
  is_public INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0,1)), created_at INTEGER NOT NULL,
  CHECK(is_public = 0 OR mode = 'practice'), CHECK(mode = 'practice' OR duration_seconds IS NOT NULL)
) STRICT;
CREATE TRIGGER test_versions_immutable BEFORE UPDATE ON test_versions BEGIN SELECT RAISE(ABORT, 'immutable test version'); END;
CREATE TRIGGER test_versions_questions BEFORE INSERT ON test_versions BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.question_ids) WHERE type <> 'text')
    OR (SELECT count(DISTINCT value) FROM json_each(NEW.question_ids)) <> json_array_length(NEW.question_ids)
    OR EXISTS(SELECT 1 FROM json_each(NEW.question_ids) q LEFT JOIN question_versions v ON v.id = q.value WHERE v.id IS NULL)
    THEN RAISE(ABORT, 'invalid question references') END;
END;
CREATE TABLE assignments (
  id TEXT PRIMARY KEY, test_version_id TEXT NOT NULL REFERENCES test_versions(id), group_id TEXT NOT NULL REFERENCES groups(id),
  opens_at INTEGER NOT NULL, closes_at INTEGER NOT NULL CHECK(closes_at > opens_at)
) STRICT;
CREATE INDEX assignments_group ON assignments(group_id, closes_at);
CREATE INDEX assignments_test ON assignments(test_version_id);
CREATE TABLE attempts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), exam_id TEXT NOT NULL,
  test_version_id TEXT NOT NULL REFERENCES test_versions(id), assignment_id TEXT REFERENCES assignments(id),
  start_operation TEXT NOT NULL, started_at INTEGER NOT NULL, ends_at INTEGER,
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','submitted','final')),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  snapshot TEXT NOT NULL DEFAULT '{"answers":{},"flags":[]}' CHECK(json_valid(snapshot)),
  question_order TEXT NOT NULL CHECK(json_valid(question_order)),
  checked TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(checked)),
  receipts TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(receipts) AND json_array_length(receipts) <= 16),
  saved_at INTEGER NOT NULL, submitted_at INTEGER, result TEXT CHECK(result IS NULL OR json_valid(result)),
  UNIQUE(user_id, start_operation), UNIQUE(user_id, assignment_id)
) STRICT;
CREATE UNIQUE INDEX attempts_active_practice ON attempts(user_id, test_version_id) WHERE assignment_id IS NULL AND state = 'active';
CREATE INDEX attempts_owner ON attempts(user_id, started_at DESC, id);
CREATE INDEX attempts_due ON attempts(state, ends_at);
CREATE INDEX attempts_test ON attempts(test_version_id);
CREATE INDEX attempts_assignment ON attempts(assignment_id);
CREATE TABLE attempt_starts (
  user_id TEXT NOT NULL REFERENCES users(id), operation_id TEXT NOT NULL, attempt_id TEXT NOT NULL REFERENCES attempts(id),
  PRIMARY KEY(user_id, operation_id)
) STRICT;
CREATE INDEX attempt_starts_attempt ON attempt_starts(attempt_id);
CREATE TRIGGER assignments_immutable BEFORE UPDATE ON assignments BEGIN SELECT RAISE(ABORT, 'immutable assignment'); END;
