# Annotated low-fidelity desktop layouts

These wireframes define hierarchy, reading order and interaction regions. They are intentionally structural: no final colors, type scale, glass styling or pixel-perfect composition is established here. Stage 2 defines those through shared components. Numbered regions are annotations, not visible product labels. Each [screen contract](SCREEN-CONTRACTS.md) maps to one of these eight patterns.

## L1 — demo sign-in

```text
┌────────────────────────────────────────────────────────────────┐
│ [1] Huqıq Mektebi                              UI language      │
│                                                                │
│                   [2] Welcome / purpose                         │
│                   Local demo: no SMS is sent                    │
│                                                                │
│                   [3] Phone number                              │
│                   +998 [____________________]                   │
│                   Format / associated error                     │
│                                                                │
│                   [4] [ Continue              ]                 │
│                                                                │
│  Code step replaces [3–4]:                                      │
│  +998 … [Change] → six code boxes → demo continuation            │
└────────────────────────────────────────────────────────────────┘
```

1. Brand and language are quiet navigation/settings. Language remains usable before sign-in.
2. Purpose and demo scope precede data entry. Do not imply that a message was sent.
3. One labeled field/group at a time; error text is associated with the input. Code paste/autofill behaves as one logical six-digit task with individually named positions.
4. One primary continuation per step. Error does not clear entered phone/code. At 1024px the form remains centered with readable line lengths, not stretched to the viewport.

## L2 — learning workspace and overview/reference variants

```text
┌──────────────────┬─────────────────────────────────────────────┐
│ [1] Brand        │ [2] Page title                               │
│                  │     Short task/status sentence              │
│ Home             ├─────────────────────────────────────────────┤
│ Tests            │ [3] Relevant next task                        │
│ Progress         │     Actual context → [ Primary action ]      │
│ Mistakes         │     Quiet secondary path                     │
│ Profile          ├─────────────────────────────────────────────┤
│                  │ [4] Supporting content                       │
│                  │     Filters → result list / history          │
│ [Identity]       │     Empty/recovery state when appropriate     │
└──────────────────┴─────────────────────────────────────────────┘
```

1. Exactly one labeled active navigation representation. Skip link precedes it and targets the main region. At 1024px reduce sidebar width while retaining labels; at narrow effective widths use the shared modal menu.
2. Focus this heading on route change; no repeated h1 in shell. Results activates Progress; sample activates Home.
3. Home prioritizes actual resume → optional sample → practice. Overview uses actual sample queue or content task. Profile instead groups directly applied preferences; it has no fake page-level Save. Reference instead exposes specimen controls. Empty history has one Find a practice test action, not a zero-filled fake chart.
4. Catalog: filters/search → matching count → cards. Progress: mode → final-only chart + equivalent table → complete/pending history. Mistakes: saved-question count → inline retry cards, hidden answers. Profile: identity → language/appearance → local-data scope → sign out. Sample: step introduction → L4 reading region → check/next/skip. Support cards never visually outrank the next task.

## L3 — focused lobby

```text
┌────────────────────────────────────────────────────────────────┐
│ [1] ← Back to tests / known origin                              │
│                                                                │
│      [2] Actual test title                                      │
│          Practice / Timed exam / Interface preview              │
│                                                                │
│      [3] Count & actual question types     Time / Untimed        │
│          Material: Karakalpak                                   │
│          Save on this device; timer continues after leaving      │
│          Written-response review and preview limitations        │
│                                                                │
│      [4] Try a sample                [ Start / Resume ]          │
└────────────────────────────────────────────────────────────────┘
```

1. Name the destination instead of an unlabeled close icon. Direct link always has a safe fallback.
2. No duplicate mode chooser: changing practice/timed selection returns to Tests. Preview identity persists into exam/results.
3. Short rule list answers what happens next, when time runs out, where answers live and what is actually ready. Count types from definitions, not assumed positions.
4. Exactly one primary start/resume/preview action. Unknown content replaces it with Back to tests. Resume does not create a replacement session. Same vertical order at all three target widths.

## L4 — focused exam reading flow

```text
┌────────────────────────────────────────────────────────────────┐
│ [1] Leave test   Test title        Question n/total   Timer      │
│                  Answered x/total · saved/unsaved status         │
├────────────────────────────────────────────────────────────────┤
│ [2] Status strip only when needed: offline / save failure        │
│                                                                │
│          [3] Question n / topic                                 │
│              Prompt, terms/definitions and legal context         │
│                                                                │
│          [4] Choose one answer                                  │
│              ( ) A …                                           │
│              ( ) B …                                           │
│              ( ) C …                                           │
│              ( ) D …        Clear answer                        │
│              OR labeled written field + Karakalpak characters   │
│              Practice feedback appears after checking           │
│                                                                │
│ [5] Previous    All questions    [ Check / Next ]    Finish      │
└────────────────────────────────────────────────────────────────┘
```

