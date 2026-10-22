# Current design reference

This Stage 9 handoff updates the specification after all implementation stages. `/design` remains the interactive token/control reference; this document connects it to the delivered workflows. Historical canvas files are background material.

| Area | Current contract | Reference |
|---|---|---|
| Foundations | Semantic light/dark colors, rem type, 44px shared controls, 48px assessment actions; opaque reading surfaces and subdued navigation glass | `src/styles/hm.css`, Stage 2 token specification, `/design` |
| Navigation | Labeled sidebar at wide sizes, named modal drawer at narrow sizes; one main landmark/primary heading; route focus and contextual return | Stage 1 navigation contracts, Stage 3 shell report |
| Discovery | Explicit practice/timed/preview boundaries, URL filters, local-save disclosure and deliberate entry | Stage 4 screen contracts |
| Assessment | Answered count independent of position, accessible map, explicit checking, immutable submission snapshot, absolute deadline, actionable save failures | Stage 5 state model |
| Learning | Correct/incorrect/unanswered/pending separated; final-only statistics; chart tables; saved retries leave recorded attempts unchanged | Stage 6 state model |
| Authoring | Immutable source; recoverable local drafts, compatible Resume, named validation, loss guards and cross-tab conflict decisions | Stage 7 state model |
| Teacher review | Draft precedes explicit Apply; Apply keeps the current response; Undo restores grade/note; next response is deliberate | Stage 8 state model |
| Analytics | Plain-language issue before coefficients, bounded labeled scales and tables; written questions reject legacy A–D interpretation | Stage 8 review report |
| Localization | Explicit React copy in three languages; source material and user input preserved; no DOM mutation or fuzzy word replacement | Stage 8 localization handoff, Stage 9 audit |

Use `Button` variants rather than applying ordinary link colors to button links. Primary button links require the on-accent foreground. Form errors must name the field, associate guidance and offer recovery. Consequential native dialogs require safe initial focus, contained Tab, Escape and return focus. Disclose the scope and lifetime of sample actions before applying them.

Do not present pending grading as a final failure, preview content as a reliable assessment, sample history as personal results, or local drafts as published changes. Keep a durable attempt before removing its active session. Do not modify scoring, timer rules or source question IDs during a live attempt.

Material preferences require a readable opaque fallback. Preserve reduced motion, forced colors and increased text. Tables may scroll in their own region when two-dimensional relationships require it; the document must reflow. Keep focus visible at sticky headers and scroll boundaries. Measure composed text over glass rather than relying only on token contrast.

The [accessibility report](ACCESSIBILITY-REPORT.md) records measured coverage and limits. Automation cannot certify native-language quality, screen-reader announcements or platform conformance. Human reviews and actual browser zoom remain release gates.
