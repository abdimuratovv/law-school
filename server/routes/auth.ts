import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { safeAppReturn } from '../../shared/contracts/navigation';
import { cookieName, cookieOptions, googleConfig } from '../auth/config';
import { csrfForSession, hash, randomToken } from '../auth/crypto';
import { createGoogleProvider, type IdentityProvider } from '../auth/google';
import { requireAuthentication, requireCsrf, limitMutation } from '../auth/session';
import type { ApiEnv } from '../env';
import { ApiError } from '../http/errors';
import { registerGoogleUser, publicUser, type UserRow } from '../repositories/auth';
import { updateProfileSchema } from '../../shared/contracts/auth';
import { readJson } from '../http/validation';

const google = createGoogleProvider();
const SESSION_AGE = 7 * 24 * 60 * 60;

export function authRoutes(provider: IdentityProvider = google) {
  const app = new Hono<ApiEnv>();

  app.get('/config', c => {
    let googleEnabled = false;
    try { googleConfig(c.env); googleEnabled = true; } catch { /* No private configuration in responses. */ }
    return c.json({ googleEnabled });
  });

  app.get('/google/start', async c => {
    const settings = googleConfig(c.env);
    if (new URL(c.req.url).origin !== settings.origin || c.req.header('Sec-Fetch-Site') === 'cross-site') {
      throw new ApiError(403, 'FORBIDDEN', 'The request could not be verified.');
    }
    let browser = getCookie(c, cookieName(c.env, 'browser'));
    if (!browser || !/^[a-f0-9]{64}$/.test(browser)) browser = randomToken();
    const ip = c.req.header('CF-Connecting-IP') ?? 'local';
    const limits = await Promise.all([
      c.env.AUTH_LIMITER.limit({ key: await hash(browser) }),
      c.env.AUTH_IP_LIMITER.limit({ key: await hash(ip) }),
    ]);
    if (limits.some(result => !result.success)) {
      c.header('Retry-After', '60');
      throw new ApiError(429, 'RATE_LIMITED', 'Please wait before trying again.');
    }
    setCookie(c, cookieName(c.env, 'browser'), browser, { ...cookieOptions(c.env), maxAge: 86400 });
    const state = randomToken(); const binding = randomToken();
    const nonce = randomToken(); const codeVerifier = randomToken();
    let location: string;
    try { location = await provider.authorizationUrl(settings, { state, nonce, codeVerifier }); }
    catch { throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Sign-in is temporarily unavailable.'); }
    const now = Date.now();
    await c.env.DB.prepare(`INSERT INTO login_flows
      (state_hash, binding_hash, nonce, code_verifier, return_path, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(await hash(state), await hash(binding), nonce, codeVerifier,
      safeAppReturn(c.req.query('returnTo')), now, now + 600000).run();
    setCookie(c, cookieName(c.env, 'flow'), binding, { ...cookieOptions(c.env), maxAge: 600 });
    return c.redirect(location, 302);
  });

  app.get('/google/callback', async c => {
    const settings = googleConfig(c.env);
    if (new URL(c.req.url).origin !== settings.origin) throw new ApiError(400, 'INVALID_JSON', 'Invalid callback origin.');
    const binding = getCookie(c, cookieName(c.env, 'flow'));
    const state = c.req.query('state');
    deleteCookie(c, cookieName(c.env, 'flow'), cookieOptions(c.env));
    if (!state || !binding || !/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(binding)) {
      return c.redirect(`${settings.origin}/sign-in?auth=failed`, 303);
    }
    // Invalid binding does not consume another browser's flow. Valid flows are single use.
    const flow = await c.env.DB.prepare(`DELETE FROM login_flows
      WHERE state_hash = ? AND binding_hash = ? AND expires_at > ?
      RETURNING nonce, code_verifier, return_path`).bind(await hash(state), await hash(binding), Date.now())
      .first<{ nonce: string; code_verifier: string; return_path: string }>();
    if (!flow) return c.redirect(`${settings.origin}/sign-in?auth=failed`, 303);
    if (c.req.query('error')) return c.redirect(`${settings.origin}/sign-in?auth=cancelled`, 303);
    try {
      const profile = await provider.verify(settings, new URL(c.req.url), { state, nonce: flow.nonce, codeVerifier: flow.code_verifier });
      const user = await registerGoogleUser(c.env.DB, profile);
      if (user.status !== 'active') return c.redirect(`${settings.origin}/sign-in?auth=failed`, 303);
      const token = randomToken(); const tokenHash = await hash(token);
      const csrfHash = await hash(await csrfForSession(token)); const now = Date.now();
      const old = getCookie(c, cookieName(c.env, 'session'));
      const oldHash = old && /^[a-f0-9]{64}$/.test(old) ? await hash(old) : '';
      // No new session is created if an admin suspends the account during login.
      const inserted = await c.env.DB.batch([
        c.env.DB.prepare(`INSERT INTO sessions (token_hash, user_id, csrf_hash, created_at, expires_at)
          SELECT ?, id, ?, ?, ? FROM users WHERE id = ? AND status = 'active'`)
          .bind(tokenHash, csrfHash, now, now + SESSION_AGE * 1000, user.id),
        c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(oldHash),
      ]);
      if (!inserted[0]?.meta.changes) return c.redirect(`${settings.origin}/sign-in?auth=failed`, 303);
      setCookie(c, cookieName(c.env, 'session'), token, { ...cookieOptions(c.env), maxAge: SESSION_AGE });
      const target = safeAppReturn(flow.return_path);
      return c.redirect(settings.origin + (user.role === 'student' && target.startsWith('/admin') ? '/' : target), 303);
    } catch {
      // OAuth error descriptions and token responses never enter URLs, logs or HTML.
      return c.redirect(`${settings.origin}/sign-in?auth=failed`, 303);
    }
  });

  app.get('/me', requireAuthentication, c => {
    const auth = c.get('auth');
    return c.json({ user: auth.user, csrfToken: auth.csrfToken });
  });
  app.put('/profile', requireAuthentication, requireCsrf, async c => {
    await limitMutation(c);
    const value = await readJson(c.req.raw, updateProfileSchema);
    const now = Date.now();
    const row = await c.env.DB.prepare(`UPDATE users SET first_name = ?, last_name = ?, patronymic = ?, birth_date = ?,
      display_name = ?, profile_completed_at = COALESCE(profile_completed_at, ?), updated_at = max(updated_at, ?), revision = revision + 1
      WHERE id = ? AND revision = ? AND status = 'active' RETURNING *`)
      .bind(value.firstName, value.lastName, value.patronymic, value.birthDate,
        [...[value.firstName, value.lastName].join(' ')].slice(0, 100).join(''), now, now, c.get('auth').user.id, value.revision).first<UserRow>();
    if (!row) throw new ApiError(409, 'CONFLICT', 'Your profile has changed. Reload and try again.');
    return c.json({ user: publicUser(row) });
  });
  app.post('/logout', requireAuthentication, requireCsrf, async c => {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(c.get('auth').sessionHash).run();
    deleteCookie(c, cookieName(c.env, 'session'), cookieOptions(c.env));
    return c.json({ ok: true });
  });
  return app;
}
