# Backend development

## Current user workflow: public collections

Every registered account sees published test collections without enrollment or copying account IDs. Admin navigation contains Test collections, Question bank, Results and Users. Import and manual grading are actions inside these workflows.

Create a collection from an imported file or saved questions, choose always-available access or a shared Asia/Tashkent window, and click Publish collection. The browser prepares question versions in batches of five and publishes the immutable test version plus public catalog entry. Draft questions remain private until selected for publication. No separate per-question publishing action or group assignment is required.

`test_collections` and `attempts.collection_id` support group-free eligibility, reporting, single attempts and reopening. All mutation endpoints keep authentication, CSRF, active-role and ownership checks. Scheduled scores are available after submission, while answer keys remain withheld until the shared deadline. Each account has one attempt per collection across both languages, including always-available collections. Active attempts resume in their original language; submitted attempts open results instead of allowing a retake. Written answers without an accepted model remain provisional until reviewed.

Apply `0012_collection_single_attempt.sql` before deploying the single-attempt fix. Its insert trigger prevents retakes atomically without deleting historical duplicate attempts or results. A legacy active attempt can still be completed; otherwise the latest existing attempt is shown. Admin reopening creates a separate collection and remains the explicit way to grant a new attempt.

Apply migration `0009_public_test_collections.sql` before deploying the new Worker. It retains the latest legacy assignment window and adopts its attempts under the public collection without changing attempt IDs, saved answers or grades. Older histories and group tables remain for compatibility; groups are no longer required by the product workflow. Admin result history includes legacy attempts.

Validation commands: `npm run typecheck`, `npm test`, `python scripts/verify-collection-migration.py`, and (with a local production preview) `python scripts/verify-public-collections-ui.py`. The latter uses synthetic HTTP fixtures and never signs in to the live site.


The [backend architecture](superpowers/specs/2026-10-22-backend-design.md) was accepted on October 22, 2026. The [implementation plan](superpowers/plans/2026-10-22-backend-implementation.md) tracks six stages.

## Current scope

Stages 1–5 provide the Worker foundation, Google authentication, scoped accounts/groups and the server-backed student exam path. Catalog, start/resume, answer synchronization, checks, submission, expiry and grading now use D1. See [exam API and recovery](EXAM-API.md) and [Google setup](GOOGLE-AUTH.md). Teacher drafts, immutable publishing, scoped assignments and manual review are connected; see [teacher workflow and API](TEACHING-API.md). CSV/XLSX draft imports, saved questions, mistakes and bounded reports are connected; see [imports and reports](IMPORTS-AND-REPORTS.md). Real provider configuration, reviewed content and hosted load acceptance are still required before real assessments.

## Local setup

Use Node.js 22.12 or later and npm. No Cloudflare account, token, paid resource or Google credential is needed for automated local tests. Real sign-in requires a configured Google Web OAuth client.

```bash
npm ci
npm run build
npm run db:migrate:local
npm run dev:worker
```

Open `http://127.0.0.1:8787` for the built frontend and the same-origin API. Frontend changes require another `npm run build` when using this combined server. `npm run dev` still provides the separate Vite frontend development server on port 5173; it does not start the API.

Local D1 persists under `.wrangler/`, which is ignored by Git. Reapplying migrations skips tracked migration files. Never edit a migration after it has reached a shared/staging database; create the next numbered migration instead. Tests use disposable databases, not this local database.

## Implemented endpoints

| Endpoint | Behavior |
| --- | --- |
| `GET /api/v1/health` | Liveness only; no database read |
| `GET /api/v1/ready` | Checks that the required migration is applied; otherwise returns a safe 503 |
| `HEAD` on either endpoint | Same status/headers without response body |
| Unknown `/api` or `/api/...` | JSON 404, including browser navigation requests |
| Unsupported method on health/readiness | JSON 405 with `Allow: GET, HEAD` |

Both successful endpoints return `{"status":"ok","requestId":"..."}`. API responses have a server-generated `X-Request-Id`, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`. Expected errors use `{"error":{"code":"...","message":"..."},"requestId":"..."}`. Unexpected errors never echo exception text, SQL, headers or request bodies; logs contain a fixed event and request ID only.

Readiness is an operational schema check; it does not check Google provider configuration or exam functionality. The schema initially has no users, groups or login sessions. Real registrations occur only after validated Google login; tests use isolated synthetic accounts.

## Boundaries and layout

```text
server/
  index.ts              Worker entry; separates API from static assets
  app.ts                Hono API, request metadata, health and readiness
  env.ts                Worker bindings and per-request variables
  http/                 Safe errors and bounded JSON validation
  repositories/         Prepared SQL operations
  tests/                Worker-runtime and D1 integration checks
