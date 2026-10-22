# Backend implementation plan

Date: October 22, 2026 (Asia/Tashkent).
Design: [accepted backend specification](../specs/2026-10-22-backend-design.md).

The referenced `writing-plans` skill is not installed in this workspace or the available skill directories. This document follows the accepted design directly. It records implementation tasks and acceptance checks; no additional architecture approval is needed.

## Delivery rules

- Implement stages in order. Keep stage completion evidence here and in the backend setup guide.
- Use local D1 and the Worker runtime for automated tests; never use production data in test runs.
- Keep frontend demo functionality available during foundation work. Do not advertise the app as an authenticated exam platform until the real student flow replaces the demo.
- Never create paid resources or deploy the application as a consequence of a build/test command.
- Preserve existing student browser data. Backend migration never accepts local demo scores as real achievements.

## Stage 1: foundation

1. Add Hono, Zod, Wrangler and compatible Vitest/Cloudflare test dependencies. Update the lockfile and keep Node.js 22.12+ support.
2. Add `server/`, `shared/contracts/`, and a separate backend TypeScript configuration. Typecheck browser and Worker code independently to prevent runtime-type leakage.
3. Implement `/api/v1/health`, a database readiness check, request IDs, safe JSON errors and no-store API responses. Unknown `/api` routes, including browser navigation requests, must never become the SPA HTML response. Unsupported methods must not mutate data.
4. Add bounded JSON parsing and explicit shared schemas for roles, pagination, request envelopes and safe question payloads. Verify unknown/private fields cannot enter a student response. Domain handlers will use these helpers in later stages; do not create fake success endpoints.
5. Add numbered D1 migrations for identity and access records. Use constraints for Google identity uniqueness, valid roles, session hashes, group ownership and enrollment uniqueness. Verify foreign keys and migration reapplication through the actual D1 test runtime.
6. Add a local-only Wrangler configuration using the existing frontend output as assets. Add separate staging/production templates without real database IDs or credentials. A documented local command applies migrations and serves frontend/API together.
7. Add tests for API routing, navigation fallback boundaries, validation, database availability/error redaction, constraints and query indexes. Add backend typechecking, tests and a Worker bundle dry run to CI.
8. Document local commands, environment separation, actual implemented endpoints, limits and the next stage. Record clean install/build/test/audit results.

Exit: actual local D1 migration and Worker API checks pass; browser build still succeeds; no cloud deployment or live OAuth setup is required for this stage.

## Stage 2: Google identity, roles and groups

1. Add Workers-compatible OIDC client and local/staging callback configuration. Implement start/callback with PKCE, ten-minute single-use state/nonce and signature/claim verification.
2. Add revocable hashed application sessions, expiry, authenticated-user middleware, same-origin/CSRF protections, safe logout and rate limits.
3. Add the registered-user admin bootstrap operator command; enforce admin-only staff changes and suspension with audited history.
4. Implement scoped group ownership, enrollment and staff/student queries. Add membership/role isolation tests, replay tests, bad-provider-response tests and fixed-expiry session tests.
5. Replace the demo sign-in with Google login behind the real backend flow; retain theme/language and explicitly separate demo history from real account records.
6. Perform a real staging login once the owner configures Google OAuth credentials and a registered redirect origin. Tests use mocked provider responses; they cannot certify real provider configuration.

Exit: local security tests pass and a real registered staging account can sign in/out. Provider credentials are set through secrets, never sent in chat or committed.

## Stage 3: student exam vertical slice

1. Add immutable question/test versions, assignment references and attempt migrations. Validate reviewed seed content and preserve stable choice IDs.
2. Implement eligible catalog/lobby routes and start/resume with attempt limits, database-enforced schedules and idempotency.
3. Implement bounded answer snapshots, optimistic revisions, receipt metadata, practice checks and privacy-filtered question responses.
4. Implement submission, expiry, bounded sweeper, server grading and provisional/final results. Store integer half-point units and algorithm versions.
5. Replace frontend mock question imports and grading calls with safe API contracts. Use account-scoped IndexedDB drafts and 15-second jittered synchronization. Remove private fixtures from browser bundles.
6. Test duplicate starts/submissions, two tabs, deadline races, uncertain retries, offline recovery, changed question versions and missing/forbidden objects.

Exit: an authenticated learner can complete an actual server-backed test; acknowledged answers survive reload; no answer keys leak before feedback is allowed.

## Stage 4: teacher authoring and review

1. Connect the bank/editor to question drafts and immutable publishing.
2. Connect the builder to draft/published test versions and scoped group assignments with explicit Asia/Tashkent schedules.
3. Implement the grading queue, revisioned item reviews, half-points, audited regrade and real student-result updates.
4. Verify unrelated teachers cannot access another teacher's groups/answers and editing a question does not rewrite old attempts.

Exit: a teacher creates, publishes, assigns and reviews an assessment end to end.

## Stage 5: import and learner reporting

1. Replace the demo import with CSV/XLSX parsing in a browser worker; revalidate canonical row payloads on the server.
2. Enforce 5 MB/1,000-row limits, remove legacy XLS claims, require explicit commit and create drafts. Make chunk retry/commit safe with import-job state.
3. Implement bookmarks, mistakes, own history/progress and bounded staff analytics from actual records.
4. Test duplicate rows/commits, invalid data, inaccessible imports and reporting filters. Verify analytics do not scan/rewrite all attempts on every save.

Exit: imported content and progress reflect real authorized data, and imports do not block the exam request path.

## Stage 6: capacity and release

1. Complete browser journeys and integration/security tests using disposable accounts and databases.
2. Load-test 200 sessions for 30 minutes, plus 200 starts/finishes in ten seconds. Record latency, failures, CPU and D1 row usage.
3. Evaluate full daily workload against the accepted headroom thresholds, not just instantaneous concurrency. Do not claim Free suitability when CPU or quota enforcement has not been tested.
4. Rehearse export/restore into an isolated database and Worker rollback against compatible migrations.
5. Prepare staging/production resource bindings, Google origins, first admin, reviewed content, monitoring and operator commands.
6. Present concrete staging evidence before the production deployment decision. Paid-plan activation remains separately authorized.

Exit: all accepted capacity/integrity gates pass and the operator can restore data. Production deployment is recorded only when it actually occurs.

## Progress

- Architecture: accepted.
- Stage 1: completed locally on October 22, 2026. Evidence: frontend/server/test typechecks, frontend build, 36 Worker/D1 tests, two locally applied migrations, Worker bundle dry run, clean `npm ci`, zero npm audit findings, and five HTTP checks through the live local Worker (health, readiness, two API navigation 404s, nested SPA route).
- Stages 2–6: queued in dependency order.
- Production deployment: not performed.
