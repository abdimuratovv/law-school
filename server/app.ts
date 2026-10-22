import { Hono } from 'hono';
import { API_PREFIX } from '../shared/contracts/constants';
import type { ApiEnv } from './env';
import { ApiError, errorResponse } from './http/errors';
import { isDatabaseReady } from './repositories/readiness';

export function createApi() {
  const app = new Hono<ApiEnv>();
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-Id', requestId);
    c.header('Cache-Control', 'no-store');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
    await next();
  });
  app.onError(errorResponse);
  app.notFound(() => { throw new ApiError(404, 'NOT_FOUND', 'API endpoint not found.'); });

  app.get(`${API_PREFIX}/health`, c => c.json({ status: 'ok', requestId: c.get('requestId') }));
  app.get(`${API_PREFIX}/ready`, async c => {
    let ready = false;
    try { ready = await isDatabaseReady(c.env.DB); } catch { /* Redact database internals. */ }
    if (!ready) {
      c.header('Retry-After', '5');
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'The service is not ready.');
    }
    return c.json({ status: 'ok', requestId: c.get('requestId') });
  });
  for (const route of ['health', 'ready']) {
    app.all(`${API_PREFIX}/${route}`, c => {
      c.header('Allow', 'GET, HEAD');
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use GET or HEAD.');
    });
  }
  return app;
}