shared/contracts/       Public schemas; no server secrets or grading keys
migrations/             Numbered SQL schema migrations
wrangler.jsonc          Local Worker and local-only D1 binding
```

Browser, server and test TypeScript configurations are separate. Do not import `server/` from `src/` or put private fields into public contracts. The safe question schema strips private fields at every defined object level. Domain routes must parse their response through that contract before serializing.

The JSON reader enforces a 256 KiB limit against actual streamed bytes, including requests without a Content-Length header. Answer schemas cap snapshots at 100 answers, each written answer at 1,000 Unicode characters, and list pages at 100 items. The combined byte limit applies in addition to per-field limits. Handlers must additionally verify question membership, stable choice IDs, role/ownership, active attempt state, deadline and revision in their domain services; schema validation alone does not authorize an exam mutation.

The first migration creates users, Google identities, hashed sessions, transient login flows, groups, staff/group links, memberships and audit events. It enforces role/status enums, foreign keys, identity/enrollment uniqueness and maximum session/login-flow lifetimes. The third migration adds user revisions and a one-time operator bootstrap trigger. Application routes enforce sessions, CSRF and group access; SQL constraints alone do not replace authorization.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run build:worker
npm audit
```

`npm test` uses Vitest and Cloudflare's Worker test plugin. The real local D1 runtime applies the production SQL migration. Tests cover routing/error boundaries, oversized streamed JSON, Unicode limits, stripping answer keys, database constraints, migration reapplication and indexed access paths. They do not require OAuth credentials or contact Google.

`npm run build:worker` is a Wrangler **dry run** writing ignored files to `.worker-build/`; it does not upload a Worker, create a cloud database or run remote migrations. It expects `dist/` from the frontend build. GitHub Actions performs the build, Worker tests, dry run and dependency audit.

These checks do not measure hosted CPU quotas, network latency or 200-user capacity. Those remain stage 6 release gates.

The isolated local 100/200-user exam profiles can now be run with `npm run test:load -- autosave-background`. They exercise the frontend's partial-answer save/compact acknowledgement protocol, real session/CSRF handling and local D1, measure binding calls and row usage, and verify save/reconnect/submit correctness. See the [Uzbek optimization report](load-test/2026-10-25-autosave-background.md) and [earlier Free-tier findings](load-test/2026-10-25-hisobot.md). The full regression suite also checks the combined cron D1 budget, draining 200 expired attempts in eight runs, and autosave write amplification. Hosted acceptance remains separate.

The npm overrides keep Miniflare's Undici on patched 7.30.1 and reuse the application's patched Zod 4.6.7 throughout the dependency tree. The pinned test tooling otherwise pulls vulnerable Undici 7.29.1 and Zod 4.6.5, causing the CI audit to fail. Reassess these overrides when updating Cloudflare tooling; keep the audit enabled.

Foundation verification on October 22, 2026: all three TypeScript configurations and the frontend build passed; 36 Worker/D1 tests passed; both migrations applied locally; a clean `npm ci` succeeded and npm audit reported zero vulnerabilities. Five HTTP checks through a running local Worker confirmed health/readiness JSON, JSON 404s for two unknown API navigation requests, and the nested-route SPA fallback. The Worker dry-run bundle is approximately 60 KiB (16 KiB gzip). The existing frontend bundle-size warning remains; it is not a backend capacity result.

## Environment separation

For the first dashboard/GitHub deployment, follow [Cloudflare GitHub setup](CLOUDFLARE-GITHUB.md). Its dedicated commands generate a staging configuration from a real database ID; plain `wrangler deploy` still targets the local configuration.

- `wrangler.jsonc` uses a deliberately synthetic local database ID. Use it with `--local`; it is not a remote deployment configuration.
- Staging and production have separate checked-in `.example.jsonc` templates with deliberately invalid placeholder database IDs. Copy them to `wrangler.staging.jsonc` / `wrangler.production.jsonc` only when preparing the respective environment. Local copies are ignored.
- Each environment needs its own D1 binding and OAuth redirect configuration. Do not use production bindings in preview builds.
- Google client secrets and future session secrets belong in Worker secrets; local secret files belong in ignored `.dev.vars` files. Never use `VITE_*` for secrets.
- Actual remote database IDs and origins are filled in when preparing a deployment; local Google settings are described in GOOGLE-AUTH.md. GitHub deployment uses the explicit `build:cloudflare` and `deploy:cloudflare` commands documented in CLOUDFLARE-GITHUB.md; regular local build/test commands never deploy.

## Next stage

Stage 5 is implemented locally. Stage 6 covers hosted capacity, backup/restore and deployment acceptance. Real staging Google login and reviewed production content remain prerequisites; provider secrets are configured directly in the environment, never sent through chat.
