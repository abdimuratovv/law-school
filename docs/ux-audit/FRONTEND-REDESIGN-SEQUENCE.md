# Huqıq Mektebi — frontend UI/UX redesign sequence

Date: 2026-10-19\
Status: proposed design and delivery plan; no frontend implementation performed\
Method: Apple HIG Expert, with brainstorming used to compare directions before implementation

## Outcome and scope

Redesign the entire student and teacher frontend into a calm, accessible learning workspace. Make the next action clear, keep exam reading comfortable, and make content creation and grading predictable. Apply Apple HIG principles to this React website through web semantics and browser behavior.

The existing project is React 18, TypeScript, Vite, and React Router, with localStorage-backed demo data. It is not a native Apple app. Native SwiftUI materials, Dynamic Type APIs, and Apple platform units are not implementation requirements. Use semantic HTML, CSS tokens, browser text enlargement, keyboard interaction, and screen-reader support as the web equivalents.

Planning assumptions inherited from README.md and docs/ux-audit/UX-REJA.md:

- Desktop/laptop is the primary redesign scope: 1440×900, 1366×768, and 1024×768. Preserve smaller-screen usability and reflow; new mobile artboards are outside this plan.
- Preserve Uzbek, Karakalpak, and Russian UI. Question content remains Karakalpak and is identified separately from the UI language.
- Preserve current routes, attempts, answers, grading semantics, saved preferences, and demo storage unless a specific migration is agreed during implementation.
- This is frontend work. Real SMS authentication, backend persistence, production authorization, and content translation are separate integration projects. Do not imply those capabilities in UI copy.
- Keep the earlier decision to omit Terms, Privacy, and Help links. Put task guidance beside the relevant action.

## Evidence and confidence

This is a source-informed redesign proposal, not a completed browser audit or a HIG certification.

🟢 Verified by source inspection: route inventory; existing theme and material tokens; student/admin shells; common controls; dialog focus management; mixed localization implementation; current exam answer checking and answered-count progress; preliminary-result labels.

🟡 Needs browser/device testing: final rendered target sizes, contrast over composed glass backgrounds, zoom/reflow, all focus paths, screen-reader announcements, and performance. Existing screenshots are historical evidence, not proof of the current rendered UI. The inspected `ux-new-exam-1366.png` shows header crowding and the visual separation between prompt, choices, and dock that the redesign should re-evaluate.

🔴 Assumed: desktop users benefit from a quieter reading surface and simpler task hierarchy. Validate this with students and teachers before treating it as research evidence.

The installed Apple HIG Expert bundle contains SKILL.md only. Its referenced checker script, audit template, and reference files are absent. No checker score has been generated. Use the live Apple sources below; restore the checker or use an equivalent documented contrast/target tool during implementation. Do not report a score for unmeasured elements.

### Current findings to carry into the redesign

| Observation | Evidence | Design consequence |
|---|---|---|
| Semantic light/dark tokens, solid content surfaces, glass, focus colors, and reduced-motion/transparency rules already exist. | `src/styles/hm.css`, `src/styles/app.css` | Evolve the existing system; consolidate duplicated rules rather than adding another styling layer. |
| IconButton requires an accessible label and defaults to 44×44 CSS px. | `src/components/ui/basic.tsx`, `.icon-btn` in hm.css | Preserve this contract and localize every label; audit other controls individually. |
| Chips use 36px height; language select uses 40px minimum height; compact admin menu uses 36×36px. | `.chip`, `.language-field select`, `.admin-menu-toggle` | Review rendered hit areas and bring these controls to the project's proposed 44×44 CSS-pixel target, including padding where appropriate. These are source observations, not measured browser failures. |
| Segmented controls declare radio/tab roles but show no arrow-key or roving-tabindex behavior in their component. | `src/components/ui/basic.tsx` | Define complete keyboard behavior and tab/panel relationships before reskinning. |
| Dialog infrastructure traps/restores focus, while the pop variant shares focus-trapping behavior without always declaring modality. | `src/components/ui/overlay.tsx` | Separate modal and nonmodal interaction contracts; verify background interaction and focus behavior. |
| DOM translation through MutationObserver remains alongside explicit useText calls. | `src/i18n/LanguageProvider.tsx` | Move redesigned components to explicit message keys; finish coverage before removing the observer. |
| Practice answer checking, explicit clear answer, answered-count progress, and preliminary results already exist. | `Exam.tsx`, `Results.tsx`, `Extras.tsx` | Treat them as regression requirements, not new features or unresolved historical bugs. |
| Route-level Suspense uses a null fallback. | `src/App.tsx` | Design an accessible loading state for lazy teacher/design routes. |

