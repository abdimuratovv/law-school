# Explicit localization migration

The technical migration is complete: LanguageProvider updates React context and the document language; it no longer observes or rewrites text nodes or attributes. The fuzzy word-by-word fallback has been removed. Explicit message tables and a small existing set of structured demo-name/unit formatters resolve presentation text. Unknown values pass through unchanged.

The syntax-aware source audit checks every TSX file for raw English JSX and native accessible string attributes. Its documented exemptions are brand/source material, internal technical units and Confirm title props translated inside that component. Conditional message branches are included; condition operands are not mistakenly treated as copy. Dynamic table/issue/rubric labels are covered through the complete review dictionary in addition to literal keys.

The route audit covers all 23 existing variants at three desktop widths in Uzbek, Karakalpak and Russian. Its MutationObserver constructor throws if invoked, so a route cannot accidentally pass through legacy translation. Live checks change language through native selectors, retain unapplied teacher grades/notes, preserve Karakalpak material and user names, and inspect a Russian portal confirmation. Existing assessment, learning, authoring, search and shared-control regression suites run after the removal.

Data boundaries: source question/answer material retains lang=kaa; names, IDs, entered notes and stored values remain user/source data. Numbers and dates use the existing formatter. Karakalpak uses supported Uzbek numeric date conventions with explicit Karakalpak words. Date-time inputs use the device time zone. The reference screen's technical rem tokens and answer letters are not prose to translate.

## Remaining human review

Automated coverage is not native-language signoff. No Uzbek, Karakalpak or Russian reviewer participated in this execution. Stage 9 must record reviewer identity/date and corrections for:

- teacher grade/rubric/partial-credit terminology and explicit sample boundaries;
- student preliminary/final labels, dates, averages and assignment preview;
- analytics issue wording, percentage/key labels and technical explanations;
- all confirmation, loss, recovery and persistence messages;
- representative real tasks, reading naturalness and wrapping at enlarged text.

Assistive-technology listening and representative learner/teacher sessions also remain release checks. Do not interpret removal of the DOM observer or a passing key audit as certification of translation quality or accessibility.
