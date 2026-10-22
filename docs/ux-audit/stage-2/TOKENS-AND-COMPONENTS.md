# Tokens and shared component specification

Stage 2 evolves `src/styles/hm.css` and the existing common controls; it does not create a competing style layer. `app.css` owns layout, including reference compositions. Current React/CSS is the implementation authority. The `design/project` canvas is historical and must not overwrite these changes; a future canvas update should explicitly use this specification and the rendered `/design` examples.

## Foundations

| Family | Contract / runtime values |
|---|---|
| Background / surfaces | Light `#F5F6FA` / `#FFFFFF` / `#F0F2F7`; dark `#11141B` / `#1C202A` / `#272D3A`. Reading/editing surfaces remain opaque. |
| Ink | Primary/secondary/quiet `--label`, `--label-2`, `--label-3`; quiet does not mean disabled. Do not use decorative separators as meaningful control boundaries. |
| Accent | Light `#4F46E5`, dark `#5850EC`; contrasting `--on-accent`, tinted selection and dedicated link text. Restrained indigo identity retained. |
| Essential borders | `--control-border`: light `#787F8E`, dark `#8791A4`. Decorative `--sep` / `--sep-2` remain separate. |
| Feedback | Correct/error/warning have fill, text and soft-surface tokens; text/icons accompany status color. Normal text and meaningful indicators are measured separately. |
| Focus | Three-pixel `--focus` outline with a two-pixel offset and contrasting halo. Light indigo / dark pale indigo. Input wrappers show focus-within; individual inner inputs do not add conflicting rings. |
| Spacing | `--space-1/2/3/4/6/8/12`: 4/8/12/16/24/32/48px at the default root size. Legacy page spacing awaits its page milestone. |
| Radius | Control 12px, large control 16px, content 20px, overlay 24px, pill 999px; rem-based except the pill sentinel. Shared controls use these tokens. |
| Type | System UI stack with browser fallback. Body 1.0625rem, question 1.125rem, reading leading 1.6, maximum reading measure 70ch. Supporting text 0.8125rem/1.45. Headings and shared-control font sizes use rem; existing page-specific inline sizes remain for migration. |
| Targets / density | Actual control bounds ≥44×44 CSS px; primary exam-preview actions ≥48px. Comfortable/compact reference density changes padding and control height without reducing targets or reading type. |
| Elevation | Existing semantic `--card-shadow` and `--glass-shadow` distinguish content and navigation. Dialogs have stable opaque fill. No additional shadow hierarchy per specimen. |
| Material | Glass restricted to navigation/toolbars and selected small control groups; 16px blur, higher-opacity neutral fill, subdued ambient mesh. Questions, choices, forms, tables and dialogs have stable surfaces. |
| Fallback | Profile preference `.rt-on`, OS reduced-transparency media and unsupported-backdrop CSS all supply opaque material. OS path verified in light/dark; unsupported-backdrop branch is source-reviewed, not run in an obsolete browser. |
| Motion / forced colors | 120ms feedback / 180ms entry tokens. Reduced motion removes transitions, transforms and animation, including the loading spinner. Forced colors supplies system fills, borders and focus; status text persists. |

The glyph specimen includes Karakalpak Latin and Cyrillic characters for visual inspection. It is not a language-editor signoff or proof of every system font's coverage. The browser's system stack avoids depending on an Apple-only font; existing remote font markup was not made a new runtime requirement.

## Component/state matrix

All implemented examples are on `/design`, with explicit three-language messages. “State” is meaningful to each control rather than a requirement that every display-only component have a pressed state.

