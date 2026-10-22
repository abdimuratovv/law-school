import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => ({
  plugins: [cloudflareTest({
    wrangler: { configPath: './wrangler.jsonc' },
    miniflare: {
      d1Databases: ['DB', 'EMPTY_DB'],
      bindings: { TEST_MIGRATIONS: await readD1Migrations('./migrations') },
    },
  })],
  test: {
    include: ['server/**/*.test.ts'],
    setupFiles: ['./server/tests/setup.ts'],
    fileParallelism: false,
  },
}));
