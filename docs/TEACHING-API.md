# Teacher authoring, assignments and manual review

Stage 4 connects the question bank, editor, builder, groups and grading screens to the same-origin Worker/D1 API. Staff accounts must already exist through Google registration and have an administrator-assigned role. See [Google setup and role bootstrap](GOOGLE-AUTH.md). This implementation does not create a demo sign-in or promote the first visitor.

## Local setup and workflow

```bash
npm run build
npm run db:migrate:local
npm run dev:worker
```

After configuring Google and bootstrapping the first administrator:

1. An administrator assigns teacher roles through the existing account API, creates a group in `/admin/students`, and links its teacher by registered account ID. Students/teachers can find their own account ID in `/profile`.
2. The group's teacher enrolls existing registered students by account ID. Students cannot enroll themselves or create accounts through this form.
3. In `/admin/editor`, create a choice or written draft, save it, then publish its saved revision. Written accepted answers are one per line; an empty list requires manual review. Choice questions require four nonempty options and a correct stable option ID. Matching blocks, HTTPS legal references and explanations are supported.
4. In `/admin/builder`, save a test draft using explicitly selected published question versions, then publish it. Mock tests require a duration; public tests must be practice. The test name and composition are frozen in the published version.
5. Choose an authorized group and opening/closing times, then assign the published test. All schedule inputs explicitly use **Asia/Tashkent (UTC+05:00)**, including on devices in another time zone. The API accepts the explicit `+05:00` offset and validates real calendar dates.
6. The enrolled learner completes the assigned test using the [exam API](EXAM-API.md). A result containing pending written answers remains provisional.
7. Open `/admin/grading`, select a queued attempt, and apply 1, 0.5 or 0 points with an optional comment. The actual learner result updates. Completed group attempts can also be opened from the assignment overview for deliberate, audited corrections.

Drafts save explicitly to D1. The interface warns before leaving with unsaved edits; unsaved authoring work is held in that page's memory and is not guaranteed after reload. Reloading the saved version requires confirmation before discarding local edits. Former browser-only teacher drafts are preserved separately and are never silently uploaded or published. Import and analytics remain pending stage 5.

## Authorization

All `/api/v1/staff/...` routes require an active teacher/admin session. Writes additionally require the same Origin/CSRF/rate-limit controls as examination writes. Permission checks occur again in conditional SQL writes, not only in page navigation.

- A teacher reads/edits/publishes their own question/test drafts. Administrators can manage all drafts. A test can include only question publications the actor is permitted to use.
- Assignment creation requires both an accessible current test publication and an assigned group. Student enrollment and group/teacher management reuse the scoped stage 2 APIs.
- Review access follows **current group-teacher membership**, independent of who wrote the question or created the assignment. An unrelated teacher cannot inspect learner answers or infer an accessible assignment through the results list.
- Only administrators can review unassigned public-practice attempts. Owning a public practice test does not authorize its author to inspect every registered learner.
- A learner cannot use staff endpoints. Staff endpoints do not expand permissions on the existing owner-only learner endpoints.
- Group answer keys and review comments remain hidden from the learner until the assignment closes and the learner's result is final. Public-practice feedback follows its existing check/final-result rules.

## Endpoints

All paths below are relative to `/api/v1`. Lists use `limit` (default 25, maximum 100), `after`, and return `{items, next}`. Group APIs retain their existing `cursor`/`nextCursor` contract.

| Endpoint | Request / response |
| --- | --- |
| `GET /staff/questions` | Accessible editable question drafts, revisions and latest publication IDs |
| `POST /staff/questions` | `{operationId, content}` creates a draft; the UUID identifies a retry of that create request |
| `GET /staff/questions/:id` | Accessible draft with its private authoring fields |
| `PATCH /staff/questions/:id` | `{revision, content}`; conditional revision update |
| `POST /staff/questions/:id/publish` | `{revision}`; returns `{versionId}` |
| `GET /staff/question-versions` | Accessible published version metadata for the builder, including source draft revision |
| `GET/POST /staff/tests` | List/create test drafts; create body `{operationId, content}` |
| `GET/PATCH /staff/tests/:id` | Read/update a draft with the same revision rules |
| `POST /staff/tests/:id/publish` | `{revision}`; freezes composition and returns `{versionId}` |
| `POST /staff/assignments` | `{operationId, testVersionId, groupId, timeZone:"Asia/Tashkent", opensAt, closesAt}` |
| `GET /staff/assignments` | Authorized group assignments and schedules |
| `GET /staff/assignments/:id/attempts` | Authorized learner attempts/results for an assignment |
| `GET /staff/reviews` | Authorized submitted results containing pending items |
| `GET /staff/reviews/:attemptId` | Frozen answers, original private rubric, applied overrides and aggregate grade revision |
| `POST /staff/reviews/:attemptId` | `{revision, operationId, questionId, units, comment}`; `units` is integer 0, 1 or 2 |