Read the existing UX-REJA.md implementation notes before converting any historical finding into a new ticket. Reproduce it first.

## Direction choice

| Approach | Benefit | Trade-off |
|---|---|---|
| **A. Calm learning workspace — recommended** | Neutral reading surfaces, restrained indigo emphasis, glass reserved for navigation and a small set of controls. Best fit for long questions and teacher tables. | Requires deliberate density and hierarchy work across all screens. |
| B. Refine the present design | Lowest visual disruption; retains existing mesh, cards, and floating controls. | Retains more of the current fragmentation and offers less improvement to long reading tasks. |
| C. Strong desktop workspace | Persistent navigation, dense tables, extensive shortcuts, and split views suit frequent teacher use. | A uniform treatment would overwhelm new students; use selected patterns only in the teacher area. |

Use A as the shared foundation, with C's table and split-view patterns inside the teacher workspace. Keep the brand name and indigo identity. Favor a system font stack with verified Karakalpak/Cyrillic glyph coverage; retaining Inter is acceptable if it is reliably available. Avoid depending on Apple-only fonts or icons.

Apple's material guidance assigns Liquid Glass to the navigation/control layer and advises restraint. Use an optional translucent shell above opaque reading and editing surfaces. CSS blur is a web approximation, not the native Liquid Glass implementation. See [Apple: Materials](https://developer.apple.com/design/human-interface-guidelines/materials).

## Delivery sequence

Complete each phase's acceptance gate before broad rollout. Accessibility, localization, and error states are part of every phase, with final integrated verification in phase 9.

### 0. Establish the baseline and protect existing behavior

**Purpose:** distinguish current defects from historical findings and define the redesign's boundaries.

- Inventory every route listed below, its entry points, primary task, data dependencies, and empty/loading/error states.
- Capture current screenshots in the three desktop viewports, light/dark appearance, and all three UI languages. Use isolated demo storage for destructive scenarios.
- Record the working behaviors that must survive: resume, local answer saving, practice checking, timed exam behavior, written-answer grading, preliminary scores, and review navigation.
- Create a current audit register with element, evidence, severity, confidence, proposed fix, and verification method. Include translucent-layer contrast, undersized targets, missing names, and density.

**Deliverables:** route/state inventory, current screenshot baseline, prioritized issue register, critical-flow regression checklist.

**Gate:** every route has a primary task and testable state list; historical findings are marked reproduced, resolved, or unverified.

### 1. Define information architecture and screen contracts

**Depends on:** phase 0.

- Student destinations: Home, Tests, Progress, Mistakes, Profile. Keep existing paths; clarify translated navigation labels without unnecessary route migrations.
- Separate the persistent learning shell from focused lobby, exam, and review experiences. Provide explicit entry, exit, and return destinations.
- Teacher destinations: Overview; Content (Bank, Import, Test Builder); Students (Grading, Students, Analytics).
- Write the task hierarchy for each screen: title, primary task, primary action, secondary actions, status, and recovery path. Use one dominant action per task region; distinguish it from navigation and destructive actions.
- Decide and document modal versus nonmodal behavior for question maps, filters, previews, confirmation dialogs, and teacher detail panels.

**Deliverables:** navigation map, student/teacher journey maps, annotated low-fidelity layouts, screen contracts.

**Gate:** every primary journey works on paper, including cancel, back, resume, empty data, and unavailable content.

### 2. Establish visual tokens and the shared component system

**Depends on:** phase 1.

- Consolidate semantic color, typography, spacing, radius, elevation, density, focus, and material tokens. Keep content, controls, selection, and feedback visually distinct.
- Starting typography: 16–17px body, approximately 18px question text, 1.5–1.6 reading line height, 60–75 character reading width. Use rem-based sizes and let text wrap and grow. These are project proposals, not Apple mandates.
- Starting spacing scale: 4/8/12/16/24/32/48px. Use a small radius family rather than a different treatment per page.
- Design all control states: default, hover, pressed, focus-visible, selected, disabled, loading, validation error, and success. Add status text/icons alongside color.
- Specify buttons/links, icon controls, inputs, OTP, selection groups, switches, checkboxes, search, filters, alerts, progress, tables, charts, empty states, dialogs, and popovers.
- Adopt 44×44 CSS px as the project's default interactive target, with at least 48px height for primary exam actions. These are web design targets, not a conversion of native points or a claim that WCAG requires 44px everywhere. Keep compact glyphs inside larger hit regions.
- Check normal text at 4.5:1, large text at 3:1, and essential control/focus indicators against applicable non-text contrast requirements. Measure translucent compositions, not only token hex values.
- Restrict glass to selected navigation/toolbar surfaces; keep questions, answer choices, forms, and data tables on stable surfaces. Supply opaque fallbacks and preserve readable reduced-transparency behavior.
- Use short, purposeful feedback transitions; no motion required to understand state. Honor reduced motion and forced colors where applicable.
- Update `/design` into the implementation reference with theme, density, language, and state examples. Define how source components and design/project artifacts stay synchronized; runtime React/CSS is the implementation authority.

