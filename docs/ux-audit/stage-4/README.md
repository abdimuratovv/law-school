# Stage 4 — student entry and test discovery

Implemented 2026-10-21, using the approved screen contracts, shared design system and stage-3 shells. Stage 5 requires the user's confirmation after this summary. The [interactive prototype and captured journey](PROTOTYPE.md) link the implemented screens and representative states.

## Delivered

Sign-in now has one phone/code flow across sizes, language selection, format guidance and associated validation errors. The local-preview disclosure appears before entry: no SMS is sent and any six digits work. Paste, whole-code entry, Backspace and change-number are supported. Six digits fill the form; Continue or native form submission performs the single continuation action. The sample-code button fills the code only. A failed sign-in write leaves the form and number/code intact for retry, with no false authenticated state. Safe full return URLs retain query and hash.

Home prioritizes a usable saved session, then the optional introduction if incomplete, then practice. Saved work is distinguished from unavailable records without deleting either. Recent learning uses genuine attempts, labels pending work preliminary and identifies preview results; seeded history is not presented as personal progress. Sample assignments are clearly labeled sample definitions rather than teacher messages. New learners can bypass the introduction.

The catalog distinguishes practice from timed exams, shows actual question counts/types, and marks incomplete material as preview before entry. Search uses the visible translated title/topic/mode. Mode, topic and search (`q`) stay in the URL; editing filters replaces history. Result count, current scope, no matches, reset and empty-content recovery are explicit. Catalog-to-lobby return restores the originating URL, card and scroll. User-entered queries remain user text when the interface language changes.

The lobby presents actual rules, content language, timing, local saving scope, written-answer limitations and one primary start/resume/preview action. Missing definitions or question material get named recovery and cannot start. New sessions are persisted before entering the player; a failed initial write stays in the lobby and can be retried. Resume retains the existing session and deadline. Expired sessions enter the existing expiry handler, without a restarted timer. Placeholder results are explicitly unsuitable as reliable assessment.

The optional sample uses three source questions with no score or recorded attempt. It has check/next, previous, a named modal question map, written character input, example reveal, skip and origin-aware returns. Map selection focuses the current step heading. Completion changes only introduction status, can finish with an empty written response and reports failed completion writes. Sample answers reset on reload, which is disclosed before interaction.

All five screen roots opt out of DOM mutation and use explicit translations. `discoveryMessages.ts` supplements existing dictionaries; source question material retains `lang="kaa"`. The observer remains for routes assigned to later stages. Native copy review is still required.

## Verification evidence

| Check | Scope |
|---|---|
| TypeScript and production build | `npm run build`, including `tsc --noEmit` |
| Composition matrix | 210 renders: phone/code, Home, catalog, sample and two lobbies × five widths (1440/1366/1024/390/320px) × two themes × three languages |
| Large text | 18 route/language compositions at 320px and 200% root text, with target and overflow measurements |
| Journey state checks | [Results](journey-results.json): fresh/returning/active/unavailable learners, three-language search, return context, retryable entry writes, sample completion, preview/missing content and unchanged deadlines |
| Keyboard and boundaries | [Results](keyboard-results.json): native Enter submission, paste event, sample map/answer keys, mode selection, card return, browser history, query retention and validated origins |
| Explicit copy register | 99 keys checked for Uzbek/Karakalpak/Russian coverage, including tutorial step copy; [register](copy-coverage.json) |
| Shared components | Original 39 assertions retained; [results](component-results.json) |
| Existing behavior probes | 26 pass, three previously known failures, nine observations; [flows](regressions/flow-results.json), [discovery](regressions/discovery-results.json) |
| Data and assessment protection | Source data, routes, schemas, grading, storage, exam/results/review modules unchanged; existing answer-update/submission state methods retained |

The final [verification register](verification.json) records pass status, exact assertion counts and source hashes. The matrix runs with MutationObserver disabled, so it checks explicit rendering. Phone and code are measured separately. Large-text checks exposed narrow long-word and non-wrapping badge overflow; scoped wrapping and flexible heading widths fix it. This also resolves the stage-3 catalog overflow finding in the measured configurations.

The reused discovery script is adapted only to press Continue after filling the code, matching the approved explicit submission flow. Historical stage-0/1/2/3 evidence is unchanged. Render-commit waits from the stage-3 regression runner are retained; keyboard focus assertions wait for asynchronous route restoration before inspection.

## Implementation boundaries

Persisted data schemas, keys and grading rules are unchanged. `signIn` and `completeIntroduction` now return write success and update in-memory state only after a successful write. The additive `beginSession` API creates an absent session only after persistence succeeds and returns without resetting an existing one. Existing `saveSession`, `dropSession`, `addAttempt` and saved-question methods keep their previous behavior. Their assessment write/submission recovery remains stage 5, not a claim of general storage-failure recovery in this milestone.

The three known baseline failures remain global exam ArrowRight navigation, surfaced assessment write-failure recovery and teacher draft reload persistence (stages 5/7). Exam composition, answer selection/clearing/checking, grading and auto-submit are protected by unchanged source plus reused behavior probes. Teacher pages are outside this redesign milestone.

Build gzip size: entry 123.37kB, CSS 14.05kB; stage 3 was 118.07kB and 13.08kB. The additional explicit copy contributes to entry size. No dependencies, backend/SMS/account integration, new product routes or deployment were introduced. Existing pending written results do not imply a connected teacher-review service.

Validation is scoped to Chromium and scripted journeys. Representative learner sessions, native-language signoff, screen-reader listening and other browser engines remain outstanding. The root-text reflow proxy is not a 400% browser-zoom claim. The interactive prototype is available for user review before the assessment milestone.

## Reproduce and next checkpoint

With Python Playwright and installed Google Chrome, start Vite in one terminal and run checks in another:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173
python docs/ux-audit/stage-4/check_journey.py
python docs/ux-audit/stage-4/check_keyboard.py
python docs/ux-audit/stage-4/capture_matrix.py
python docs/ux-audit/stage-4/run_regressions.py
npm run build
python docs/ux-audit/stage-4/verify_stage.py
```

Do not edit application source while capturing. Baseline probes characterize known failures rather than fail on every reported failure; `verify_stage.py` asserts the retained failure set. Evidence is written only to this stage's directory. [Source backup](source-before.zip) supports selective rollback after checking subsequent edits; the workspace has no Git repository. Restore changed files selectively and remove new source files only together with their imports. The production `dist` output was regenerated.

Stage 5 will redesign the exam workspace, including layout, question navigation, deliberate practice checking, global shortcuts, timer/submission behavior and failed-save recovery. It starts only after user confirmation.
