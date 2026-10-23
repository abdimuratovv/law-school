# Imports and learning reports

Stage 5 uses real authorized D1 records. Apply migration `0006_imports_and_learning.sql` with `npm run db:migrate:local` before starting the local Worker. Production resources are not changed by this command.

## Importing questions

Open `/admin/import` as a teacher or administrator. Download the CSV template, fill it, select a CSV or XLSX file, inspect the preview/errors, then choose **Import as drafts**. Nothing is published automatically. Review drafts in the question bank and use the normal publication/test builder workflow.

The exact header order is:

```csv
kind,topic,stem,A,B,C,D,correct,accepted,explanation,terms,defs,legal_label,legal_url
written,theory,Example question,,,,,,example|alternative,Explanation,,,,
single,theory,Choose ALPHA,ALPHA,BETA,GAMMA,DELTA,A,,Explanation,,,,
```

- `kind`: `single` or `written`.
- `topic`: `constitutional`, `civil`, `criminal`, `administrative`, `human-rights`, `labor`, `family`, or `theory`.
- `single` requires four nonempty choices and `correct` set to A, B, C or D. Choice IDs become `o1` through `o4` independently of later exam shuffling.
- `accepted` contains pipe-separated written answer models, at most 20 of 1000 characters each. An empty written model is valid and requires teacher review. Models are never learner-side grading rules.
- Optional `terms` and `defs` are pipe-separated strings with generated ordinal labels. Optional legal references require an HTTPS URL; supply both label and URL.
- CSV uses UTF-8, optional BOM, comma delimiters, and standard double-quote escaping. Quoted commas/newlines are supported. Headers must match the template exactly. Extra/blank data rows and malformed content must be corrected before import. XLSX uses exactly one worksheet with the same headers, starting at A1. Legacy XLS is unsupported.

The source limit is 5 MiB and 1000 data rows. Canonical UTF-8 question data also has a cumulative 5 MiB limit; a compressed XLSX may therefore meet the source limit but exceed the content limit. Individual rows must fit a 192 KiB upload envelope. Formula cells/formula-like text beginning `=`, `+`, or `@` are rejected. Workbook ZIP parsing is bounded to 128 entries, 8 MiB per expanded entry and 20 MiB total expansion, with a 15-second browser-worker watchdog. Embedded objects, VBA archives, external links and unsafe archive paths are rejected. Keep formatting simple; no macro execution or filesystem extraction is used.

Parsing runs in a dedicated browser worker. The pinned spreadsheet dependency is SheetJS CE **0.20.3**, installed from the [official distribution](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), plus fflate 0.8.3 for bounded streaming inflation. The old npm-registry `xlsx` release is not used. Integrity hashes are recorded in `package-lock.json`. The spreadsheet code remains outside both the main learner chunk and the API Worker bundle.

All canonical rows are revalidated by the server using the same published-question requirements. Strings normalize to NFC and trim at import. Identical canonical rows within one file are skipped by default, or retained when explicitly selected. This is full-content deduplication within an import, not fuzzy stem matching or global bank deduplication.

## Import API and recovery

All routes below are under `/api/v1/staff/imports`, require an active teacher/admin session, and mutations require exact-origin CSRF protection plus the normal mutation rate limit. A job belongs exclusively to its creating account, including against other administrators.

| Method/path | Behavior |
| --- | --- |
| `GET /?after=&limit=25` | Own import history, opaque ID continuation |
| `POST /` | `{operationId,filename,bytes,totalRows,fileHash,duplicatePolicy}` creates/resumes a job |
| `GET /:id` | Stored status, counters and commit cursor |
| `POST /:id/rows` | `{rows:[{rowNumber,content}]}`, at most 25 canonical rows per request |
| `POST /:id/validate` | `{cursor:1}` seals only a complete validated upload |
| `POST /:id/commit` | `{cursor}` processes at most 25 staged rows into question drafts |

Job states are `uploading → ready → committing → complete`. The same owner/file SHA-256/duplicate policy resumes the original job; changing metadata for that identity returns 409. Upload retries with identical row numbers/content are harmless. A conflicting row rejects the whole chunk. Once sealed, staged content cannot change. Commit uses a transaction and stored cursor: concurrent/replayed requests cannot duplicate drafts, counters or the completion audit event. A partial commit may expose its already-created drafts in the bank; remaining chunks can be resumed from import history.

After an interruption during upload, reselect the identical file and policy and press import again. Uploaded rows are acknowledged again rather than inserted twice. After an interruption during commit, use **Resume import** or reselect the file. Requests are sequential, limited to 25 rows and below the API's 256 KiB JSON limit. On a network error, timeout, conflict or rate limit, the interface pauses instead of automatically flooding retries. No import parsing runs inside exam autosave/submit handlers.

