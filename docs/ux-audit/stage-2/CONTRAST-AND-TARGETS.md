# Measured contrast, targets and interaction register

Date: 2026-10-19. Environment: installed Google Chrome through Python Playwright, disposable contexts, local Vite. Scope is the shared reference and explicit probes below, not a WCAG certification of the entire application.

## Rendered reference matrix

`reference-matrix.json` contains 72 measurements: three desktop sizes (1440×900, 1366×768, 1024×768) × light/dark × Uzbek/Karakalpak/Russian × comfortable/compact × translucent/opaque navigation. All records have no JavaScript page errors, no horizontal document overflow, no interactive-bound candidates below 44×44 and no primary exam-example action below 48px. Disabled controls are included in the bounds scan. The offscreen skip link is excluded until focused; noninteractive tags/marks are not counted as controls.

There are 18 full reference screenshots for the comfortable/translucent combinations. Other combinations have measurement records; there is no claim of 72 full-page screenshots. Separate student/teacher crops cover light/dark and opaque/translucent examples at 1366px with Russian UI. Their Karakalpak question text remains unchanged.

Target measurements are real `getBoundingClientRect()` bounds on the interactive element, replacing the earlier checkbox/switch practice of small bounds with invisible pseudo-element extensions. Sizes are project defaults, not a claim that WCAG mandates 44px everywhere. Existing bespoke teacher controls and shell menu sizes remain page-migration work; they are not covered by a reference-only target pass.

## Contrast evidence

| Evidence | Measurements | Minimum / result |
|---|---|---|
| Reference state/composition measurements | 72, including body/support text, translucent/opaque labels, selected radio text, feedback text, primary button states and border/focus pairs | All pass their specified threshold |
| Supplemental reading/input/dialog text | 12 in light/dark: question, default/selected/checked answer, input ink, modal heading | All pass 4.5:1 |
| All tested normal text | Text subset of 84 total measurements | Minimum 4.87:1 against the required 4.5:1 |
| Essential border/focus pairs | Opaque token-pair subset | Minimum 3.59:1 against the chosen 3:1 threshold |
| Navigation labels on actual translucent composition | Light 9.40:1; dark 9.82:1 | Text sampled over the rendered material/background |
| Navigation labels with opaque preference | Light 8.77:1; dark 9.69:1 | No blur required to read text |

Raw data: `contrast-measurements.json` and `supplemental-contrast.json`. The script records each selector, foreground, sampled background, ratio, threshold and outcome. It does not reuse the old reference page's hardcoded unmeasured contrast claims.

For text, the script waits for finite animations/transitions to settle, reads the resolved foreground, temporarily makes its text transparent, screenshots the actual rendered element and takes the median RGB from nine interior sample points. It restores the exact original style. Dialog screenshots disable finite capture animation so review images show the settled opaque surface. This captures composed backgrounds rather than assuming an alpha token equals an opaque color. The local brightness filter is applied to the foreground calculation when present; relative luminance uses the sRGB transfer function. This is a documented representative sampling method, not a worst-pixel proof for every possible image/gradient under glass. Glass is restricted to the tested subdued neutral navigation environment.

Control/focus pair checks use resolved opaque tokens against surface/surface-2/background. They are explicitly marked token-pair checks, not pixel measurements of every focused glyph, border and chart segment. Focus also has a contrasting halo. Disabled text does not receive a false normal-text pass; disabled controls are covered by interaction/target checks. Chart data has an equivalent table rather than relying on line color alone. Exact thresholds are project checks informed by [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast), not a complete conformance declaration.

## Keyboard, semantics and media

`component-results.json` contains 39 passing assertions covering selection/wrapping/Home/End/roving tabindex, linked/hidden tab panels, native checkbox/switch activation, loading/disabled actions, disabled link navigation, phone/OTP editing, field errors, answer radios, modal focus/background/escape/return, nonmodal access, empty/reset, chart alternatives, named progress and explicit translations with the observer disabled.

`media-checks.json` records 320px and 375px effective widths and 200% root-text enlargement, with no document overflow or undersized controls after fixing the narrow phone track and 40px character keys. This is a reflow/text-enlargement proxy, not a claim of testing browser 400% zoom. Reduced-motion spinner animation is `none`. Forced colors activates and has a retained screenshot for review. `transparency-media.json` independently confirms the OS reduced-transparency preference produces `backdrop-filter: none` in both themes.

Modal behavior follows the chosen stage-1 contract and the [WAI modal pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Dialog display/background isolation uses native browser behavior plus explicit focus wrapping; radio/tab behavior follows the corresponding [radio](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) and [tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) patterns. These are browser assertions, not screen-reader listening sessions.

## Existing-flow regression boundary

`route-smoke.json` covers 23 existing route variants at all three widths (69 renders), with no unexpected redirects, blank content, page errors or horizontal document overflow. This is smoke coverage, not every state of every route. Reused baseline flow probes are written into `regressions/`, leaving stage-0 evidence unchanged. Their map modality and segmented-arrow checks now pass. Three existing failures remain: global exam ArrowRight advance, visible local-write failure recovery and teacher draft reload persistence. They remain assigned to stages 5/7 and do not block the shared-component gate; no broad page rollout occurs in stage 2.

Human language review, full assistive-technology sessions, every composed screen's contrast, actual browser zoom, production cross-browser coverage, all teacher bespoke controls and real learner/teacher usability sessions remain later checks. No score or pass is invented for those unmeasured areas.
