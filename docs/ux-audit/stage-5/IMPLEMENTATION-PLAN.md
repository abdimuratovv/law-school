# Stage 5 — assessment workspace

Authorized by “start Stage 5” after stage-4 review. Use approved S06/L4, navigation/saving contracts and the established visual direction. No new visual-approval gate within this milestone.

- [x] Review approved contracts, current player/state/overlays, source backup and baseline failures.
- [x] Implement truthful synchronous session persistence with in-memory retention on failure and retry.
- [x] Implement idempotent result-first submission, immutable failed-submission snapshots, partial-cleanup recovery and absolute expiry under the existing persisted schema.
- [x] Build a readable single-column workspace, in-flow navigation, optional settings region, written assistance and independent save/offline status.
- [x] Add distinct answered/current/flagged/checked map states, guarded shortcuts and correct focus transitions.
- [x] Confirm exit/back/forward; protect unsaved reload/close; never pause deadlines in dialogs or after backgrounding.
- [x] Explicit three-language coverage, workflow/failure/clock tests, complete-route smoke after supported router-provider migration, desktop/narrow/short-height/large-text matrix and shared regressions.
- [x] Record final evidence, limitations and summary; await confirmation before stage 6.

Browser history blocking uses React Router's supported `useBlocker` API, which requires its data-router provider. Migrate the root provider while keeping the existing route inventory and dependencies; verify every route after this infrastructure change. References: [useBlocker](https://reactrouter.com/6.30.1/hooks/use-blocker), [createBrowserRouter](https://reactrouter.com/6.30.1/routers/create-browser-router).
