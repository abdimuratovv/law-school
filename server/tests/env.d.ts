import type { WorkerBindings } from '../env';

declare global {
  namespace Cloudflare {
    interface Env extends WorkerBindings {
      EMPTY_DB: D1Database;
      TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
    }
    interface GlobalProps {
      mainModule: typeof import('../index');
    }
  }
}
