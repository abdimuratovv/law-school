# Shared test availability and admin reopening

The user requested a shared scheduled window (for example 24 October, 22:00–23:59 Asia/Tashkent), without an individual countdown. Assigned tests use the assignment closing instant as every attempt's deadline, regardless of start time or legacy duration. The existing assignment enforces a single attempt per learner and window. Before opening and at/after closing, the server refuses new attempts. Saves at/after the deadline remain rejected and the last server-saved snapshot is finalized.

Remove the personal-duration input from the live test builder and countdown from the live student exam. Display fixed opening and closing dates in the catalog/lobby, and a fixed deadline during solving. Keep server clock offset and local deadline locking. Open public practice remains untimed. Mock tests are scheduled through groups. The legacy immutable `test_versions.duration_seconds` constraint remains for compatibility; new mock versions store a compatibility value that assigned-attempt creation never uses.

Migration 0008 updates only active assigned attempts to the shared closing instant; completed attempts and answers are untouched.

Admin-only reopening creates a new assignment with the same immutable test version and group, new opening/closing dates and an audit record. The old window must have ended. Replayed operation IDs return the same new assignment; changed requests conflict. Previous results are preserved, and every learner may start one new attempt in the new window. No automatic live schedule is created as part of deploying this feature.

Verify early/late starts, common deadline for learners joining at different times, frozen late answers, admin permissions, reopening idempotence, unchanged previous attempts, UI absence of a countdown and duration field, fixed Tashkent dates, and early/closed lobby blocking.

## Published question selection and order

The user also requested select-all, clear selection, and number ordering in the test builder. Fetch every accessible latest published question version across pages, include its authoritative import row number and source metadata, and display source files with their original question order. Provide inclusive From/To number filters. Select all applies to all matching fetched questions, rather than one API page. Clear selection removes every selected ID. Enforce the existing 100-question test limit before saving. A changed selection is normalized to the displayed source order, and saved drafts pin those exact published versions.

New attempts preserve the ordered `test_versions.question_ids` sequence instead of shuffling questions. Existing attempts keep their stored question and answer-option order. Answer options retain their existing independent randomization; correct answer IDs remain stable. Test the builder against deliberately scrambled and paginated metadata, range selection, deselection/reselection, saved payload order and the selection limit. Verify the student sequence against the published test across different learners and resumptions.
