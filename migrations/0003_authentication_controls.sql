ALTER TABLE users ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);

-- This table has no HTTP write endpoint. The operator command claims it once.
CREATE TABLE admin_bootstrap (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL CHECK (created_at >= 0)
) STRICT;
CREATE TRIGGER admin_bootstrap_validate BEFORE INSERT ON admin_bootstrap BEGIN
  SELECT CASE WHEN EXISTS (SELECT 1 FROM users WHERE role = 'admin')
    OR NOT EXISTS (
      SELECT 1 FROM users u JOIN identities i ON i.user_id = u.id
      WHERE u.id = NEW.user_id AND u.status = 'active' AND i.provider = 'google'
    ) THEN RAISE(ABORT, 'Bootstrap requires a registered Google user and no existing administrator') END;
END;
CREATE TRIGGER admin_bootstrap_apply AFTER INSERT ON admin_bootstrap BEGIN
  UPDATE users SET role = 'admin', revision = revision + 1,
    updated_at = max(updated_at, NEW.created_at) WHERE id = NEW.user_id;
  INSERT INTO audit_events (id, actor_id, action, target_id, metadata_json, created_at)
    VALUES ('admin-bootstrap', NEW.user_id, 'admin.bootstrap', NEW.user_id, '{}', NEW.created_at);
END;