| Component | Interaction and state contract | Evidence / scope |
|---|---|---|
| Buttons and links | Default, hover, pressed, focus, selected specimen, disabled, loading, error and success; preserve action text while busy. Disabled/loading link prevents navigation and is removed from tab order; real actions use buttons. | State selector, native keyboard activation, disabled navigation probe, rendered state contrast. External links retain existing new-tab behavior. |
| Icon buttons | Required accessible label; 44px region; button disabled semantics; disabled icon link cannot navigate. | Existing compatible API, reference close control and target measurement; glyph remains compact. |
| Chips/tags | Chips are buttons with pressed state and disabled state, real 44px region. Tags are noninteractive labels and need no artificial 44px padding. | Selection examples and measured targets. |
| Segmented choices | Radio group for settings/filtering; one tab stop, arrows wrap/select, Home/End, skip disabled options. Space/Enter use native button activation. | Keyboard probes; Results and Builder filter/method consumers now use radio semantics. Raw page-specific bank status tabs await stage 7. |
| Tabs | Separate `Tabs` composition creates tab IDs, controls/label associations, hidden panels and one active tab stop. Horizontal arrows automatically activate already-rendered local panels; Up/Down remain browser scrolling. | Linked-panel, hidden-panel, arrow and Tab-exit probes. Use `Tabs`, not standalone tab roles without panels. |
| Answer options | Radio group has one tab entry, arrows select without checking; repeated click keeps selection; explicit Clear. Correct/incorrect states include icon and localized accessible text. | Shared option keyboard probe and existing practice regression checks. Exam A–D/global shortcuts remain stage 5; misleading unsupported shortcut metadata removed. |
| Checkbox / switch | Controlled checked/mixed/disabled states. Native button activation avoids duplicate key toggles. Compact mark/track inside actual 44px region. Mixed demo becomes checked when activated. | Space/Enter and rendered bounds probes; row click propagation stays scoped. |
| Fields/search | Associated label, hint and error IDs; `aria-invalid`; placeholder is not the label. Visible focus-within, stable boundaries and preserved values. Search is native `type=search`. | Reference field/search validation, reset/empty path and target measurements. |
| Phone/OTP | Nine-digit phone formatting; OTP whole-code input/paste handling, individual localized names, group progress name, arrows/backspace; all boxes ≥44px. | Formatting/full-code/backspace probes. OTP remains a local demo, not real SMS authentication. |
| Counter / character aid | Localized increase/decrease names; bounds disable buttons; character keys keep selection/caret behavior and wrap with 44px targets. Character aid is a labeled group, not an incompletely implemented composite toolbar. | Counter bounds, glyph/target reference; narrow-width key regression fixed. |
| Notices/loading/empty | Success/info status, urgent error alert, icon + text, recovery action when supplied; loading remains named without motion. Empty retains task recovery. | Notice, loading and empty/reset reference examples. These examples do not implement real save recovery in Exam. |
| Progress | Named, clamped valid current/min/max and equivalent displayed count. | Progress probe; max=0 is normalized to a valid empty range. |
| Tables | Caption, column headers, row header, explicit selection, named keyboard-focusable overflow region; only the table can scroll in two dimensions. | Teacher sample and empty search. Existing teacher tables are not fully migrated yet. |
| Charts | New shared trend pattern has fixed 0–100 score axis, labeled attempt axis, accessible description and adjacent equivalent data table. Score ring accessible summary is explicitly localized. | Chart/table-value probe. Full student/teacher analytics chart migration remains stages 6/8. |
| Modal dialog/map/sheet | Native `showModal()` provides top-layer/background isolation; explicit Tab/Shift-Tab containment, name, modality, safe initial focus, Escape, close and trigger return. Confirmation ignores backdrop; map can dismiss via backdrop. Empty/hidden/disabled controls excluded from focus targets. | Modal probes and actual exam map regression. Legacy visual `pop` no longer implies nonmodal semantics. |
| Nonmodal dialog/panel | Explicit `modal=false` uses native `show()`, no background scrim/scroll lock/inert trap; background focus works; Escape/Close return focus. Real teacher detail/preview pages become inline at their milestone. | Nonmodal focus/Escape probe. The reference is an API demonstration, not a new product navigation pattern. |

## Integration boundaries

Existing props and routes remain compatible. Minimal consumer changes correct filter semantics and the safe initial focus of exam submission; no exam timer/grading/persistence logic changed. Shared shortcut handling now suppresses page commands inside dialogs and when an event is already handled. Full shell navigation/landmarks/route loading belong to stage 3. Complete page translations, raw teacher control migrations, persisted drafts and save failures retain their assigned stages.

New reference copy is in `src/i18n/designMessages.ts` and is selected by explicit `useText` keys. The reference root opts out of DOM mutation; a test disables MutationObserver and checks all three headings and OTP names. This proves explicit rendering for those probes, not native-review accuracy for all translated sentences. The legacy observer remains for unmigrated pages.
