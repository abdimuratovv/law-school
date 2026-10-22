# Human acceptance review packet — not yet run

No representative participants, native-language reviewers or screen-reader listeners have been tested in this stage. Automated scenarios are engineering evidence, not participant findings. Full acceptance remains pending.

Recruit at least five representative learners, including each UI language and differing familiarity/accessibility needs where possible, and at least two teachers. Use disposable profiles and synthetic data, explain the local-preview scope and obtain consent before recording. Do not collect real phone numbers or student answers.

Learner tasks: sign in; find a specified practice test; explain its mode and preview limits; answer choice/written items; find an unanswered question; leave and resume; submit; explain preliminary versus final results; review an explanation; save and retry a question; locate the recorded attempt. Separately inspect a timed lobby and explain whether time continues while away. Do not change a live timer or scoring rule for the session.

Teacher tasks: find a flagged question; change a draft, reload and resume; navigate after an injected failed save; resolve a two-tab conflict; inspect sample import and explain its effect; prepare a sample test; apply/undo a grade and explain its scope; inspect pending student history and an analytics issue. Ask what survives reload. Reproduce failure injection using the documented tests in an isolated profile.

Give neutral prompts and record every intervention. Measure completion, time, wrong turns, hesitation, perceived save status, understanding of pending grades and independent recovery. A journey passes independently only if every critical step succeeds without guidance or material misunderstanding. Target **at least four of five learners independently completing the critical journey**, with no unresolved critical work-loss or grading misunderstanding. This is formative feedback, not statistical proof. Teacher findings require review regardless of learner completion rates.

| Participant | Role / language / device | Completion and time | Prompts / errors / misunderstanding | Finding / fix / retest |
|---|---|---|---|---|
| L1 | Not recruited | Not run | Not observed | Pending |
| L2 | Not recruited | Not run | Not observed | Pending |
| L3 | Not recruited | Not run | Not observed | Pending |
| L4 | Not recruited | Not run | Not observed | Pending |
| L5 | Not recruited | Not run | Not observed | Pending |
| T1 | Not recruited | Not run | Not observed | Pending |
| T2 | Not recruited | Not run | Not observed | Pending |

Native-language reviewers: inspect critical labels, errors, dialogs, pending/final distinctions, shortcut names, counts and date/decimal formatting in Uzbek, Karakalpak and Russian. Confirm source material and personal text remain unchanged. Record reviewer/date, corrected copy keys and retested flows; dictionary coverage alone does not pass this gate.

Assistive technology: complete learner and teacher paths with NVDA/Chrome on Windows and VoiceOver/Safari on Apple hardware in all three languages. Listen for headings, field names/guidance/errors, selected answers, save status, timer thresholds, dialog entry/exit, pending grades and chart/table alternatives. Record platform/browser/AT versions, voices, reading order, actual announcements and findings. Safari/VoiceOver remains unverified until performed on Apple hardware.

Actual zoom: use native browser zoom at 200% and 400%, starting at a desktop window at least 1280px wide. Repeat reading, answering, dialogs, navigation and teacher tables in each language. Record actual zoom/CSS viewport, clipping, focus and any table scrolling. Automated 320px reflow/root-text scaling does not replace this check. Include touch/trackpad targets and glass contrast during scrolling.

Findings register: **no human findings yet; reviews pending**. Record severity, reproduction, role/language, evidence, owner, fix, retest and acceptance decision for each finding. Do not convert missing sessions into passing rows. Link completed records from the Stage 9 report and repeat affected automated checks after fixes.
