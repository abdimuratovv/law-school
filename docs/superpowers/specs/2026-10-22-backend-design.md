# Backend architecture and delivery roadmap

**Status:** Accepted by the project owner on October 22, 2026; implementation in progress.
**Date:** October 22, 2026 (Asia/Tashkent).
**Project:** Huqiq Mektebi / `abdimuratovv/law-school`.

## 1. Confirmed requirements

- Keep the existing React/Vite student and teacher interfaces and three interface languages.
- Support Google sign-in. SMS and password authentication are outside the first release.
- Anyone may register and use published public practice sets. Teachers assign access to group tests.
- Target 100–200 simultaneous learners, including bursts when exams start and finish.
- Start with free hosting where practical. Capacity and cost must be measured; free production capacity is not guaranteed. No paid plan is authorized by this design.
- Implement the backend before deploying a functioning exam application.

The project owner approved this architecture, roadmap and product defaults, including scoring, attempt limits and feedback policies. Deployment and any paid services remain separate decisions after validation.

## 2. Architecture decision

Use a modular TypeScript application deployed to Cloudflare: Workers Static Assets serves the frontend, a Worker handles `/api/v1/*`, and a D1 database stores application records. Frontend and API share one origin. Give API routing precedence over the SPA fallback; unknown API paths must return JSON 404 responses, never `index.html`.

| Option | Benefits | Trade-offs | Decision |
| --- | --- | --- | --- |
| Workers + D1 | One provider, shared TypeScript, no continuously running application server to maintain | CPU/daily quotas; D1 write throughput needs measurement; SQLite-specific SQL | Recommended for this release |
| Cloudflare frontend + Supabase | PostgreSQL and managed authentication | Second provider, cross-service integration, free project inactivity policy | Alternative if managed auth/PostgreSQL becomes the priority |
| Node API + PostgreSQL on a server host | Familiar server runtime and broader database tooling | Separate services and operating cost; free hosting may suspend idle servers | Revisit if requirements outgrow Workers |

Use Hono for HTTP routing, Zod for request validation, `oauth4webapi` for Google OpenID Connect, and prepared SQL through D1 bindings. Use numbered SQL migrations managed with Wrangler. Keep dependencies pinned in the lockfile; verify compatible versions at implementation time.

Separate HTTP handlers, authorization rules, domain services, database repositories, and public response types. Do not let browser code import server modules. Keep the current frontend directory structure; add `server/`, `shared/contracts/`, and `migrations/` during implementation. Shared contracts contain safe API shapes, never answer keys or provider secrets.

The first version is a single school application, not a platform for isolated schools. Teachers see only the groups and assignments they manage; administrators manage the entire school. Student registration does not grant staff privileges.

## 3. Identity and access

Google identifies the person; application roles and membership determine access.

- Use the server authorization-code flow with `openid email profile`, state and nonce checks, and PKCE. Validate signatures and issuer, audience, expiry, nonce, and verified-email claims using the OIDC client. Identity is keyed by Google's stable `sub`, not by a changeable email address.
- Login state lasts ten minutes and is single-use. Store its verifier/nonce server-side, bound to an opaque short-lived cookie; consume it atomically before completing login. Cache provider discovery/signing metadata according to provider guidance.
- Create an opaque random application session after login. Store only its token hash in D1. Use a host-only `HttpOnly; Secure; SameSite=Lax` cookie with a fixed seven-day expiry. Do not keep authentication tokens in localStorage or persist Google access/refresh tokens for this login-only application.
- Read session expiry, user status, and role on protected requests. Do not update the session record on every API call. Logout revokes the session; account suspension blocks access on subsequent requests.
- For mutations require a valid session, same-origin checks and a session-bound CSRF token. No mutating GET routes. Return safe errors without tokens, SQL details, or private answer content.
- New users become students. Teacher/admin elevation is admin-only and audited. Bootstrap the first admin through a one-time operator command targeting a verified registered Google identity; there is no public role-setting endpoint or permanent first-user-admin rule.
- Teachers manage their assigned groups and assessments. They cannot promote users or inspect unrelated students. Publicly registered students cannot assign themselves to a group; staff enroll existing users.

Use a Google Cloud OAuth client with exact development, staging, and production redirect URIs. Production credentials live in Worker secrets, never in GitHub files or `VITE_*` values.

## 4. Data model

Use server-generated IDs, foreign keys, uniqueness constraints and UTC timestamps. Display dates in the user's interface locale, with assignment scheduling explicitly using Asia/Tashkent.

