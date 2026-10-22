# Stage 3 — shared shells and localization foundation

Completed 2026-10-19. Stage 4 awaits the user's confirmation. The implementation follows the approved stage-1 navigation and stage-2 shared components. This milestone changes navigation, accessibility and localization infrastructure; page-specific redesigns retain their scheduled stages.

## Delivered

Students have a labeled desktop sidebar and a compact modal menu with the same five destinations. Teachers have grouped navigation, seven teacher destinations and a student-app return link. Teacher navigation collapses below 1200px to preserve content room; student navigation collapses below 900px. Only one navigation tree is mounted. Active states associate onboarding with Home, results with Progress and question editing with Question bank. Badges distinguish saved questions and sample grading responses; the teacher footer identifies sample data.

Every existing route variant now has one visible main landmark and a skip target. Route changes update the translated document title and focus a heading or main content. Query-only and language changes preserve task focus. A keyboard/pointer action cancels delayed route focus so it cannot interrupt someone already interacting. The compact student-management detail view now retains its heading. Assessment/lobby/review routes remain focused workspaces outside the global navigation.

The navigation drawer uses the shared native modal dialog: translated name, current destination as initial focus, Tab containment, Escape, background isolation, and focus return. Selecting a destination moves focus into its content; resizing an open drawer to the desktop layout closes it and focuses main content.

Lazy routes show a named loading state. Bundle failures offer reload and a return link; unknown routes have recovery content. Sign-in preserves the protected student destination's query and hash, with a validated return-path boundary. This does not change the local preview sign-in model or add backend authentication.

Shared navigation, control names and feedback use explicit translation messages. Number interpolation, navigation counts, counters and real attempt dates have locale formatting; timer accessible names use translated units. Karakalpak question metadata/input are preserved. See the [localization inventory](LOCALIZATION-INVENTORY.md) for remaining page strings, legacy chart/date surfaces, the numeric-locale fallback and the observer removal gate in stage 8.

## Verification

| Scope | Result |
|---|---|
| Production build, including TypeScript | Passed |
| Shell configurations | 48 passed: student/teacher × 1366/1024/390/320px × light/dark × Uzbek/Karakalpak/Russian; mutation observer disabled |
| Route renders | 69 passed: all 23 existing variants at 1440/1366/1024px; one main, heading, skip target, correct path, no page errors or document overflow |
| Navigation/recovery assertions | 50 passed, including all destinations with keyboard at desktop/compact widths, drawer focus/isolation, history, parent active states, auth context and injected lazy-module failure/reload |
| Localization assertions | 30 passed: live explicit language changes, preserved focus/title/language, numbers/dates, return-path boundary, source material/input, 320px/200% root-text drawer wrapping and resize behavior |
| Shared controls | All 39 stage-2 assertions retained and passed |
| Existing behavior probes | 26 pass, three previously known failures, nine observations |
| Protected data contracts | AppState, question/test/admin source data, types, storage and grading byte-identical to pre-stage backup |

Screenshots and measured values are in [shell matrix](shell-matrix.json), [route landmarks](route-landmarks.json), [interactions](interaction-checks.json), [localization](localization-checks.json), [component checks](component-results.json) and [verification](verification.json). The matrix disables the observer intentionally: English content in still-unmigrated page bodies is expected there; shell labels remain explicitly localized. All 48 screenshots are retained in `screenshots/`, alongside loading/error and large-text probes.

The injected module test matches Vite module URLs including optional cache timestamps. The reused control runner waits for React's render commit after key events before inspecting state; it preserves the original assertions. An initial discovery screenshot capture failed in Chrome; its independent rerun completed and produced the final discovery evidence. Historical stage-0/1/2 evidence was not overwritten. A label typo in the shell assertion was corrected from 96 to 48; the matrix contains exactly 48 distinct configurations, checked independently by `verify_stage.py`.

Build gzip size: entry 118.07kB and CSS 13.08kB, versus stage-2 114.37kB and 12.69kB. Teacher/design routes remain lazy loaded. No dependencies or persisted data schema were added; `dist` was regenerated. No deployment was performed.

## Limits and next gate

The three baseline failures remain scheduled work: global exam ArrowRight navigation and surfaced write-failure recovery in stage 5, teacher authoring draft reload persistence in stage 7. They are not stage-3 regressions. The navigation drawer itself fits at 320px and 200% root text; the existing catalog body produces 5px document overflow in that probe and needs attention in stage 4. These tests cover Chromium and scoped reflow/interaction checks, not whole-application accessibility certification, native-language signoff, screen-reader listening, other engines or 400% browser zoom.

Stage 4 will redesign sign-in, getting started, Dashboard, catalog and lobby, with explicit page copy/state coverage and the discovery journey gate. It starts only after user confirmation.

## Reproduce and rollback

With installed Python Playwright and Google Chrome, start Vite in one terminal and run the checks in another:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173
python docs/ux-audit/stage-3/check_shells.py
python docs/ux-audit/stage-3/check_localization.py
python docs/ux-audit/stage-3/run_regressions.py
npm run build
python docs/ux-audit/stage-3/verify_stage.py
```

Do not change application source during browser capture. `--interactions-only` reuses completed matrix/route evidence for recovery-test iteration; `--routes-only` refreshes just route landmarks. The reused baseline probes characterize known failures and do not fail the process for every reported failure; the integrity check verifies that their failure set is unchanged.

The workspace has no Git repository. [Pre-stage source backup](source-before.zip) supports selective rollback after checking later edits. `verification.json` lists changed/new source files and records their final hashes. Restore changed files selectively and remove the five added source files only together with their imports; do not restore all source blindly after subsequent work.
