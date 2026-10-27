# Sources and References

Every rule in uiq cites a real, published, verifiable source. No AI-generated sources. No broken links. All URLs point to official documentation or peer-reviewed research.

## Motion

### motion/no-layout-animation
- **Title**: Avoid large, complex layouts and layout thrashing
- **Source**: https://web.dev/avoid-large-complex-layouts-and-layout-thrashing/
- **Also**: https://csstriggers.com/
- **Summary**: Animating layout properties (width, height, top, margin) triggers layout recalculation on every frame, causing jank. Only transform and opacity are compositor-only.

### motion/duration-range
- **Title**: Motion – Easing and duration (Material Design 3)
- **Source**: https://m3.material.io/styles/motion/easing-and-duration
- **Also**: https://www.nngroup.com/articles/animation-duration/
- **Summary**: Material Design specifies 100-500ms for UI transitions. NN/g research: users perceive animations under 100ms as instant, over 500ms as sluggish.

### motion/known-easing
- **Title**: Motion – Easing and duration (Material Design 3)
- **Source**: https://m3.material.io/styles/motion/easing-and-duration
- **Also**: https://developer.apple.com/design/human-interface-guidelines/motion
- **Summary**: Material Design: ease-out for entrances (decelerate), ease-in for exits (accelerate), ease-in-out for moves. Apple HIG agrees.

### motion/reduced-motion
- **Title**: WCAG 2.1 Success Criterion 2.3.3: Animation from Interactions
- **Source**: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html
- **Also**: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- **Summary**: Users with vestibular disorders can be harmed by motion. Respect prefers-reduced-motion.

### motion/stagger-interval
- **Title**: Motion – Choreography (Material Design 3)
- **Source**: https://m3.material.io/styles/motion/overview
- **Summary**: Material Design choreography: stagger entrances by 20-40ms for rhythm.

## Interaction

### interaction/hover-state
- **Title**: Interaction states (Material Design 3)
- **Source**: https://m3.material.io/foundations/interaction-states/overview
- **Summary**: Every interactive element needs hover, focus, pressed, and disabled states.

### interaction/focus-visible
- **Title**: WCAG 2.1 Success Criterion 2.4.7: Focus Visible
- **Source**: https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html
- **Also**: https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
- **Summary**: Keyboard users must be able to see which element has focus.

### interaction/disabled-state
- **Title**: Interaction states (Material Design 3)
- **Source**: https://m3.material.io/foundations/interaction-states/overview
- **Summary**: Disabled elements must visually indicate they are not interactive.

### interaction/loading-state
- **Title**: Skeleton screens (NN/g)
- **Source**: https://www.nngroup.com/articles/skeleton-screens/
- **Also**: https://m3.material.io/components/progress-indicators/overview
- **Summary**: NN/g: skeleton screens improve perceived performance.

### interaction/empty-state
- **Title**: Empty states (NN/g)
- **Source**: https://www.nngroup.com/articles/empty-state-interface-design/
- **Summary**: NN/g: empty states should explain why there is no data and provide a path forward.

### interaction/error-state
- **Title**: Error message guidelines (NN/g)
- **Source**: https://www.nngroup.com/articles/error-message-guidelines/
- **Summary**: NN/g: error messages must be visible, specific, and provide recovery actions.

### interaction/active-route
- **Title**: WCAG 2.1 Success Criterion 2.4.8: Location
- **Source**: https://www.w3.org/WAI/WCAG21/Understanding/location.html
- **Also**: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current
- **Summary**: Users need to know where they are in a site.

## Accessibility

### a11y/keyboard-nav
- **Title**: WCAG 2.1 Success Criterion 2.1.1: Keyboard
- **Source**: https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html
- **Also**: https://www.w3.org/WAI/ARIA/apg/
- **Summary**: All functionality must be available via keyboard.

### a11y/focus-management
- **Title**: Dialog (Modal) pattern (ARIA APG)
- **Source**: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- **Summary**: ARIA APG: modals must trap focus, and focus must return to the trigger element on close.

### a11y/aria-dynamic
- **Title**: ARIA Live Regions (MDN)
- **Source**: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
- **Also**: https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html
- **Summary**: Dynamic content changes must be announced to screen readers.

### a11y/touch-targets
- **Title**: WCAG 2.1 Success Criterion 2.5.5: Target Size
- **Source**: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
- **Also**: https://m3.material.io/foundations/accessible-design/accessibility-basics
- **Summary**: WCAG: minimum 44×44 CSS pixels. Material Design: 48×48dp. Apple HIG: 44×44pt.

## Consistency

### consistency/motion-tokens
- **Title**: Design tokens (W3C Design Tokens Community Group)
- **Source**: https://design-tokens.github.io/community-group/format/
- **Also**: https://m3.material.io/foundations/design-tokens/overview
- **Summary**: Design tokens provide a single source of truth for design values.

### consistency/single-language
- **Title**: Motion system (Material Design 3)
- **Source**: https://m3.material.io/styles/motion/overview
- **Summary**: Use a consistent motion language (easing family + duration scale) across the product.

### consistency/no-generic-cta
- **Title**: Button design (NN/g)
- **Source**: https://www.nngroup.com/articles/buttons/
- **Summary**: Buttons should use brand colors, not default blue.

### consistency/no-card-grid-hero
- **Title**: Homepage design (NN/g)
- **Source**: https://www.nngroup.com/articles/homepage-design-principles/
- **Summary**: Hero sections should have one dominant visual and clear CTA.

