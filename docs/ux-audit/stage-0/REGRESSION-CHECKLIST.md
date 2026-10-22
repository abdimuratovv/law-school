# Critical-flow regression checklist

Run from the project root with Vite on `127.0.0.1:5173`:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173
# In a second terminal; Python Playwright and installed Chrome required
python docs/ux-audit/stage-0/capture_baseline.py
python docs/ux-audit/stage-0/check_flows.py
python docs/ux-audit/stage-0/check_discovery.py
python docs/ux-audit/stage-0/verify_baseline.py
npm run typecheck
npm run build
```

The scripts collect characterization evidence, including existing failures; a zero script exit code does not mean all checks pass. Read `flow-results.json`. No package or production-code changes were required. The installed webapp-testing skill's server helper is absent, so Vite is started directly. This workspace has no `.git` repository; no commit or rollback branch was created.

## Protect at every affected stage

- [ ] Demo sign-in: invalid phone errors, complete phone → OTP, paste/type code, change number, original protected destination, sign-out.
- [ ] Clean account has no fabricated name/group, attempt history, or active session; optional introduction can be skipped/reopened without creating history.
- [ ] Catalog searches currently visible localized titles/topics in Uzbek, Karakalpak, Russian; filters/reset and browser back remain consistent.
- [ ] Start creates a session only once. Resume keeps answers, checked state, current question and absolute deadline. Missing content has a clear recovery destination.
- [ ] Clicking the same option twice keeps it selected; explicit Clear answer removes it. Choice changes remain possible before checking/submitting.
- [ ] Practice checking is explicit, persists on reload, then locks the choice and explains outcome. Answered count is independent of question position.
- [ ] Written answers preserve Karakalpak text after reload. Exact answers, near matches, manual-only and blank answers keep their grading meanings.
- [ ] Timed tests continue after exit/reload; expiry submits one attempt, keeps answers, removes live session, caps duration. Cancel does not submit.
- [ ] Submit confirmation counts unanswered questions correctly; review unanswered returns to map; confirm saves attempt before navigation.
- [ ] Save failures are visible and recoverable; no promise that an unsaved answer is persisted. Current implementation fails this requirement.
- [ ] Results show awaiting grading and preliminary score; pending attempts do not inflate final averages/trends. Review preserves answer and return context.
- [ ] Mistake retry hides the answer until checking/reveal; removing saved questions and changing filters do not corrupt attempts.
- [ ] Keyboard-only operation reaches every destination and action; modal Escape/focus return and background interaction follow the chosen contract. Verify advertised exam/grading shortcuts, input suppression and overlay suppression.
- [ ] All languages preserve accessible names and content-language metadata. Check long Russian labels at 1024px and theme changes without losing state.
- [ ] Teacher bank starts with preview closed; search/filter/select/bulk workflows use clear scope. Correct-answer editor remains single selection.
- [ ] Teacher drafts survive the persistence policy advertised by the UI; validation and unsaved navigation are truthful. Current editor draft disappears on reload despite autosave stamp.
- [ ] Import is explicitly a fixture/demo unless a parser is implemented; warning/duplicate decisions, back/cancel and summary agree.
- [ ] Builder details → questions → groups/dates → review preserves draft across steps; assignment/save reports its actual demo effect.
- [ ] Grading queue, comments, shortcuts and undo agree; do not claim student results are updated while the data sources remain disconnected.

## Evidence limits

Stage 0 browser probes cover the checks listed in `flow-results.json` and `discovery-results.json`, not every item above. The screenshot matrix is a visual baseline, not an accessibility certification. Human language review, screen-reader completion, composed glass contrast, 200% text enlargement, 400% zoom, forced colors, performance comparison and learner/teacher usability sessions remain later acceptance work. No score is assigned to unmeasured contrast or comprehension.

The fixture date/deadline is generated at capture time; reruns intentionally refresh it. Animation/timer text and relative assignment dates can differ between captures. Target measurements are CSS bounding boxes, and do not automatically establish a WCAG failure: spacing, equivalent targets and exceptions need review.
