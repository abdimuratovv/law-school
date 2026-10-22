# Stage 5 — exam workspace

Completed 2026-10-21. Authorized by the user's “start Stage 5”; stage 6 requires separate confirmation.

The assessment now has one readable question column, navigation below the question, visible answered progress, and optional language/text-size settings. Question maps distinguish current, answered, flagged and checked states. Keyboard navigation respects answer controls, typing and dialogs. Written answers retain Karakalpak character assistance, with explicit limits on automated review.

## Saving and finishing

Device-save status and offline status are independent. Failed writes retain the latest answers in the current tab, explain the problem and offer retry. Leaving through application navigation or browser history requires confirmation; unsaved reload/close invokes the browser's warning.

Submission freezes a snapshot and saves the result before removing the active session. Retries reuse a stable attempt ID and the original saved snapshot. A cleanup failure offers recovery without generating another attempt or overwriting its answers. The timer uses the original absolute deadline, continues inside dialogs, rejects late edits and caps recorded duration at expiry. Major time warnings are announced without announcing every tick, and follow the selected language.

React Router's supported history blocker required migrating the root provider to its data router. Existing routes, dependencies, question data, persisted schemas and grading rules are preserved. [State and recovery diagram](STATE-MODEL.md).

## Verification

- 210 workspace compositions: seven states, five viewport sizes, both themes and three languages.
- 24 additional narrow/enlarged-text or short-height cases; measured controls meet the 44 CSS-pixel target and no tested layout overflows horizontally.
- 69 existing-route renders and all 39 shared-component assertions pass.
- 40 assessment assertions and 11 timing/confirmation assertions cover failed writes, retries, immutable submission, expiry, history, real unload warnings, focus and language changes.
- 68 explicit copy keys covered in all three languages, with the legacy translation observer disabled for the workspace checks.
- 46 rendered text-contrast probes pass; minimum measured ratio 5.41:1.
- TypeScript and production build pass. Full evidence and source hashes: [verification.json](verification.json).

The retained baseline reports have one known failure: teacher draft persistence, assigned to stage 7. Exam arrow navigation and visible storage-failure feedback now pass. The old forced-reload loss probe is recorded as an observation: accepting the browser's warning while all storage writes are blocked restores only the last successfully saved snapshot.

The final two refinements changed focus handling and the hidden timer announcement; focused behavior checks were rerun after them. The composition and contrast matrix precedes those behavior-only refinements.

## Design review and representative screens

The explicitly requested [apple-design skill](C:/Users/Asus/.codex/plugins/cache/claude-cowork/anthropic-skills/1.0.0/skills/apple-design/SKILL.md) informed the review. Its bundled references were missing, so the review used Apple's published guidance. [Apple design review and sources](APPLE-DESIGN-REVIEW.md).

![Practice workspace](screenshots/practice-1366-light-uz.png)

![Narrow question map](screenshots/map-390-light-uz.png)

## Limits and reproduction

Browser evidence uses Chromium. Native-language signoff, screen-reader listening, representative learner sessions and integrated release validation remain outstanding. Enlarged root text is a reflow probe, not a 400% browser-zoom certification. This preview stores work on this device; it adds no account sync or connected teacher review. Simultaneous editing in multiple tabs is not guaranteed. When storage is blocked, in-memory work cannot survive an explicitly accepted reload or tab close.

The data-router change increases the production entry bundle compared with stage 4; see exact measured gzip sizes in verification.json. No performance claim or deployment is implied. The pre-stage source backup is source-before.zip; this workspace has no Git repository.

With Vite running at http://127.0.0.1:5173, run the Python scripts check_assessment.py, check_timing_and_guards.py, capture_workspace.py, check_routes.py and run_regressions.py from this directory. Run `npm run build` at the project root, then `python docs/ux-audit/stage-5/verify_stage.py`. The verifier checks evidence consistency and protected files; browser scripts produce the interaction evidence.

Next gate: user review and confirmation before **stage 6 — results and learning loop**.
