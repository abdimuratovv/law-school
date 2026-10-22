# Retrospective performance comparison

Chrome 146.0.7680.178, production builds at 1366×768, light/Uzbek, 4× CPU throttling. Six alternating baseline/redesign pairs per route, fresh disposable contexts, disabled browser cache, remote Google Fonts blocked in both variants. Actual route content and positive paint observations are required before interaction/scroll measurement. Other browser suites were idle.

The earliest preserved pre-foundation source is `stage-2/source-before.zip`; Stages 0–1 changed no application source. It was reconstructed in an isolated workspace with the candidate build configuration, public assets and installed lockfile dependencies. Provenance/hashes are in `baseline-provenance.json`. **Stage 0 recorded no timings: these are new retrospective measurements, not historical field data.**

| Route | Median FCP baseline → redesign | Median LCP baseline → redesign | LCP change | Median DOMContentLoaded baseline → redesign |
|---|---|---|---|---|
| `/` | 2860 → 4822 ms | 2860 → 4822 ms | +68.6% | 665 → 1427 ms |
| `/exam/practice-1` | 2204 → 3678 ms | 2204 → 3678 ms | +66.9% | 770 → 1687 ms |
| `/admin/bank` | 5136 → 2570 ms | 5136 → 6088 ms | +18.5% | 657 → 1308 ms |

| Route | Scroll frame p95 baseline → redesign | Frames over 25ms baseline → redesign |
|---|---|---|
| `/` | 32.7 → 31.9 ms | 39/360 → 34/360 |
| `/exam/practice-1` | 28.6 → 28.4 ms | 35/360 → 25/360 |
| `/admin/bank` | 33.0 → 33.6 ms | 62/360 → 49/360 |

Scripted answer selection through two animation frames: median **227.2 → 83.6 ms**. Every measured answer was present in local storage. This includes synchronous handler/render/frame work; it is **not field INP** or an end-to-end hardware input measurement.

| Asset | Baseline → redesign actual file bytes | Baseline → redesign gzip bytes |
|---|---|---|
| Entry JavaScript | 345,080 → 531,512 | 109,377 → 165,106 |
| CSS | 53,980 → 95,062 | 10,612 → 17,902 |
| Teacher chunk | 88,231 → 77,817 | 22,127 → 21,199 |
| Reference chunk | 13,759 → 12,113 | 4,439 → 3,845 |

Sizes above count actual UTF-8 file bytes and Python gzip output; Vite console figures use a different reporting/compression path and should not be mixed into these deltas. The entry bundle grew materially with explicit three-language copy and the redesigned workflows. Local preview is not a throttled production network, so these timings do not quantify download cost on slow connections. The release decision must consider the size increase separately.

## Interpretation and remaining work

Paint/long-task results vary substantially between runs. Review all raw samples, not only medians. No statistical significance, performance SLO or universal improvement is claimed. Headless rendering, CPU throttling, cached OS resources and synthetic scrolling differ from user hardware. The baseline and redesign also have different content layouts and heights, so the scroll test compares scripted workload on the same route, not an identical scene. It does not measure every glass overlap or touch interaction.

The first paint probe returned missing observations; it was stopped and preserved as `performance-initial-probe.json`. The first full diagnostic run also sampled one teacher route before its lazy content was ready. Its samples/summary remain under `performance-diagnostic-*` and are excluded from the final table. The final runner waits for the actual route content, requires positive FCP/LCP and requires real scroll content in every sample. CPU profiles were inspected to investigate startup variance; no unsupported optimization or causal attribution is inferred from those two profiles.

Composed material uses 16px navigation blur and opaque reading surfaces, with an opaque user/OS preference. If final scroll measurements regress, reduce effects in the implicated surface and repeat this matched test before release. Regardless of synthetic medians, verify load/scroll/input on representative lower-powered hardware and a constrained network; review entry-bundle growth and establish a product performance budget. The candidate is not declared faster or production-approved by this report.

## Individual paint ranges

| Route / variant | FCP min–max | LCP min–max |
|---|---|---|
| `/` / baseline | 1584–4388 ms | 1584–4388 ms |
| `/` / redesign | 952–5828 ms | 952–5828 ms |
| `/exam/practice-1` / baseline | 668–3844 ms | 668–3844 ms |
| `/exam/practice-1` / redesign | 872–4852 ms | 872–4852 ms |
| `/admin/bank` / baseline | 3200–6796 ms | 3200–6796 ms |
| `/admin/bank` / redesign | 1704–4096 ms | 2368–8188 ms |

## Release finding S9-P01 — unresolved load regression

The final synthetic comparison records slower median LCP on all three measured routes. Home and Exam regress materially in this environment; entry JavaScript grows from 109,377 to 165,106 gzip bytes. This finding remains **unresolved and requires performance acceptance/remediation before public release**. Functional passes do not waive it. Profiles show startup/initial layout work but do not isolate a single cause. The scroll p95 differences are small and mixed while slow-frame counts fall; these samples do not establish blur as the cause of the load regression. Do not infer that removing glass alone will resolve it. Profile the startup path and evaluate route/copy chunking with a defined budget, then repeat on representative hardware/network conditions.
