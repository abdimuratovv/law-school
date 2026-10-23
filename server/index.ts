import { backfillReports } from './exams/backfill';
import { sweepExpired } from './exams/service';
import { createApi } from './app';
import type { WorkerBindings } from './env';
import { cleanupAuthentication } from './repositories/auth';

const api = createApi();

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/api' || path.startsWith('/api/')) return api.fetch(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
  async scheduled(_controller, env): Promise<void> {
    await cleanupAuthentication(env.DB);
    await sweepExpired(env.DB);
    await backfillReports(env.DB);
  },
} satisfies ExportedHandler<WorkerBindings>;
