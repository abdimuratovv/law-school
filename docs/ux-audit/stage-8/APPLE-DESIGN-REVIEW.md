# Design Review: Stage 8 teacher review

## Summary

Severity: **Good**, with human language and assistive-technology review outstanding. Scope is the responsive React web teacher workspace: grading, student examples, analytics and explicit localization. The existing calm surfaces, semantic colors and shared controls continue across roles.

The skill's bundled reference directory is still absent. Apple's published Accessibility, Color, Layout, Typography, Entering data, Alerts and Charts Markdown was consulted instead; full downloads were not retained. These are web adaptations of design principles, not native HIG certification.

## Critical issues addressed

- **What:** A grade shortcut immediately changed a response and advanced, while global acceptance controls suggested unsupported effects. **Why:** People need clear feedback and control over consequential data entry. **Fix:** Shortcuts select a draft; Apply names its session-only effect. Notes, dirty navigation and a real single-step undo share consistent state. [Apple HIG — Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data).
- **What:** Filtered student lists could retain another profile, and sample actions claimed messages or assignments. **Why:** Navigation and presentation should preserve understandable context. **Fix:** Details resolve within the filtered list, native buttons support keyboard selection/focus, and unsupported actions become explicit previews. [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout).
- **What:** Analytics led with coefficients and an operational-looking scope; a written source question had legacy choice data. **Why:** Charts need clear purpose, units, context and accessible alternatives. **Fix:** Explain the issue first, label the sample/percentage/key boundary, expose a data table, and identify inapplicable written-question data. [Apple HIG — Charts](https://developer.apple.com/design/human-interface-guidelines/charts).
- **What:** The shared plain-link selector overrode primary button-link text, causing poor contrast in teacher workflows. **Why:** Action text must remain legible in both appearances. **Fix:** Exclude button links from that rule; the 94 composed-text probes include 60 targeted primary-link cases, all passing, with an overall minimum of 5.56:1. [Apple HIG — Color](https://developer.apple.com/design/human-interface-guidelines/color), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).

## Improvements

- Modals are reserved for losing unapplied work. They initially focus the safe action; Escape cancels and ordinary details stay inline. [Apple HIG — Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts).
- Apply keeps the current response visible, preserves space for Undo and focuses the visible action group. Rapid double-clicking cannot accidentally reverse the applied grade. Explicit Next/Skip avoids moving the next response under the pointer.
- Native fields, explicit names, disabling single-character shortcuts, scalable text, wrapped actions and a collapsible narrow queue support keyboard and reflow needs. Colors are supplemented by state text. [Apple HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Color](https://developer.apple.com/design/human-interface-guidelines/color).
- Opaque reading surfaces and the established type hierarchy distinguish response, model, rubric and action. Only genuinely multidimensional tables scroll horizontally. [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout).

## Positive notes

Queue, Overview and navigation share actual sample counts. Teacher preview changes cannot finalize a learner's pending result. Student trends exclude pending attempts and have equivalent table values. React renders translated copy without DOM mutation, preserving authored text and focus during language changes.

## Platform notes

Targets are measured in CSS pixels, not native Apple points. Automated Chrome checks and screenshot review do not verify VoiceOver/Safari or NVDA listening. Native unload wording is browser-controlled. Root-text enlargement and narrow viewports are reflow probes, not browser-zoom certification. Human language and task sessions remain documented release checks.