| Records | Responsibility |
| --- | --- |
| `users`, `identities`, `sessions`, `login_flows` | Accounts, Google identity, revocable login sessions, transient OAuth flows |
| `groups`, `group_teachers`, `group_memberships` | Staff ownership and student enrollment |
| `questions`, `question_versions` | Editable question identity and immutable published content, including private grading rules |
| `tests`, `test_versions`, `test_version_items` | Draft builder configuration and frozen published compositions |
| `assignments`, `assignment_groups` | Group visibility, open/close times, pinned test version, attempt allowance and feedback policy |
| `attempts` | Student ownership, pinned version, question/option order, answer snapshot, revision, times, status and score snapshot |
| `attempt_item_reviews` | Unique per-item grading overrides, reviewer, revision and comment |
| `saved_questions` | Student-owned practice bookmarks |
| `audit_events`, `import_jobs` | Staff action history and import validation/commit status |

Keep one bounded answer JSON document per attempt during editing. A successful autosave updates that row with a revision comparison. Avoid one database write per displayed timer tick, keystroke, or answer row. Materialize per-item review records when required by grading; dashboard summaries must not rewrite on every autosave.

Index identity/session lookups, membership, published catalog filters, student attempt history, assignment attempt uniqueness, expiry/status sweeps, and teacher grading queues. Avoid indexing frequently changed answer/revision fields. Verify actual query plans and measured row counts.

Published question and test versions are immutable. Editing creates a new version. Attempts reference the selected version and keep scoring results; later editing must not silently change historical results. A deliberate regrade creates an audited grade revision.

## 5. Exam rules and concurrency

### Start

Check account status, publication, assignment membership, schedule, and attempt allowance on the server. Public practice can be repeated; group assessments allow one attempt per assignment in the initial release. Reuse an existing active attempt when the same learner opens the same practice set again.

The server sets `startedAt` and, for timed/group assessments, `endsAt = min(startedAt + duration, assignment close time)`. Untimed public practice has no deadline. Pin test version, question order and any option permutation at creation. Use stable option IDs for answers; displayed A–D letters are presentation only.

A client-generated idempotency key makes a retried start return the same attempt. Constraints prevent concurrent requests from creating an extra group attempt. Different start keys still obey the allowance. Validate all rules again in the database write path rather than trusting an earlier read.

### Save and resume

Persist local answer drafts immediately in IndexedDB, scoped by authenticated user and attempt. Existing demo `hm.*` sessions are never uploaded as real results. Keep theme/language preferences separate. Clear cached private account data on logout/account changes; explain that unsynchronized drafts will be lost before completing an interactive logout.

While answers are changing, synchronize a bounded snapshot at most once per 15 seconds, with randomized timing to spread writes. Save when the learner explicitly submits, and on returning online when the deadline permits. A failed tab-close request cannot be relied upon; show the last server acknowledgement and unsaved state.

Each mutation includes the expected server revision and an operation ID. The server atomically checks ownership, active state, deadline and revision before accepting answers. A stale tab receives `409` with the current revision and must not silently overwrite newer work. Retrying a previously accepted operation returns its acknowledgement. Keep bounded operation receipt metadata with the attempt; do not grow an unlimited log of every autosave.

Initial limits: at most 100 questions per published test, 1,000 Unicode characters per written answer, and a 256 KiB maximum answer mutation body. Enforce the limits on the server and validate existing seed sets before enabling them. These bounds keep validation, storage and grading predictable.

### Submit and expiry

Use an attempt state transition guarded by revision and active status. Submission and its accepted final answer snapshot are committed together. Retries return the existing submitted result. A zero-row conditional update is a conflict, not success.

Accept answer changes only when the database write-time deadline check passes. A submission received after the deadline can finalize the last server-saved answers, but cannot introduce late edits. Browser timestamps do not prove an offline answer was written before expiry. The UI must distinguish local unsynchronized work from accepted exam answers.

A scheduled, bounded sweeper finalizes expired attempts and prepares review summaries. Every relevant read/mutation also enforces expiry, so correctness never depends on the sweeper running at an exact second. Sweep, save and submit races must result in one frozen answer snapshot. Compute results from that frozen revision and persist them conditionally so a competing request cannot replace a newer grade.

Do not hold a database transaction open across network requests. Prefer single conditional statements; keep multi-record operations within supported database primitives and verify their failure behavior. Split large imports into recoverable chunks, separate from exam requests.

## 6. Grading and feedback

- Multiple choice: correct option earns 1 point; otherwise 0.
- Written answers: Unicode NFC normalization, whitespace normalization, and case folding that preserves Karakalpak distinctions. An accepted exact match earns 1 point. An edit distance of at most two goes to manual review; no accepted answers also means manual review. Other answers earn 0. Use bounded edit-distance processing with early termination.
- Teacher decisions are 1, 0.5, or 0 points. Keep integer half-point units internally to avoid floating-point rounding. Pending items remain pending, not incorrect.
- Total score is earned points divided by maximum points. A result containing pending items is explicitly provisional and becomes final only after required reviews. Store the grade algorithm version and any teacher overrides.
- Public practice can reveal a question's feedback after a server-side check, which locks that answer for the current attempt. Mock exams never offer per-question checking.
- Group tests reveal answer keys only after the assignment closes and that student's result is final. Teachers/admins may review keys earlier. This policy also applies to result/review endpoints, not just UI controls.

