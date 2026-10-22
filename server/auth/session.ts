import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AuthenticatedUser } from '../../shared/contracts/auth';
import type { ApiEnv } from '../env';
import { ApiError } from '../http/errors';
import { publicUser, type UserRow } from '../repositories/auth';
import { appOrigin, cookieName } from './config';
import { csrfForSession, equalHash, hash } from './crypto';

export interface Authentication {
  user: AuthenticatedUser; sessionHash: string; csrfHash: string; csrfToken: string;
}
export const requireAuthentication: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const token = getCookie(c, cookieName(c.env, 'session'));
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  const sessionHash = await hash(token);
  const row = await c.env.DB.prepare(`SELECT u.*, s.csrf_hash FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`)
    .bind(sessionHash, Date.now()).first<UserRow & { csrf_hash: string }>();
  if (!row) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  c.set('auth', { user: publicUser(row), sessionHash, csrfHash: row.csrf_hash, csrfToken: await csrfForSession(token) });
  await next();
};

export function requireRole(...roles: AuthenticatedUser['role'][]): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    if (!roles.includes(c.get('auth').user.role)) throw new ApiError(403, 'FORBIDDEN', 'This action is not available for your account.');
    await next();
  };
}

export const requireCsrf: MiddlewareHandler<ApiEnv> = async (c, next) => {
  if (c.req.header('Origin') !== appOrigin(c.env) || c.req.header('Sec-Fetch-Site') === 'cross-site') {
    throw new ApiError(403, 'FORBIDDEN', 'The request could not be verified.');
  }
  const supplied = c.req.header('X-CSRF-Token') ?? '';
  if (!/^[a-f0-9]{64}$/.test(supplied) || !equalHash(await hash(supplied), c.get('auth').csrfHash)) {
    throw new ApiError(403, 'FORBIDDEN', 'The request could not be verified.');
  }
  await next();
};

export async function limitMutation(c: Context<ApiEnv>) {
  if (!(await c.env.MUTATION_LIMITER.limit({ key: c.get('auth').user.id })).success) {
    c.header('Retry-After', '60');
    throw new ApiError(429, 'RATE_LIMITED', 'Please wait before trying again.');
  }
}
