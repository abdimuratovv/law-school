# Google authentication and account access

Stage 2 provides Google OpenID Connect login, application sessions, CSRF enforcement, staff roles and scoped group APIs. The login screen now uses the server's session rather than the historical phone/OTP demo. Exam storage and teacher content screens still use account-scoped sample data until later stages.

## Configure local Google login

1. Create/select a project in [Google Cloud Console](https://console.cloud.google.com/). Configure the OAuth consent screen/branding and audience. If the application is in testing mode, add the Google accounts that will perform the smoke test to its test audience.
2. Create an OAuth client with **Web application** type. Register the exact redirect URI `http://localhost:8787/api/v1/auth/google/callback`. This implementation requests only `openid email profile` and uses a server redirect flow.
3. Copy `.dev.vars.example` to `.dev.vars`. Replace the client ID and secret locally, and keep `APP_ORIGIN=http://localhost:8787`. The file is ignored by Git. Do not share the secret in chat, paste it into frontend variables, or commit it.
4. Run `npm run db:migrate:local`, `npm run build`, and `npm run dev:worker`. Open **http://localhost:8787** using the same host that is registered with Google. Do not switch between localhost, 127.0.0.1, or Vite's port during the login flow.
5. Choose Continue with Google. Confirm the callback returns to the application. Open `/api/v1/auth/me` to verify a student account exists; the returned application user ID is suitable for the admin bootstrap command.
6. Sign out from Profile and verify that revisiting a protected route requires login. A cancelled Google consent screen should return to the sign-in page with a safe retry message.

Without credentials, the sign-in screen reports temporary unavailability and the Google button is disabled. There is no alternative demo login, test password or production authentication bypass. Automated tests use disposable databases, injected test transports and signed fixture tokens; they do not create a live Google OAuth client.

For staging/production, register the exact HTTPS origin and callback URI for that environment, set `APP_ORIGIN` and the client ID, and configure `GOOGLE_CLIENT_SECRET` directly with Worker secrets for that configuration. Never point a local preview at the production database. Each deployment uses the three rate limiter bindings in its example configuration; change namespace IDs if they conflict with existing account namespaces.

## Session behavior

- The stable Google subject identifies the account. Email changes do not create a new account or elevate roles.
- New registrations become active students. Staff privileges must be granted by an administrator.
- The server verifies signature, issuer, client audience, expiry, nonce and verified email. Authorization uses code + PKCE, browser-bound state, and a ten-minute single-use login record.
- Application sessions use random tokens. Only token and CSRF hashes are stored in D1. The session cookie is host-only, HttpOnly, SameSite=Lax and Secure on HTTPS, with a fixed seven-day expiry. HTTP cookies are allowed only for an explicitly local loopback origin.
- `GET /auth/me` returns safe account fields and a session-bound CSRF token. It does not renew or write the session. The frontend holds identity/CSRF in memory and revalidates on focus/visibility changes and logout notifications.
- Mutations require the authenticated session, an exact matching Origin, and X-CSRF-Token. Role and account status are read from the database. Suspension revokes the user's sessions; logout revokes the current session.
- Fifteen-minute scheduled cleanup removes at most 200 expired login records and 200 expired sessions per run. Expiry is enforced on requests even if cleanup is delayed.

## First administrator

First log in normally through Google and identify the registered application's UUID from `/api/v1/auth/me`. Then, from a trusted operator terminal:

```bash
node scripts/bootstrap-admin.mjs --user-id YOUR_REGISTERED_USER_UUID --local --dry-run
node scripts/bootstrap-admin.mjs --user-id YOUR_REGISTERED_USER_UUID --local
```

The dry run prints the generated SQL without applying it. The actual command can claim a bootstrap record only once, requires a Google identity already attached to an active account, grants admin, and writes an audit event atomically through a database trigger. It refuses initialization if an administrator already exists. No user becomes admin by being the first visitor, and no public bootstrap route exists.

An intentional remote initialization requires both `--remote` and `--config wrangler.staging.jsonc` (or the production configuration). Never run it against a remote environment unless that operation has been authorized. Example UUIDs in documentation are not real accounts.

## API reference

All paths below are relative to `/api/v1`. Responses are no-store. Protected endpoints require the session cookie; all POST/PUT/PATCH/DELETE operations additionally require exact Origin and `X-CSRF-Token` from `/auth/me`.

| Method and path | Access / behavior |
| --- | --- |
| `GET /auth/config` | Public; returns only `googleEnabled` |
| `GET /auth/google/start?returnTo=/tests` | Begins browser-bound Google redirect; return path is allowlisted |
| `GET /auth/google/callback` | Consumes a matching, unexpired flow; creates/rotates the session |
| `GET /auth/me` | Signed-in user; `{user: {id,name,email,role,revision}, csrfToken}` |
| `POST /auth/logout` | Revokes the current session and expires its cookie |
| `GET /groups` | Admin: all groups; teacher: assigned groups; student: enrolled groups |
| `POST /groups` | Admin; body `{name}` creates a group |
| `GET /groups/:id/members` | Admin or that group's assigned teacher |
| `POST /groups/:id/members` | Same; body `{studentId}` enrolls an existing active student, retry-safe |
| `DELETE /groups/:id/members/:studentId` | Same; removes membership |
| `PUT /groups/:id/teacher` | Admin; body `{teacherId}` adds an existing active teacher/admin to the group |
| `DELETE /groups/:id/teachers/:teacherId` | Admin; removes the staff/group link |
| `GET /users` | Admin; bounded list of account IDs, names, emails, roles, status and revisions |
| `PATCH /users/:id/access` | Admin; body `{role,status,revision}` with optimistic revision checking |

List routes accept `limit` (default 25, max 100) and a `cursor` from the previous response's `nextCursor`. A null cursor means no further page. Only admins can use the global user list; teachers obtain membership details only for assigned groups. Enrollments never create users from arbitrary submitted email addresses.

Staff actions are audited. Stale revisions return 409; the final active administrator cannot be demoted or suspended. A teacher accessing another teacher's group receives 404. These APIs provide the account/group backend; connecting the existing teacher dashboard's sample tables is scheduled for the authoring stage.

Rate limits are applied per browser (20 login starts/minute), with a separate high IP ceiling (1,000/minute) to accommodate shared school networks, and per account for staff writes (120/minute). These edge limits are approximate per Cloudflare location; they are not a global quota guarantee. Logout remains available independently of the staff write limit.

## Browser data migration

The historical `hm.user`, `hm.sessions`, `hm.attempts`, mistakes and `hm.authoringDrafts.v1` are preserved as old demo records, but are not read as authenticated identity or uploaded as results. New local preview work uses `hm.account.<user-id>.demo.*`, including teacher drafts. Logout/account changes clear these caches; language, theme and other appearance preferences are preserved. Private cached preview data is not a substitute for server persistence.

The UI warns before interactive logout with active work. If browser storage itself is blocked, cache cleanup is best-effort; the server session is still revoked and the application clears its in-memory account state. No Google/application bearer tokens are stored in browser localStorage.

## Acceptance status

Local protocol, security and database tests verify signed-token acceptance, invalid signatures/claims, replay, browser binding, expiry, CSRF, logout, account/group isolation, administrator restrictions and bootstrap. Browser checks use controlled HTTP fixtures to verify the UI without real provider secrets.

Local verification on October 22, 2026: 65 Worker/D1 tests passed, all three TypeScript configurations passed, the frontend build and Worker bundle dry run passed, a clean `npm ci` succeeded, and npm audit reported zero known vulnerabilities. Migration 0003 applied to local D1. The operator command was checked in dry-run mode; no real user was promoted.

Seventeen browser checks passed in disposable Chrome contexts, including three interface languages, rejection of a forged historical `hm.user`, Google-button navigation, student/staff routing, account-scoped answers and teacher drafts, localized logout copy, CSRF delivery and cache cleanup while retaining legacy demo data and appearance preferences. With the built local Worker running, reproduce them using `python scripts/verify-auth-ui.py` (Python Playwright and Google Chrome required). These browser fixtures are not included in the current GitHub Actions workflow.

The main browser JavaScript bundle is approximately 658 kB (204 kB gzip); the existing bundle-size/performance warning remains open. Hosted CPU/latency and 200-user capacity have not been measured in this stage.

**Real staging Google sign-in remains pending until the project owner configures an OAuth client and staging origin.** Automated fixture tests are not evidence that a live consent screen, callback registration, or hosted CPU quota is configured correctly. No cloud deployment or paid resource was created in this stage.

References: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [oauth4webapi](https://github.com/panva/oauth4webapi), [Cloudflare rate limiter](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