Question draft content is defined by `questionDraftContentSchema`. It can retain incomplete stems/options while editing; publication validates the complete private question contract. Test draft content is `{name, mode, durationSeconds, questionVersionIds, isPublic}`. A published test contains 1–100 unique, accessible question-version IDs. All JSON mutations remain bounded by the existing 256 KiB reader.

Schedule strings have the form `2026-10-23T09:00:00+05:00`. Closing must follow opening and still be in the future at the SQL write. Assignments pin published versions and cannot be edited in place. Correct a schedule by creating an explicitly new assignment; the first release has no cancellation/delete workflow.

## Versioning, retries and grading integrity

- A draft edit uses compare-and-set and increments its revision. Stale edits return 409 and keep the page's local text available for an explicit reload. A timed-out draft edit may already have committed: inspect the saved version before replacing it.
- Publishing is idempotent per logical draft/revision. Concurrent retries produce one immutable version and one publication audit record. Changing a draft does not modify the previous publication. Existing attempts continue to grade with their pinned keys, including after an author publishes a different correct answer.
- Publishing a new test edition removes older authored editions from the public catalog. It does not rewrite/cancel already assigned tests or existing attempts; those remain readable through their attempt IDs/history.
- Assignment retries use the same operation ID and exact payload; reuse with another payload is rejected. If the outcome is uncertain after reloading the authoring page, inspect the assignment overview before creating another assignment.
- Manual review overrides only written items belonging to the frozen attempt. It never changes the submitted answer snapshot. Automatic choice grades remain fixed.
- Review updates compare the aggregate `grade_revision`, atomically update the result and unique per-item review, and write an audit event in one D1 batch. A competing reviewer gets 409 rather than overwriting a newer result. Identical retries of the latest accepted operation do not add another item revision/audit record.
- Totals are recomputed from the original immutable questions, frozen answers and all applied item overrides. Pending counts decrease only as decisions are applied. Integer half-point units avoid floating-point rounding. Learner feedback includes the applied partial/full/zero decision and released comment.
- Corrections create another grade/item revision and audit event containing actor, previous/new units, comments and aggregate grade revision. No HTTP route resets or deletes review history.

## Verification and release boundary

```bash
npm run typecheck
npm test
npm run build
npm run verify:exam-bundle
npm run build:worker
python -X utf8 scripts/verify-teaching-ui.py
```

The browser script uses installed Chrome/Playwright, port 8789 and an isolated temporary D1 database. It inserts synthetic teacher/student sessions directly, then uses real UI/API calls to create, publish, assign, submit, review and correct a result. Browser time is deliberately America/New_York to verify explicit Tashkent schedule handling. It checks staff/learner isolation and never contacts Google or uses a cloud database. Existing learner recovery and authentication UI scripts remain separate regression checks.

Local build, correctness and authorization checks do not certify real Google OAuth configuration, reviewed legal content or hosted 200-user quota/CPU headroom. These are still release prerequisites. No cloud deployment or paid resource is created by these commands.

Local verification on October 23, 2026: 106 Worker/D1 tests passed, all three TypeScript configurations passed, the frontend build/private-fixture scan/Worker dry run passed, and migration 0005 applied to normal local D1. Browser verification passed 17 actual teacher/learner checks, 13 actual learner recovery checks and 15 authentication UI checks. npm audit reported zero known vulnerabilities. The main browser chunk is approximately 627 kB (197 kB gzip); its existing size warning remains open and is not a capacity result.
