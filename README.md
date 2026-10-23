# Huqıq Mektebi

A multilingual law certificate preparation application with student exams and a teacher workspace. Built with React, TypeScript, Vite, Cloudflare Workers and D1.

**Status:** Google authentication and account/group APIs are implemented on Cloudflare Workers/D1. OAuth credentials are required for real sign-in. The learner catalog, attempts, synchronization, results and grading now use the backend. Teacher drafts, immutable publishing, scoped assignments and audited manual grading are connected. Import and full reporting are pending. This intermediate version is not ready to administer real exams. See the [backend setup guide](docs/BACKEND.md), [accepted architecture](docs/superpowers/specs/2026-10-22-backend-design.md), and [implementation plan](docs/superpowers/plans/2026-10-22-backend-implementation.md).

## Features

- Student dashboard, test catalog, timed mock exams, and untimed practice.
- Server-backed multiple-choice/written answers, flags, provisional/final results and attempt history. Bookmarks and full progress reporting are pending.
- Server-backed teacher question drafts, immutable publishing, test building, group enrollment/assignments and revisioned manual grading.
- Uzbek (default), Karakalpak, and Russian interface translations. Question material remains in Karakalpak.
- Responsive layouts, light/dark themes, keyboard navigation, and a design reference at `/design`.

## Requirements

- Node.js 22.12 or later (Node.js 22 recommended; `.nvmrc` selects version 22).
- npm, included with Node.js.

## Local development

From the repository root:

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. If the port is occupied, use the address printed by Vite.

Sign-in now uses Google. For the combined frontend/API development server and OAuth configuration, follow [Google authentication setup](docs/GOOGLE-AUTH.md). The former phone/code demo login has been removed.

Automated Worker tests do not need external credentials. Actual Google sign-in requires a Web OAuth client and an ignored local `.dev.vars` file or deployed Worker secrets. Without configuration, sign-in is disabled; there is no demo bypass.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the exact dependencies from the lockfile |
| `npm run dev` | Start the development server |
| `npm run typecheck` | Run strict TypeScript checks, including unused declarations |
| `npm run build` | Check types and create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm audit` | Check dependencies against npm security advisories |
| `npm test` | Run Worker-runtime and D1 integration tests |
| `npm run db:migrate:local` | Apply schema migrations to local D1 |
| `npm run dev:worker` | Serve built frontend and API together on port 8787 |
| `npm run build:worker` | Bundle the Worker as a local dry run; no upload |

GitHub Actions runs a clean install, typechecks, frontend build, Worker/D1 tests, Worker bundle dry run, and dependency audit on pushes and pull requests. Browser tests are not included in this CI workflow.

## Project structure

```text
src/
  components/       Shared UI, layouts, exam controls, and draft handling
  data/             Public controls examples and teacher preview fixtures
  i18n/             Language provider, translations, and locale formatting
  lib/              API client, IndexedDB drafts, navigation and preview utilities
  pages/
    student/        Sign-in, dashboard, exams, results, and review
    admin/          Teacher workspace
    DesignSystem.tsx
  state/            Authentication, server attempt recovery and preview preferences
  styles/           Design tokens and application styles
design/project/     Historical HTML design references
docs/ux-audit/      Historical UX reports, scripts, and recorded measurements
public/             Static assets copied into the build
server/             Worker API, HTTP helpers, database repositories and tests
shared/contracts/   Public API types, validation schemas and limits
migrations/         Numbered D1 SQL migrations
```

Generated audit screenshots, archives, Python caches, and the historical benchmark workspace are excluded from Git. Existing local copies are preserved. Some historical reports link to these local-only artifacts or describe older dependency versions and build outputs.

## Routes

| Student | Teacher |
| --- | --- |
| `/sign-in` | `/admin` |
| `/` | `/admin/bank` |
| `/tests` | `/admin/editor/:id` |
| `/tests/:testId` | `/admin/import` |
| `/exam/:attemptId` | `/admin/builder` |
| `/results/:attemptId` | `/admin/grading` |
| `/results/:attemptId/q/:n` | `/admin/students` |
| `/mistakes`, `/progress`, `/profile` | `/admin/analytics` |
| `/getting-started` | |

The shared design reference is available at `/design`.

## Data and limitations

- Real learner tests use same-origin Worker APIs and immutable D1 versions. Answers are graded on the server. IndexedDB retains account-scoped unsynced drafts; legacy demo scores are preserved separately and never imported.
- Active exams do not expose answer keys. The public design tutorial uses trivial controls examples. Former artboard question/grading fixtures are archived under `server/fixtures/` and are not bundled into the browser.
- Teacher authoring, groups, assignment overview and review use actual records. Import, mistakes and full progress/analytics reporting remain pending stage 5. See [teacher setup and API](docs/TEACHING-API.md).
- A fresh database contains no exam bank. An optional synthetic local exercise is documented in [EXAM-API.md](docs/EXAM-API.md); real legal content must be reviewed and published before use.
- Real Google acceptance needs owner-configured OAuth credentials. Hosted 200-user capacity, quota headroom and production deployment remain stage 6 release gates.
- For local browser tests and recovery semantics, see the [exam API guide](docs/EXAM-API.md).

## Deployment

Build the frontend with `npm run build` and serve the contents of `dist/` over HTTPS. Use Node.js 22.12 or later in the build environment. The host must serve `index.html` for client-side application routes so that direct visits and refreshes work.

The accepted Cloudflare architecture is Workers Static Assets for the frontend, Workers for the API, and D1 for persistent data. Local configuration, health/readiness API endpoints, database migrations and staging/production templates are included. Google authentication and account/group APIs are implemented; real provider sign-in requires credentials and an exact registered callback. Student exams now use server data; teacher authoring, assignments and review use authorized server data. Connecting a GitHub repository alone does not configure cloud resources or OAuth credentials. Follow the [backend guide](docs/BACKEND.md) for the current supported local setup.

The current page loads the Inter font from Google Fonts and falls back to system fonts when it is unavailable.

Do not commit `.env` files, Cloudflare tokens, database credentials, or other secrets. Variables exposed through Vite's `VITE_` prefix are public browser configuration, not secret storage.

## Publishing to GitHub

The repository is [abdimuratovv/law-school](https://github.com/abdimuratovv/law-school), with `main` as its branch. After reviewing and testing local changes:

```bash
git add .
git diff --cached --stat
git commit -m "Describe your change"
git push origin main
```

Review the staged file list before committing. Dependencies, build output, environment secrets, and generated audit images/archives are excluded by `.gitignore`. Keep `package-lock.json` in version control.

## Next development steps

1. Configure Google OAuth and complete the real staging sign-in acceptance check; see [the setup guide](docs/GOOGLE-AUTH.md).
2. Connect import, bookmarks and progress reporting to actual records.
3. Prepare reviewed production question content and rehearse backup/restore.
4. Validate capacity with realistic concurrent exam sessions before production deployment.

## License

This project is licensed under the [MIT License](LICENSE). Third-party packages retain their respective licenses.
