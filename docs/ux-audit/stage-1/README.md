# Stage 1 — information architecture and screen contracts

Date: 2026-10-19 (Asia/Tashkent). Status: design deliverables complete; awaiting user review before stage 2. This is a proposed frontend contract, not shipped behavior or a usability-study result.

The user approved stage 1 after reviewing the completed baseline and requested a summary and confirmation between stages. That review cadence governs this work: the complete design is prepared for a single stage review. No additional mid-stage approval is required. The brainstorming skill informs context review, options, design and self-review; it does not authorize implementation or override the user's stage boundaries. Existing project paths are retained for these artifacts instead of creating a competing specification tree. This workspace has no Git repository, so documents are saved without a commit.

## Deliverables

1. [Navigation and shared behavior](NAVIGATION.md): route ownership, translated destination labels, active states, focused-screen entry/exit, return context, modal/nonmodal decisions and persistence boundaries.
2. [Student and teacher journeys](JOURNEYS.md): seven primary journeys, including cancel/back/resume, empty data, unavailable content and demo limitations.
3. [Screen contracts](SCREEN-CONTRACTS.md): 21 screen variants covering all 20 routable screen patterns, each with title, task, primary action, secondary actions, status, recovery, layout and delivery stage.
4. [Annotated low-fidelity layouts](LAYOUTS.md): eight reusable desktop compositions and narrower-width rules, covering every route through the contract mapping. These are structural wireframes; tokens and visual polish belong to stage 2.
5. [Acceptance walkthrough](ACCEPTANCE.md): completed design review, route coverage and scenario-by-scenario paper verification; implementation checks remain explicitly pending.

## Direction and alternatives

| Approach | Benefit | Trade-off | Decision |
|---|---|---|---|
| A. Stable learning navigation with focused test screens; teacher task groups | Clear return context, comfortable reading, familiar paths; works with current data | Requires explicit transitions and accurate save/status language | Selected, consistent with the sequence's calm workspace direction |
| B. Keep global navigation on every exam and review screen | Immediate access to all destinations | Competes with reading and creates more accidental exit opportunities | Rejected for focused assessment screens |
| C. Use a dense split workspace for both roles | Efficient cross-referencing for frequent operators | Excess structure for learners and first use | Use selected table/detail patterns only in teacher screens |

## Decisions ready for review

- Student navigation remains Home, Tests, Progress, Mistakes and Profile at the same URLs. Mistakes explicitly contains questions the learner saved for practice; incorrect attempt answers remain in Results/Review.
- Teacher navigation is Overview; Content → Question bank, Import, Test builder; Students → Grading, Students, Analytics. Editors sit under Question bank rather than becoming navigation destinations.
- Lobby, exam and question review use a focused frame. Results stays in the learning shell with Progress active. The optional introduction remains in the learning shell and is always skippable.
- Question maps are modal at every size. Filters, teacher previews, student details and grading panes are inline/nonmodal. Confirmation dialogs are modal with a safe default and focus return.
- Explicit return links have deterministic safe fallbacks. Browser Back stays meaningful; no workflow uses a blind history-back as its only escape route.
- Saves describe actual outcomes. Answer write failures remain visible; recoverable local authoring drafts are required in stage 7, while teacher previews do not claim publishing, assignment or student-grade synchronization.
- No production roles, real SMS, backend connection, content translation or route/storage migration is introduced by this stage. A proposed additive local-draft store for stage 7 is specified for review; existing records stay compatible.

## Completion and limits

All primary journeys have been walked through on paper, including recovery. All 20 routable screen patterns have a contract, with separate new/edit editor variants making 21 screen contracts; unknown paths and missing entities have shared recovery rules. The acceptance document maps every gate item to evidence.

No application code, dependencies, browser storage or baseline screenshots changed. Typecheck/build were not repeated because this stage changes documentation only; stage 0's passing build is historical evidence, not validation of a future implementation. No live usability, contrast, keyboard or screen-reader result is claimed for these proposals. Copy concepts must be implemented through explicit message keys and reviewed in all three languages.

Stage 2 will establish semantic tokens, control states, accessible interaction primitives and the `/design` reference. It must implement the modal and keyboard contracts before page migration; a representative student and teacher screen should be reviewed at its milestone. Stage 1 approval does not authorize advancing through later stages without their requested review.
