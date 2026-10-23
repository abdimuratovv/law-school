# Server-backed examinations

Stage 3 implements the learner examination path on the existing same-origin Worker/D1 backend. Google login configuration is described in [GOOGLE-AUTH.md](GOOGLE-AUTH.md). Real Google-provider acceptance, reviewed production content, reporting and hosted capacity acceptance remain release prerequisites.

## Local sample

```bash
npm run build
npm run db:migrate:local
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --file server/fixtures/local-exam.sql
npm run dev:worker
```

The optional SQL file publishes a **synthetic controls exercise**, not a law assessment. It is safe to reapply and creates no users or sessions. Tests validate its JSON against the same private question contract used by the server. Never treat the archived artboard examples in `server/fixtures/*.txt` as reviewed/published content. They are outside browser imports and Worker imports. Public `/design` and the controls tutorial use three deliberately trivial, separate examples whose answers are intentionally public.

Without the optional seed, a new database has an empty catalog. After configuring Google, a registered account can start the local sample. There is no HTTP endpoint for creating a fake login. The browser test described below inserts a fixture session directly into its own temporary local database.

## API

All endpoints require an active session. Mutations additionally require exact same-origin `Origin`, the session's `X-CSRF-Token`, JSON content type and the existing per-user mutation rate limit. Unknown/inaccessible object IDs return 404.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/v1/exams?limit=25&after=...` | Eligible public practice and enrolled group assignments; metadata only; maximum page size 100 |
| `GET /api/v1/exams/:examId` | Lobby metadata and opening time |
| `POST /api/v1/exams/:examId/start` | `{operationId: UUID}`; starts/resumes an attempt and returns its stable server ID |
| `GET /api/v1/attempts?limit=25&before=...` | Own bounded history; opaque `(startedAt,id)` cursor preserves tied timestamps |
| `GET /api/v1/attempts/:attemptId` | Own attempt, safe questions, acknowledged snapshot and permitted feedback |
| `POST /api/v1/attempts/:attemptId/save` | Atomic answer snapshot with revision compare-and-set |
| `POST /api/v1/attempts/:attemptId/check` | Same snapshot plus `questionId`; checks and locks an answer in public practice |
| `POST /api/v1/attempts/:attemptId/submit` | Atomically freezes the snapshot and runs server grading; retries return the frozen result |

Save/submit bodies contain `revision`, UUID `operationId`, `answers` keyed by question-version ID, `flags` as an array, and optional `currentQuestionId`. Single-choice answers contain the stable **option ID**, never the displayed A/B/C/D position. Check accepts an additional `questionId`. Unknown fields, questions or options are rejected. Limits are 100 questions, 1,000 Unicode characters per written answer and 256 KiB per request.

Exam IDs use `p_<test-version-id>` for public practice and `a_<assignment-id>` for assignments. Attempt URLs use the returned UUID, independent of the exam ID. A legacy local demo URL is not a real attempt.

## Integrity and privacy

- Published question/test versions and assignments reject updates. Test references must exist, be unique and contain 1–100 questions. Attempts pin the test/version IDs and persist question/option permutations at start.
- Start checks the server clock, active account and current membership at the SQL write. Group attempts are unique per student/assignment; one active public-practice attempt is reused. A separate start-operation mapping preserves retry identity after completion.
- Answers live in one bounded JSON document per attempt. A save increments its revision in a single conditional SQL update. Stale tabs get 409 and cannot overwrite newer snapshots. The last 16 operation receipts recognize uncertain save/check retries; receipt eviction never permits a stale revision to overwrite newer answers.
- SQL enforces the deadline on every answer mutation. The deadline is the earlier of duration and assignment close. Untimed public practice has no deadline. Late submission freezes and grades only the last acknowledged snapshot, ignoring late browser edits and browser timestamps.
- Submission/expiry freezes first, then computes a grade from the immutable version and frozen revision. Conditional result persistence makes interrupted grading resumable. Requests finalize overdue attempts independently of the scheduled job; the existing 15-minute cron also processes at most 25 overdue/submitted attempts per invocation. Catalog/history list reads do not sweep an entire account.
- Correct choice answers receive 2 integer half-point units; wrong/unanswered receive 0. Written answers normalize NFC, whitespace and case. Exact matches receive 2; distance at most 2 or no model answer stays pending; other answers receive 0. Distance checking is banded and bounded. The result records algorithm `nfc-distance2-v1`. Pending results remain provisional until an authorized manual review; see [teacher review](TEACHING-API.md).
- The safe question response is allowlisted. Active exams do not receive keys, accepted answers or explanations. Public practice receives feedback only for checked/locked questions. Group checks are disabled; group feedback requires assignment closure **and** a final result. Teachers do not gain access through the learner endpoints; scoped teacher review is available through the separate staff API.
- Current membership is checked again when saving an assigned attempt. Former members may still read their own existing attempt, but cannot write new group answers.

## Browser recovery

Real exam screens use API data and server grading. Local legacy `hm.*` scores and `hm.account.*.demo.*` exam records never become real results. Teacher authoring and review now use the scoped staff API. The mistakes/reporting section shows an unavailable state until stage 5.

IndexedDB database `hm-exam-drafts-v1` stores draft records under `<user-id>:<attempt-id>`. Edits persist locally immediately; dirty drafts sync every 15–17 seconds with jitter and on reconnection. Explicit check, submit and Sync now actions may send immediately. In-flight operations keep their original ID and payload for retry. Server acknowledgements are displayed separately from local changes, alongside the last server save time. Unload warns about unsynced work; correctness does not rely on an unload network request.

On a revision conflict the browser requires an explicit **Use server version** action. It explains that this discards that tab's unsynced draft. Reload otherwise recovers a same-revision local draft. Logout/account changes clear account-specific IndexedDB drafts; acknowledged server answers remain. Sync before logout. If local storage is unavailable, keep the tab open and explicitly sync; unsynced recovery cannot be guaranteed in that browser.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run build:worker
npm run verify:exam-bundle
python -X utf8 scripts/verify-exam-ui.py
```

The browser script requires Python Playwright and installed Google Chrome. It launches a local Worker on port 8788 with an isolated temporary D1 database, applies migrations, inserts a synthetic account/session directly, exercises actual API calls, and removes its temporary data. It does not mock exam responses, contact Google or change the normal local database. It covers reload recovery, checked-answer locking, offline/reconnect, two-tab conflicts, submission and history. Authentication UI fixtures remain in `scripts/verify-auth-ui.py` against a separately running local Worker on port 8787.

Local correctness checks do not establish hosted Free-plan CPU/request/D1 quota headroom. The accepted 200-session/30-minute load test and simultaneous start/finish bursts are still stage 6 gates. No cloud resources or deployment are created by these commands.

Local verification on October 23, 2026: 90 Worker/D1 checks in total (65 existing foundation/auth/access checks and 25 exam/grading checks), all three typechecks, production frontend build, private-fixture bundle scan, Worker bundle dry run, local migration/seed, 15 authentication UI checks and 13 actual Worker/D1 exam browser checks passed. npm audit reported zero known vulnerabilities. The main browser bundle is approximately 615 kB (194 kB gzip); its existing size warning remains. These results do not certify hosted Free-plan performance or live Google configuration.
