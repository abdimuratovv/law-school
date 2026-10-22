# Measured accessibility report

Scope: local Chrome automation against the production build, with isolated synthetic browser storage. This is measured engineering coverage, **not a WCAG conformance certificate or a screen-reader pass**. Final counts and hashes are checked in `verification.json`; screenshots and JSON reports are inspectable alongside this document.

| Coverage | Evidence and acceptance |
|---|---|
| Desktop compositions | 414 production renders: 23 route variants × 1440×900 / 1366×768 / 1024×768 × two themes × three languages; route, main/h1, root language, content, exceptions and overflow checks |
| Automated semantics | 138 axe-core 4.10.3 audits at 1366×768, both themes/all languages; WCAG 2 A/AA, 2.1 A/AA and 2.2 AA tagged rules |
| Effective reflow and text | 138 production renders at 320×256, both themes/all languages, plus 69 at 1024×768 with 200% root text; document and teacher-content horizontal overflow checked |
| Control targets | 92 route/theme/width records at 1366 and 320px in Russian; 1,666 measured control appearances, including navigation and associated checkbox/radio label regions; 44px minimum |
| Shared reference | 72 theme/language/desktop/density/material configurations; all measured targets pass; assessment-example actions remain 48px |
| Contrast | Shared text/feedback, reading/input/answer/dialog states, control/focus token pairs, primary teacher links and scrolled navigation with opaque preference; see measurements below |
| Keyboard journey | 23 checks for Tab/typing/Space/Enter/escape through sign-in, catalog, entry, answer, map, submit, review and save-for-practice; 14 measured focus destinations |
| Teacher reachability | 36 route/configuration checks for actual wheel scrolling, PageDown, final-control focus, unobscured navigation and no main horizontal spill; includes 320×256 and 200% root text |
| Static answer semantics | 24 production states across correct/incorrect learner review and Bank/Editor previews, both themes/all languages; named group, noninteractive and no ARIA rule findings |
| Dialogs and preferences | Retained safe initial focus, Tab containment, Escape/return, history/unload guards; four measured narrow/desktop dialog bounds, reduced motion, forced colors and reduced-transparency media |

## Findings corrected in this stage

**S9-A01 — static answer labels lacked a supporting role.** Axe returned `aria-prohibited-attr` as an incomplete/manual-review finding on correct-answer rows in all six learner-review theme/language states. A generic `div` may not expose its accessible label. Labeled static rows now use `role="group"`; unlabeled static choices remain ordinary content. They do not become radios or tab stops. The targeted production checks cover both verdicts and both author-preview consumers; affected route audits were rerun. The original finding is preserved in `axe-before-fix.json`.

**S9-A02 — teacher content could be unreachable below the fixed viewport.** A real scrolling probe found that `.app-admin` hid overflow while `.teacher-main` had no scrollable overflow. Earlier width-only and programmatic-focus checks did not detect this reachability failure. The teacher main region now has `overflow:auto` and scroll padding. Tests exercise actual wheel and PageDown input, focus on the final control, and persistent navigation at desktop, narrow, very short and enlarged-text sizes. The full production matrix was rerun with an additional main-region overflow check, as were authoring, shared/baseline, learning and teacher-review workflows. Scoring, timer and persistence logic are unchanged.

## Contrast and focus measurements

`contrast-measurements.json` has 72 shared probes; 56 are text and 16 are control/focus token pairs. `supplemental-contrast.json` adds 12 composed answer/input/dialog text probes. `scrolled-glass-contrast.json` adds 16 navigation text probes after scrolling, with both themes and transparency preferences. `primary-link-checks.json` adds 60 primary-link text/target/layout checks across Overview, Bank, Analytics and completed Import.

All **160 probes** pass their stated threshold: 4.5:1 for normal text and 3:1 for the 16 non-text token pairs. Minimum measured text contrast is **4.87:1**; minimum control/focus token-pair contrast is **3.59:1**. Text probes sample screenshot-composited backgrounds while preserving the computed foreground; indicator pairs use opaque resolved tokens. These are representative points/states, not every pixel or every scroll position. Antialiasing, dynamic backgrounds, different fonts and platform rendering still require visual review.

All 14 keyboard-journey destinations have a visible 3px outline and were within the viewport with an unobscured hit point. Retained dialog and shortcut checks additionally verify background isolation, safe cancellation, arrow navigation, typing suppression and single-key shortcut disabling. Timer tests verify threshold announcement updates in the DOM; no listening test was performed.

## Incomplete automation and remaining reviews

Axe cannot determine many text/background combinations over gradients and returns `color-contrast` as incomplete. Those are **manual-review obligations**, not passing contrast checks. The composed probes reduce uncertainty for selected critical states but do not resolve every incomplete node. Read the full incomplete lists in `axe-results.json`; zero automated violations is not zero accessibility issues.

320×256 is effective reflow geometry for a 1280px-wide window at 400%; 200% root text is an enlargement stress test. Neither is actual browser zoom. Headless Chrome keyboard zoom and profile preference probes did not produce native zoom, so native 200%/400% zoom remains unverified. Height constraints and scroll reachability are measured, rather than inferring them from absence of horizontal overflow alone.

NVDA listening on Windows, VoiceOver/Safari on Apple hardware, actual native zoom, native-language review and representative learner/teacher sessions are pending. Firefox/Edge/Safari compatibility, touch and real hardware performance are not established by Chrome automation. Unsupported-backdrop CSS fallback exists, but no legacy browser was used to prove it. OS reduced-transparency media and the user preference were tested in Chrome. Use [the human acceptance packet](HUMAN-ACCEPTANCE.md), record findings/fixes and rerun affected checks before release approval.
