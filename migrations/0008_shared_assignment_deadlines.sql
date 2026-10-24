-- Active scheduled attempts adopt the same closing instant as new attempts.
-- Preserve completed attempts and every previously saved answer.
UPDATE attempts SET ends_at=(SELECT closes_at FROM assignments WHERE id=attempts.assignment_id)
WHERE assignment_id IS NOT NULL AND state='active';
