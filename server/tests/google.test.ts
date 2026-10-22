import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createGoogleProvider } from '../auth/google';

let keyPair: CryptoKeyPair; let jwk: JsonWebKey;
beforeAll(async () => {
  const generated = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  if (!('privateKey' in generated)) throw new Error('Expected an RSA key pair');
  keyPair = generated;
  const exported = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  if (exported instanceof ArrayBuffer) throw new Error('Expected a JWK');
  jwk = exported;
});
const flow = { state: 'a'.repeat(64), nonce: 'b'.repeat(64), codeVerifier: 'c'.repeat(64) };
const settings = { clientId: 'fixture.apps.googleusercontent.com', clientSecret: 'fixture-not-real',
  origin: 'https://school.test', redirectUri: 'https://school.test/api/v1/auth/google/callback' };
const callback = new URL(settings.redirectUri + '?state=' + flow.state + '&code=fixture');
function encoded(value: Uint8Array) {
  return btoa(String.fromCharCode(...value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
async function jwt(overrides: Record<string, unknown>, corrupt: boolean) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => encoded(new TextEncoder().encode(JSON.stringify(value)));
  const message = encode({ alg: 'RS256', kid: 'fixture-key' }) + '.' + encode({
    iss: 'https://accounts.google.com', aud: settings.clientId, sub: 'subject-1', iat: now, exp: now + 600,
    nonce: flow.nonce, email: 'learner@example.test', email_verified: true, name: 'Learner', ...overrides,
  });
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, new TextEncoder().encode(message)));
  if (corrupt) signature[0] = (signature[0] ?? 0) ^ 1;
  return message + '.' + encoded(signature);
}
function transport(token: string) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    let body: unknown;
    if (url.href === 'https://accounts.google.com/.well-known/openid-configuration') {
      body = { issuer: 'https://accounts.google.com', authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        token_endpoint: 'https://oauth2.googleapis.com/token', jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
        response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'] };
    } else if (url.href === 'https://oauth2.googleapis.com/token') {
      const form = new URLSearchParams(String(init?.body));
      expect(form.get('code_verifier')).toBe(flow.codeVerifier);
      expect(form.get('redirect_uri')).toBe(settings.redirectUri);
      expect(form.get('client_secret')).toBe(settings.clientSecret);
      body = { access_token: 'fixture-access-token', token_type: 'Bearer', id_token: token };
    } else if (url.href === 'https://www.googleapis.com/oauth2/v3/certs') {
      body = { keys: [{ ...jwk, kid: 'fixture-key', alg: 'RS256', use: 'sig' }] };
    } else throw new Error('Unexpected provider request');
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=3600' } });
  }) as unknown as typeof fetch;
}
describe('real OIDC protocol validation with locally signed fixture tokens', () => {
  it('sends PKCE and validates a signed ID token, caching discovery', async () => {
    const fetcher = transport(await jwt({}, false)); const provider = createGoogleProvider(fetcher);
    const location = new URL(await provider.authorizationUrl(settings, flow));
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('code_challenge')).not.toBe(flow.codeVerifier);
    expect(location.searchParams.get('scope')).toBe('openid email profile');
    expect(await provider.verify(settings, callback, flow)).toEqual({ subject: 'subject-1', email: 'learner@example.test', name: 'Learner' });
    expect(vi.mocked(fetcher).mock.calls.filter(call => String(call[0]).includes('openid-configuration'))).toHaveLength(1);
  });
  it.each([
    ['issuer', { iss: 'https://evil.test' }], ['audience', { aud: 'other-client' }],
    ['nonce', { nonce: 'wrong' }], ['expiry', { exp: 1 }], ['verified email', { email_verified: false }],
  ])('rejects the wrong %s', async (_label, overrides) => {
    const provider = createGoogleProvider(transport(await jwt(overrides as Record<string, unknown>, false)));
    await expect(provider.verify(settings, callback, flow)).rejects.toThrow();
  });
  it('rejects an invalid signature even when all ID token claims are correct', async () => {
    const provider = createGoogleProvider(transport(await jwt({}, true)));
    await expect(provider.verify(settings, callback, flow)).rejects.toThrow();
  });
});
