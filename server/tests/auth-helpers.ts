import { env } from 'cloudflare:workers';
import { cookieName } from '../auth/config';
import { csrfForSession, hash, randomToken } from '../auth/crypto';
import type { WorkerBindings } from '../env';

export const authEnv: WorkerBindings = { ...env, APP_ORIGIN: 'https://school.test',
  GOOGLE_CLIENT_ID: 'fixture.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'fixture-not-a-real-credential' };
export async function resetAuthDatabase() {
  for (const table of ['saved_questions', 'attempt_reports', 'import_rows', 'import_jobs', 'attempt_item_reviews', 'assignment_authors', 'test_publications', 'test_drafts', 'question_publications', 'question_drafts', 'attempt_starts', 'attempts', 'assignments', 'test_versions', 'question_versions', 'admin_bootstrap', 'audit_events', 'group_memberships', 'group_teachers', 'groups', 'login_flows', 'sessions', 'identities', 'users']) {
    await env.DB.prepare(`DELETE FROM ${table}`).run();
  }
}
export async function account(role: 'student' | 'teacher' | 'admin' = 'student') {
  const id = crypto.randomUUID(); const token = randomToken(); const now = Date.now();
  const csrf = await csrfForSession(token);
  await env.DB.prepare('INSERT INTO users (id, display_name, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, 'Test User', `${id}@example.test`, role, now, now).run();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, csrf_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .bind(await hash(token), id, await hash(csrf), now, now + 86400000).run();
  return { id, token, csrf, headers: { Cookie: `${cookieName(authEnv, 'session')}=${token}`,
    Origin: 'https://school.test', 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' } };
}
