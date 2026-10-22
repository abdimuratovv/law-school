# Huqıq Mektebi

A multilingual law certificate preparation frontend with student practice exams and a teacher workspace. Built with React, TypeScript, and Vite.

**Status:** frontend prototype with a Cloudflare Workers/D1 backend foundation. Real authentication, exam APIs, and shared student data are not connected yet. This intermediate version is not ready to administer real exams. See the [backend setup guide](docs/BACKEND.md), [accepted architecture](docs/superpowers/specs/2026-10-22-backend-design.md), and [implementation plan](docs/superpowers/plans/2026-10-22-backend-implementation.md).

## Features

- Student dashboard, test catalog, timed mock exams, and untimed practice.
- Multiple-choice and written answers, flagged questions, results, review, and a mistakes collection.
- Teacher interfaces for a question bank, question editing, sample import validation, test building, manual grading, students, and analytics.
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

For demo sign-in, enter any nine-digit phone number after `+998`, then any six-digit code. No SMS is sent. Use sample information when trying the demo.

No environment variables or external services are required for the current frontend.

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
  data/             Sample questions, tests, topics, and teacher fixtures
  i18n/             Language provider, translations, and locale formatting
  lib/              Grading, assessment, storage, navigation, and utilities
  pages/
    student/        Sign-in, dashboard, exams, results, and review
    admin/          Teacher workspace
    DesignSystem.tsx
  state/            Browser-local student state and temporary teacher reviews
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
| `/exam/:testId` | `/admin/builder` |
| `/results/:attemptId` | `/admin/grading` |
| `/results/:attemptId/q/:n` | `/admin/students` |
| `/mistakes`, `/progress`, `/profile` | `/admin/analytics` |
| `/getting-started` | |

The shared design reference is available at `/design`.

## Demo data and limitations

- Student data uses browser `localStorage` under the `hm.*` prefix. It is not synchronized between devices or securely separated between accounts. Clearing site data removes local progress and drafts.
- Sign-in is a simulation, and teacher routes have no real authentication or role enforcement. Answer keys and grading logic are included in the frontend bundle.
- Timed exam deadlines continue while the student is away from the page. Browser-local timing and scores are not authoritative or tamper-resistant.
- Question editing, test building, and import screens save local drafts. Import validates sample decisions and file metadata; it does not parse spreadsheet contents, publish questions, or assign tests on a server.
- Teacher grading uses in-memory fixtures. Reloading or leaving the teacher workspace resets reviews; teacher grades do not update student results.
- Some questions contain placeholder material. Student history and analytics include sample data.
- Storage failures are surfaced in the interface, but closing a page with unsaved changes can still lose work.

The historical [performance report](docs/ux-audit/stage-9/PERFORMANCE.md) records an unresolved loading regression. Native-language review, assistive-technology checks, and real-device acceptance remain pending; see the [human acceptance packet](docs/ux-audit/stage-9/HUMAN-ACCEPTANCE.md). Historical results are not validation of future backend capacity or the dependency updates in this repository.

## Deployment

Build the frontend with `npm run build` and serve the contents of `dist/` over HTTPS. Use Node.js 22.12 or later in the build environment. The host must serve `index.html` for client-side application routes so that direct visits and refreshes work.

The accepted Cloudflare architecture is Workers Static Assets for the frontend, Workers for the API, and D1 for persistent data. Local configuration, health/readiness API endpoints, database migrations and staging/production templates are included. Real Google authentication and exam functionality are not implemented yet; the frontend still uses demo data. Connecting a GitHub repository alone does not configure cloud resources or OAuth credentials. Follow the [backend guide](docs/BACKEND.md) for the current supported local setup.

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

1. Implement real authentication and server-enforced student/teacher roles.
2. Add persistent question banks, tests, attempts, and teacher reviews.
3. Move answer keys, grading, and exam deadline enforcement to the server.
4. Add retry-safe answer synchronization and submission handling.
5. Validate capacity with realistic concurrent exam sessions before production deployment.

## License

This project is licensed under the [MIT License](LICENSE). Third-party packages retain their respective licenses.
