# Stage 1 — acceptance walkthrough and review record

Date: 2026-10-19 (Asia/Tashkent). Review type: source reconciliation and paper walkthrough, not a browser test or user study. Outcome: stage-1 design deliverables complete and ready for user approval. Stage 2 has not started.

## Work and review checklist

- [x] Review sequence, stage-0 inventory, known failures and current navigation/flow sources.
- [x] Reuse the selected calm-workspace direction and compare three navigation approaches with explicit trade-offs.
- [x] Resolve routine choices from the plan; prepare the full stage for the user's requested end-of-stage review. No new information was needed to begin the authorized design work.
- [x] Write navigation/active-state/return rules, seven journeys, 21 screen variants and eight structural layout patterns.
- [x] Specify modal/nonmodal behavior and keyboard/focus consequences, independently of final styling.
- [x] Carry saving failures, editor draft loss, teacher fixture isolation and unavailable IDs into concrete recovery contracts.
- [x] Review for missing routes, contradictory transitions, fabricated capabilities, ambiguous primary actions and unassigned requirements; correct issues in the documents.
- [x] Verify local document links, contract/layout references and route coverage by inspection and file checks.
- [ ] User review/approval of stage 1 before stage 2. This is the user's requested checkpoint, not an extra mid-stage approval imposed by a skill.
- [ ] Implement and verify the proposed behavior during its assigned future milestone. Documentation does not establish a passing runtime gate.

The brainstorming process was adapted to the existing approved sequence and stage boundary: context/options/design/self-review are included here; the stage package is the reviewable specification. No interactive visual-choice interview or browser companion was needed to produce the structural document wireframes. No implementation skill or application change was started, and no nonexistent Git commit is claimed.

## Plan gate traceability

| Stage-1 requirement | Evidence | Design outcome |
|---|---|---|
| Five student destinations, existing paths | Navigation: Student labels and selection; S02/S04/S09–S11 | Preserved; saved questions distinguished from wrong answers |
| Persistent shell versus focused lobby/exam/review | Navigation: Frames; L2–L5; S05–S08 | Explicit frame/active-state/entry/exit contracts |
| Teacher Overview/Content/Students grouping | Navigation: Teacher labels; T01–T09; L6–L8 | Existing paths retained; editors belong to Bank; builder label clarified |
| Title/task/action/status/recovery for every screen | Screen contracts, 21 rows | All 20 routed screen patterns covered, editor split into new/edit |
| Modal/nonmodal decisions for maps, filters, previews, confirmations, details | Navigation: Overlay and panel decisions | Maps/confirmations modal; filters/previews/details inline or nonmodal |
| Navigation and journey maps | Navigation diagram; J1/J2/J5 diagrams and J1–J7 walkthroughs | Student and teacher main routes and exception edges specified |
| Annotated low-fidelity layouts | L1–L8; per-screen layout mapping | All screen contracts have a structural layout and responsive behavior |
| Cancel, Back, Resume, empty/unavailable work on paper | Scenario table below | Each has an explicit retained state and safe destination |

## Primary journey scenarios

“Pass” below means the proposed contract has a coherent answer. It does not mean current software passes the scenario.

