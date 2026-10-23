# First GitHub deployment to Cloudflare

The default `wrangler.jsonc` is intentionally local-only. Deploying it with plain `npx wrangler deploy` fails because its D1 ID `00000000-0000-0000-0000-000000000001` does not identify a cloud database. Changing the Worker name alone cannot fix that error.

## Create the staging database first

1. In the Cloudflare account that owns the Worker, open **Storage & Databases > D1 SQL Database**.
2. Select **Create database**, name it `law-school-staging`, and complete creation.
3. Copy **Database ID** from the database overview. This identifier is not a secret or an API token.

## Configure Workers Builds

This guide targets the existing dashboard Worker named `law-school` as a staging environment. Its dashboard label may say Production for the Git branch; the application still uses `APP_ENV=staging` and its separate staging database. It is not the production release acceptance step.

Under the Worker's **Settings > Builds**, use:

| Field | Value |
| --- | --- |
| Repository | `abdimuratovv/law-school` |
| Branch | `main` |
| Root/path | `/` |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npm run deploy:cloudflare` |
| Preview builds | Disabled for this initial setup |
| Build variable `NODE_VERSION` | `22` |
| Build variable `D1_DATABASE_ID` | Actual Database ID copied above |
| Build variable `WORKER_NAME` | Optional, defaults to `law-school`; set it if your dashboard Worker has another name |

An automatically created Workers Builds API token can be used for deployment. Database migration commands additionally need D1 write permission on the intended account; the default build token may not include it. Apply the initial migrations separately with an account authorized to manage D1, rather than putting migrations into every automatic deploy.

The scripts generate ignored `wrangler.github.generated.jsonc` in the repository root, using the checked-in staging template and the validated build variable. It contains `APP_ENV=staging`, the real D1 binding, Workers Static Assets and `workers_dev=true`. Missing/malformed/known-local IDs stop the command before deployment. Syntax validation does not prove a database exists or belongs to this account; use the actual ID. Local configuration and existing local D1 data are unchanged. Only allowlisted build settings are copied; no OAuth secret is written into the generated file. `keep_vars=true` preserves runtime variables subsequently configured in the dashboard across redeployments.

Push the updated scripts and settings to GitHub before retrying. The build variable is supplied separately in the Cloudflare dashboard; no source edit is needed when entering the ID. Do not reuse this staging command for a production database.

## Initialize tables and finish runtime setup

For the initial schema, use the VS Code PowerShell terminal in the project directory. Set the same actual database ID and Worker name, authenticate to the intended Cloudflare account and apply the tracked migrations:

```powershell
$env:D1_DATABASE_ID = 'YOUR_ACTUAL_DATABASE_ID'
$env:WORKER_NAME = 'law-school'
npx wrangler login
npm run db:migrate:cloudflare
```

This command explicitly writes to the remote staging database. Inspect the account/database and migration confirmation before accepting. It applies the six tracked migrations; it does not upload local data, seed legal questions, create an administrator or configure Google. A successful Worker upload alone does not initialize tables. `/api/v1/ready` returns 503 until migration 0006 is present, then 200.

After upload, inspect the assigned HTTPS `workers.dev` URL. Under **Settings > Variables & Secrets**, set runtime `APP_ORIGIN` to that exact origin without a path, set `GOOGLE_CLIENT_ID`, and add `GOOGLE_CLIENT_SECRET` as a secret. These are runtime settings, distinct from build variables. Register the exact callback `<APP_ORIGIN>/api/v1/auth/google/callback` at Google. See [Google setup](GOOGLE-AUTH.md) for real-provider acceptance and administrator bootstrap. Never send the secret in chat or use `VITE_*` for it.

After migrations, verify `/api/v1/health` and `/api/v1/ready`, then real sign-in. Hosted load/quota testing, backup/restore and production release acceptance remain stage 6 work.
