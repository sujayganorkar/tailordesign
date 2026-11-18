// src/decisions/requirements.js - Map component type → required states + recommended motion

// Interaction requirements by component type
// Each entry: { states: [], motion: [], antiPatterns: [], consequence: string }
const REQUIREMENTS = {
  'button': {
    consequence: 'instant-reversible',
    states: ['hover', 'focus-visible', 'active', 'disabled'],
    motion: ['color/opacity shift on hover (100-150ms)', 'scale(0.97-0.98) on press (80-100ms)'],
    antiPatterns: ['No layout property animation', 'No entrance animation on buttons', 'Don\'t animate button size'],
  },
  'button-primary': {
    consequence: 'instant-reversible',
    states: ['hover', 'focus-visible', 'active', 'disabled', 'loading'],
    motion: ['color shift on hover (100-150ms)', 'scale(0.97) on press', 'loading spinner replaces label'],
    antiPatterns: ['Don\'t use generic blue - use brand color', 'Loading state must disable the button'],
  },
  'button-destructive': {
    consequence: 'destructive',
    states: ['hover', 'focus-visible', 'active', 'disabled', 'confirmation'],
    motion: ['Red color shift on hover (150ms)', 'Shake on error (once)', 'Heavy press feedback'],
    antiPatterns: ['Must have confirmation dialog or undo', 'Never instant-delete without guard'],
  },
  'card': {
    consequence: 'passive-consumption',
    states: [],
    motion: ['Fade-in on scroll (200ms, ease-out)', 'No hover if not clickable'],
    antiPatterns: ['Don\'t animate card dimensions', 'Don\'t add parallax to card images in grids'],
  },
  'card-clickable': {
    consequence: 'navigation',
    states: ['hover', 'focus-visible', 'active'],
    motion: ['translateY(-2px) + shadow on hover (150ms, ease-out)', 'scale(0.98) on press (100ms)', 'Entrance fade-in on scroll (200ms)'],
    antiPatterns: ['Don\'t animate width/height', 'Don\'t add hover if card is not clickable'],
  },
  'modal': {
    consequence: 'structural',
    states: ['open', 'close', 'backdrop'],
    motion: ['Fade + scale from 0.95 (200ms, ease-out)', 'Backdrop fade (150ms)', 'Exit: fade + scale to 0.95 (150ms, ease-in)'],
    antiPatterns: ['Must trap focus', 'Must restore focus on close', 'Don\'t use slide for modals (use for drawers)'],
  },
  'drawer': {
    consequence: 'structural',
    states: ['open', 'close', 'backdrop'],
    motion: ['Slide from edge (250ms, ease-out)', 'Backdrop fade (150ms)', 'Exit: slide to edge (200ms, ease-in)'],
    antiPatterns: ['Must trap focus', 'Must be dismissible via backdrop click and Escape'],
  },
  'accordion': {
    consequence: 'structural',
    states: ['expanded', 'collapsed'],
    motion: ['Height animation (200ms, ease-out)', 'Chevron rotation (200ms)'],
    antiPatterns: ['Don\'t animate max-height with large values (performance)', 'Use grid-template-rows for smooth height'],
  },
  'form': {
    consequence: 'data-mutation',
    states: ['idle', 'submitting', 'success', 'error', 'validation'],
    motion: ['Field focus: border color transition (150ms)', 'Submit: button loading spinner', 'Success: checkmark (300ms)', 'Error: shake (once, 300ms)'],
    antiPatterns: ['Don\'t animate form layout on validation', 'Disable submit during submission'],
  },
  'input': {
    consequence: 'instant-reversible',
    states: ['focus', 'error', 'success', 'disabled'],
    motion: ['Border color transition (150ms)', 'Label float (200ms, ease-out)'],
    antiPatterns: ['Don\'t animate input size', 'Error state must be accessible (aria-invalid)'],
  },
  'list': {
    consequence: 'passive-consumption',
    states: ['hover (row)', 'selected'],
    motion: ['Staggered fade-in on mount (40ms stagger, 200ms each)', 'Hover: background shift (100ms)'],
    antiPatterns: ['Don\'t stagger more than 8 items', 'Don\'t animate list on scroll if already visible'],
  },
  'data-view': {
    consequence: 'passive-consumption',
    states: ['loading', 'empty', 'error', 'populated'],
    motion: ['Loading: skeleton shimmer (infinite)', 'Empty: fade-in (200ms)', 'Error: shake (once)', 'Populated: staggered entrance (40ms)'],
    antiPatterns: ['Must have all 4 states', 'Skeleton must match content layout'],
  },
  'image': {
    consequence: 'passive-consumption',
    states: ['loading', 'loaded', 'error'],
    motion: ['Lazy-load fade-in (300ms, ease-out)', 'Hover zoom (only in galleries, 200ms)'],
    antiPatterns: ['Don\'t parallax images in dense grids', 'Must have alt text'],
  },
  'link': {
    consequence: 'navigation',
    states: ['hover', 'focus-visible', 'active', 'visited'],
    motion: ['Color/underline transition (100-150ms)'],
    antiPatterns: ['No entrance animation on links', 'Visited state for navigation context'],
  },
  'nav': {
    consequence: 'navigation',
    states: ['active-route', 'hover', 'mobile-open', 'mobile-closed'],
    motion: ['Mobile collapse: slide (250ms, ease-out)', 'Active indicator: sliding (layout animation)', 'Entrance: slide-down (200ms)'],
    antiPatterns: ['Don\'t scroll-jack navigation', 'Active state must be clear without hover'],
  },
  'tab-bar': {
    consequence: 'navigation',
    states: ['active-tab', 'hover'],
    motion: ['Sliding indicator (200ms, ease-out)', 'Content crossfade (150ms)'],
    antiPatterns: ['Don\'t animate tab content with heavy transitions'],
  },
  'unknown-interactive': {
    consequence: 'unknown',
    states: ['hover', 'focus-visible', 'active'],
    motion: ['Determine appropriate motion based on component purpose'],
    antiPatterns: ['Classify this component properly - it has onClick but is not a recognized interactive element', 'Consider using <button> instead of <div onClick>'],
  },
  'tooltip': {
    consequence: 'instant-reversible',
    states: ['visible', 'hidden'],
    motion: ['Fade + scale from 0.95 (100ms, ease-out)', 'Exit: fade (80ms)'],
    antiPatterns: ['Must not block interaction', 'Position must not cause layout shift'],
  },
  'loading': {
    consequence: 'passive-consumption',
    states: ['visible', 'hidden'],
    motion: ['Skeleton shimmer (infinite, subtle)', 'Spinner rotation (linear, 1s)'],
    antiPatterns: ['Skeleton must match content dimensions', 'Don\'t use spinner for > 3s (use progress bar)'],
  },
};

