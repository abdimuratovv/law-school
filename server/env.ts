export interface WorkerBindings {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV: 'local' | 'staging' | 'production';
}

export interface ApiEnv {
  Bindings: WorkerBindings;
  Variables: { requestId: string };
}
