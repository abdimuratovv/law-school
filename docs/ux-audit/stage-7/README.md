# Stage 7 — Teacher content workflows

Scope: Overview, Question bank, new/existing Question editor, Import and Test builder. Execution follows the approved [sequence](../FRONTEND-REDESIGN-SEQUENCE.md) and [screen contracts](../stage-1/SCREEN-CONTRACTS.md). Stage 8 requires the user's next confirmation.

## Delivered

- **Overview:** unfinished sample grading responses come first, followed by content readiness and explicitly static assignment examples. Removed operational-looking selectors and invented live metrics.
- **Bank:** actual displayed counts, five working filters, URL context preserved through editing, explicit row selection and scoped session-only actions. Preview starts closed, stays inline, includes complete matching content and restores focus when closed. Hiding names affected IDs and confirms its local effect.
- **Editor:** new and existing drafts have distinct identities. Full question text, separate matching blocks, explicit correct choice, automatic/manual written answers, metadata and optional legal references have clear labels. Validation links to affected fields; preview reuses the assessment question and answer components. Unknown IDs have a named recovery screen. Type changes confirm exactly which answer fields will be cleared.
- **Import:** the three steps explain the metadata-only file selection before upload, show the ten actual sample rows and three source errors, retain topic/duplicate decisions and distinguish demonstration completion from import readiness. Completion offers Bank and Builder destinations. Filename/size and decisions can recover; file bytes are never stored.
- **Builder:** four steps cover details, real sample question selection, groups/local date-times and a complete review. Automatic and manual methods use actual IDs/types/counts, validate pool limits and support resettable search. Advanced settings remain under disclosure. Completion cannot publish or assign a test.
- **Shared authoring:** additive validated local drafts, explicit Resume/Start fresh, autosave/manual save/retry, incompatible-record handling, scoped discard, conservative newer-version checks, safe conflict decisions and app/history/unload protection. See [state model](STATE-MODEL.md).

## Validation

Evidence is machine-readable in [verification.json](verification.json); screenshot references are recorded in the matrices.

| Check | Result |
|---|---|
| Authoring workflows and storage/history edges | 75 assertions passed |
| Layout combinations | 360 passed: five viewport sizes × two themes × three languages × 12 states |
| Narrow enlarged text and short windows | 54 passed |
| Error summaries, written preview and conflict dialog stress | 36 passed |
| Existing route variants | 69 passed |
| Retained assessment and timing/guard checks | 51 passed |
| Shared controls | 39 passed |
| Explicit three-language copy | 235 keys covered |
| Composed text contrast | 26 probes passed; minimum 5.02:1 |
| Historical baseline with documented adapters | 28 passed, 10 observations, zero failures |
| TypeScript and production build | Passed |

The original editor-reload failure B-02 is resolved: a successful compatible draft restores after the explicit Resume decision. Historical evidence remains unchanged. Adapters cover explicit OTP submission, Resume after reload and the redesigned in-flow import/builder controls; they preserve the original behavior assertions.

Critical copy renders directly in Uzbek, Karakalpak and Russian with the legacy translation observer disabled during checks. [Copy coverage](copy-coverage.json) includes conditional states and schema descriptions. [Contrast evidence](contrast.json) measures composed text in both themes against a 4.5:1 threshold. [Apple design review](APPLE-DESIGN-REVIEW.md) documents the applied principles and platform limits.

## Preservation and limitations

[Source-before backup](source-before.zip) and SHA-256 comparison protect the previous checkpoint. Only five stage-7 pages, the copy lookup integration, scoped CSS and three new authoring files change. Question definitions, grading, AppState, storage helpers, student screens, routes and stage-8 teacher review screens remain byte-identical.

This remains a local preview application. No Excel parser, backend publication, assignment or account synchronization was added. Choosing to leave despite a failed save can lose browser-memory changes. Conflict checks do not provide atomic collaboration across tabs. Malformed global draft JSON is preserved; external repair/removal is required if Retry cannot read it. Native-language signoff, assistive-technology listening and integrated release validation remain outstanding. Root-text enlargement and narrow widths are reflow probes, not 400% browser-zoom certification.

Final Vite output: entry JavaScript 473.73 kB / 158.20 kB gzip, lazy teacher chunk 75.32 kB / 21.46 kB gzip, CSS 90.40 kB / 17.34 kB gzip. Entry gzip increased 9.63 kB and CSS 1.04 kB from stage 6; no performance improvement is claimed. The dialog padding adjustment was recaptured across its full matrix; error, written and conflict states have their own additional stress evidence.

Next gated scope: **Stage 8 — teacher Grading, Students, Analytics and localization completion.**
