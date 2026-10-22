import { env, exports } from 'cloudflare:workers';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import { apiErrorSchema, healthSchema } from '../../shared/contracts/api';
import { createApi } from '../app';
import worker from '../index';

describe('Worker API boundary', () => {
  it('reports liveness without exposing bindings or accepting a supplied request ID', async () => {
    const response = await exports.default.fetch('https://school.test/api/v1/health', {
      headers: { 'X-Request-Id': 'untrusted-id' },
    });
    expect(response.status).toBe(200);
    const body = healthSchema.parse(await response.json());
    expect(body.requestId).toBe(response.headers.get('X-Request-Id'));
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(Object.keys(body).sort()).toEqual(['requestId', 'status']);
  });

  it('checks migrated database readiness', async () => {
    const response = await exports.default.fetch('https://school.test/api/v1/ready');
    expect(response.status).toBe(200);
    healthSchema.parse(await response.json());
  });

  it('returns a safe 503 when the database is not migrated', async () => {
    const response = await createApi().request('https://school.test/api/v1/ready', {}, {
      ...env, DB: env.EMPTY_DB,
    });
    expect(response.status).toBe(503);
    const body = apiErrorSchema.parse(await response.json());
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(body)).not.toMatch(/d1_migrations|SELECT|SQLITE/);
  });

  it.each(['/api', '/api/v1', '/api/v1/missing', '/api/v2/health'])(
    'keeps unknown API navigation %s out of SPA HTML', async path => {
      const response = await exports.default.fetch(`https://school.test${path}`, {
        headers: { Accept: 'text/html', 'Sec-Fetch-Mode': 'navigate' },
      });
      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(apiErrorSchema.parse(await response.json()).error.code).toBe('NOT_FOUND');
    },
  );

  it.each(['POST', 'PATCH', 'DELETE', 'OPTIONS'])('rejects %s on a read-only endpoint', async method => {
    const response = await exports.default.fetch('https://school.test/api/v1/health', { method });
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, HEAD');
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('handles HEAD without a JSON body', async () => {
    const response = await exports.default.fetch('https://school.test/api/v1/health', { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });

  it('delegates application routes to the assets binding, including non-API prefixes', async () => {
    const fetchAsset = vi.fn(async () => new Response('frontend asset'));
    const context = createExecutionContext();
    for (const path of ['/tests/practice-1', '/apiary']) {
      const response = await worker.fetch(new Request(`https://school.test${path}`), {
        ...env, ASSETS: { fetch: fetchAsset } as unknown as Fetcher,
      }, context);
      expect(await response.text()).toBe('frontend asset');
    }
    await waitOnExecutionContext(context);
    expect(fetchAsset).toHaveBeenCalledTimes(2);
  });

  it('redacts unexpected exception details from both response and log', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const app = createApi();
      app.get('/api/v1/failure-test', () => { throw new Error('private-token-and-sql'); });
      const response = await app.request('https://school.test/api/v1/failure-test', {}, env);
      expect(response.status).toBe(500);
      const body = apiErrorSchema.parse(await response.json());
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(body)).not.toContain('private-token');
      expect(JSON.stringify(spy.mock.calls)).not.toContain('private-token');
      expect(spy).toHaveBeenCalledWith(JSON.stringify({ event: 'api_error', requestId: body.requestId }));
    } finally { spy.mockRestore(); }
  });
});
