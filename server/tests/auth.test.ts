import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentUserSchema } from '../../shared/contracts/auth';
import { safeAppReturn } from '../../shared/contracts/navigation';
import { createApi } from '../app';
import { cookieName } from '../auth/config';
import { hash } from '../auth/crypto';
import type { IdentityProvider } from '../auth/google';
import { registerGoogleUser } from '../repositories/auth';
import { cleanupAuthentication } from '../repositories/auth';
import { account, authEnv, resetAuthDatabase } from './auth-helpers';

beforeEach(resetAuthDatabase);
const provider: IdentityProvider = {
  authorizationUrl: async (_settings, flow) => `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ state: flow.state, nonce: flow.nonce })}`,
  verify: async () => ({ subject: 'fixture-subject', email: 'fixture@example.test', name: 'Test Learner' }),
};
async function start(app: ReturnType<typeof createApi>, returnTo = '/') {
  const response = await app.request(`https://school.test/api/v1/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`, {}, authEnv);
  expect(response.status).toBe(302);
  const state = new URL(response.headers.get('Location')!).searchParams.get('state')!;
  const cookie = response.headers.getSetCookie().find(value => value.startsWith(cookieName(authEnv, 'flow') + '='))!.split(';')[0]!;
  return { state, cookie };
}
describe('Google login orchestration', () => {
  it('stores hashed state with a Secure HttpOnly same-site browser binding', async () => {
    const response = await createApi({ identityProvider: provider }).request('https://school.test/api/v1/auth/google/start', {}, authEnv);
    const state = new URL(response.headers.get('Location')!).searchParams.get('state')!;
    expect(await env.DB.prepare('SELECT state_hash FROM login_flows').first('state_hash')).toBe(await hash(state));
    const cookie = response.headers.getSetCookie().find(value => value.startsWith('__Host-hm_flow='))!;
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax']) expect(cookie).toContain(flag);
    expect(cookie).not.toContain('Domain=');
  });
  it('creates a student session and rejects callback replay', async () => {
    const app = createApi({ identityProvider: provider }); const flow = await start(app, '/tests');
    const url = `https://school.test/api/v1/auth/google/callback?state=${flow.state}&code=fixture`;
    const response = await app.request(url, { headers: { Cookie: flow.cookie } }, authEnv);
    expect(response.status).toBe(303); expect(response.headers.get('Location')).toBe('https://school.test/tests');
    const cookie = response.headers.getSetCookie().find(value => value.startsWith('__Host-hm_session='))!.split(';')[0]!;
    expect(await env.DB.prepare('SELECT token_hash FROM sessions').first('token_hash')).toBe(await hash(cookie.split('=')[1]!));
    const me = await app.request('https://school.test/api/v1/auth/me', { headers: { Cookie: cookie } }, authEnv);
    expect(currentUserSchema.parse(await me.json()).user).toMatchObject({ role: 'student', email: 'fixture@example.test' });
    expect((await app.request(url, { headers: { Cookie: flow.cookie } }, authEnv)).headers.get('Location')).toContain('auth=failed');
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM sessions').first('count')).toBe(1);
  });
  it('binds the flow to its browser and enforces expiry before calling Google', async () => {
    const spy = vi.fn(provider.verify); const app = createApi({ identityProvider: { ...provider, verify: spy } });
    const flow = await start(app); const url = `https://school.test/api/v1/auth/google/callback?state=${flow.state}&code=fixture`;
    expect((await app.request(url, { headers: { Cookie: '__Host-hm_flow=' + 'a'.repeat(64) } }, authEnv)).headers.get('Location')).toContain('auth=failed');
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM login_flows').first('count')).toBe(1);
    await env.DB.prepare('UPDATE login_flows SET created_at = 0, expires_at = 1').run();
    expect((await app.request(url, { headers: { Cookie: flow.cookie } }, authEnv)).headers.get('Location')).toContain('auth=failed');
    expect(spy).not.toHaveBeenCalled();
  });
  it('consumes cancellation and redacts provider failures', async () => {
    const app = createApi({ identityProvider: { ...provider, verify: async () => { throw new Error('private-provider-token'); } } });
    const flow = await start(app);
    const failed = await app.request(`https://school.test/api/v1/auth/google/callback?state=${flow.state}&code=fixture`, { headers: { Cookie: flow.cookie } }, authEnv);
    expect(failed.headers.get('Location')).toBe('https://school.test/sign-in?auth=failed');
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first('count')).toBe(0);
    const next = await start(app);
    const cancelled = await app.request(`https://school.test/api/v1/auth/google/callback?state=${next.state}&error=access_denied&error_description=secret`, { headers: { Cookie: next.cookie } }, authEnv);
    expect(cancelled.headers.get('Location')).toBe('https://school.test/sign-in?auth=cancelled');
  });
  it('handles concurrent first logins and changed email using stable Google subject', async () => {
    const profile = { subject: 'stable-subject', email: 'first@example.test', name: 'First' };
    const users = await Promise.all(Array.from({ length: 8 }, () => registerGoogleUser(env.DB, profile)));
    expect(new Set(users.map(user => user.id)).size).toBe(1);
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first('count')).toBe(1);
    const changed = await registerGoogleUser(env.DB, { ...profile, email: 'changed@example.test' });
    expect(changed.id).toBe(users[0]?.id); expect(changed.email).toBe('changed@example.test');
  });
  it('blocks suspended accounts and returns a retryable login rate limit', async () => {
    await registerGoogleUser(env.DB, { subject: 'fixture-subject', email: 'fixture@example.test', name: 'Test' });
    await env.DB.prepare("UPDATE users SET status = 'suspended'").run();
    const app = createApi({ identityProvider: provider }); const flow = await start(app);
    const response = await app.request(`https://school.test/api/v1/auth/google/callback?state=${flow.state}&code=fixture`, { headers: { Cookie: flow.cookie } }, authEnv);
    expect(response.headers.get('Location')).toContain('auth=failed');
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM sessions').first('count')).toBe(0);
    const limited = await app.request('https://school.test/api/v1/auth/google/start', {}, { ...authEnv, AUTH_LIMITER: { limit: async () => ({ success: false }) } as RateLimit });
    expect(limited.status).toBe(429); expect(limited.headers.get('Retry-After')).toBe('60');
  });
});
describe('sessions and CSRF', () => {
  it('cleans expired authentication records in bounded batches while keeping live sessions', async () => {
    const user = await account();
    await env.DB.prepare(`WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 201)
      INSERT INTO login_flows (state_hash, binding_hash, nonce, code_verifier, created_at, expires_at)
      SELECT printf('%064x', n), ?, ?, ?, 0, 1 FROM seq`)
      .bind('a'.repeat(64), 'b'.repeat(32), 'c'.repeat(43)).run();
    await cleanupAuthentication(env.DB);
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM login_flows').first('count')).toBe(1);
    expect(await env.DB.prepare('SELECT user_id FROM sessions').first('user_id')).toBe(user.id);
  });
  it('rejects fabricated identity, suspended users and expired sessions', async () => {
    const app = createApi(); const url = 'https://school.test/api/v1/auth/me';
    expect((await app.request(url, { headers: { Cookie: 'hm.user=admin' } }, authEnv)).status).toBe(401);
    const user = await account();
    expect((await app.request(url, { headers: user.headers }, authEnv)).status).toBe(200);
    await env.DB.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").bind(user.id).run();
    expect((await app.request(url, { headers: user.headers }, authEnv)).status).toBe(401);
    await env.DB.prepare("UPDATE users SET status = 'active' WHERE id = ?").bind(user.id).run();
    await env.DB.prepare('UPDATE sessions SET created_at = 0, expires_at = 1').run();
    expect((await app.request(url, { headers: user.headers }, authEnv)).status).toBe(401);
  });
  it('requires same-origin session-bound CSRF and revokes only the logged-out session', async () => {
    const app = createApi(); const user = await account(); const other = await account();
    for (const headers of [{ ...user.headers, Origin: 'https://evil.test' }, { ...user.headers, 'X-CSRF-Token': other.csrf }, { ...user.headers, 'Sec-Fetch-Site': 'cross-site' }]) {
      expect((await app.request('https://school.test/api/v1/auth/logout', { method: 'POST', headers }, authEnv)).status).toBe(403);
    }
    const response = await app.request('https://school.test/api/v1/auth/logout', { method: 'POST', headers: user.headers }, authEnv);
    expect(response.status).toBe(200); expect(response.headers.getSetCookie().join()).toContain('Max-Age=0');
    expect((await app.request('https://school.test/api/v1/auth/me', { headers: user.headers }, authEnv)).status).toBe(401);
    expect((await app.request('https://school.test/api/v1/auth/me', { headers: other.headers }, authEnv)).status).toBe(200);
  });
  it.each(['//evil.test', '/%2f%2fevil.test', '/\\evil.test', '/%0d%0aLocation:evil', 'https://evil.test', '/api/v1/auth/logout'])(
    'rejects unsafe return path %s', value => { expect(safeAppReturn(value)).toBe('/'); });
});