| Scenario | Paper walkthrough / expected behavior | Contract evidence | Result |
|---|---|---|---|
| P01 New local account | Sign-in → Home without invented history; sample or browse is possible | J1, S01–S04 | Pass |
| P02 Incomplete phone/change number | Error retains number; code Back/Change returns phone; no SMS claim | J1, S01, L1 | Pass |
| P03 Protected deep link | Sign-in returns safe full path/query/hash; invalid origin falls back Home | Navigation return rules, J1/J4 | Pass |
| P04 Skip/cancel/reopen sample | Origin restored on skip; completion goes to origin lobby or practice catalog; no attempt created | J1, S03 | Pass |
| P05 Search has no results | Filters remain visible; clear/reset restores matches; selected UI language drives search | J1, S04 | Pass |
| P06 Incomplete or missing test | Known preview is explicitly labeled through task; missing definitions cannot start; return to tests | Navigation availability, J1, S05 | Pass |
| P07 Start versus resume | One session created for Start; Resume preserves answers/checks/current/deadline | J1/J2, S05/S06 | Pass |
| P08 Choice changes and practice checking | Repeat keeps selection; explicit clear; check then feedback; timed mode reveals no correctness | J2, S06, L4 | Pass |
| P09 Long question / written input | Prompt and choices are one reading flow; dock reserves space; content language and characters preserved | J2, L4 | Pass |
| P10 Map open/pick/Escape | One modal; current-cell focus; pick focuses question; Escape restores trigger | Navigation overlay rules, J2 | Pass |
| P11 Leave/Back/cancel | Named confirmation; cancel retains all state; confirm uses origin/lobby; timer continues | Navigation history, J2 | Pass |
| P12 Reload/offline | Successful local writes restore; deadline is absolute; offline status is distinct from save outcome | J2, Navigation saving | Pass |
| P13 Write failure/manual leave | Input retained in memory; error+retry; Leave anyway warns of loss; native close limits stated | J2, Navigation saving | Pass |
| P14 Submit unanswered/cancel | Counts and review implications shown; review opens map; cancel keeps attempt active | J2, S06 | Pass |
| P15 Expiry while modal open | Deadline supersedes modal; freezes answer changes and commits once; no renewed timer | J2, Navigation overlay/saving | Pass |
| P16 Submit write fails | Read-only submission held; retry; no fake stored result or premature session removal; partial-write integrity assigned to stage 5 | J2, Navigation saving | Pass |
| P17 Pending versus final result | Counts/score/history label preliminary; pending excluded from final aggregate; no live grading promise | J3, S07/S10 | Pass |
| P18 Review boundary/missing model | First/last navigation explicit; no invented expected answer/explanation; Results restores context | J3, S08, L5 | Pass |
| P19 Saved retry/empty saved list | Save doesn't alter grade; retry hides answer; empty list explains entry; missing saved ID removable | J3, S09 | Pass |
| P20 Empty history/missing attempt | Empty → practice; seed summary not reviewable; missing result → Progress; invalid question → same result | J3, S07/S08/S10 | Pass |
| P21 Preference change and sign-out | Local-save feedback; active-deadline warning; cancel retains auth; no account-isolation promise | J4, S11 | Pass |
| P22 Bank search/preview/selection | No matches reset; preview initially closed/nonmodal; selection scope separate from row Open/Edit | J5, T02, L6 | Pass |
| P23 Editor validation/unknown ID | Input preserved; one correct option; errors focus; missing edit cannot silently become new | J5, T03/T04, L7 | Pass |
| P24 Editor draft leave/reload | Successfully written local draft resumes; unsaved leave guard; retry on failure; incompatible newer draft not overwritten | Navigation local-draft policy, J5 | Pass |
| P25 Import errors/replace/cancel | Fixture scope stated before upload; warnings/duplicates explicit; Back retains; replacement confirms; no fake commit | J5, T05 | Pass |
| P26 Import recovery | Only compatible sample metadata restored, not file bytes or parsed spreadsheet content | Navigation local-draft policy, J5 | Pass |
| P27 Builder back/invalid counts/dates | Values retained; per-step validation; no forced selection bypass; empty/manual search reset | J6, T06 | Pass |
| P28 Builder resume/complete | Saved local draft resumes; failed write retry; Finish preview makes no assignment claim | J6, Navigation local-draft policy | Pass |
| P29 Grading draft/cancel/apply/undo | Guard unsaved selection/comments; Apply changes only sample; exact reversible Undo; typing/modal shortcut suppression | J7, T07, L8 | Pass |
| P30 Empty queue/filtered student | Empty queue recovers to Overview; no-match student list clears stale detail | J7, T07/T08 | Pass |
| P31 Analytics and unavailable regrade | Valid question links only; sample data alternative; no real regrade action without connected scope | J7, T09 | Pass |
| P32 Unknown/direct route and loading | Frame-appropriate named recovery; deterministic fallback; lazy loading/error feedback instead of blank area | Navigation availability; F01/R01 | Pass |
| P33 Narrow width and longer language | Labeled menu remains reachable; dialogs modal; body/answers reflow; only tables may scroll horizontally | Navigation frames, L1–L8 | Pass |

