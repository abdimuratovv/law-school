# Teacher review state and cross-role boundaries

## Sample grades

TeacherReviewProvider owns immutable in-memory response items, applied notes and one undo snapshot. It sits inside the teacher shell, so Overview, navigation and Grading share the actual unfinished count across teacher route changes. It does not use localStorage, mutate GRADING fixtures or call student grading functions. Leaving the teacher workspace or reloading resets this preview. It is not browser-session persistence or a backend save.

Selecting a grade or editing a note creates a component-local draft. Choosing 1/2/3 changes that draft only. Apply sample grade commits the selected response and note, updates counts and keeps the current response visible. Next/Skip are deliberate navigation. Undo retains a stable place in the action region, is disabled without a snapshot and ignores the second click of a double-click gesture. Applying an unchanged response is a no-op. Undo restores the previous item array, notes and selection; it does not invent an undo for remote effects. A comment-only change can be applied to an already graded sample response.

Queue/previous/next/skip, discard and undo request confirmation if a draft differs from applied state. App and SPA history navigation use useBlocker; native beforeunload covers closing, reload and document navigation. Safe cancellation retains the draft. A deliberate leave can discard it. No unapplied draft persistence is claimed. Modals use the shared safe initial focus, contained Tab navigation, Escape cancellation and focus restoration. Narrow queues are collapsible rather than hidden or modal.

Single-key shortcuts can be disabled. They pause in editable controls, native dialogs, modified-key events and already-handled events. Shortcuts never apply a grade automatically. Applying focuses the visible action group rather than an offscreen heading; keyboard access remains in the current task.

## Student examples

Student name/group filters define the displayed list. Details are resolved exclusively within that list; changing filters clears the selected query parameter. An invalid or filtered-out identity cannot retain another student's detail. Closing a detail returns focus to its invoking button.

Illustrative dated attempts derive consistently from the existing student fixtures. Two final records determine the displayed average, topic values and dated 0–100 trend. The preliminary record has two responses awaiting grading and is excluded from final statistics. Its correct count is explicitly preliminary, never a final score. The equivalent chart table contains the same two final values.

These example records have no connection to the signed-in learner's attempts, so there are no fabricated result links. Assignment preview opens Builder without assigning any student.

## Analytics examples

Search uses the visible translated issue/topic and source question text. Scope and sort are working URL filters. Counts come from the eight actual fixture rows. Inspect focuses the chosen issue; an invalid ID gets a named unavailable state rather than another record.

The plain-language issue and question-review action precede optional technical indicators. Distribution bars use a labeled 0–100 percentage scale and an equivalent four-row table. Sample key differences from the source are disclosed. The legacy A–D fixture for written Q-0119 is explicitly inapplicable; its values remain inspectable as legacy data and are not charted as valid written grading.

Reviewed markers only annotate this mounted analytics view and can actually be cleared. They never change answer keys, distribution figures, student grades or attempts. Leaving/reloading resets markers. Regrading is unavailable because no connected attempt scope exists.

## Agreement with student results

Teacher fixtures and learner attempts remain independent, consistently labeled domains. Applying all sample grades cannot finalize a real pending learner response. The retained result flow still calls the existing grader; pending real written work remains preliminary and excluded from final-only trends. Browser verification compares student session/attempt bytes before and after teacher operations.
