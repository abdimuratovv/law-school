import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const configPath = new URL('../wrangler.github.generated.jsonc', import.meta.url);

/** Build-time account settings only. OAuth secrets are configured on the Worker. */
export function githubConfig(environment) {
  const databaseId = environment.D1_DATABASE_ID?.trim();
  if (!databaseId || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(databaseId) ||
      databaseId.startsWith('00000000-0000-0000-0000-')) {
    throw new Error('Set D1_DATABASE_ID in Cloudflare Settings > Builds > Variables and secrets to the actual D1 Database ID. Create law-school-staging under Storage & Databases > D1 first.');
  }
  const name = environment.WORKER_NAME?.trim() || 'law-school';
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(name)) throw new Error('WORKER_NAME must match your Cloudflare Worker name.');
  const config = JSON.parse(readFileSync(new URL('../wrangler.staging.example.jsonc', import.meta.url), 'utf8'));
  config.name = name;
  config.keep_vars = true;
  config.d1_databases[0].database_id = databaseId;
  return config;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    writeFileSync(configPath, JSON.stringify(githubConfig(process.env), null, 2) + '\n');
    console.log('Prepared GitHub deployment configuration for the staging database.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
