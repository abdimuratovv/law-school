-- Authentication and group access only. Exam records arrive in stage 3.
-- Timestamps are UTC epoch milliseconds, supplied by trusted server code.
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) BETWEEN 1 AND 100),
  display_name TEXT NOT NULL CHECK (length(display_name) <= 100),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 320),
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at)
) STRICT;

CREATE TABLE identities (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'google'),
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  UNIQUE (provider, subject)
) STRICT;
CREATE INDEX identities_user ON identities(user_id);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY NOT NULL
    CHECK (length(token_hash) = 64 AND token_hash NOT GLOB '*[^0-9a-f]*'),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_hash TEXT NOT NULL
    CHECK (length(csrf_hash) = 64 AND csrf_hash NOT GLOB '*[^0-9a-f]*'),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at AND expires_at <= created_at + 604800000)
) STRICT;
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);

CREATE TABLE login_flows (
  state_hash TEXT PRIMARY KEY NOT NULL
    CHECK (length(state_hash) = 64 AND state_hash NOT GLOB '*[^0-9a-f]*'),
  binding_hash TEXT NOT NULL
    CHECK (length(binding_hash) = 64 AND binding_hash NOT GLOB '*[^0-9a-f]*'),
  nonce TEXT NOT NULL CHECK (length(nonce) BETWEEN 32 AND 128),
  code_verifier TEXT NOT NULL CHECK (length(code_verifier) BETWEEN 43 AND 128),
  return_path TEXT NOT NULL DEFAULT '/' CHECK (length(return_path) BETWEEN 1 AND 2048),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at AND expires_at <= created_at + 600000)
) STRICT;
CREATE INDEX login_flows_expiry ON login_flows(expires_at);

CREATE TABLE groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL CHECK (created_at >= 0)
) STRICT;

CREATE TABLE group_teachers (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  PRIMARY KEY (group_id, teacher_id)
) STRICT;
CREATE INDEX group_teachers_user ON group_teachers(teacher_id, group_id);

CREATE TABLE group_memberships (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id),
  enrolled_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  PRIMARY KEY (group_id, student_id)
) STRICT;
CREATE INDEX group_memberships_user ON group_memberships(student_id, group_id);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 100),
  target_id TEXT CHECK (target_id IS NULL OR length(target_id) <= 100),
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  created_at INTEGER NOT NULL CHECK (created_at >= 0)
) STRICT;
CREATE INDEX audit_events_actor_created ON audit_events(actor_id, created_at);
CREATE INDEX audit_events_target_created ON audit_events(target_id, created_at);
