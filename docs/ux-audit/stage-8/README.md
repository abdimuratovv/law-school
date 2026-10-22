# Stage 8 — Teacher review and localization completion

Technical implementation is complete. Scope follows the approved [sequence](../FRONTEND-REDESIGN-SEQUENCE.md) and [screen contracts](../stage-1/SCREEN-CONTRACTS.md). Human copy and assistive-technology signoff remain release checks; Stage 9 requires the user's confirmation.

## Delivered

- **Grading:** stable queue, response, model, rubric and action regions; a selected grade/note stays a draft until Apply. Apply keeps the response visible; Next/Skip are explicit navigation. A rapid-click regression now proves that a second click cannot accidentally undo the grade. The action group retains visible keyboard focus. Undo restores the actual prior grade/note. Queue changes, discard, app/history navigation and native unload protect unapplied edits. Shortcuts can be disabled and pause during typing/dialogs. Narrow queues remain discoverable through native disclosure.
- **Shared teacher state:** Overview, navigation and Grading agree on unfinished sample counts. Applied grades and notes remain in memory across teacher routes, and reset when leaving that workspace or reloading. They never update learner results or storage.
- **Students:** working name/group filters, keyboard-selectable details, no stale profiles, dated illustrative attempt history and explicit preliminary/final labels. Pending records are excluded from final averages/trends. The chart has a 0–100 scale and equivalent table. Unsupported messaging, assignment claims and fabricated result links are removed.
- **Analytics:** plain-language issues precede optional coefficients. Search, scope and sorting work on actual displayed rows. Percentage charts have units, a labeled scale and table alternatives. Missing IDs cannot silently open another question. Sample/source key differences and the inapplicable A–D fixture for written Q-0119 are disclosed. Reviewed markers are reversible local annotations; unsupported regrading is unavailable.
- **Localization:** removed DOM text/attribute mutation and fuzzy word replacement. Explicit React copy covers the migrated UI, shared chart fallback, dialogs, accessible names and dynamic summaries. Names and Karakalpak source/entered material remain unchanged. See [localization evidence and human-review handoff](LOCALIZATION-COMPLETION.md).

## Verification

| Check | Result |
|---|---|
| New teacher workflow, lifetime, rapid-click and keyboard checks | 62 passed |
| Teacher layouts | 300 passed: five viewports × two themes × three languages × ten states |
| Enlarged text and short-window layouts | 60 passed |
| All 23 existing route variants, three desktop widths, three languages | 207 passed with observer construction configured to throw |
| Live language/data-preservation checks | 13 passed |
| Source copy audit | 650 literal keys; zero unwrapped critical-copy findings after documented exemptions |
| Explicit copy coverage | 680 keys covered across all three languages |
| Retained authoring | 75 passed |
| Retained assessment/timing | 51 passed |
| Retained learning/review/preferences | 63 passed |
| Shared controls | 39 passed |
| Historical baseline | 28 passing checks, 10 observations, zero failures |
| Composed text contrast | 94 passed; minimum 5.56:1 |
| Targeted primary-link layout/contrast checks | 60 passed across Overview, Bank, Analytics and completed Import |
| TypeScript and production build | Passed |

Manual screenshot review also caught a shared authoring link selector overriding primary button-link foregrounds. Plain-link styling now excludes button links, preserving their contrast. The affected Analytics states were recaptured, and [targeted checks](primary-link-checks.json) cover Overview, Bank, choice/written Analytics and completed Import in both themes, three languages and desktop/narrow layouts.

The [delivery verification](verification.json) checks report completeness, final source/build hashes and checkpoint preservation. [Composition matrix](composition-matrix.json), [stress cases](stress-layouts.json), [contrast probes](contrast.json), [localized routes](localized-routes.json) and [source audit](source-copy-audit.json) provide inspectable evidence. The [Apple design review](APPLE-DESIGN-REVIEW.md) records design principles and platform limits.

Historical reports are unchanged. Retained adapters cover the already-approved explicit OTP submission, draft Resume, in-flow import/builder controls and the shared stage-7 Retry saving wording. The latter changes the selector from the older Uzbek wording to the currently rendered label; it does not weaken the preference persistence assertion.

## Preservation and limitations

[Source-before backup](source-before.zip) matches the stage-7 checkpoint. Student screens, AppState, grading algorithms, question/test definitions, routes and authoring behavior remain byte-identical. Only the three review pages, shared teacher counts, explicit localization/shared fallback integration and scoped styles change; two files add review copy and ephemeral teacher state.

This is a local preview, not connected teacher administration. No learner grade, question key, message or assignment is changed by these sample actions. Leaving despite an unapplied-work warning can discard that draft. Native-language reviewers, NVDA/VoiceOver listening, representative task sessions, actual browser zoom and release/performance validation remain outstanding. Automated language/layout coverage is not human signoff.

Final Vite output: entry JavaScript 495.28 kB / 165.34 kB gzip, lazy teacher chunk 77.37 kB / 21.34 kB gzip, CSS 95.01 kB / 18.04 kB gzip. Entry gzip increased 7.14 kB and CSS 0.70 kB from stage 7; no performance improvement or deployment is claimed.

Next gated scope: **Stage 9 — integrated validation, documentation and release preparation.**
