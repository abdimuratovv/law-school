CREATE TABLE question_drafts (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
  content TEXT NOT NULL CHECK(json_valid(content)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
) STRICT;
CREATE INDEX question_drafts_owner ON question_drafts(owner_id,id);
CREATE TABLE question_publications (
  question_id TEXT NOT NULL REFERENCES question_drafts(id), draft_revision INTEGER NOT NULL,
  version_id TEXT NOT NULL UNIQUE REFERENCES question_versions(id), created_at INTEGER NOT NULL,
  PRIMARY KEY(question_id,draft_revision)
) STRICT;
CREATE TABLE test_drafts (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
  content TEXT NOT NULL CHECK(json_valid(content)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
) STRICT;
CREATE INDEX test_drafts_owner ON test_drafts(owner_id,id);
CREATE TABLE test_publications (
  test_id TEXT NOT NULL REFERENCES test_drafts(id), draft_revision INTEGER NOT NULL,
  version_id TEXT NOT NULL UNIQUE REFERENCES test_versions(id), archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN(0,1)), created_at INTEGER NOT NULL,
  PRIMARY KEY(test_id,draft_revision)
) STRICT;
CREATE TABLE assignment_authors (
  assignment_id TEXT PRIMARY KEY REFERENCES assignments(id), actor_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX assignment_authors_actor ON assignment_authors(actor_id);
ALTER TABLE attempts ADD COLUMN grade_revision INTEGER NOT NULL DEFAULT 0 CHECK(grade_revision>=0);
ALTER TABLE attempts ADD COLUMN last_review_operation TEXT;
ALTER TABLE attempts ADD COLUMN last_review_digest TEXT;
CREATE TABLE attempt_item_reviews (
  attempt_id TEXT NOT NULL REFERENCES attempts(id), question_version_id TEXT NOT NULL REFERENCES question_versions(id),
  units INTEGER NOT NULL CHECK(units BETWEEN 0 AND 2), comment TEXT NOT NULL CHECK(length(comment)<=2000),
  reviewer_id TEXT NOT NULL REFERENCES users(id), revision INTEGER NOT NULL CHECK(revision>=1), updated_at INTEGER NOT NULL,
  PRIMARY KEY(attempt_id,question_version_id)
) STRICT;
CREATE INDEX attempt_item_reviews_question ON attempt_item_reviews(question_version_id);
CREATE INDEX attempt_item_reviews_reviewer ON attempt_item_reviews(reviewer_id);
CREATE INDEX attempts_review_queue ON attempts(state,assignment_id,id) WHERE state='final' AND json_extract(result,'$.pending')>0;