---

## Sources index

All sources are from these organizations:

| Organization | URL | Used for |
|---|---|---|
| W3C / WCAG | w3.org/WAI | Accessibility rules (keyboard, focus, target size, location, status messages) |
| Material Design | m3.material.io | Motion, interaction states, design tokens, accessibility |
| NN/g (Nielsen Norman Group) | nngroup.com | Animation duration, skeleton screens, empty states, error messages, button design, homepage design |
| MDN Web Docs | developer.mozilla.org | prefers-reduced-motion, :focus-visible, ARIA live regions |
| web.dev | web.dev | Layout thrashing, performance |
| Apple HIG | developer.apple.com | Motion guidelines, touch targets |
| CSS Triggers | csstriggers.com | Which CSS properties trigger layout/paint/composite |
| W3C Design Tokens | design-tokens.github.io | Design token format specification |
| ARIA APG | w3.org/WAI/ARIA/apg | Dialog pattern, keyboard navigation |

---

## Numbers and their sources

Every numeric value in uiq is either **research-backed** (from a published source) or a **heuristic** (our own decision, documented here). No hallucinated numbers.

### Research-backed numbers

| Value | Where used | Source |
|---|---|---|
| 100-500ms duration range | `motion/duration-range` rule | Material Design 3 motion spec + NN/g "Animation Duration" |
| 100ms (micro-interaction) | Decision engine, DURATION_RANGES | Material Design short2 (100ms) |
| 150ms (hover/transition) | Decision engine, DURATION_RANGES | Material Design short3 (150ms) |
| 200ms (entrance) | Decision engine | Material Design short4 (200ms) |
| 250ms (complex start) | DURATION_RANGES | Material Design medium1 (250ms) |
| 300ms (modal/complex) | Decision engine | Material Design medium2 (300ms) |
| 500ms (max) | DURATION_RANGES, duration-range rule | Material Design long2 (500ms), NN/g upper bound |
| 20-40ms stagger | `motion/stagger-interval` rule | Material Design choreography spec |
| 44×44px touch targets | `a11y/touch-targets` rule | WCAG 2.5.5 (minimum 44×44 CSS pixels) |
| 4.5:1 contrast ratio | SOURCES (not yet implemented as rule) | WCAG 2.1 AA (normal text) |
| 48×48dp touch targets | SOURCES (reference) | Material Design (48×48dp) |
| 44×44pt touch targets | SOURCES (reference) | Apple HIG (44×44pt) |
| ease-out for entrances | `motion/known-easing` rule | Material Design + Apple HIG |
| ease-in for exits | `motion/known-easing` rule | Material Design + Apple HIG |
| ease-in-out for moves | `motion/known-easing` rule | Material Design + Apple HIG |
| scale 0.96-0.98 on press | Decision engine | Material Design pressed state |
| 0.01ms for reduced motion | Decision engine | Common technique (instant appear, no motion) |

### Heuristic numbers (our decisions, not research-backed)

| Value | Where used | Rationale |
|---|---|---|
| Score deductions: error -10, warning -3, info -1 | Score calculation | Errors are more severe; 10/3/1 ratio reflects relative impact |
| Pass threshold: 80 | Default `--min-score` | 80% = "good enough" default; configurable via `--min-score` |
| Compliance threshold: 90% | README recommendation | 90% = near-complete; configurable |
| `animations.length > 3` for stagger check | rules/index.js | Heuristic: 3+ animations likely need staggering |
| `interactiveElements.length > 2` for disabled check | rules/index.js | Heuristic: 2+ interactive elements likely need disabled states |
| `interactiveElements.length > 3` for touch targets | rules/index.js | Heuristic: 3+ elements likely need explicit touch sizing |
| `easings.length > 3` for single-language check | rules/index.js | Heuristic: 3+ different easings likely inconsistent |
| `uniqueEasings.size > 3` | rules/index.js | Heuristic: more than 3 easings is inconsistent |
| translateY(-2px) on card hover | Decision engine | Common practice; subtle enough for grids |
| translateY(-4px) on card hover (feedback) | Decision engine | Adjusted based on human feedback |
| 25ms stagger (feedback example) | Decision engine | Within Material Design 20-40ms range |
| 40ms stagger | Decision engine | Upper bound of Material Design 20-40ms range |
| 300ms modal entrance | Decision engine | Material Design medium2 (300ms) |
| 200ms standard entrance | Decision engine | Material Design short4 (200ms) |
| 150ms hover | Decision engine | Material Design short3 (150ms) |
| 100ms press | Decision engine | Material Design short2 (100ms) |

### What is NOT a number (and why)

- **No "2 seconds" claim**: Earlier README said "runs in 2 seconds." This is not measured. Actual runtime depends on codebase size. Removed in favor of "runs in seconds."
- **No contrast ratio rule**: WCAG 4.5:1 is documented in SOURCES but not implemented as a rule because static contrast checking requires color parsing that isn't reliable across CSS frameworks. Marked as "planned."
- **No layout thrashing rule**: Documented in SOURCES but not implemented as a separate rule because interleaved reads/writes are hard to detect statically. Covered partially by `motion/no-layout-animation`.

### How to verify any number

1. Find the number in the codebase (search for the value)
2. Check if it appears in the "Research-backed" table above
3. If yes, visit the cited URL and confirm
4. If no, it's in the "Heuristic" table with rationale
5. If it's in neither table, it's a bug — please file an issue