## Learner collections and progress

- `/` and `/progress` show actual completed-attempt summaries and recent results; `/history` preserves paginated history including active attempts.
- `/mistakes` shows released wrong, unanswered and partial-credit items from the latest 100 completed reports. Pending answers are excluded. Entries are per attempt/question, so repeating a question in several attempts may produce several mistake entries. Pagination is bounded to this window, not all-time performance.
- **Save question** is available with released exam feedback. `/mistakes` has a **Saved questions** tab; bookmarks persist by account and immutable question version, survive reload, and can be removed. A bookmark retains an owned source attempt. Saving requires an owned attempt containing that question and current feedback permission, rechecked in the write statement. List responses reapply exam feedback policy. No pre-close answer-key shortcut is introduced.
- API paths: `GET /api/v1/progress`, `GET /mistakes?after=&limit=25`, `GET /saved-questions?after=&limit=25`, and `POST /saved-questions` with `{attemptId,questionId,saved}`. The latter three share `/api/v1`. Collection reads require a session; writes also require CSRF and mutation rate limiting.
- Progress covers the latest **100** completed reports before filters. History remains available for older attempts. Averages are the mean percentage of fully graded attempts, each weighted equally. Pending attempts count separately and do not lower the average.
- Topic details and mistakes follow the existing feedback release policy: a group attempt must be fully graded and the assignment closed. Aggregate attempt scores already visible on the result page remain visible before close. Provisional results are labelled explicitly. Checked public-practice feedback may be bookmarked while the attempt is active.
- Reports accept optional `from` (inclusive epoch milliseconds), `until` (exclusive), `mode`, and `topic`. Invalid values/ranges return 422. Date controls include whole Asia/Tashkent calendar days. Topic filtering selects attempts containing that topic; aggregate scores still cover whole attempts, while the topic table narrows to the selected topic.

## Staff analytics and persistence

`/admin/analytics` loads authorized assignments and requests `GET /api/v1/staff/analytics?assignmentId=<UUID>` with the same optional filters. Teachers see their currently assigned groups; administrators have the existing broader group scope. An inaccessible assignment returns 404. The report covers the latest **200** completed attempts for that assignment before filters, including provisional counts, final-only average and topic outcomes. Staff may inspect their authorized provisional rubrics. No unbounded all-school aggregation endpoint is provided.

`attempt_reports` stores one bounded outcome array (maximum 100 pinned items) per finished attempt. Finalization writes the frozen result and its report in one D1 batch. A manual correction updates the aggregate grade, report, item review and audit event in one batch; retries do not add another report. Autosaves do not scan or rewrite reporting tables. User/time and assignment/time indexes bound report windows.

Existing finished attempts are backfilled by the scheduled Worker, at most 10 attempt records per invocation using a durable primary-key cursor. The configured cron is every 15 minutes; large historical databases need multiple invocations. The UI explicitly reports incomplete backfill coverage. New submissions produce reports immediately. Conditional backfill writes cannot overwrite a newer reviewed grade and do not modify attempt snapshots. Backfill scans are separate from interactive exam requests; do not increase cron/batch sizes without evaluating quota headroom.

## Verification and release boundary

```bash
npm run build
npm test
npm run verify:exam-bundle
npm run build:worker
npm audit
python -X utf8 scripts/verify-learning-ui.py
python -X utf8 scripts/verify-teaching-ui.py
python -X utf8 scripts/verify-exam-ui.py
```

The new browser script uses installed Chrome/Playwright, port 8790, synthetic sessions inserted directly into disposable local D1, and actual browser-worker parsing plus authorized APIs. It uploads real CSV and XLSX files, checks preview-before-write, duplicate/invalid imports, repeat-file recovery, publication, server grading, bookmarks/reload/removal, mistakes, progress filters, history and scoped assignment analytics. No authentication bypass route or cloud resource is created.

Stage 6 still owns realistic 100–200-session hosted load tests, quota/CPU measurements, backup/restore rehearsal, real Google acceptance and staging/production deployment. These local correctness checks make no free-tier capacity guarantee.

Local verification on October 23, 2026: 133 Worker/D1/parser tests; all three TypeScript configurations; frontend build; private-fixture scan across six browser chunks; Worker dry run (about 975 KiB, 168 KiB gzip); zero npm audit findings; migration 0006 applied locally; 18 new import/report browser checks plus 45 existing teacher, learner recovery and authentication checks. The existing browser bundle-size warning remains: the main chunk is about 642 kB (201 kB gzip); the spreadsheet worker is a separate 487 kB asset loaded on import. Real Google-provider screens were not contacted.
