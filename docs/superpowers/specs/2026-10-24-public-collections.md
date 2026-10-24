# Public test collections

Status: accepted by the user. Replace mandatory group enrollment with a catalog of published test collections available to every authenticated account. Preserve Google authentication and one-time personal profiles.

## User journeys

Student: sign in, complete the initial profile, choose a collection, solve, submit, see score and answer counts. Scheduled collections share a single opening/closing instant; there is no personal countdown. Always-available collections allow another attempt after completion. Scheduled windows permit one attempt per account. An admin may reopen a closed collection as a new window while preserving previous results.

Admin: import questions or select bank questions, enter the collection name and optional shared schedule, publish once. Preparing private question versions happens automatically in bounded batches behind the single publish action. Invalid questions link back to editing; a failed or retried request must not create duplicate publications. Draft saving remains optional and separate from public availability.

Navigation: Test collections, Question bank, Results, Users. Import is an action inside creation/bank; manual grading is inside Results. User search uses names/email rather than copying identifiers. All users appear automatically. Groups remain stored for historical compatibility and are absent from the main workflow.

## Backend

Add `test_collections`, referencing immutable test versions and their author. Add nullable `attempts.collection_id`, indexed for reporting and uniqueness. Every active published collection is eligible for every authenticated user, independently of mode and legacy is_public. Prevent legacy public/group entry points from bypassing the new collection schedule. Keep ownership-scoped teacher reports and admin-wide reporting. Preserve answer-key separation, atomic answer saves, deadline enforcement and revision conflict checks.

Migration 0009 converts the latest existing published test versions to public collections, retaining their most recent assignment schedule when present. It adopts attempts from that exact window, retaining attempt IDs, answers, results and history links. Older windows remain in the global result history. Draft questions and tests remain private until explicitly published.

Scores are available on submission; answer keys for scheduled windows remain withheld until closing. Manual written grading remains provisional and updates both student and staff results. Admin results show participants, score, completion time and review links without group selection. Imported files can create a collection directly from their authoritative row order.

Validation: real database API tests for group-free access, duplicate/concurrent starts, schedules, scope, answer-key isolation, score/review updates, reopen/retry behavior; execute actual migration SQL over synthetic legacy data; browser tests cover the complete single-publish workflow, all four navigation areas, import-to-collection, automatic user listing, mobile layouts and student results. Do not delete historical records.