**Deliverables:** token specification, component/state matrix, updated design reference, contrast and target measurement register.

**Gate:** shared controls meet their interaction and accessibility contracts in light/dark and opaque/translucent conditions before page migration.

### 3. Rebuild the shared shells and localization foundation

**Depends on:** phase 2.

- Rework StudentShell and AdminShell with stable navigation, active states, clear page headings, and predictable content widths.
- At smaller widths, collapse navigation without obscuring labels or losing destinations. Preserve small-screen reflow without creating new mobile mockups.
- Provide a main landmark, skip navigation, logical headings, route focus management, and accessible loading feedback for lazy routes.
- Fix shared modal/nonmodal behavior: appropriate naming, Escape, initial focus, focus return, and inert background only where the interface is modal.
- Migrate shared navigation, controls, and feedback to explicit translations and parameterized messages. Localize accessible names and dates/numbers as well as visible labels.
- Keep question content under its correct language metadata and preserve Karakalpak input. Inventory unmigrated DOM-translated strings before retiring the observer in phase 8.

**Deliverables:** redesigned shells, route loading state, overlay contracts, shared localization migration.

**Gate:** all destinations remain reachable by keyboard, browser back/forward behaves predictably, and all three language shells render without clipping.

### 4. Redesign student entry and test discovery

**Depends on:** phase 3.

- **Sign-in:** clear purpose, phone format guidance, OTP entry/paste, validation, change-number action, and accurate demo messaging. Show resend/error behavior only when supported by the actual data layer.
- **Getting started:** optional short sample flow; no fabricated progress or mandatory tour. Make skip and return paths clear.
- **Dashboard:** prioritize new learner, active attempt, or returning learner states. Lead with the relevant next action, then assignments and useful progress. Avoid unexplained statistics and fabricated personal history.
- **Catalog:** distinguish practice from timed exams; search translated visible titles and topics; provide clear filter/reset/no-result states and unavailable-content treatment.
- **Lobby:** show chosen mode, question count/types, content language, timing, save/resume rules, and one start/resume action. Avoid contradictory duplicate mode selection.

**Deliverables:** sign-in → first task → catalog → lobby prototype and implemented pages, each with full copy/state coverage.

**Gate:** a new learner can find and start the intended mode without assistance; changing UI language does not change the meaning of search or rules.

### 5. Redesign the exam workspace

**Depends on:** phase 4; treat this as the highest-risk interaction milestone.

- Keep question, choices/written response, and feedback in a coherent reading order. Start with one readable column; use a split view only where content and available width justify it.
- Reduce header crowding: separate test identity/mode, time, answered progress, and utilities. Move infrequent settings into a named menu.
- Distinguish current question position from answered count. Preserve existing answered-based progress.
- Preserve deliberate practice checking, stable answer selection, and explicit clearing. Avoid competing check/next controls; define one state-dependent primary action and make skip behavior clear.
- Expose previous/next, flag, question map, and finish with text or reliably named controls. Keep question-map states distinct: current, answered, unanswered, flagged, and checked where relevant.
- Written answers: visible label, expected format, input assistance, Karakalpak character controls, and truthful local save status. Preserve the typed answer when opening overlays or switching questions.
- Keep floating controls clear of reading content at short laptop heights, enlarged text, and browser zoom. Reserve space or use in-flow/sticky controls as appropriate.
- Define exit/resume, final submission, unanswered warning, time expiry, offline detection, storage failure, and reload states. Derive countdowns from existing timing rules; never pause or restart a timed exam accidentally.
- Distinguish network availability from persistence: the present app can say “saved on this device” only after a successful local write, never “synced” without server confirmation. Offline styling does not establish offline reload support.
- Preserve keyboard shortcuts while preventing activation in inputs or modal dialogs. Announce saves and major time thresholds without reading every timer tick.

