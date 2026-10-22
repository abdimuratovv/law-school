# Release candidate and rollback

Status: local preparation only. No hosting target, public deployment or release approval is supplied. [Human gates](HUMAN-ACCEPTANCE.md) and [loading-performance finding S9-P01](PERFORMANCE.md) remain outstanding. Do not treat this candidate as release-approved. Sample OTP, teacher grades, imports, assignments and analytics are frontend demonstrations.

## Candidate verification

The packaging script writes `release-dist.zip`, `release-source.zip` and `release-manifest.json` with SHA-256 hashes. The dist archive contains deployable static files; the source archive contains source, public assets, lockfile, build configuration, README and current handoff documents. Test evidence remains alongside them. `source-before.zip` is the verified Stage 8 source checkpoint plus root configuration and previous README.

Use `npm ci`, `npm run typecheck`, `npm run build` and a production preview. Compare candidate hashes with `verification.json` and the manifest. The future HTTPS host needs SPA fallback, correct JS/CSS MIME types, immutable caching for hashed assets and revalidation of `index.html`. Verify the target's Google Fonts/network policy. A target-specific deployment review remains necessary when the hosting target and backend scope exist.

Deploy only after native-language, actual zoom, Windows/Apple assistive-technology and representative task reviews, plus review of performance tradeoffs. Keep the prior full artifact. Test hosted deep links to catalog, active exam, results and editor, then the critical production journey. Record approver, target, digest, time and outcome. This local package is not a public release.

## Increments and route recovery

Reviewed increments were foundation/shells (Stages 2–3), discovery (4), exam/results (5–6), authoring (7), teacher review (8). These are review boundaries, not runtime feature flags. **There is no route-level rollback switch.** Restore a defective route from a reviewed source checkpoint in an isolated directory, inspect shared imports/state dependencies, rebuild and verify a coherent artifact. Do not mix hashed chunks from different builds. Prefer the prior complete artifact for urgent rollback.

The immediate rollback target is Stage 8. Stage 9 fixes static-answer accessibility roles and scrolling of teacher content; scoring, timing, storage and source data remain unchanged. Rolling back restores those two known defects. Earlier route restoration requires storage-compatibility and affected-journey checks before deployment. Checkpoint archives are recovery material, not scripts that overwrite the shared workspace.

## Preserve browser work

Keep the same origin. Do not rename/remove `hm.sessions`, `hm.attempts`, `hm.mistakes`, identity or preference keys, and do not clear browser storage during deployment/rollback. Additive `hm.authoringDrafts.v1` may be ignored by old versions but must not be wiped. No server backup or account isolation exists. Changing origin, clearing a profile, private-session expiry or failed local writes can lose access to work.

Do not force reload active attempts or change their scoring, question IDs, accepted answers or timer rules. Wait for active sessions to finish where possible; communicate maintenance and retain prior assets for existing tabs. This static app has no server-side active-session inventory, so scheduling requires operator coordination. Absolute deadlines continue during downtime.

On regression: stop rollout; preserve the failing profile/storage with consent; capture route/version/error; verify whether an attempt is durable before retrying; restore the previous complete artifact at the same origin; retain old hashed assets while tabs finish; smoke-test saved sessions/results and affected paths. Durable results remain immutable and cleanup retries must not duplicate them. Rollback cannot recover a failed write held only in memory after closing the tab. Never delete or move the shared workspace/browser profile as a rollback shortcut.
