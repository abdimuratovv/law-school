import type { WorkerBindings } from '../env';
import { ApiError } from '../http/errors';

export function appOrigin(env: WorkerBindings): string {
  const origin = env.APP_ORIGIN ?? (env.APP_ENV === 'local' ? 'http://127.0.0.1:8787' : '');
  try {
    const url = new URL(origin);
    const local = env.APP_ENV === 'local' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      !(url.protocol === 'https:' || local && url.protocol === 'http:')) throw new Error();
    return url.origin;
  } catch { throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Sign-in is temporarily unavailable.'); }
}

export function googleConfig(env: WorkerBindings) {
  const origin = appOrigin(env);
  if (!env.GOOGLE_CLIENT_ID?.endsWith('.apps.googleusercontent.com') || !env.GOOGLE_CLIENT_SECRET ||
    env.GOOGLE_CLIENT_ID.includes('REPLACE_') || env.GOOGLE_CLIENT_SECRET.includes('REPLACE_')) {
    throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Sign-in is temporarily unavailable.');
  }
  return { origin, clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${origin}/api/v1/auth/google/callback` };
}

export function cookieOptions(env: WorkerBindings) {
  const localHttp = env.APP_ENV === 'local' && appOrigin(env).startsWith('http:');
  return { path: '/', httpOnly: true, secure: !localHttp, sameSite: 'Lax' as const };
}
export const cookieName = (env: WorkerBindings, kind: 'session' | 'flow' | 'browser') =>
  `${cookieOptions(env).secure ? '__Host-' : ''}hm_${kind}`;
