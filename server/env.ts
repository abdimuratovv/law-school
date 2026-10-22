export interface WorkerBindings {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV: 'local' | 'staging' | 'production';
  APP_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  AUTH_LIMITER: RateLimit;
  AUTH_IP_LIMITER: RateLimit;
  MUTATION_LIMITER: RateLimit;
}

export interface ApiEnv {
  Bindings: WorkerBindings;
  Variables: { requestId: string; auth: import('./auth/session').Authentication };
}
