# Changelog

## [0.5.0] - 2026-11-15

### Added — The concreteness contract
- **Objective-only gate**: only objective rules (published-standard violations) deduct points. Recommendation-kind (heuristic) rules are advisory by default: reported with an `[advisory]` tag, deducted from nothing, and unable to fail the gate. `--strict` re-includes heuristics for teams that want them gating.
- **Errors always block**: any error-severity finding fails the gate regardless of score, so a single real violation can no longer hide inside a large project's average.
- **First-class suppressions**: inline `{/* uiq-ignore [rule-ids] */}` (same line or the comment line above) and `.uiqrc.json` `suppressions` (rule → glob patterns, `*` supported). Suppressed findings are counted and displayed in every report.
- **Severity overrides**: `.uiqrc.json` `rules` now maps rule IDs to `"error" | "warning" | "info" | "off"`. `"off"` disables a rule; escalating to `"error"` makes it gate-blocking.
- **Gate transparency in output**: `Advisory: N (heuristic findings — shown, not scored)`, `Suppressed: N (uiq-ignore / config)`, and an explicit `Gate: blocked by N error(s)` line when errors force a FAIL.
- **Precision baseline harness**: external-repos test now records per-repo error baselines; new gate-blocking findings on curated production codebases fail the tool's own test suite.
- **MCP**: `uiq_scan` accepts `strict`.

### Wired — stubs cut or made concrete ("no half-baked features")
- **`uiq loop` is real**: loop state persists to `.uiq-loop.json`, so each `uiq loop` run records one iteration against the previous ones and the guards (plateau, score-gaming, target-reached, `--max-iterations`) evaluate the accumulated history. A plateau-guard bug that compared a run against itself (loops could never exceed 2 iterations) is fixed. `--reset` clears state; the state file is cleared when the loop stops.
- **Escalation resolution has downstream effect**: cards de-duplicate by rule+file (no more unbounded growth in `.uiq-escalations.json`) and a resolved card is never re-raised on later scans. Resolution is recorded acceptance of the escalation stream; it does not silence the finding in the gate.
- **`--control` persists**: control state accumulates in `.uiq-control.json` (scan count, history, control points), so the report shows a real trend instead of a fabricated single sample. Regressions are now included in alarms. `post-decision` and `post-compliance` control points complete when their evidence exists. `--control --format json` no longer prints a text report before the JSON (it corrupted agent parsing); the structured summary is attached as `result.control` instead.
- **Motion-spec lifecycle**: new `uiq spec show` (summary + unapproved components) and `uiq spec approve <file> <component> --by <name>` commands; `runFull` verifies the implementation against an existing motion-spec.json and reports `specConformance` (with matched-component count, so an empty match is visible rather than silently "conforming").
- **`--library` renders**: the per-file library compliance report now appears in text and markdown output (previously JSON-only).
- **`verify` output**: prints a single verdict line plus the first blocking reasons instead of dumping the full JSON report.

### Cut — removed rather than half-implemented
- **`--platform desktop|all`**: these values were behaviorally identical to `web`. Now rejected with a clear error; supported values are `auto`, `mobile`, `web`.
- **`getAdjustments` (feedback→rule adjustments)**: computed adjustments that were consumed by nothing — a hidden, unauditable second suppression path. Feedback remains a concrete log (add/list/resolve/report); rule changes go through `.uiqrc.json` severity overrides or suppressions.

### Fixed
- **MCP stdio corruption**: `runFull` no longer prints to stdout unconditionally — `uiq_full_scan` (and the `loop`/`verify` commands) run it with `silent: true`, so report text can no longer leak into the MCP protocol stream or pollute command output.
- **Config discovery**: `.uiqrc.json` is now found by walking up parent directories, so `uiq ./src` picks up a project-root config.
- **Config rules semantics**: `.uiqrc.json` `rules` no longer acts as an include-filter (previously `{"rules": {}}` silently disabled every rule — a critical false-negative bug).
- **Line mapping**: `a11y/keyboard-nav` line detection no longer matches destructured `{ onClick }` function parameters.
- **Spread-props abstention**: interactive elements receiving `{...props}` are treated as "styles unknown" (abstain) instead of asserting missing hover/focus — a recurring false-positive class in real codebases.
- **Keyboard-nav delegation**: `onClick` containers that delegate via `event.target.closest(...)` are no longer flagged.
- **CLI**: `uiq escalate resolve <id> --option N` works (was rejected by Commander); `--quiet` is honored; `uiq state [path]` accepts a path and finds state saved under `<path>/src`; dashboard no longer dumps scan JSON to stdout; `--format` validates values with a warning.
- **Control report**: standalone `--control` shows compliance as `n/a` instead of a false "0% — missing states" alarm.
- **Tailwind reduced-motion**: `motion-reduce:` / `motion-safe:` utilities count as reduced-motion handling.
- **Docs**: README CI example typo; MCP server version aligned to package version.