Build student question payloads with explicit allowlists. They exclude `correct`, accepted answers, explanations and private metadata while feedback is unavailable. Published production frontend assets must not contain imported private question fixtures or answer keys. The production `/design` page uses purpose-built public examples if it is retained.

## 7. API outline

| Area | Main operations |
| --- | --- |
| Identity | Google start/callback, current user, CSRF token, logout |
| Catalog | List eligible tests, inspect lobby and assignment rules |
| Attempts | Start/resume, load safe questions, save answers, check a practice answer, submit, fetch result/review |
| Learning | Own history/progress, saved questions, own mistake review |
| Staff authoring | Question draft/version, publish/archive, test draft/publish, validation-first import |
| Groups | Admin staff management; authorized teacher group membership and assignments |
| Grading | Authorized queue, per-item review with revision guard, audited regrade |
| Operations | Minimal health response, request IDs and structured error codes |

Use `/api/v1` and shared validated request/response contracts. Paginate list endpoints with a maximum page size of 100. Return `401` for missing login, `403` for forbidden roles, `404` for inaccessible private objects, `409` for revision/attempt conflicts, `413` for oversized input, `422` for validation errors, and `429` for deliberate application rate limits. Transient service failure gets a retryable response; quota exhaustion must not be mislabeled as successful saving.

Protected responses use `Cache-Control: no-store`; public catalog summaries may be cached without private fields. Apply stricter abuse limits to login/start/import operations than to answer saving, accounting for many students sharing one school's IP. Retry network/5xx failures with bounded exponential backoff and jitter; respect `Retry-After`.

## 8. Capacity and cost model

These are planning calculations, not benchmark results.

- 200 active learners saving once per 15 seconds generate about 13.3 save requests/second, or 48,000/hour if every interval contains changes.
- Two such hours produce 96,000 save requests before login, starts, results, staff work, and retries. A free deployment therefore cannot promise unlimited daily exam sessions.
- One successful save should normally change one attempt row. Additional indexes, grading, sessions, imports and housekeeping still consume database usage. Fewer HTTP requests do not automatically mean fewer database writes.
- Keep the browser timer local, use no heartbeat write, fetch safe question sets at start/resume, and avoid repeated full-table analytics scans. Auth sessions do not need Google verification or a session write on every request.