// Context modifiers - adjust requirements based on where the component is used
const CONTEXT_MODIFIERS = {
  scroll: {
    // Components in scroll contexts get entrance animations
    addMotion: ['scroll-triggered reveal (fade + translateY, 200ms, ease-out)'],
  },
  data: {
    // Data-fetching components need loading/empty/error states
    addStates: ['loading', 'empty', 'error'],
  },
  navigation: {
    // Navigation components need active state
    addStates: ['active-route'],
  },
};

export function getRequirements(componentType, contexts = []) {
  const base = REQUIREMENTS[componentType] || {
    consequence: 'unknown',
    states: [],
    motion: [],
    antiPatterns: [],
  };

  // Determine whether this component should animate at all.
  const passive = base.consequence === 'passive-consumption';
  const shouldAnimate = !passive || contexts.includes('scroll') || componentType === 'card-clickable';

  const result = {
    type: componentType,
    consequence: base.consequence,
    shouldAnimate,
    animationRationale: shouldAnimate
      ? (passive ? 'Scroll-triggered reveal only; no continuous motion.' : 'Micro-interactions on hover/press are appropriate.')
      : 'Static component: no animation needed. Avoid generic fade-ins.',
    requiredStates: [...base.states],
    recommendedMotion: shouldAnimate ? [...base.motion] : [],
    antiPatterns: [...base.antiPatterns],
  };

  // Apply context modifiers
  for (const ctx of contexts) {
    const modifier = CONTEXT_MODIFIERS[ctx];
    if (modifier) {
      if (modifier.addStates) {
        for (const state of modifier.addStates) {
          // Only add data states to data-view and list components
          if (['loading', 'empty', 'error'].includes(state)) {
            if (!['data-view', 'list'].includes(componentType)) continue;
          }
          // Only add active-route to nav and link components
          if (state === 'active-route') {
            if (!['nav', 'tab-bar', 'link'].includes(componentType)) continue;
          }
          if (!result.requiredStates.includes(state)) {
            result.requiredStates.push(state);
          }
        }
      }
      if (modifier.addMotion && result.shouldAnimate) {
        result.recommendedMotion.push(...modifier.addMotion);
      }
    }
  }

  return result;
}

export function getAllRequirements() {
  return REQUIREMENTS;
}