1. Test identity, position, answered progress and timer are distinct. Heading/title may wrap; timer never hides task controls. Untimed mode says so. Save feedback announces state changes without reading each keystroke/timer tick.
2. Offline is informational for local work; save failure is a separate alert with retry. Do not show Saved solely because the device is offline or React state updated.
3–4. Default is a single reading column with prompt immediately before answer choices. Wide matching/long questions may use an aligned supplementary column only when reading order and choice visibility stay clear; 1024px returns to one column. Written input and character aids stay with the question. Long content scrolls without clipping; no answer is removed to fit the viewport.
5. Dock is in normal layout flow or has fully reserved space; it cannot cover choices, field errors or focus. Check/Next is the changing primary action, Finish a quieter explicit action. Last-question action is Review and finish; confirmation still required. Previous boundary is disabled with clear position. Targets ≥48px for primary exam actions are measured in stage 2/5, not asserted from this sketch.

Modal map: named heading, answered/unanswered/flagged legends only when supported, actual type groups, numbered cells, Close; initial focus current cell. Submit modal: counts, pending-written explanation, Review unanswered and Confirm submit. Leave modal: continue-timer/save state, Keep solving and Leave. One open modal at a time. Frozen submission replaces editable controls with read-only status and Retry saving after a write failure.

## L5 — result summary and focused review

```text
RESULT — learning shell retained
┌────────────┬───────────────────────────────────────────────────┐
│ Navigation │ [1] Final / Preliminary result                     │
│ Progress ● │     Test / date / preview identity                 │
│            │     [ Review mistakes / written / all answers ]    │
│            ├───────────────────┬───────────────────────────────┤
│            │ [2] Score + label │ [3] Answer list + filters      │
│            │ Correct/incorrect │ Q / verdict / Open review      │
│            │ Blank / awaiting  │ Count independent of filter    │
│            │ Time / topic data │ No rows → show all/reset       │
│            └───────────────────┴───────────────────────────────┤
│            │ Back to progress / Home / Retake or Resume         │
└────────────┴───────────────────────────────────────────────────┘

REVIEW — focused frame
┌────────────────────────────────────────────────────────────────┐
│ [4] ← Results        Question n/total         Previous / Next    │
│                                                                │
│ [5] Prompt → learner answer → expected/model → explanation      │
│     Verdict text, including Awaiting review                     │
│                                                                │
│ [6] Save for practice       [ Next to review / Back to results ] │
└────────────────────────────────────────────────────────────────┘
```

1. Select one review action by the actual verdict breakdown. Final versus preliminary appears in the heading and score, not merely a color or footnote.
2–3. At 1024px stack summary above answer list rather than squeezing labels; keep score numerals/units together. A table/text alternative carries chart values. Missing models and explanations are stated, not invented.
4. Results has a deterministic same-attempt destination; first/last controls respect boundaries. Filter and row context restore when available.
5. DOM and visual order agree. Review never exposes editable exam controls or changes attempt answers. Full question remains accessible at narrow widths.
6. Saving toggles without redirecting; retry happens on Mistakes. Next/return is dominant, saving a quieter toggle. Awaiting review stays distinct from incorrect even if the learner can read a model answer.

## L6 — teacher table with optional detail

```text
┌──────────────────┬─────────────────────────────────────────────┐
│ [1] Overview     │ [2] Page title / sample scope    [ Action ]   │
│ Content          ├─────────────────────────────────────────────┤
│  Question bank   │ [3] Search / filters / reset / visible count  │
│  Import          ├──────────────────────────┬──────────────────┤
│  Test builder    │ [4] Table / list          │ [5] Detail       │
│ Students         │ [ ] ID  Question Status  │ named heading    │
│  Grading         │ [ ] …   Open / Edit      │ full context     │
│  Students        │                          │ Close → row      │
│  Analytics       │                          │ optional action  │
│ Student app      ├──────────────────────────┴──────────────────┤
│                  │ [6] Selection scope + deliberate bulk action │
└──────────────────┴─────────────────────────────────────────────┘
```

1. Content/Students are labels, not destinations. Bank remains active in its editor; Test builder avoids ambiguity with learner Tests. At 1024px use narrower labeled nav or modal menu to protect work space; no inaccessible unlabeled rail.
2. Bank New question is the page action before selection; Import is secondary navigation. Students has row selection, not a fake Assign CTA. Analytics leads with Inspect issue; Overview links here using valid IDs only.
3. Filters apply inline; no modal required. Empty query results clear stale student detail. Keep scope and sample totals explicit; fixture totals cannot masquerade as loaded row count.
4. Rows have explicit selection controls and Open preview/Edit buttons rather than pointer-only row actions. Long question text can truncate visually only if full text is available through a named preview action. Real table horizontal scroll stays within a labeled region.
5. Bank detail initially closed and nonmodal. At narrower widths place it below the selected row/table or in a single content region with a clear Back to list; focus only moves on an explicit Open action. Student detail and analytics distribution use the same principle. Selecting a hidden/nonexistent row clears or recovers, never shows another student's stale data.
6. Selection scope is actual IDs/count; bulk actions confirm destructive changes and name their sample effect. Reserve space if bar is sticky. Unselected default actions do not compete with a selection task.

