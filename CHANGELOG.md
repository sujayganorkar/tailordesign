# Changelog

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
