# Changelog

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
