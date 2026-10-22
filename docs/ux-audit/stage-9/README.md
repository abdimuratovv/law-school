# Stage 9 — integrated validation and release preparation

Authorized 2026-10-21; technical handoff prepared 2026-10-22 (Asia/Tashkent). **Automated validation and release preparation are complete with an unresolved loading-performance finding; full Stage 9 acceptance and public release remain pending.** Human reviews have not run. No deployment was performed. Stage 9 is the final planned stage; there is no automatic next implementation stage.

## Delivered changes

Two validation findings were fixed: static answer rows now expose their correct/incorrect label through a named noninteractive group, and teacher pages now scroll within their fixed workspace. The latter was missed by earlier width-only checks and could hide content below the viewport. All other application source remains byte-identical to the verified Stage 8 checkpoint. Routes, source data, scoring, deadlines, storage and application dependencies are unchanged.

The project README and [current design reference](DESIGN-REFERENCE.md) now describe the delivered workflows and demo boundaries. The [accessibility report](ACCESSIBILITY-REPORT.md) records findings, measurements, incomplete audit rules and platform limits. The [human acceptance packet](HUMAN-ACCEPTANCE.md) provides learner/teacher tasks, native-language and assistive-technology checks, success criteria and an unfilled results register. [Release/rollback notes](RELEASE-AND-ROLLBACK.md) explain artifacts, route recovery and preservation of active browser work.

## Technical results

| Check | Result |
|---|---|
| TypeScript and production build | Passed |
| Retained authoring / assessment / learning / teacher review / shared controls | 75 / 51 / 63 / 62 / 39 assertions passed |
| Historical baseline | 28 pass, 10 recorded observations, zero failures |
| Production assessment and timing | 51 assertions passed |
| Production keyboard learner journey | 23 checks passed; 14 focus destinations visible and unobscured with 3px outlines |
| Production route matrix | 414 passed across 23 variants, three desktop viewports, two themes and three languages |
| Production reflow/text stress | 207 passed, including 320×256 effective reflow and 200% root text |
| Automated accessibility | 138 axe-core audits, zero automated violations; gradient contrast still requires manual review |
| Static-answer semantics | 24 production states passed |
| Teacher wheel/keyboard/focus reachability | 36 route/configuration checks passed |
| Target audit | 92 records; 1,666 control appearances meet 44px bounds |
| Shared reference | 72 material/theme/language/density configurations passed |
| Contrast | 160 probes passed; measured text minimum 4.87:1, non-text token-pair minimum 3.59:1 |
| Localization | 207 route renders, 13 live checks, 680 copy keys; no unwrapped critical-copy findings or DOM translator |
| Retrospective performance | Measured; slower median loading remains unresolved (S9-P01); not a passing release gate |

Authoring, learning, shared/baseline and teacher-review workflows were rerun after the scrolling fix. All actual static-answer consumers were tested after the role fix. The full production matrix and stress suite were rerun after both fixes, including a teacher-main horizontal-overflow check. Earlier reports remain historical; `axe-before-fix.json` preserves the initial semantic finding. Chrome screenshots were inspected for representative exam and narrow teacher states, not every capture.

The [performance report](PERFORMANCE.md) compares local production builds with the pre-redesign source under matched conditions. This is a **retrospective** comparison, because Stage 0 recorded no performance timings. Final median LCP is 2,860→4,822ms on Home, 2,204→3,678ms on Exam and 5,136→6,088ms on Bank. Entry JavaScript grows from 109,377 to 165,106 gzip bytes. **Loading regression S9-P01 remains unresolved and requires remediation/acceptance before public release.** Scripted answer commits improve in this sample, and scroll timings are mixed; no blur-specific cause or universal improvement is established. Raw samples, method, variability and bundle sizes are in [performance-summary.json](performance-summary.json) and [performance-samples.json](performance-samples.json); these are not field INP, real hardware certification or timings collected during Stage 0.

## Reviewable release candidate

- [Static build archive](release-dist.zip)
- [Source and handoff archive](release-source.zip)
- [Artifact checksums and scope](release-manifest.json)
- [Evidence/source/build verification](verification.json)
- [Stage 8 source/configuration checkpoint](source-before.zip)

The source archive excludes screenshots, historical backup zips, the generated benchmark workspace and dependencies. Those images/checkpoints remain in the original workspace. The pinned axe package is an isolated audit tool and does not change the application lockfile. No Git repository, commit or release branch exists in this workspace.

## Reproduce the checks

Install the lockfile dependencies with `npm ci`; Python Playwright, Pillow and installed Google Chrome are also required. Tests use disposable contexts and synthetic storage. They never open the user's normal browser profile. The runners use ports 5173 (Vite source) and 5174 (production preview); avoid unrelated processes on those ports.

```powershell
npm run typecheck
npm run build
# Separate terminals:
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5174 --strictPort
# From the project root:
node docs/ux-audit/stage-9/audit_source.cjs
python docs/ux-audit/stage-9/run_retained.py
python docs/ux-audit/stage-9/check_assessment_regression.py
python docs/ux-audit/stage-9/check_review.py
python docs/ux-audit/stage-9/check_review_edges.py
python docs/ux-audit/stage-9/check_localization.py
python docs/ux-audit/stage-9/check_production_assessment.py
python docs/ux-audit/stage-9/check_production.py
python docs/ux-audit/stage-9/check_keyboard.py
python docs/ux-audit/stage-9/check_static_labels.py
python docs/ux-audit/stage-9/check_teacher_scroll.py
python docs/ux-audit/stage-9/check_targets_and_glass.py
python docs/ux-audit/stage-9/check_primary_links.py
python docs/ux-audit/stage-9/check_materials.py
```

`tools/axe-core-4.10.3.tgz` is included in the workspace/source archive; if missing, obtain the same package with `npm pack axe-core@4.10.3 --pack-destination docs/ux-audit/stage-9/tools`. The retained adapters preserve previously approved OTP submit, draft Resume, import/builder selectors, unload probes and the current Uzbek Retry saving label. None changes grading or weakens persistence assertions.

For the retrospective benchmark, prepare/build an isolated baseline, start its preview separately, then run measurements **with other browser suites idle**:

```powershell
python docs/ux-audit/stage-9/prepare_baseline.py
node node_modules/vite/bin/vite.js build docs/ux-audit/stage-9/baseline-workspace
# Separate terminal:
node node_modules/vite/bin/vite.js preview docs/ux-audit/stage-9/baseline-workspace --host 127.0.0.1 --port 5175 --strictPort
python docs/ux-audit/stage-9/measure_performance.py
python docs/ux-audit/stage-9/verify_delivery.py
python docs/ux-audit/stage-9/package_release.py
```

`verify_delivery.py` requires complete passing reports, validates the Stage 8 backup and permits only the two reviewed source changes. Packaging verifies source/build digests and produces archives; it does not deploy. Rebuild the candidate before rerunning production checks after any source change.

## Remaining acceptance gates

No native-language review, NVDA listening, VoiceOver/Safari testing, actual browser 200%/400% zoom or representative learner/teacher sessions were performed. The participant register contains zero completed sessions, against a minimum of five learners and two planned teachers; four of five learners must independently complete the critical journey. Effective reflow, dictionary coverage and DOM announcement checks do not pass these human gates. Axe's incomplete gradient-contrast nodes remain review obligations beyond the representative composed probes.

Loading-performance finding S9-P01, human acceptance and target-specific release approval are still outstanding. The candidate is reviewable; full Stage 9 acceptance is not complete and it is not approved for production release.