## Screen coverage ledger

| Current route pattern | Contract | Journey | Layout | Implementation stage |
|---|---|---|---|---|
| `/sign-in` | S01 | J1/J4 | L1 | 4 |
| `/` | S02 | J1 | L2 | 4 |
| `/getting-started` | S03 | J1 | L2/L4 | 4 |
| `/tests` | S04 | J1 | L2 | 4 |
| `/tests/:testId` | S05 | J1/J2 | L3 | 4 |
| `/exam/:testId` | S06 | J2 | L4 | 5 |
| `/results/:attemptId` | S07 | J3 | L5 | 6 |
| `/results/:attemptId/q/:n` | S08 | J3 | L5 | 6 |
| `/mistakes` | S09 | J3 | L2/L4 | 6 |
| `/progress` | S10 | J3 | L2 | 6 |
| `/profile` | S11 | J4 | L2 | 6 |
| `/admin` | T01 | J5/J7 | L2 | 7 |
| `/admin/bank` | T02 | J5 | L6 | 7 |
| `/admin/editor/:id?` (new) | T03 | J5 | L7 | 7 |
| `/admin/editor/:id?` (existing) | T04 | J5 | L7 | 7 |
| `/admin/import` | T05 | J5 | L7 | 7 |
| `/admin/builder` | T06 | J6 | L7 | 7 |
| `/admin/grading` | T07 | J7 | L8 | 8 |
| `/admin/students` | T08 | J7 | L6 | 8 |
| `/admin/analytics` | T09 | J7 | L6/L8 | 8 |
| `/design` | R01 | Internal reference, not a learner task | L2 | 2–9 |

## Self-review resolutions and handoff

The optional editor route is one current route pattern but two distinct screen variants; counts consistently distinguish these from teacher wildcard routing/fallbacks. Incomplete known sets retain the explicitly identified preview rather than silently blocking or replacing existing attempts. Preview completion is distinct from local draft saving and from publication. Question maps use a consistent modal contract instead of retaining the baseline focus-trap/semantics mismatch. Saved-question navigation does not imply automatic collection of wrong answers. Direct-link fallbacks work without ephemeral return state. Timer expiry takes precedence over dialog focus without altering the deadline or grading formula.

Baseline issue handoff: B-01/B-04/B-12 → S06/stage 5; B-02 → T03–T06/stage 7 and proposed additive local-draft store; B-03/B-05/B-06 → component contracts/stages 2–3 and page verification; B-07 → frame semantics/stage 3; B-08/B-09 → honest capabilities/localization/stages 3, 7–8; B-10 → measurements/stage 2; B-11 → L6/stage 7; B-13 → F01 and affected entity screens. Current defects remain in runtime until their implementation milestone passes.

No screen or journey depends on real SMS, production authorization, an Excel parser, remote grading, live assignment, new translated legal content or fabricated learner history. The only proposed future storage addition is the isolated local authoring-draft namespace described in Navigation; this stage writes no application storage. The same question/attempt schemas and existing keys stay valid. Exact payload validation/retry sequencing and component code belong to the assigned implementation milestones.

Stage 2 can begin only after user confirmation. It should define and verify component interaction/state contracts, semantic tokens, focus/target/contrast behavior and the `/design` reference. Final accessibility measurements, all-language reviewer signoff and representative student/teacher usability work remain later gates; paper passes here are not substitutes.
