# Stage 3 — implementation plan

2026-10-19. Authorized by the user's confirmation after stage 2. Use the approved stage-1 navigation/overlay contracts and stage-2 primitives; no new design approval or page-workflow migration is needed to start this milestone.

- [x] Review current shells, router, localization and baseline; retain pre-stage source backup and verify no intervening source changes.
- [x] Rebuild labeled student/teacher navigation, active-section rules, responsive modal drawer and explicit shared copy. Keep paths and current data contracts.
- [x] Supply a single main landmark/skip target for every route, route heading focus, full auth return context, named lazy loading and recoverable bundle failure.
- [x] Use stage-2 overlay contracts for navigation, preserve safe focus return, and verify background isolation and keyboard completion.
- [x] Migrate common controls/status names and locale-format boundaries to explicit messages; keep question material metadata/input. Inventory remaining observer dependence.
- [x] Verify all destinations, browser history, three viewport/theme/language shells, narrow reflow, loading/error, keyboard and focused routes; rerun relevant baseline behavior checks and build/typecheck.
- [x] Record evidence, limitations and handoff. Stage 4 remains gated on the user's confirmation of the stage summary.

Scope excludes student discovery/assessment redesign, teacher authoring/grading redesign, draft/save recovery and removing the translation observer. Runtime files remain authoritative; source backup supports selective rollback after checking later edits. The webapp-testing workflow uses disposable Chrome contexts; no user browser profile is touched.
