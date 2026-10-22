# Design Review: Stage 7 teacher content workflows

## Summary

Responsive React web Overview, Bank, Editor, Import and Builder use the approved calm workspace tokens. Severity: **Good**, with local demo limitations stated in the product. Apple principles guide clear input, truthful feedback, sparing modality and accessible reflow; this is not native-platform certification.

The skill's bundled reference index and HIG directory were absent, as in stages 5–6. Reviewed Apple's published Markdown for Accessibility, Color, Layout, Typography, Entering data and Alerts. Full guideline downloads were not retained.

## Critical issues addressed

- **What:** Editor previously displayed a save timestamp without persisting fields. **Why:** Feedback must describe the actual outcome. **Fix:** Validated local writes, explicit saved/unsaved/failure states, recovery decisions and guarded leaving. [Apple HIG — Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data).
- **What:** Publishing and import readiness could be inferred from fixture actions. **Why:** Forms should explain requirements and errors; actions should match outcomes. **Fix:** Check and preview / Finish preview, metadata disclosure before selection, actual counts and source-error explanations. [Apple HIG — Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data).
- **What:** Consequential field changes and local hiding lacked explicit decisions. **Why:** Interruptions should be reserved for important choices with useful actions. **Fix:** Named native confirmations for field discard, draft deletion, unsaved leaving, conflicts and selected sample hiding; safe initial focus and Escape cancellation. Ordinary previews remain inline. [Apple HIG — Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts).

## Improvements

- Opaque editor surfaces use semantic light/dark tokens. Status and correct-answer meaning use text and structure alongside color. [Apple HIG — Color](https://developer.apple.com/design/human-interface-guidelines/color).
- Wrapped actions, labels and dates form a single column at narrow widths; the multidimensional bank table has its own scroll region. Scalable text and native controls support browser accessibility tools. [Apple HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography).
- Question errors link to their fields. Builder validates each step and reviews actual selected IDs, types, dates and advanced settings.

## Positive notes

Actions match the local preview boundary. Teacher work cannot mutate student results. Bank filters survive editing, and nonmodal preview has explicit focus entry/return. Three-language critical copy renders directly with the legacy observer disabled during verification.

## Platform notes

These are web controls and CSS-pixel target checks, not native Apple points or Dynamic Type. Browser date/time inputs retain platform rendering and use the device time zone. Native unload wording is browser-controlled. Automated Chrome checks and screenshot inspection do not replace a dedicated assistive-technology user study. Integrated release validation remains stage 9.
