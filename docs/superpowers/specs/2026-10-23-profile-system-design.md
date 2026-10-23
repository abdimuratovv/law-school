# Profile: approved System design

The user selected option A (System) from three interactive profile mockups. Implement its identity summary, two-column personal-details form, settings rows with icons, custom language picker, compact theme control, and separate sign-out footer. Apply the same component to learner and admin profiles. Stack fields and controls on mobile. Use existing theme tokens and fonts in light and dark modes.

Remove the reduce-transparency setting and state from the application, including the design reference and legacy profile. No backend or database changes are needed. Preserve the two-step first-login questionnaire and existing Google/account security.

The language picker exposes all three native language names, current selection and a check mark. Support arrows, Home/End, Enter/Space, Escape, outside click and Tab dismissal. Restore focus after selection and Escape. The compact native radio group provides monitor/sun/moon icons and translated labels. Preferences retain existing browser persistence and report storage failures with retry actions.

Personal details show saved/unsaved state and enable saving only when changed. Errors retain edited values. A modal confirmation preserves sign-out behavior, returns focus on cancellation, and warns about unsaved profile edits. Use browser unload protection for unsaved edits. The Google connection summary uses actual authenticated identity, without exposing internal account IDs in the primary UI.

Validate learner/admin routes, mobile widths, all three languages, themes, picker keyboard/dismissal behavior, storage failures, profile saves, sign-out modal and existing onboarding. Build/typecheck and browser acceptance checks are required before pushing and deploying.

Verification: production build and all three TypeScript checks passed. Chrome acceptance scripts cover 19 onboarding/profile-save checks, 18 existing profile/navigation/language checks and 18 System profile checks, including 320/390/768px layouts, keyboard interaction, system-theme changes, storage failure/retry and sign-out focus restoration. No backend/database schema changes are included.
