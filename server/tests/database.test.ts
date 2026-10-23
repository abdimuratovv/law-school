import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';

async function addUser(id: string, role = 'student') {
  return env.DB.prepare(
    'INSERT INTO users (id, display_name, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0)',
  ).bind(id, 'Sample user', `${id}@example.test`, role).run();
}

beforeEach(async () => {
  for (const table of ['attempt_item_reviews', 'assignment_authors', 'test_publications', 'test_drafts', 'question_publications', 'question_drafts', 'attempt_starts', 'attempts', 'assignments', 'test_versions', 'question_versions', 'admin_bootstrap', 'audit_events', 'group_memberships', 'group_teachers', 'groups', 'login_flows', 'sessions', 'identities', 'users']) {
    await env.DB.prepare(`DELETE FROM ${table}`).run();
  }
});

describe('identity and access migration', () => {
  it('reapplies through migration tracking without recreating tables or removing data', async () => {
    await addUser('kept');
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM d1_migrations').first('count')).toBe(env.TEST_MIGRATIONS.length);
    expect(await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind('kept').first('role')).toBe('student');
  });

  it('defaults new users to active students and rejects arbitrary roles', async () => {
    await env.DB.prepare('INSERT INTO users (id, display_name, email, created_at, updated_at) VALUES (?, ?, ?, 0, 0)')
      .bind('new', 'Sample', 'new@example.test').run();
    expect(await env.DB.prepare('SELECT role, status FROM users WHERE id = ?').bind('new').first())
      .toMatchObject({ role: 'student', status: 'active' });
    await expect(addUser('bad', 'superuser')).rejects.toThrow();
  });

  it('makes Google subject unique across users without treating email as identity', async () => {
    await addUser('first'); await addUser('second');
    const sql = 'INSERT INTO identities (id, user_id, provider, subject, created_at) VALUES (?, ?, ?, ?, 0)';
    await env.DB.prepare(sql).bind('i1', 'first', 'google', 'subject-1').run();
    await expect(env.DB.prepare(sql).bind('i2', 'second', 'google', 'subject-1').run()).rejects.toThrow();
    await env.DB.prepare(sql).bind('i3', 'second', 'google', 'subject-2').run();
    await env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind('new-email@example.test', 'first').run();
    expect(await env.DB.prepare('SELECT user_id FROM identities WHERE subject = ?').bind('subject-1').first('user_id')).toBe('first');
  });

  it('rejects orphan identities', async () => {
    await expect(env.DB.prepare(
      "INSERT INTO identities (id, user_id, provider, subject, created_at) VALUES ('orphan', 'missing', 'google', 's1', 0)",
    ).run()).rejects.toThrow();
  });

  it('requires hashes rather than raw session tokens and enforces fixed expiry bounds', async () => {
    await addUser('student');
    const sql = 'INSERT INTO sessions (token_hash, user_id, csrf_hash, created_at, expires_at) VALUES (?, ?, ?, 0, ?)';
    await expect(env.DB.prepare(sql).bind('raw-token', 'student', 'a'.repeat(64), 100).run()).rejects.toThrow();
    await expect(env.DB.prepare(sql).bind('b'.repeat(64), 'student', 'a'.repeat(64), 604800001).run()).rejects.toThrow();
    await env.DB.prepare(sql).bind('b'.repeat(64), 'student', 'a'.repeat(64), 604800000).run();
  });

  it('bounds OAuth flow lifetime and atomically consumes a flow once', async () => {
    const sql = 'INSERT INTO login_flows (state_hash, binding_hash, nonce, code_verifier, created_at, expires_at) VALUES (?, ?, ?, ?, 0, ?)';
    const args = ['a'.repeat(64), 'b'.repeat(64), 'n'.repeat(32), 'v'.repeat(43)];
    await expect(env.DB.prepare(sql).bind(...args, 600001).run()).rejects.toThrow();
    await env.DB.prepare(sql).bind(...args, 600000).run();
    const consume = () => env.DB.prepare('DELETE FROM login_flows WHERE state_hash = ? RETURNING nonce').bind(args[0]).first();
    expect(await consume()).toEqual({ nonce: 'n'.repeat(32) });
    expect(await consume()).toBeNull();
  });

  it('rejects duplicate and orphan group enrollment', async () => {
    await addUser('teacher', 'teacher'); await addUser('student');
    await env.DB.prepare("INSERT INTO groups (id, name, created_by, created_at) VALUES ('g1', '11-A', 'teacher', 0)").run();
    const sql = 'INSERT INTO group_memberships (group_id, student_id, enrolled_by, created_at) VALUES (?, ?, ?, 0)';
    await env.DB.prepare(sql).bind('g1', 'student', 'teacher').run();
    await expect(env.DB.prepare(sql).bind('g1', 'student', 'teacher').run()).rejects.toThrow();
    await expect(env.DB.prepare(sql).bind('g1', 'missing', 'teacher').run()).rejects.toThrow();
  });

  it('rejects malformed audit metadata and removes sessions when an account is deleted', async () => {
    await addUser('student');
    await expect(env.DB.prepare("INSERT INTO audit_events (id, action, metadata_json, created_at) VALUES ('a', 'test', 'broken-json', 0)").run()).rejects.toThrow();
    await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, csrf_hash, created_at, expires_at) VALUES (?, ?, ?, 0, 100)')
      .bind('a'.repeat(64), 'student', 'b'.repeat(64)).run();
    await env.DB.prepare("DELETE FROM users WHERE id = 'student'").run();
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM sessions').first('count')).toBe(0);
  });

  it('uses indexes for session, identity and membership lookups', async () => {
    const queries = [
      ["SELECT user_id FROM sessions WHERE token_hash = ?", ['a'.repeat(64)]],
      ["SELECT user_id FROM identities WHERE provider = ? AND subject = ?", ['google', 'subject-1']],
      ["SELECT group_id FROM group_memberships WHERE student_id = ?", ['student']],
    ] as const;
    for (const [sql, args] of queries) {
      const plan = await env.DB.prepare(`EXPLAIN QUERY PLAN ${sql}`).bind(...args).all<{ detail: string }>();
      expect(plan.results.map(row => row.detail).join(' ')).toMatch(/USING.*INDEX/);
    }
  });
});
