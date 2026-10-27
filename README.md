# uiq — eslint for UI

> **One command. Objective rules. Zero taste debates.**
> Your code builds the UI. `uiq` makes sure it doesn't ship broken.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![Rules](https://img.shields.io/badge/rules-20-orange.svg)](src/config.js)
[![Sources](https://img.shields.io/badge/sources-23%20verified-green.svg)](SOURCES.md)

```bash
npx uiq ./src
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AI UI Quality Gate Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Files scanned:  4  |  Issues: 14  |  Score: 27/100 ✗ FAIL

  src/BadComponent.jsx
    ✗ interaction/hover-state — No hover state on 3 interactive elements
    ✗ interaction/focus-visible — No focus-visible on 3 interactive elements
    ✗ a11y/keyboard-nav — onClick on <div>, use <button> instead
    ⚠ interaction/loading-state — Data fetching but no loading UI
    ⚠ interaction/empty-state — No empty state for data view
    ⚠ interaction/error-state — No error state for failed requests
    ℹ consistency/no-generic-cta — Generic blue CTA detected

  Score: 27/100 ✗ FAIL  (threshold: 80)
```

---

## The problem

AI agents build UI that is **technically correct but mechanically broken**:

- ❌ Buttons with no hover or focus states
- ❌ Modals with no focus trapping
- ❌ Lists with no loading, empty, or error states
- ❌ Animations on layout properties (causes jank)
- ❌ No `prefers-reduced-motion` handling
- ❌ Durations like 800ms (should be 150-300ms)
- ❌ Generic blue CTAs everywhere
- ❌ Card grids in hero sections

These aren't taste problems. They're **objective, measurable failures** that agents ship silently because nobody checks.

## The solution

`uiq` is a deterministic quality gate. It runs in seconds, needs no browser, and checks 23 rules across 5 categories. Your agent runs it after writing code, fixes the issues, and re-runs until it passes.

**No taste debates. No rendering. No cost. Just rules.**

---

## Install

```bash
npm install -g uiq
# or use directly
npx uiq ./src
```

**As an agent skill** (Claude Code / Codex / Cursor):
```bash
git clone https://github.com/sujayganorkar/tailordesign.git ~/.claude/skills/uiq
```

---

## Quick start

```bash
# 1. Scan your UI
uiq ./src

# 2. Fix the issues (agent does this automatically)

# 3. Re-run until it passes
uiq ./src --ci --min-score 80
```

---

## Commands

| Command | What it does |
|---|---|
| `uiq ./src` | Quality gate — checks 23 rules |
| `uiq ./src --decide` | Decision analysis — what interaction each component warrants |
| `uiq ./src --full` | Full loop — decisions + quality + compliance |
| `uiq ./src --state` | Save state + detect regressions |
| `uiq review` | View human feedback |
| `uiq escalate` | View pending escalations |
| `uiq state` | View scan history |
| `uiq init` | Scaffold a .uiqrc.json config |
| `uiq watch ./src` | Watch for changes and re-scan |

### Flags

| Flag | Description |
|---|---|
| `--format json` | JSON output (for agents) |
| `--format markdown` | Markdown report |
| `--ci` | CI mode (exit 1 on failure) |
| `--min-score <n>` | Pass threshold (default: 80) |
| `--decide` | Run decision analysis |
| `--full` | Full workflow |
| `--state` | Save state for regression detection |
| `--fix` | Auto-fix simple issues (reduced-motion, motion tokens) |
| `--rules <ids>` | Run only specific rules (comma-separated) |
| `--ignore <patterns>` | Ignore glob patterns (comma-separated) |
| `--no-color` | Disable colored output |
| `--quiet` | Suppress non-essential output |

---

## What it checks (23 rules)

### Motion (5 rules)
| Rule | What it catches |
|---|---|
| `motion/no-layout-animation` | Animating width/height/top/margin (causes jank) |
| `motion/duration-range` | Durations outside 100-500ms |
| `motion/known-easing` | Unknown easing curves |
| `motion/reduced-motion` | No `prefers-reduced-motion` handling |
| `motion/stagger-interval` | Multiple animations without stagger pattern |

### Interaction (7 rules)
| Rule | What it catches |
|---|---|
| `interaction/hover-state` | Interactive elements without hover styling |
| `interaction/focus-visible` | No focus-visible for keyboard nav |
| `interaction/disabled-state` | No disabled state handling |
| `interaction/loading-state` | Data views without loading UI |
| `interaction/empty-state` | Data views without empty state |
| `interaction/error-state` | Data views without error state |
| `interaction/active-route` | Navigation without active route indication |

### Accessibility (5 rules)
| Rule | What it catches |
|---|---|
| `a11y/keyboard-nav` | onClick on divs/spans (not keyboard accessible) |
| `a11y/focus-management` | Modals/drawers without focus trapping |
| `a11y/aria-dynamic` | Dynamic content without ARIA attributes |
| `a11y/touch-targets` | No explicit touch target sizing (44×44px) |
| `a11y/contrast` | Potential contrast issues (WCAG 4.5:1) |

### Performance (2 rules)
| Rule | What it catches |
|---|---|
| `perf/compositor-only` | Animations on layout properties (main thread) |
| `perf/layout-thrash` | Interleaved DOM reads/writes |

### Consistency (4 rules)
| Rule | What it catches |
|---|---|
| `consistency/motion-tokens` | No motion design tokens defined |
| `consistency/single-language` | More than 3 different easing curves |
| `consistency/no-generic-cta` | Generic blue CTA buttons |
| `consistency/no-card-grid-hero` | Card grids in hero section |

---

## The decision engine

`uiq ./src --decide` tells you **what interaction each component should have**:

```
├─ Component: button-primary (×2)
│  Consequence: instant-reversible
│  Required states: hover, focus-visible, active, disabled, loading
│  Recommended motion:
│    → color shift on hover (100-150ms)
│    → scale(0.97) on press
│    → loading spinner replaces label
│  Anti-patterns:
│    ✗ Don't use generic blue — use brand color
│    ✗ Loading state must disable the button
```

Covers 16 component types for both web (JSX/TSX/CSS/HTML) and Flutter (Dart).

---

## The full loop

```
DECIDE → IMPLEMENT → CHECK → COMPLY → ESCALATE/REVIEW → LEARN → DECIDE
```

1. **Decide**: `uiq ./src --decide` → interaction requirements per component
2. **Implement**: Agent builds with required states and motion
3. **Check**: `uiq ./src` → quality issues
4. **Comply**: `uiq ./src --full` → cross-reference decisions vs. implementation
5. **Escalate**: Agent stuck? → `uiq escalate` → human picks option
6. **Review**: Human watches site → `uiq review --add` → structured feedback
7. **Learn**: State saved → next scan detects regressions

---

## Agent workflow (copy-paste into AGENTS.md)

```
After writing or modifying UI code:
1. Run: uiq ./src
2. Fix errors first, then warnings
3. Re-run until score ≥ 80
4. Run: uiq ./src --full
5. Verify compliance ≥ 90%
6. Only declare "done" when both pass

For new components:
1. Run: uiq ./src --decide
2. Implement all required states and recommended motion
3. Follow anti-patterns list
4. Run: uiq ./src
```

---

## CI integration

```yaml
# .github/workflows/ui-quality.yml
name: UI Quality Gate
on: [pull_request]
jobs:
  uiq:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npx uiq ./src --ci --min-score 80
```

---

## Human feedback

```bash
# Add feedback
uiq review --add --file Hero.jsx --component Hero --category too-slow --note "Entrance takes 600ms"

# View feedback
uiq review

# List unresolved
uiq review --list

# Resolve
uiq review --resolve fb-1234567890
```

**Categories**: `too-slow`, `too-fast`, `janky`, `wrong-easing`, `unnecessary`, `missing`, `too-much`, `too-little`, `wrong-trigger`, `accessibility`

---

## Escalations

When the agent can't auto-fix an issue, it creates an escalation:

```bash
uiq escalate                    # View pending
uiq escalate resolve esc-123 --option 2  # Resolve with option 2
```

---

## Supported frameworks

| Framework | Files | Parser |
|---|---|---|
| React / Next.js | `.jsx`, `.tsx`, `.js`, `.ts` | JSX |
| Vue / Svelte | `.vue`, `.svelte` | JSX (HTML-like) |
| HTML | `.html`, `.htm` | JSX |
| CSS / Tailwind | `.css`, `.scss`, `.less` | CSS |
| Flutter | `.dart` | Dart |

---

## Architecture

```
src/
├── config.js              — Rule definitions (23 rules)
├── index.js               — Quality gate runner
├── reporter.js            — Output formatting
├── parsers/               — JSX, CSS, Dart parsers
├── rules/                 — Rule implementations
├── decisions/             — Component classifier + requirements + engine
├── workflow/              — Full workflow (decisions + quality + compliance)
├── spec/                  — Machine-readable motion spec
├── state/                 — State persistence + regression detection
├── feedback/              — Human feedback capture
└── escalation/            — Escalation protocol
```

---

## Documentation

| Document | Description |
|---|---|
| [README.md](README.md) | This file — overview and usage |
| [SOURCES.md](SOURCES.md) | All 23 rules with verified source citations |
| [SKILL.md](SKILL.md) | Agent skill (Claude Code / Codex / Cursor) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [SECURITY.md](SECURITY.md) | Security policy |
| [LICENSE](LICENSE) | MIT license |

## Sources

Every rule in uiq cites a real, published, verifiable source. No AI-generated sources. No broken links.

See [SOURCES.md](SOURCES.md) for the full list of 20 citations with URLs and summaries.

All sources are from: W3C/WCAG, Material Design, NN/g, MDN, web.dev, Apple HIG, CSS Triggers, W3C Design Tokens, ARIA APG.

**Q: Does this replace human design review?**
No. It automates the objective layer (motion mechanics, states, accessibility). The experiential layer (does it feel right?) still needs human judgment. The tool makes human review faster by catching mechanical issues first.

**Q: Can the agent game the score?**
The agent could add `hover:` to every element to silence the linter. That's why the decision engine exists — it specifies *which* components need *which* states. The compliance check verifies decisions match implementation.

**Q: Does this work without a browser?**
Yes. All checks are static (AST/regex on source code). No rendering, no Playwright, no screenshots. Runs in < 2 seconds.

**Q: What about taste/beauty?**
Out of scope. The tool checks mechanical correctness, not aesthetics. For taste, use visual references + human review.

**Q: Is this only for AI-generated UI?**
No. It works on any UI code. But it's designed for the agentic workflow where an agent writes code and needs automated verification.

---

## License

MIT

## Contributing

1. Fork the repo
2. Add a rule in `src/config.js` and implement in `src/rules/index.js`
3. Add parser support in `src/parsers/`
4. Add tests in `tests/`
5. Submit PR

Rules should be: deterministic, objective, checkable via static analysis, and map to an established standard (Material Design, Apple HIG, WCAG, etc.).
