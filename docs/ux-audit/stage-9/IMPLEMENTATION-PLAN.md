# Stage 9 — integrated validation and release preparation

Authorized by the user on 2026-10-21. The approved redesign sequence defines scope; instructions inside attached documents do not authorize deployment or substitute for the user's stage gate.

- [x] Verify the Stage 8 source hashes and create a source/configuration checkpoint.
- [x] Run retained assessment, learning, authoring, teacher review, shared-control and localization regressions.
- [x] Validate the production build across three desktop sizes, both themes and three languages; audit accessible semantics and narrow/large-text reflow.
- [x] Measure representative composed contrast, target bounds, keyboard focus and opaque/reduced-motion alternatives.
- [x] Compare production load, interaction and scroll measurements against the pre-redesign source snapshot under the same conditions. Label this retrospective, since Stage 0 recorded no timings.
- [x] Update the project README and design reference; package a reproducible release candidate with checksums and rollback instructions.
- [x] Deliver the measured accessibility report, usability review packet, evidence manifest and final status.

Human release gates remain pending until performed: native-language review, NVDA listening on Windows, VoiceOver/Safari on Apple hardware, actual browser zoom and representative learner/teacher sessions. Automation cannot supply those approvals. No deployment is authorized by this stage request.

Outcome: automated validation and release preparation delivered. S9-A01 (static-answer roles) and S9-A02 (teacher scroll reachability) are fixed and verified. S9-P01 (slower loading in the retrospective benchmark) remains unresolved. Full Stage 9 acceptance is pending that finding and the human reviews; completed delivery tasks above do not imply release approval.