**Deliverables:** complete exam state diagram, redesigned workspace and map/exit/submit overlays, long-question/written-answer variants.

**Gate:** no lost answers, hidden choices, accidental finish, inaccessible actions, or altered timer semantics across the desktop matrix. Verify reload/resume and local write failure explicitly.

### 6. Redesign results and the learning loop

**Depends on:** phase 5.

- **Results:** distinguish correct, incorrect, unanswered, and awaiting grading. Keep preliminary results explicit in the heading, breakdown, score visualization, and history.
- **Review:** show prompt, learner answer, expected answer, explanation, and previous/next navigation in a consistent order. Preserve return context.
- **Mistakes:** make the current retry behavior discoverable; distinguish saved questions from incorrect attempts. Hide answers until the learner checks or deliberately reveals them.
- **Progress:** provide labeled date/score axes, attempt mode filters, a text/table alternative, pending-result treatment, and actionable next steps. Show truthful empty histories.
- **Profile:** group identity, language, appearance, and accessibility preferences; clearly scope local preferences. Keep internal design/demo operations outside the ordinary student journey.

**Deliverables:** results → review → retry → next practice journey, progress/profile redesigns, chart alternatives.

**Gate:** a learner can explain whether a result is final, find an explanation, and retry a mistake without exposing its answer prematurely.

### 7. Redesign teacher content workflows

**Depends on:** phase 3 and the exam presentation contract from phase 5; follow the student milestone for delivery.

- **Overview:** prioritize grading queue, content readiness, and assignments; reduce secondary metrics.
- **Question bank:** searchable/filterable table, meaningful columns, explicit row selection, deliberate bulk actions, optional detail preview. Preserve the already-closed initial preview behavior.
- **Editor:** clear single-choice/written-answer structure, one correct-answer selection, content validation, preview consistent with the student exam, save/dirty/error feedback, and leave-with-unsaved-changes handling.
- **Import:** retain the existing three-stage workflow but clarify file/schema requirements, row errors, duplicates, preview, and commit summary. Specify actual supported file formats; do not promise full Excel support from a screen label alone.
- **Builder:** staged name/mode → questions → group/deadline → review/action. Keep automatic/manual selection and hidden advanced options understandable. Display the actual effect of save or assignment, including demo-only behavior.

**Deliverables:** bank → editor and import → builder prototypes and pages; table, validation, and draft-state patterns.

**Gate:** a teacher can create/edit a question, resolve an import issue, and assemble a test without losing drafts or guessing the effect of an action.

### 8. Redesign teacher review and complete localization

**Depends on:** phases 6 and 7.

- **Grading:** stable queue + response + rubric/action layout; clear save result; keyboard shortcuts; draft/dirty states. Provide undo only if state changes can actually be reversed.
- **Students:** clear search/group filters, selectable student details, attempt history, pending-grade states, and understandable no-data results.
- **Analytics:** explain actionable question issues before technical coefficients; label charts and provide accessible data alternatives. Before a supported bulk regrade, show affected scope and confirmation; report the actual result.
- Complete explicit message-key coverage across student and teacher pages, accessible names, errors, dialogs, and dynamic summaries. Check all three languages with reviewers.
- Remove DOM text mutation only after coverage is complete and every migrated route has passed localization checks.

**Deliverables:** grading/students/analytics pages, complete translation coverage, consistent cross-role result states.

**Gate:** teacher grading and student results agree; unfinished grades never appear final; no untranslated critical UI or translation-induced layout breakage remains.

### 9. Validate, document, and release in coherent increments

**Depends on:** all earlier phases; repeat relevant checks at every preceding milestone.

