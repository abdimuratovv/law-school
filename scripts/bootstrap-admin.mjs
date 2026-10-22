import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
const userId = args.includes('--user-id') ? value('--user-id') : '';
const local = args.includes('--local'); const remote = args.includes('--remote');
const config = args.includes('--config') ? value('--config') : undefined;
if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(userId) || local === remote || remote && !config) {
  console.error('Usage: node scripts/bootstrap-admin.mjs --user-id UUID (--local | --remote --config CONFIG) [--dry-run]');
  process.exit(1);
}
const sql = `INSERT INTO admin_bootstrap (singleton, user_id, created_at) VALUES (1, '${userId}', ${Date.now()});\n`;
if (args.includes('--dry-run')) {
  console.log(sql);
} else {
  const directory = mkdtempSync(join(tmpdir(), 'hm-bootstrap-'));
  const file = join(directory, 'bootstrap.sql');
  try {
    writeFileSync(file, sql, { encoding: 'utf8', mode: 0o600 });
    const command = [fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url)),
      'd1', 'execute', 'DB', local ? '--local' : '--remote', '--file', file];
    if (config) command.push('--config', config);
    execFileSync(process.execPath, command, { cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit', windowsHide: true });
  } finally {
    unlinkSync(file); rmdirSync(directory);
  }
}
