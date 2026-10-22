# Localization handoff

Stage 3 checkpoint, 2026-10-19. The DOM translation observer remains enabled. This is a migration inventory, not a declaration of complete language coverage.

## Explicit foundation

`WorkspaceNavigation`, both shells, route loading/error/not-found states, skip navigation, document titles, language preferences and navigation count summaries use explicit messages. Shell subtrees opt out of DOM mutation. `shellMessages.ts` supplements the existing three-language dictionaries; numeric interpolation now uses the shared locale formatter.

Common Button/IconButton, segmented controls/tabs, Switch/Checkbox, Counter names, Progress names, StatusDot, Difficulty, Notice, LoadingState and EmptyState resolve their shared copy through `useText`. Existing PhoneInput/OtpInput and the stage-2 design reference already use explicit messages. Complex React children and caller-supplied content still require explicit translation at their own call sites; wrapping them in a shared component does not migrate an entire page. TextField/DataTable/TrendChart continue to accept translated presentation labels from callers.

`useFormatting` supplies numeric dates and numbers. Dashboard attempt dates, progress history dates and result timestamps now use it. Number interpolation, navigation badges and Counter values use localized formatting. Karakalpak uses the supported Uzbek numeric conventions (`uz-Latn-UZ`), with explicit Karakalpak words; this avoids unsupported Karakalpak month-name formatting. Dates use the browser's local timezone. Identifiers, phone numbers, answer letters, clock digits, source material and stored values are not reformatted as prose numbers. Timer accessible names use parameterized translated units without announcing every tick.

## Remaining migration by owner

| Scheduled stage | Files / surfaces | Examples to migrate and check |
|---|---|---|
| 4 — Entry/discovery | `SignIn`, `Dashboard`, `Catalog`, `GettingStarted`, `Lobby` | Raw headings such as “Welcome”, catalog descriptions/filter option labels, conditional status text, empty/error states and accessible names. Search must use the visible translated title/topic. Preserve full auth return query/hash now supplied by the router. |
| 5 — Assessment | `Exam`, remaining `components/exam/parts` call sites | Raw task instructions, question counters, mode/save/check feedback, map labels and submission summaries. Ensure every page-specific aria name is explicit. Keep timer and persisted answer semantics. |
| 6 — Results/learning loop | `Results`, `Review`, `Extras` | Raw Progress/Profile headings, result summaries and review controls, chart labels/data alternatives, inline numeric ratios and percentages, remaining saved-question statuses. |
| 7 — Content workflows | `Bank`, `Editor`, `Import`, `Builder` | Raw teacher headings, tables/filters, validation messages, preview/commit summaries, draft feedback, static sample dates and counts. Bank still calls `toLocaleString('en')`; replace at the page migration. |
| 8 — Teacher review | `Grading`, `Students`, `Analytics`, remaining `Overview` call sites | Queue/rubric labels, chart and table descriptions, dynamic confirmation/toast sentences, sample attempt dates such as “Oct 4”, joined/last-active descriptions and numbered summaries. |
| 8 — Shared audit | `ui/data`, all page call sites, `lib/format` | Raw legacy chart empty text and composed labels, custom native controls, fallback messages and legacy date/duration helpers. Several English date helpers remain exported but no longer serve the migrated attempt-date call sites. Do not remove a helper solely because its exported name looks untranslated. |

These are concrete surfaces found by source review; they overlap with the earlier UX copy fixes and are not a count of untranslated strings. Translation of source literals by the observer can make a route look complete while it still depends on mutation. Test migrated routes with the observer disabled, including live language changes and dynamic/error states, before checking them off.

## Content boundaries and final removal gate

Keep `lang="kaa"` on source question/answer material and preserve text entered into inputs/textareas. User names, identifiers and other user-authored values must not become message keys. Shared navigation identity/footer subtrees are protected with `data-no-translate`. Existing spelling normalization and grading are unchanged.

Retire the observer only in stage 8 after every route, dialog, accessible name, error, dynamic summary and data alternative has explicit coverage. Require live changes across Uzbek/Karakalpak/Russian, native-language review, and retained Karakalpak input/material checks. Browser matrix evidence is not native copy signoff.

Large-text probe: the navigation drawers themselves fit at 320px and 200% root text, including wrapped labels and a scrollable footer. The existing catalog body creates 5px document overflow in this probe (325px at a 320px viewport); address the page content in stage 4. This is not a whole-application zoom/reflow pass.
