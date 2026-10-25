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
    reporters: process.env.EXAM_LOAD_TEST ? ['default', './scripts/load-reporter.mjs'] : ['default'],
    include: process.env.EXAM_LOAD_TEST ? ['server/tests/exam.load.ts'] : ['server/**/*.test.ts'],
    setupFiles: ['./server/tests/setup.ts'],
    fileParallelism: false,
  },
}));
