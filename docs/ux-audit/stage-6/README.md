# Stage 6 — results and the learning loop

Completed 2026-10-21. Authorized by “start Stage 6”. The user also requested the apple-design skill during this stage. Stage 7 requires separate confirmation.

Results, focused review, saved practice, Progress and Profile now use the approved calm learning-workspace direction. The journey connects a saved result to an explanation, a deliberately revealed retry and the next practice test.

## What changed

- **Results:** separate correct, incorrect, unanswered and awaiting-grading counts. Preliminary status appears in the heading, score caption, visualization name, topic guidance and history. The existing score denominator is unchanged and explained. Filters live in the URL. Sample-only and unavailable records offer named recovery.
- **Review:** the full prompt precedes the learner answer, expected/model answer and explanation. Missing models/explanations are stated. Previous/next updates the review entry without stacking every question in browser history; returning restores the source filter and question focus. Saving a question changes only the saved list and reports write failures.
- **Saved practice:** the list explains that these are deliberately saved questions, rather than all incorrect answers. Opening a retry never reveals feedback. Check/reveal is deliberate; Try again hides feedback. Written input retains Karakalpak assistance. Retry never changes a grade or adds a test attempt. Missing saved IDs remain visible and removable.
- **Progress:** labeled date/score axes, actual submission-date positions and a fixed 0–100% scale. An always-available table provides exact dates, modes, scores, status and result links. Statistics use all final detailed results in the selected mode; the chart uses the latest ten. Preliminary, sample-only and unavailable records stay in history but are excluded from final statistics.
- **Profile:** grouped identity, language/appearance, accessibility and account actions. Browser-local scope is explicit. Failed settings retain the previous value and offer retry; failed language persistence is labeled as a tab-only change. Active-work sign-out requires confirmation, preserves deadlines and retains browser records. Failed sign-out keeps the learner signed in. Internal design/reset/teacher actions stay outside the ordinary student journey.

The existing route inventory, question bank, persisted attempt/session schemas, storage keys, grading algorithm and Stage 5 assessment methods are preserved. No dependency, server synchronization, teacher-grading integration or data migration was added. [Journey and state model](STATE-MODEL.md).

## Verification

- 300 compositions: ten states × five viewports (1440, 1366, 1024, 390 and 320 pixels) × both themes × all three UI languages.
- 42 additional cases: six screens plus sign-out confirmation, in three languages at 320×568 with 200% root text and at 1024×480. These targeted stress cases use light appearance.
- 63 new learning-loop/edge assertions, 51 retained assessment/timer assertions and all 39 shared-component assertions pass.
- 69 existing-route renders pass. 143 explicit copy keys have Uzbek/Karakalpak/Russian coverage; workspace checks disable the legacy translation observer.
- 40 rendered text-contrast probes pass, including disabled retry text; minimum measured ratio 5.56:1. Exact measured ratios are in [contrast.json](contrast.json).
- `npm run typecheck` and `npm run build` pass. Entry gzip is 148.57 kB and CSS gzip is 16.30 kB, respectively 6.86 kB and 1.05 kB above stage 5. No performance improvement is claimed.

Evidence, protected-file checks, source/build hashes and limits: [verification.json](verification.json). The retained historical flow suite has 27 passing checks, 10 observations and one known failure: teacher draft persistence, assigned to stage 7. The accepted-unsaved-reload probe remains an observation of browser-memory limits, not a recovery guarantee.

The browser review caught and corrected a long Russian topic tag overflowing under enlarged text, an oversized narrow sign-out dialog and disabled dark-theme text measuring 4.43:1. The full composition/stress/contrast matrix was rerun after those fixes. The final review also covers the distinction between a durable result awaiting session cleanup and genuinely unsaved work.

## Apple design review

The explicitly invoked [apple-design skill](C:/Users/Asus/.codex/plugins/cache/claude-cowork/anthropic-skills/1.0.0/skills/apple-design/SKILL.md) informed the implementation and review. Its bundled references were absent, so Apple's published guidance was consulted directly. [Design review, prioritized fixes and sources](APPLE-DESIGN-REVIEW.md).

Representative views:

![Preliminary result](screenshots/result-pending-1440-light-uz.png)

![Focused written review](screenshots/review-written-1366-dark-kaa.png)

![Progress and exact history](screenshots/progress-1366-light-ru.png)

## Reproduction and limits

Run Vite at http://127.0.0.1:5173. From the project root:

```powershell
python docs/ux-audit/stage-6/check_learning.py
python docs/ux-audit/stage-6/check_edges.py
python docs/ux-audit/stage-6/capture_learning.py
python docs/ux-audit/stage-6/check_routes.py
python docs/ux-audit/stage-6/run_regressions.py
python docs/ux-audit/stage-6/check_assessment_regression.py
npm run typecheck
npm run build
python docs/ux-audit/stage-6/verify_stage.py
```

The verifier checks evidence consistency and protected source; browser scripts produce the interaction evidence. The pre-stage source backup is source-before.zip. This workspace has no Git repository. Nothing was deployed.

Chromium automation does not replace native-language signoff, NVDA/VoiceOver listening, Safari/device checks or representative learner sessions. Root-text enlargement is a reflow probe, not actual 400% browser-zoom certification. Retry responses intentionally remain temporary practice. When browser storage is blocked, accepting reload/close can lose unsaved assessment work held only in memory. Browser records remain local and shared in this preview; simultaneous editing in multiple tabs is not guaranteed. The translation observer remains for unmigrated teacher screens until stage 8.

Next gate: user review and confirmation before **stage 7 — teacher content workflows**.
