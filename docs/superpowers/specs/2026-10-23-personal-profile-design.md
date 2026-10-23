# Personal profile onboarding

Implement the user's requested two-step questionnaire after Google sign-in: first name, last name and patronymic on step one; date of birth on step two. Save & continue atomically saves all four required fields to the authenticated account in D1, then reveals the originally requested page. Previous preserves entered names. Failed saves retain the form. Existing accounts without a completed profile also see this form. Completion persists across devices and sign-ins; editing never reopens onboarding.

Use the same form in learner and staff profile settings with all fields visible and editable. Never store questionnaire values in browser storage or OAuth URLs. Google remains the identity/email provider and cannot overwrite edited names. Display names use first and last names within the existing 100-character database limit; all individual fields are preserved in full.

Add migration 0007 with nullable user columns and completion timestamp. PUT /api/v1/auth/profile accepts only the four fields and the current account revision. Session authentication, same-origin CSRF, bounded JSON parsing, mutation limits and an atomic revision check protect updates. No target user ID or role can be supplied. Require nonempty trimmed names up to 100 characters, real ISO calendar dates from 1900 through today, and reject unknown fields. Date of birth is returned only with the account's own authenticated profile, never in staff roster responses.

Keep existing Google callback destinations; the authenticated route boundary displays onboarding before mounting exam/workspace content. This is a UI onboarding requirement, not a new authorization rule for exam APIs. Provide all copy in Uzbek, Karakalpak and Russian, native form labels, keyboard navigation, step heading focus and mobile layout.

Validate D1 persistence, editing, concurrent revisions, Google re-login preservation, invalid dates/names, cross-account isolation and CSRF. Browser checks cover the two steps, back navigation, failed save retry, reload/completion, mobile layout and editing in both learner and admin profiles. Deployment requires migration 0007 before the new Worker serves traffic.

## Verification

All 149 Worker/D1 tests passed, including 16 personal-profile cases. TypeScript checks and the production build passed. Local Chrome acceptance checks passed: 19 onboarding/profile checks and 18 existing profile-navigation/language checks. Google is mocked only at the HTTP fixture boundary for browser tests; database behavior and security checks run against local D1. The live user's profile is never filled with synthetic test data.
