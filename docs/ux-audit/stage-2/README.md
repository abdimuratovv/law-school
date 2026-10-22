# Stage 2 — visual tokens and shared components

Date: 2026-10-19 (Asia/Tashkent). Status: complete within the measured shared-component scope; awaiting user review/confirmation before stage 3. This stage implements the foundation, not the full student/teacher page redesign.

## Review the result

- [Live reference](http://127.0.0.1:5173/design): theme, three UI languages, comfortable/compact density, transparency and interactive control states. The local Vite server is running for review.
- [Student reading example](screenshots/student-light-glass.png) and [teacher table example](screenshots/teacher-dark-glass.png): the representative compositions requested at this milestone. These are in-reference examples, not claims that the full Exam/Bank page migration is complete.
- [Full reference at 1366px in Russian/light](screenshots/reference-1366-light-ru.png) and [dark](screenshots/reference-1366-dark-ru.png).
- [Token and component/state specification](TOKENS-AND-COMPONENTS.md).
- [Contrast, target and interaction register](CONTRAST-AND-TARGETS.md), [machine-readable gate result](verification.json).

## What changed and why

The existing `hm.css` system now has semantic surface/border/focus tokens, a rem-based shared type scale, canonical spacing/radii, purposeful motion tokens and denser opaque reading surfaces. Ambient gradients are subdued, navigation glass uses 16px blur with higher-opacity fill, and reduced-transparency/unsupported-backdrop fallbacks remain readable. Common input/OTP/selection declarations were consolidated out of the page-layout sheet instead of introducing another theme layer.

Shared radios and answer choices have arrow/Home/End navigation and one tab entry. Actual tabs have linked hidden/visible panels; Results/Builder filters use radio semantics. Checkboxes and switches have real 44px hit regions. Button loading/disabled states keep their labels and cannot navigate through a disabled link. Shared fields, search/empty recovery, notices, loading, tables and chart alternatives now have reusable patterns. OTP, counters, answer-state names, score summaries and map labels use explicit localized copy where updated.

Overlays now use opaque native dialogs with explicit modality, background isolation, visible/safe focus, Tab containment, Escape and return focus. A nonmodal mode leaves background focus available. Exam submission initially focuses the safe review/back action; page shortcuts are suppressed in dialogs. No timer, grading or persistence logic changed.

`/design` was rebuilt around the approved calm-workspace direction with interactive examples, translated copy, state selection, representative reading/teacher-table compositions, data alternatives and material preferences. It opts out of DOM translation; tests disable MutationObserver and verify explicit translation still works. Native language review remains outstanding.

## Validation

| Check | Outcome |
|---|---|
| TypeScript and production build | Passed on final implementation |
| Shared interaction assertions | 39/39 passed |
| Reference matrix | 72/72: three desktop sizes × two themes × three languages × two densities × opaque/translucent |
| Rendered targets | All measured reference controls ≥44×44; exam-example actions ≥48px |
| Contrast register | 84 representative measurements passed; normal-text minimum 4.87:1; tested indicator-pair minimum 3.59:1 |
| Existing route smoke | 69/69 renders: 23 variants at three widths, no unexpected redirect, blank page, JS error or document overflow |
| Narrow/large-text/media | 320/375px and 200% root text without reference overflow/small targets; four narrow/desktop dialog measurements; reduced motion, forced colors and OS opaque fallback checked |
| Reused critical-flow checks | 26 pass, three known failures and nine observations; map modality and shared segmented navigation now pass |
| Protected contracts | Router, AppState, attempt/session types, source questions/tests, storage and grading modules byte-identical to the source backup |

The three retained baseline failures are global exam ArrowRight navigation, visible failed-write recovery, and teacher draft reload persistence. They remain stages 5/7 work. Answer-radio arrows now work within the group; this does not implement the separate global Next-question shortcut. The remaining page-specific raw controls, shell semantics, full localization and screen redesigns keep their assigned milestones.

Build size is recorded for transparency: entry JS 114.37kB gzip and CSS 12.69kB gzip, compared with stage-0 build output 109.94kB and 10.72kB (increases of 4.43kB and 1.97kB). The design reference remains lazy-loaded. Reduced blur is a design choice, not a measured scrolling-performance improvement; performance/usability comparisons remain stage 9 work.

## Reproduce

From the project root, with Python Playwright and installed Google Chrome:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173
# In a second terminal
python docs/ux-audit/stage-2/check_components.py
python docs/ux-audit/stage-2/run_regressions.py
python docs/ux-audit/stage-2/measure_reference.py
python docs/ux-audit/stage-2/check_compositions.py
npm run typecheck
npm run build
python docs/ux-audit/stage-2/verify_stage.py
```

The reused baseline scripts characterize existing failures and do not fail the process for every failed assertion; read their JSON results. The new shared-component, composition, measurement and integrity scripts assert their scoped gate. Do not edit source during the capture matrix: Vite HMR can invalidate an in-progress browser context. Historical stage-0 evidence is not overwritten; reruns write to `stage-2/regressions`.

No package dependencies, routes, data types or storage migration were introduced. This workspace has no Git repository. [Source backup](source-before.zip) retains the pre-stage source; rollback should restore only the changed files after checking for subsequent edits and remove the two new source files only together with their new imports. `verification.json` records final source hashes and verifies the unchanged data/state contracts. The production `dist` output was regenerated by the build.

## Acceptance and next checkpoint

The shared-control gate is satisfied for the tested browser, compositions and state matrix. Evidence includes runtime interactions, composed backgrounds and actual target bounds rather than just declared CSS values. It is not whole-application accessibility certification: assistive-technology listening, native copy signoff, every page state, actual 400% browser zoom, other browser engines and representative learners/teachers still need their later checks.

Stage 3 will apply the foundation to StudentShell/AdminShell, labeled responsive navigation, main/skip/route focus behavior, lazy-route loading and shared navigation/feedback localization. It starts only after the user's confirmation of this stage and the representative student/teacher visual language.
