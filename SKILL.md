---
name: uiq
description: Quality gate for UI code. Checks 23 objective rules across motion, interaction states, accessibility, performance, and consistency. Also provides interaction decision analysis. Use after writing or modifying any UI code.
---

# uiq - Quality Gate for AI-Generated UI

## One-line summary

Run `uiq ./src` after writing UI code. Fix errors. Re-run until score ≥ 80. Never declare "done" until it passes.

## Commands

| Command | Purpose |
|---|---|
| `uiq ./src` | Quality gate - 23 rules, < 2 seconds |
| `uiq ./src --decide` | What interaction each component warrants |
| `uiq ./src --full` | Decisions + quality + compliance in one pass |
| `uiq ./src --state` | Save state + detect regressions |
| `uiq review` | View human feedback |
| `uiq escalate` | View pending escalations |

## Quick reference

```bash
# After writing UI code:
uiq ./src                    # check
uiq ./src --format json      # for programmatic use
uiq ./src --ci --min-score 80 # CI mode

# For new components:
uiq ./src --decide           # plan interactions first

# Full verification:
uiq ./src --full             # decisions + quality + compliance
```

## Rules (23 total)

### Motion
- `motion/no-layout-animation` - Never animate width/height/top/margin. Use transform/opacity.
- `motion/duration-range` - Durations must be 100-500ms.
- `motion/reduced-motion` - All animations must respect prefers-reduced-motion.
- `motion/stagger-interval` - Stagger: 20-40ms between items.

### Interaction
- `interaction/hover-state` - Every interactive element needs hover styling.
- `interaction/focus-visible` - Every interactive element needs focus-visible.
- `interaction/disabled-state` - Disableable elements need disabled styling.
- `interaction/loading-state` - Data views need loading UI.
- `interaction/empty-state` - Data views need empty state.
- `interaction/error-state` - Data views need error state.
- `interaction/active-route` - Navigation needs active route indication.

### Accessibility
- `a11y/focus-management` - Modals/drawers must trap focus.
- `a11y/keyboard-nav` - No onClick on divs. Use buttons or role+tabIndex+onKeyDown.
- `a11y/aria-dynamic` - Dynamic content needs ARIA.
- `a11y/contrast` - WCAG 4.5:1 contrast ratio.
- `a11y/touch-targets` - Minimum 44×44px.

### Performance
- `perf/compositor-only` - Animations on compositor thread only.
- `perf/no-layout-thrash` - No interleaved DOM reads/writes.

### Consistency
- `consistency/motion-tokens` - Define --duration-* and --ease-* tokens.
- `consistency/no-generic-cta` - No generic blue CTAs.
- `consistency/no-card-grid-hero` - No card grids in hero.

## Agent workflow

```
1. Write UI code
2. Run: uiq ./src
3. Fix errors first, then warnings
4. Re-run until score ≥ 80
5. Run: uiq ./src --full
6. Verify compliance ≥ 90%
7. Only declare "done" when both pass
```

For new components:
```
1. Run: uiq ./src --decide
2. Implement all required states and recommended motion
3. Follow anti-patterns list
4. Run: uiq ./src
```

## Decision engine output

When you run `--decide`, you get per-component recommendations:

```
├─ Component: button-primary
│  Consequence: instant-reversible
│  Required states: hover, focus-visible, active, disabled, loading
│  Recommended motion:
│    → color shift on hover (100-150ms)
│    → scale(0.97) on press
│    → loading spinner replaces label
│  Anti-patterns:
│    ✗ Don't use generic blue - use brand color
│    ✗ Loading state must disable the button
```

## Motion spec

For every animated component, document:

| Component | Pattern | Trigger | Duration | Easing | Reduced motion |
|-----------|---------|---------|----------|--------|----------------|
| Hero title | Fade + slide up | Page load | 300ms | ease-out | Instant appear |
| Card hover | Scale up | Hover | 150ms | ease-out | No animation |

## Supported frameworks

React, Next.js, Vue, Svelte, HTML, CSS/Tailwind, Flutter (Dart)

## What this does NOT do

- Does not judge beauty or taste
- Does not generate UI
- Does not need a browser
- Does not cost money (free, open source, runs locally)

## What this DOES do

- Catches mechanical UI bugs in < 2 seconds
- Tells you what interaction each component should have
- Tracks regressions across scans
- Captures human feedback structurally
- Escalates issues needing human judgment
- Works in CI (exit 1 on failure)
