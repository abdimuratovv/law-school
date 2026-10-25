import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

// Only the isolated Worker test runtime is used. No remote target or credentials.
const label = process.argv[2] ?? 'latest';
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Use an alphanumeric report label.');
const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run'], {
  env: { ...process.env, EXAM_LOAD_TEST: '1', NO_COLOR: '1' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
let output = '';
child.stdout.on('data', chunk => { output += chunk; process.stdout.write(chunk); });
child.on('exit', code => {
  const results = [...output.matchAll(/EXAM_LOAD_RESULT (\{[^\n]+\})/g)].map(match => JSON.parse(match[1]));
  mkdirSync('docs/load-test/results', { recursive: true });
  writeFileSync(`docs/load-test/results/${label}.json`, JSON.stringify({
    generatedAt: new Date().toISOString(), node: process.version,
    runtime: 'Local workerd + D1; in-process Hono requests; no external HTTP network or hosted CPU enforcement',
    exitCode: code, results,
  }, null, 2) + '\n');
  process.exitCode = code || (results.length === 2 ? 0 : 1);
});
