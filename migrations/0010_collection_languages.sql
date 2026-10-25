CREATE TABLE collection_languages (
 collection_id TEXT NOT NULL REFERENCES test_collections(id) ON DELETE CASCADE,
 language TEXT NOT NULL CHECK(language IN ('uz','kaa')),
 test_version_id TEXT NOT NULL REFERENCES test_versions(id),
 PRIMARY KEY(collection_id,language)
) STRICT;
CREATE INDEX collection_languages_version ON collection_languages(test_version_id);
INSERT INTO collection_languages SELECT id,'uz',test_version_id FROM test_collections;
ALTER TABLE attempts ADD COLUMN language TEXT NOT NULL DEFAULT 'uz' CHECK(language IN ('uz','kaa'));
CREATE TRIGGER attempts_language_immutable BEFORE UPDATE OF language,test_version_id ON attempts
WHEN NEW.language<>OLD.language OR NEW.test_version_id<>OLD.test_version_id
BEGIN SELECT RAISE(ABORT,'Attempt language and question version are immutable'); END;
