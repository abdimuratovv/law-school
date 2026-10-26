-- Preserve existing availability; future publications and reopened windows require admin activation.
ALTER TABLE test_collections ADD COLUMN start_enabled INTEGER NOT NULL DEFAULT 0 CHECK(start_enabled IN(0,1));
ALTER TABLE test_collections ADD COLUMN availability_revision INTEGER NOT NULL DEFAULT 0;
UPDATE test_collections SET start_enabled=1 WHERE retired=0;