## L7 — authoring and staged previews

```text
┌──────────────────┬─────────────────────────────────────────────┐
│ Teacher nav      │ [1] Bank → New/Edit draft / Import / Builder │
│                  │     Draft saved / unsaved / retry + scope   │
│                  ├─────────────────────────────────────────────┤
│                  │ [2] Step/context strip when staged           │
│                  ├──────────────────────────┬──────────────────┤
│                  │ [3] Active form/task     │ [4] Preview       │
│                  │ Label                    │ actual prompt /  │
│                  │ Field + help/error       │ selected count / │
│                  │ One correct-answer key   │ sample decisions │
│                  │ Validation summary       │ no live publish  │
│                  ├──────────────────────────┴──────────────────┤
│                  │ [5] Cancel / Back       [ Check / Next ]      │
└──────────────────┴─────────────────────────────────────────────┘
```

1. Breadcrumb and explicit return are distinct from destructive Discard draft. Show a save timestamp only after a confirmed local draft write. Entering an existing local draft offers Resume/Start fresh; invalid source IDs never render the new-question form as Edit.
2. Editor has format/content/answer structure rather than an invented mandatory wizard. Import retains Upload → Sample validation → Preview. Builder retains Details → Questions → Groups/dates → Review. Step Back keeps values; Cancel exits only after unresolved unsaved changes are handled.
3. Single-choice keys use one radio group; written accepted answers/manual grading are separate. Import rows show errors, warning resolution and duplicate policy without pretending to parse Excel. Builder automatic/manual counts and group dates use actual sample data. Validation identifies fields, preserves input and focuses summary/first error after attempted Next.
4. Inline preview is optional and nonmodal. At 1024px stack below the form, preserving a visible expanded-state toggle; do not shrink editor text into two unreadable columns. It must use the student question presentation contract. Draft save ≠ publish; Finish preview names the lack of publication/assignment effect.
5. One primary action per active step; unsaved failure prioritizes Retry saving. Sticky controls have reserved space and never cover input/error focus. Keyboard and browser Back use the dirty guard. Successfully saved drafts survive reload under the proposed stage-7 local-draft contract; uploaded file bytes are not part of recovery.

## L8 — grading workspace and analytics detail variant

```text
┌──────────────┬─────────────────────────────────────────────────┐
│ Teacher nav  │ [1] Grading / sample scope / unfinished count    │
│              ├────────────────┬─────────────────┬───────────────┤
│              │ [2] Queue      │ [3] Response    │ [4] Rubric    │
│              │ pending/graded │ prompt          │ model if any  │
│              │ current row    │ learner answer  │ grade choices │
│              │ filter/state   │ sample identity │ comment       │
│              │                │                 │ [ Apply ]     │
│              ├────────────────┴─────────────────┴───────────────┤
│              │ [5] Previous / Skip / Next   local status / Undo │
└──────────────┴─────────────────────────────────────────────────┘
```

1. Sample state is clear at entry; no live synchronization promise. Empty/all-done queue replaces the work area with a named recovery/review state, not an invalid selected item.
2–4. At 1440px use three panes only when response text stays readable; 1366px may combine response/rubric; 1024px places queue selection above response and rubric/actions below. Visual and keyboard reading order remains queue → response → grading action, never an offscreen hidden action pane.
3. Prompt, answer and model preserve content language; anonymized/identified mode is a display preference, not a security boundary.
4. Grade selection is tentative until Apply sample grade. Unsaved comment/grade changes guard queue and route changes. Model absent means manual guidance, never a fabricated correct answer.
5. Undo is offered only for an exact reversible local application. Shortcuts are inactive in inputs and modals. Sample grade persistence/scope is stated beside the result. Analytics can reuse the issue → response distribution → explanation sequence without borrowing Apply grade or implying a working regrade backend.

## Common reading and focus annotations

Every frame has skip navigation where appropriate and exactly one main region. Route changes focus its h1; same-screen filter changes retain focus and announce result count. Status updates do not steal focus. Modal close restores a present trigger or logical fallback. At all target sizes and enlarged text, labels and controls wrap/reflow before any content is clipped; floating controls reserve their full space. Stage 2/3 implementation must validate these sketches in light/dark, all three languages, reduced motion/transparency and narrower effective widths. These are acceptance requirements, not measurements from the wireframes.
