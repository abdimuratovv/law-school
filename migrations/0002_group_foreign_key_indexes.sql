-- Index secondary references used by account deletion and enrollment queries.
CREATE INDEX groups_creator ON groups(created_by);
CREATE INDEX group_memberships_enroller ON group_memberships(enrolled_by);
