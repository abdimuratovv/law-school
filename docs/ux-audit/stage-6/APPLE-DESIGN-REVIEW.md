# Design review: results and the learning loop

Reviewed 2026-10-21 using the user's explicitly requested `anthropic-skills:apple-design` skill. Platform: desktop-first React website with narrow-screen reflow, serving learners reviewing local assessment results. Scope: results, focused question review, saved practice, progress and profile.

The skill's `references/hig-lookup.md` and bundled HIG documents are absent. Apple's published Accessibility, Color, Layout, Typography and Charts guidance was consulted directly through its Markdown documentation. The approved visual direction and web interaction contracts remain authoritative for this product.

## Summary

Initial assessment: **Needs Work**. Grade interpretation, missing records, review context, chart descriptions and persistence feedback needed improvement. The implementation addresses these with explicit status, a complete reading order, predictable recovery and browser-measured layouts. Final assessment: **Good in the tested scope**. All 300 compositions, 42 stress cases and 40 text-contrast probes pass (minimum measured ratio 5.56:1). Confidence is limited to the recorded browser evidence; native-language review and assistive-technology listening are still required.

## Critical issues and high-priority fixes

| What / why | Concrete React/web implementation | Principle and source |
|---|---|---|
| A preliminary heading alone did not make the score visualization's accessible name preliminary. Pending answers were not a separate review filter. Learners need consistent status throughout the journey. | Four verdict counts, a pending filter, preliminary score caption and SVG accessible name, topic caveat and preliminary history rows. Keep the existing all-question denominator and explain it. | **Accessibility > Vision**: communicate state through perceivable alternatives; **Color > Inclusive color**: text labels supplement colors. [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Color](https://developer.apple.com/design/human-interface-guidelines/color) |
| Narrow review clamped the prompt and split the reading/action sequence. Missing records redirected silently. | Full prompt → learner answer → expected/model answer → explanation, with in-flow controls. Named unavailable and sample-summary recovery; preserve stored records. | **Layout > relative importance / grouping / adaptable layouts** and **Typography > hierarchy and legibility**. [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) |
| Progress lacked date and score axes, while sample summaries could look like personal achievement. | Actual submission-date positions, a fixed 0–100% scale, descriptive chart name and a visible equivalent table. Final-only personal statistics exclude pending, sample and unavailable results. | **Charts > Axes / Descriptive content / Best practices**: meaningful ranges, context and accessible data without mandatory interaction. [Charts](https://developer.apple.com/design/human-interface-guidelines/charts) |
| Bookmark and preference writes could report success through changed state even when storage failed. | Persist first, retain previous list/value on failure, explain recovery and offer retry. Language may change in this tab while its persistence failure is stated explicitly. | **Accessibility > intuitive and perceivable interactions** and **Layout > group related functions**. [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) |

## Improvements

- **High impact, moderate effort — return context:** result filters and progress modes live in the URL; focused review returns to the same filter and question anchor. Previous/next replace review history entries. Named headings receive route focus; closing a retry restores its trigger. This applies **Layout > relative importance and grouping** and **Accessibility > predictable operation**. [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- **High impact, moderate effort — deliberate reveal:** saved practice starts with fresh hidden feedback; checking/revealing is explicit. Retry does not alter grades/history. Missing examples and disconnected teacher review are stated. This applies **Layout > progressive disclosure** while preserving a coherent learning task. [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- **High impact, low effort — enlarged text:** browser measurements found and fixed an overflowing Russian topic tag and an oversized sign-out dialog at a 320-pixel viewport with 200% root text. This applies **Accessibility > larger text** and **Typography > preserving hierarchy when text changes**. [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- **Medium impact, low effort — disabled text:** a rendered dark-theme disabled retry action measured 4.43:1. Its text now uses the stronger secondary-label token; repeat measurements are recorded in contrast.json. Disabled state remains conveyed by native semantics and styling. This applies **Color > inclusive color** and **Accessibility > contrast**. [Color](https://developer.apple.com/design/human-interface-guidelines/color), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- **Medium impact, low effort — preferences:** identity, language/appearance, accessibility and account actions are grouped. Browser-local scope is explicit; ordinary student screens expose no design/reset/teacher operations. Active-work sign-out uses a native confirmation with a safe initial action. This applies **Layout > grouping**. [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

## Positive notes

The implementation retains semantic controls and the established theme tokens, uses text alongside verdict colors, and keeps the reading surfaces opaque. Written content and expected answers preserve Karakalpak language metadata. Keyboard and save-error paths are exercised against actual browser state; the result/attempt schemas and grading algorithm are preserved. Tables offer exact values without requiring hover, drag or chart exploration.

See [verification.json](verification.json), [journey state model](STATE-MODEL.md) and [stage summary](README.md) for the measured scope and remaining limits.

## Platform-specific notes

The project uses 44 CSS-pixel interactive targets and web text enlargement; these are not native point measurements or HIG certification. The existing responsive learning shell is preserved. Native browser dialogs supply modality; ordinary retries and feedback remain inline. No native window controls, platform-only typography, haptics or Liquid Glass claims are introduced.

Chromium evidence does not establish VoiceOver/Safari or NVDA listening results, 400% browser-zoom compliance, native-language correctness or successful representative learner sessions. Those remain part of integrated validation. No performance improvement is claimed; production bundle sizes are recorded separately.
