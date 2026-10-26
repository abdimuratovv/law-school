-- Retain historical retakes and results while preventing any new collection retake.
-- A unique index cannot be added safely when legacy duplicate attempts exist.
CREATE INDEX attempts_collection_user ON attempts(user_id,collection_id,started_at,id);
CREATE TRIGGER attempts_collection_single_insert BEFORE INSERT ON attempts
WHEN NEW.collection_id IS NOT NULL AND EXISTS (
 SELECT 1 FROM attempts WHERE user_id=NEW.user_id AND collection_id=NEW.collection_id
)
BEGIN SELECT RAISE(IGNORE); END;
