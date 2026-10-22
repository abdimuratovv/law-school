# Stage 2 implementation plan

2026-10-19. Authorized by the user's “start 2nd stage” after reviewing stage 1. The prior screen/interaction design is the implementation input; this stage does not restart design approval or advance to stage 3.

- [x] Review existing tokens, common controls, reference page and consumers; retain source backup because this workspace has no Git repository.
- [x] Evolve `hm.css` in place: semantic surfaces/ink/borders, rem type, spacing/radius/elevation/focus/motion tokens, opaque fallback and forced colors. Remove conflicting common-control declarations from layout CSS.
- [x] Complete shared button, selection, switch, checkbox, input/OTP, tabs and overlay contracts. Keep filters as radio groups; demonstrate actual tabs with linked panels. Preserve existing call sites through compatible APIs and small semantic adaptations.
- [x] Provide reusable field/search, alert/loading/empty/table/chart patterns, with text equivalents and truthful state examples.
- [x] Rebuild `/design` as explicit three-language reference with theme, density, transparency and interactive state controls. Include a representative student reading card and teacher work table for this milestone's visual review.
- [x] Verify keyboard state transitions, focus containment/return/background isolation, disabled/loading actions, field errors, chart alternatives, 44px targets, 48px exam actions, three viewports, themes/languages, opaque/translucent compositions, reduced motion and forced colors.
- [x] Run typecheck/build and targeted critical-flow regressions; record remaining baseline failures without claiming fixes outside this stage.
- [x] Publish token/state specifications, measured contrast/target register, verification evidence, summary and stage checkpoint.
- [ ] Receive user confirmation before starting stage 3.

Runtime React/CSS is authoritative. `design/project` remains a historical source until its artifacts are explicitly synchronized; new tokens must not be copied back over runtime by an undocumented generation step. No routes, attempt/session schema, local auth semantics or content source are migrated here. Shell navigation/loading changes, persistence recovery and complete page localization remain their assigned stages.

Interaction references: [WAI radio groups](https://www.w3.org/WAI/ARIA/apg/patterns/radio/), [tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), [modal dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast). A focus-appearance AAA criterion is not mislabeled as an AA requirement; this project's focus/target goals remain documented project choices. Measurements and manual review are required beyond these references.
