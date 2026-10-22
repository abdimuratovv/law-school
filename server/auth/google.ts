import * as oauth from 'oauth4webapi';
import type { googleConfig } from './config';

export type GoogleSettings = ReturnType<typeof googleConfig>;
export interface LoginFlow { state: string; nonce: string; codeVerifier: string }
export interface GoogleProfile { subject: string; email: string; name: string }
export interface IdentityProvider {
  authorizationUrl(settings: GoogleSettings, flow: LoginFlow): Promise<string>;
  verify(settings: GoogleSettings, callback: URL, flow: LoginFlow): Promise<GoogleProfile>;
}

/** Separate instances are useful for deterministic provider tests, never a runtime auth bypass. */
export function createGoogleProvider(fetcher: typeof fetch = fetch): IdentityProvider {
  const issuer = new URL('https://accounts.google.com');
  let cached: { server: oauth.AuthorizationServer; expires: number } | undefined;
  let pending: Promise<oauth.AuthorizationServer> | undefined;
  const keys: oauth.JWKSCacheInput = {};
  const transport = () => ({ [oauth.customFetch]: (input: string, init: RequestInit) => fetcher(input, init), signal: AbortSignal.timeout(10000) });
  const server = async () => {
    if (cached && cached.expires > Date.now()) return cached.server;
    if (!pending) pending = (async () => {
      const response = await oauth.discoveryRequest(issuer, transport());
      const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/i)?.[1] ?? 3600);
      const metadata = await oauth.processDiscoveryResponse(issuer, response);
      // Restrict metadata endpoints to Google's HTTPS origins, even after discovery.
      for (const endpoint of [metadata.authorization_endpoint, metadata.token_endpoint, metadata.jwks_uri]) {
        if (!endpoint || new URL(endpoint).protocol !== 'https:' ||
          !['accounts.google.com', 'oauth2.googleapis.com', 'www.googleapis.com'].includes(new URL(endpoint).hostname)) throw new Error('Invalid provider metadata');
      }
      cached = { server: metadata, expires: Date.now() + Math.min(maxAge, 86400) * 1000 };
      return metadata;
    })().finally(() => { pending = undefined; });
    return pending;
  };
  const client = (settings: GoogleSettings): oauth.Client => ({
    client_id: settings.clientId, id_token_signed_response_alg: 'RS256',
  });
  return {
    async authorizationUrl(settings, flow) {
      const metadata = await server();
      const url = new URL(metadata.authorization_endpoint!);
      url.search = new URLSearchParams({ client_id: settings.clientId, redirect_uri: settings.redirectUri,
        response_type: 'code', scope: 'openid email profile', state: flow.state, nonce: flow.nonce,
        code_challenge: await oauth.calculatePKCECodeChallenge(flow.codeVerifier), code_challenge_method: 'S256' }).toString();
      return url.href;
    },
    async verify(settings, callback, flow) {
      const metadata = await server();
      const registeredClient = client(settings);
      const parameters = oauth.validateAuthResponse(metadata, registeredClient, callback, flow.state);
      const response = await oauth.authorizationCodeGrantRequest(metadata, registeredClient,
        oauth.ClientSecretPost(settings.clientSecret), parameters, settings.redirectUri, flow.codeVerifier,
        transport());
      const tokens = await oauth.processAuthorizationCodeResponse(metadata, registeredClient, response,
        { expectedNonce: flow.nonce, requireIdToken: true });
      await oauth.validateApplicationLevelSignature(metadata, response,
        { ...transport(), [oauth.jwksCache]: keys });
      const claims = oauth.getValidatedIdTokenClaims(tokens);
      if (!claims || claims.email_verified !== true || typeof claims.email !== 'string' ||
        claims.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email) ||
        !claims.sub || claims.sub.length > 255) throw new Error('Invalid Google identity');
      let name = '';
      if (typeof claims.name === 'string') for (const character of claims.name.normalize('NFC')) {
        if (name.length + character.length > 100) break;
        name += character;
      }
      return { subject: claims.sub, email: claims.email, name };
    },
  };
}
