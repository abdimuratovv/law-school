# Profile navigation and language controls

The user supplied the interaction design: move the sidebar Profile entry to the existing bottom avatar/name for learners and administrators, place language selection in profile settings, and replace the landing language select with a round flag cycling to the next language on click.

The shared navigation footer becomes one keyboard-accessible profile link. Learners use `/profile`; staff use `/admin/profile` inside their existing authorized workspace. The profile link indicates its current route and closes the mobile drawer through the existing navigation handler. Admin identity gains the same initials avatar as the learner identity. The main learner navigation no longer repeats Profile.

The shared profile settings retain language, appearance and sign-out. Language dropdowns are removed from the live catalog, lobby, exam and navigation footer. The public sign-in page keeps a single flag button with the fixed cycle `uz → kaa → ru → uz`. The flag is decorative; an accessible name identifies current and next languages. Existing browser preference persistence remains responsible for updates and reload behavior. No menu opens on flag activation.

Implementation stays in the shared navigation, existing profile, admin routes and a small flag control. No authentication, role policy, exam state or backend schema changes are needed. The admin profile destination is added to the existing safe return allowlist. Browser checks cover both identities, desktop/mobile navigation, language selection persistence, the full flag cycle and absence of dropdowns outside profile settings.

Verification: all three TypeScript configurations and the production build passed; 18 browser checks covered learner/admin desktop and mobile profile navigation, keyboard access, sign-out, language persistence and the full flag cycle; 15 existing authentication tests passed. Private-fixture scan across six browser chunks and Worker dry run passed. Local visual review used anonymous and synthetic authenticated contexts, without Google credentials or cloud data. The pre-existing main bundle-size warning remains.
