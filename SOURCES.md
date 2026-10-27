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
