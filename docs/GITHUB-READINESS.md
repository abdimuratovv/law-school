# GitHub readiness review

Reviewed on October 22, 2026 (Asia/Tashkent).

## Changes

- Replaced the root README with English setup, feature, demo limitation, deployment, and GitHub publishing documentation.
- Added the MIT license and matching package metadata.
- Initialized a local Git repository on `main`; no remote, commit, or push was created.
- Added ignore rules for secrets, local tooling, builds, dependencies, generated audit screenshots/archives, Python caches, and the historical benchmark workspace. Local evidence was preserved.
- Added editor and line-ending conventions, a Node.js version file, and a GitHub Actions build/audit workflow.
- Updated React Router DOM from major version 6 to 7.18.4, Vite from major version 5 to 7.3.7, and the React Vite plugin from major version 4 to 5.2.0. The lockfile was regenerated. These updates resolve the four dependency findings reported by the initial npm audit.
- Application source and demo behavior were retained; no backend or Cloudflare deployment configuration was added.

## Verification

- Strict TypeScript checks and production build passed after the dependency updates.
- A clean `npm ci` installation from the final lockfile, followed by the production build and dependency audit, passed. The preview server was stopped before the clean install to release Windows executable locks.
- npm audit reported zero known vulnerabilities after the updates.
- The existing production keyboard journey passed all 23 checks, including sign-in validation, navigation, answer persistence, submission, review, and saved mistakes. It ran in a disposable Chrome context without overwriting historical audit reports.
- All 23 existing routes were opened directly in production preview for Uzbek, Karakalpak, and Russian: 69 checks passed. Each route returned HTTP 200, retained the expected URL, rendered one main landmark and one main heading, set the expected language, and produced no browser exceptions.
- Common private-key and access-token patterns were scanned without printing matching contents; no matches were found. This was a pattern scan, not an exhaustive secrets audit.
- Git ignore rules were verified against example environment files, build output, dependencies, historical images, archives, and the benchmark workspace. Example environment filenames remain eligible for version control.
- Upload candidates were approximately 5.44 MiB before this report was added, with no files above 10 MiB and no unexpected dependency/build/cache/archive files.

## Remaining limitations

The current build emits a bundle-size warning: the main JavaScript chunk is approximately 560 kB before gzip and 176 kB after gzip. The earlier loading-performance finding remains open; route smoke checks do not establish performance acceptance.

Authentication, student/teacher authorization, server-side answer protection, authoritative grading, and persistent shared storage are not implemented. Teacher routes remain public demo interfaces. Production exam deployment and 100–200-user capacity have not been validated.

The GitHub Actions workflow has been prepared locally; a hosted Actions run requires pushing the repository. Historical UX scripts and reports are retained as development records, and some reference generated files intentionally excluded from Git.
