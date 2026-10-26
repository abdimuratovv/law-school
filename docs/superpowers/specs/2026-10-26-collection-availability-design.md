# Collection availability

Approved by the user on 2026-10-26. Each collection has an admin-controlled admission switch independent of its schedule and archival status. Paused collections reject new attempts in either language, including direct API requests and stale browser pages. Existing attempts can resume, save and submit against their original deadline; results and the single-attempt rule remain intact.

Existing collections retain their current availability during migration. Newly published collections, replacement publications and reopened scheduled windows start paused. Enabling admission never overrides a future opening time or expired closing time. Paused collections remain visible with a clear message.

Only active admins can change admission. Updates require CSRF and an expected availability revision, use an atomic conditional update, and create an audit record. The attempt INSERT independently checks admission to prevent a stale eligibility read from authorizing a new attempt after pause.

The admin card shows an explicit play/pause button and current status. Busy and error states remain visible. Student cards and lobbies distinguish paused admission from schedule closure; existing attempts and results remain accessible.

Implementation and verification: add the D1 migration; extend staff and exam contracts and routes; add localized admin/student UI; verify authorization, default-paused publishing/reopening, stale writes, direct-start rejection, scheduled boundaries, and continuity of existing attempts with backend and browser tests; build, audit, push and deploy.
