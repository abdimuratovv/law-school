CREATE TABLE test_collections (
 id TEXT PRIMARY KEY,
 test_id TEXT NOT NULL REFERENCES test_drafts(id),
 test_version_id TEXT NOT NULL REFERENCES test_versions(id),
 owner_id TEXT NOT NULL REFERENCES users(id),
 opens_at INTEGER,closes_at INTEGER,
 retired INTEGER NOT NULL DEFAULT 0 CHECK(retired IN(0,1)),
 reopened_from TEXT REFERENCES test_collections(id),created_at INTEGER NOT NULL,
 CHECK((opens_at IS NULL AND closes_at IS NULL) OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND closes_at>opens_at))
) STRICT;
CREATE INDEX collections_test ON test_collections(test_id,retired);
CREATE INDEX collections_owner ON test_collections(owner_id,created_at DESC);
CREATE INDEX collections_version ON test_collections(test_version_id);
ALTER TABLE attempts ADD COLUMN collection_id TEXT REFERENCES test_collections(id);
DROP INDEX attempts_active_practice;
CREATE UNIQUE INDEX attempts_active_practice ON attempts(user_id,test_version_id) WHERE assignment_id IS NULL AND collection_id IS NULL AND state='active';
CREATE UNIQUE INDEX attempts_collection_active ON attempts(user_id,collection_id) WHERE collection_id IS NOT NULL AND state='active';
CREATE UNIQUE INDEX attempts_collection_window ON attempts(user_id,collection_id) WHERE collection_id IS NOT NULL AND ends_at IS NOT NULL;
CREATE INDEX attempts_collection ON attempts(collection_id,started_at DESC,id);
CREATE INDEX attempts_chronology ON attempts(started_at DESC,id);
CREATE INDEX users_registered ON users(created_at DESC,id);
-- Make every previously published latest test available without group enrollment.
-- Preserve its latest group schedule, if one existed, and leave all old attempts intact.
INSERT INTO test_collections(id,test_id,test_version_id,owner_id,opens_at,closes_at,created_at)
 SELECT p.version_id,p.test_id,p.version_id,d.owner_id,
  (SELECT a.opens_at FROM assignments a WHERE a.test_version_id=p.version_id ORDER BY a.closes_at DESC,a.id LIMIT 1),
  (SELECT a.closes_at FROM assignments a WHERE a.test_version_id=p.version_id ORDER BY a.closes_at DESC,a.id LIMIT 1),p.created_at
 FROM test_publications p JOIN test_drafts d ON d.id=p.test_id WHERE p.archived=0
 AND p.draft_revision=(SELECT max(v.draft_revision) FROM test_publications v WHERE v.test_id=p.test_id);
-- Adopt the selected legacy window (and untimed public practice) without changing
-- attempt IDs, saved answers, grades, or published question versions.
UPDATE attempts SET collection_id=(SELECT c.id FROM test_collections c WHERE c.test_version_id=attempts.test_version_id
 AND ((c.opens_at IS NULL AND attempts.assignment_id IS NULL AND attempts.ends_at IS NULL)
 OR attempts.assignment_id=(SELECT a.id FROM assignments a WHERE a.test_version_id=c.test_version_id ORDER BY a.closes_at DESC,a.id LIMIT 1)))
 WHERE EXISTS(SELECT 1 FROM test_collections c WHERE c.test_version_id=attempts.test_version_id
 AND ((c.opens_at IS NULL AND attempts.assignment_id IS NULL AND attempts.ends_at IS NULL)
 OR attempts.assignment_id=(SELECT a.id FROM assignments a WHERE a.test_version_id=c.test_version_id ORDER BY a.closes_at DESC,a.id LIMIT 1)));
UPDATE attempts SET exam_id='c_'||collection_id WHERE collection_id IS NOT NULL;