- Run `npm run typecheck` and `npm run build` after implementation changes. The current package has no dedicated test command; choose a suitable browser runner when implementation begins.
- Add targeted regression coverage for answer persistence, timer expiry/resume, submission, preliminary grading, keyboard/modal behavior, translation/search, and import/builder state transitions. Avoid tests that only repeat CSS declarations.
- Check the three desktop viewports, light/dark, Uzbek/Karakalpak/Russian, 200% text enlargement, and 400% browser zoom/reflow where applicable. At narrow effective widths, verify current responsive behavior. Constrain horizontal scrolling to genuinely two-dimensional data where needed.
- Test keyboard-only completion, visible/unobscured focus, accessible names, input errors, reading order, and announcements. Include VoiceOver/Safari on an Apple device and NVDA with a Windows browser. Apple-device behavior remains unverified until that test occurs.
- Measure contrast and hit regions in the browser, including scrolled glass backgrounds and opaque fallbacks. A restored skill checker may supplement the audit; its arithmetic score is not a release decision.
- Compare loading time, interaction responsiveness, and scrolling with the phase-0 baseline; reduce blur area/layers if they cause regressions.
- Conduct task-based sessions with at least five representative learners and representative teachers. Proposed learner target: at least four of five independently complete start → answer → submit → review. Log each failure and resolve critical blockers; this sample is formative, not statistical proof.
- Release as shared foundation → complete student discovery flow → exam/results flow → teacher authoring → teacher review. Keep route-level rollback possible through small coherent changes and storage-compatible state. Do not change a live exam's interaction rules mid-attempt.

**Deliverables:** measured accessibility report, regression results, usability findings/fixes, updated design reference and README, release/rollback notes.

**Gate:** critical journeys pass; no unresolved blockers for reading, operating controls, preserving answers, understanding grades, or completing teacher tasks. All remaining limitations are recorded with evidence.

## Route coverage

| Routes | Main phase | Primary source files |
|---|---|---|
| `/sign-in`, `/getting-started`, `/` | 4 | `SignIn.tsx`, `GettingStarted.tsx`, `Dashboard.tsx` |
| `/tests`, `/tests/:testId` | 4 | `Catalog.tsx`, `Lobby.tsx`, `src/lib/tests.ts` |
| `/exam/:testId` and question map/submit/exit/offline states | 5 | `Exam.tsx`, `src/components/exam/parts.tsx` |
| `/results/:attemptId`, `/results/:attemptId/q/:n` | 6 | `Results.tsx`, `Review.tsx`, `src/lib/grading.ts` |
| `/mistakes`, `/progress`, `/profile` | 6 | `Extras.tsx` |
| `/admin`, `/admin/bank`, `/admin/editor`, `/admin/editor/:id` | 7 | `Overview.tsx`, `Bank.tsx`, `Editor.tsx`, `AdminRoutes.tsx` |
| `/admin/import`, `/admin/builder` | 7 | `Import.tsx`, `Builder.tsx` |
| `/admin/grading`, `/admin/students`, `/admin/analytics` | 8 | `Grading.tsx`, `Students.tsx`, `Analytics.tsx` |
| `/design` | 2, then maintained throughout | `src/pages/DesignSystem.tsx` |
| All shells, controls, themes, languages, loading states | 2–3, 8–9 | `src/components/layout/*`, `src/components/ui/*`, `src/styles/*`, `src/i18n/*`, `src/App.tsx` |

Page filenames without a directory above live under `src/pages/student/` or `src/pages/admin/` according to the route. State integration remains in `src/state/AppState.tsx`; preserve `src/data/types.ts` contracts or document any migration.

## Execution and review rules

For each milestone, prepare the flow, annotated layout, copy, component states, accessibility behavior, data boundaries, and acceptance scenarios before implementation. Review one representative student screen and one teacher screen after phase 2 to establish the shared visual language before applying it everywhere.

Do not estimate a fixed completion date before phase 0 establishes the remaining defects and design depth. Track completion by acceptance gates. Suggested responsibility: product/design owns flow and copy; frontend owns components and state integration; QA/accessibility owns independent verification; content reviewers own language and question-material correctness. One person may cover multiple roles.

This document is the requested planning artifact. Frontend implementation can proceed as a separate task after the design direction is settled; this plan does not claim that any redesign or live usability test has already shipped.

## Sources

- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials) — material hierarchy and restrained use of glass in navigation/controls.
- [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) — legibility, interaction, assistive technology, and platform-specific target guidance. The project's 44 CSS-pixel target is a chosen web standard, not a universal native minimum.
- [Apple HIG: Navigation and search](https://developer.apple.com/design/human-interface-guidelines/navigation-and-search) — navigation primitives and search patterns.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — web verification reference for contrast, keyboard, reflow, focus, and target-size criteria; validate applicable success criteria during implementation.
- Local evidence: README.md; docs/ux-audit/UX-REJA.md; current src routes, styles, components, localization, and student flows; historical docs/ux-audit/screenshots/ux-new-exam-1366.png.

Apple Markdown documentation was retrieved on 2026-10-19 for materials, accessibility, and navigation/search. This plan paraphrases the guidance and makes project-specific adaptations explicit.