## [0.3.0] - 2026-11-07

### Added
- **Turnkey GitHub Action**: Added root [`action.yml`](action.yml) for 3-line GitHub Actions CI integration (`uses: sujayganorkar/tailordesign@v0.3.0`).
- **Platform Awareness**: Added `--platform <auto|mobile|web|desktop>` CLI flag and engine module to evaluate code according to target form factor (mutes desktop mouse hover requirements on mobile touch targets).
- **Headless Primitive Registry**: Comprehensive support for Radix UI, Headless UI, and React Aria primitives and namespaced subcomponents (`DialogPrimitive.Content`, `Root`, `Trigger`, `Close`).
- **Function Scope-Aware Layout Thrashing**: Uses Babel AST function boundary tracking (`p.getFunctionParent()`) to detect DOM reads and writes strictly within the same enclosing function.
- **Extensive External Benchmark Suite**: Added multi-repo validation suite tested across 5 real-world production codebases (`tailwindcss.com`, `shadcn-ui/taxonomy`, `shadcn-ui/ui`, `tastejs/todomvc`, and `flutter/samples`).

### Fixed
- **Component vs. Intrinsic Element Separation**: Intrinsic lowercase DOM elements (`<button>`, `<a>`, `<input>`) are inspected for missing styles, while capitalized React components (`<Button>`, `<Link>`, `<Input>`) are recognized as encapsulating their own interactive styles.
- **Easing Pattern Precision**: Fixed regex word boundaries for timing functions (`\bease(?:-in|-out|-linear)?\b`), preventing standard text like "Please try again" from triggering false "Unknown easing" diagnostics.
- **Flutter Built-in Semantics**: Expanded built-in accessibility semantics and focus recognition to all standard Flutter Material controls (`Checkbox`, `Switch`, `Slider`, `TextField`, `DropdownButton`, `ListTile`).
- **Scaffold 100/100 Guarantee**: Fixed template literal expressions and backdrop overlay buttons so new projects created via `uiq create` score 100/100 with zero warnings.

## [0.2.0] - 2026-10-29

### Changed
- Renamed package to scoped `@sujayganorkar/uiq` (avoids npm security holding package)
- Added `create` command: scaffolds a runnable Vite + React + Tailwind starter with the quality gate wired in
- Scaffold now generates package.json, index.html, Vite config, entry files, and .gitignore
- Fixed npm test script for Node 22+/25
- Fixed .npmignore corruption and included TypeScript definitions in publish
- Aligned rule counts (23) across README, CLI, and SKILL
- Aligned CI workflow to use the correct package name

## [0.1.0] - 2026-10-27

### Added
- Initial release of uiq
- 23 objective rules across 5 categories (motion, interaction, accessibility, performance, consistency)
- Decision engine: component → interaction requirements mapping
- Full workflow: decisions + quality + compliance in one pass
- Web parser (JSX/TSX/CSS/HTML/Vue/Svelte)
- Flutter/Dart parser
- Color contrast parser (Tailwind color classes)
- Human feedback capture (10 structured categories)
- Escalation protocol for issues needing human judgment
- State persistence + regression detection
- Motion spec generation (machine-readable)
- Auto-fix for CSS (reduced-motion, motion tokens)
- CI integration (GitHub Action)
- Comprehensive documentation (README, SOURCES, SKILL, CONTRIBUTING, SECURITY)
- 32 tests (quality gate, decision engine, full workflow, state, feedback, escalation, motion spec, color parser, config, fixer)

### Sources
- All 23 rules cite real, published, verifiable sources
- See SOURCES.md for full list of 23 citations
