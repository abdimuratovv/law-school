# Design review: assessment workspace

Reviewed 2026-10-21 using the explicitly requested `anthropic-skills:apple-design` skill. Context: React web application for learning and timed assessment, desktop first with narrow-screen reflow. Apple guidance is used as design principles, not a claim of native-platform compliance.

The skill's bundled HIG reference files were absent and no matching local copies were found. The review therefore consulted Apple's published Accessibility, Color, Layout, Typography, Entering data and Alerts guidance directly, including their Markdown representations. The implementation follows the previously approved product navigation and visual language.

## Summary

Initial assessment: **Needs Work**, with critical reliability and visibility problems in the old player. Final assessment: **Good in the tested scope**. The redesigned player keeps reading and actions in flow, distinguishes saved work from network state, preserves failed writes in memory, and requires deliberate submission. Browser evidence supports the fixes; native-language review and assistive-technology listening remain outstanding.

## Critical issues addressed

| What and why | Concrete fix | Design guideline |
|---|---|---|
| Fixed header/toolbars and conditional split layouts could compete with long prompts and enlarged text. Important content needs a stable reading order and reachable controls. | One reading column, in-flow header/actions, wrapping utilities, responsive matching blocks and scrollable dialogs. | **Layout > Visual hierarchy / adaptable layouts**: prioritize and group information, disclose secondary choices, and test varying window/text sizes. [Apple Layout](https://developer.apple.com/design/human-interface-guidelines/layout) |
| Offline wording claimed that answers were saved even when a local write failed. Failure could discard work or open a result before persistence. | Separate offline/save status; visible failed-write alert and retry; immutable pending submission; result-first writes, then session cleanup; explicit close/reload risk. | **Entering data > Best practices**: make input easier and protect entered work; **Alerts > Best practices**: explain actionable problems and recovery. [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data), [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts) |
| Map states lacked persisted flags/checked cues; global keyboard navigation was missing. Color alone is insufficient state communication. | Text labels, current outline, answered marker, flag symbol, checked mark and accessible names; guarded question shortcuts and native radio behavior. | **Accessibility > Vision / Mobility**: provide perceivable state and usable input alternatives. [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) |

## Improvements applied

- **High, low effort — hierarchy:** separate identity, answered progress, question position and time; keep options behind a named disclosure. This applies **Layout > Visual hierarchy** and **Typography > Conveying hierarchy** to existing web components. [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- **High, medium effort — confirmations:** focus Review unanswered or Keep solving initially; Escape cancels; backdrop clicks never submit. Reserve modal interruption for maps and consequential actions; ordinary save feedback stays inline. This follows **Alerts > Best practices / Buttons**. [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
- **High, low effort — semantic color:** retain the shared light/dark tokens; supplement success/error/flag colors with labels and symbols. All 46 representative rendered text-contrast probes pass, minimum 5.41:1. This applies **Color > Best practices / Inclusive color** and **Accessibility > Vision**. [Color](https://developer.apple.com/design/human-interface-guidelines/color), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- **Medium, low effort — input:** visible written-answer label/help, caret-preserving Karakalpak letter controls, explicit review limitations and truthful device-save feedback. This applies **Entering data > Best practices**. [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data)

## Positive notes and evidence

The workspace keeps one primary action per state, uses native buttons/inputs/dialogs and named landmarks, and preserves entered answers when language/settings/maps change. The answered bar uses actual answer count rather than current position. Timer announcements occur at major thresholds; routine ticks do not update the live announcement. Frozen pending work stays readable and can be retried.

Evidence: 210 workspace compositions in both themes/all three languages; 24 narrow/enlarged-text or short-height cases; 69 existing-route renders; 46 rendered contrast probes; 39 retained shared-control assertions; dedicated answer/persistence/history/timer/unload checks. See [verification](verification.json) and [state model](STATE-MODEL.md). During review, the answered bar's inherited flex rule was found to collapse its height; an explicit six-pixel track fixes the measured visibility problem.

## Platform-specific notes and limits

This is a browser product. The existing design uses at least 44×44 CSS-pixel interactive targets and 48-pixel primary actions where measured; these are web dimensions, not claims about native points or physical device size. Native dialog modality handles background isolation, while React Router's supported blocker handles SPA history. Hard reload/close uses the browser's own unsaved-work prompt where data is at risk.

The focused exam intentionally omits global app navigation. The approved compact drawer elsewhere remains unchanged. No speculative window controls, haptics, multiwindow UI or native Apple visual treatment were added. No native-platform HIG certification, full screen-reader audit, 400% browser-zoom pass or simultaneous multi-tab editing guarantee is claimed.