As checked on the design date, Workers Free permits 100,000 daily requests and 10 ms CPU per invocation. Measure validation, cold/warm OIDC, and worst-case grading CPU; OAuth CPU may fail this budget even at low traffic. Static assets served directly are separately unmetered by Worker request billing. See [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [pricing](https://developers.cloudflare.com/workers/platform/pricing/).

D1 Free includes 5 million rows read/day and 100,000 rows written/day; indexes can add writes. Its account storage allowance is 5 GB, but each free database is limited to 500 MB. An individual database handles queries sequentially, so query duration determines throughput. See [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [limits](https://developers.cloudflare.com/d1/platform/limits/), and [concurrency guidance](https://developers.cloudflare.com/d1/reference/faq/#concurrency-and-throughput).

Use 70% of the applicable daily allowance and 350 MB per database as internal planning thresholds to leave headroom. Measure the expected full daily workload, not just a short 200-user burst. If the forecast exceeds a threshold or CPU/latency gates fail, reduce work, choose another architecture, or request a paid plan decision before admitting that workload. Workers Paid currently starts at $5/month with usage-dependent charges; this is an alternative, not an approved expense or a total bill guarantee.

## 9. Build roadmap and exit criteria

Deliver a complete student exam path first, then teacher authoring, then operational readiness. Later milestones depend on the earlier ones.

| Stage | Deliverables | Exit criteria |
| --- | --- | --- |
| 1. Foundation | Worker routing, D1 migrations, validation/error contracts, local setup, separate staging/production configuration, CI extensions | Local migrations and integration checks pass; API paths cannot fall into SPA routing; no server secrets enter browser assets |
| 2. Identity and access | Google login, sessions/logout, student registration, admin bootstrap, staff roles, group membership | Real staging Google login succeeds; replay/CSRF tests pass; suspended users and unauthorized staff cannot access protected objects |
| 3. Exam vertical slice | Reviewed seed content, catalog, immutable published versions, start/resume, revisioned saving, submit/expiry, server grading and results | A real account completes an exam end to end; multiple tabs, retries and deadline races do not corrupt accepted answers or create duplicate results |
| 4. Teacher operations | Real question bank/editor, test builder, schedules/group assignment, manual grading and audit trail | An authorized teacher publishes and assigns a new assessment; only enrolled students see it; grading updates the correct student's result |
| 5. Import and learning | CSV/XLSX validation preview, explicit import commit, bookmarks, history, progress and bounded analytics | Actual file contents are validated; invalid rows are reported; repeated commit is safe; all history/analytics comes from authorized real records |
| 6. Reliability and release | Integration/browser/concurrency tests, load test, usage forecast, backup/restore rehearsal and deployment runbook | Capacity/CPU/cost gates below pass; staging acceptance succeeds; production credentials and content are ready |

Imports in the first release support CSV and XLSX, up to 5 MB and 1,000 rows. Legacy binary XLS is explicitly unsupported and removed from the current demo's accepted-file description. Parse preview data in a browser worker; revalidate canonical rows and staff permissions on the server. Create draft questions only until an authorized publish action. Heavy parsing and imports must not run on the hot exam save/submit path.

No real-time sockets, payments, AI grading, proctoring, multi-school tenancy, or binary asset uploads are included. Add object storage or a job queue only when a concrete feature needs it.

## 10. Verification and release gates

Use Vitest/Cloudflare's Worker test environment for domain and D1 integration cases, Playwright for browser journeys, and k6 or an equivalent reproducible HTTP load generator for concurrent attempts. Select compatible versions during stage 1.

- Authorization: student A cannot read/change student B's attempts; staff cannot cross group boundaries; clients cannot elevate roles; keys never leak through exam payloads or frontend assets.
- Integrity: duplicate start/submit, two-tab saves, save versus expiry, teacher review conflicts, changed question versions, local clock manipulation, request replay, and failures between operations.
- Recovery: reload/offline resume before expiry, explicit late-answer rejection, server-confirmed receipt after uncertain submission, Google refusal/unavailability, quota errors, and restored database validation.
- Load: ramp to 200 active exam sessions and maintain them for 30 minutes with realistic changed answers and 15-second jittered saving. Separately test 200 starts in ten seconds and 200 submissions in ten seconds. Include maximum-size valid written answers and staff activity.
- Targets: p95 save/load API latency below one second, p95 submit-to-result response below two seconds, and unexpected 5xx/network failures below 0.5% in the controlled load test. Expected validation/conflict responses are counted separately. Zero acknowledged answer loss, duplicate submissions or cross-user leaks is mandatory.
- Record the load-generator location, data size, SQL row metrics, CPU distribution, daily usage forecast and whether actual deployment quotas were enforced. Local emulation is not evidence of hosted capacity. Staging load tests use test identities and never real students' sessions; real Google authentication is smoke-tested separately from bulk session traffic.
- A Free release requires representative endpoints to remain below the actual per-invocation CPU cap, not just the average. If a staged environment cannot enforce that cap, validate it on a suitably constrained deployment before claiming Free compatibility.

## 11. Deployment, backups and rollout

1. Create separate local/staging/production databases and separate OAuth redirect configuration. Never point a preview deployment at production student records.
2. Apply reviewed additive migrations to staging, seed reviewed content, and run the complete acceptance path. Existing fabricated demo attempts stay local and are never migrated as real achievements.
3. Configure request/error/latency and database quota monitoring with redaction. Logs exclude cookies, Google tokens and raw written answers.
4. Before production migrations, export the database and rehearse restore to an isolated database. Rehearse Worker rollback against compatible schema. D1 Free Time Travel is seven days; exports are also required before risky changes.
5. Prepare the first administrator, published content, operator instructions and confirmed daily workload. Production exposure and any paid upgrade require an explicit deployment decision after staging results are reviewable.
6. Deploy frontend and API together, verify Google sign-in and nested-route refreshes, run a controlled small cohort, then admit 100–200 users only after the capacity gates pass.

Application rollback must preserve saved attempts. Do not clear users' browser storage or overwrite production content with demo fixtures. Keep database exports private and out of Git.

## 12. Review checklist

- Confirm the recommended Cloudflare architecture and stage order.
- Confirm the proposed one-attempt group policy, repeatable public practice, feedback timing, and half-point manual grading.
- Confirm the first-release bounds (100 questions/test, 1,000 written-answer characters, CSV/XLSX imports).
- Accept the distinction between locally drafted answers and server-accepted answers at the deadline.
- After approval, turn the roadmap into small implementation tasks with exact migration/API/test changes. This document does not authorize paid services or claim that capacity has already been proven.

## References

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google server authorization flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [oauth4webapi runtime support](https://github.com/panva/oauth4webapi#supported-runtimes)
- [Cloudflare D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
