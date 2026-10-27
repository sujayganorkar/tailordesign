// src/config.js — Rule definitions and configuration

export const SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

export const CATEGORIES = {
  MOTION: 'motion',
  INTERACTION: 'interaction',
  ACCESSIBILITY: 'accessibility',
  PERFORMANCE: 'performance',
  CONSISTENCY: 'consistency',
};

// Known-good easing curves (Material Design + Apple HIG)
export const KNOWN_EASINGS = [
  'ease-out', 'ease-in', 'ease-in-out', 'ease',
  'cubic-bezier(0, 0, 0.2, 1)', // standard decelerate (Material)
  'cubic-bezier(0.4, 0, 1, 1)', // accelerate
  'cubic-bezier(0.4, 0, 0.2, 1)', // standard
  'cubic-bezier(0.0, 0, 0.2, 1)', // decelerate
  'cubic-bezier(0.4, 0, 0.6, 1)', // emphasized decelerate
  'linear', // only for progress bars / marquees
];

// Duration ranges (ms) per interaction type
export const DURATION_RANGES = {
  micro: { min: 50, max: 150 },      // button press, toggle
  transition: { min: 150, max: 300 }, // page transition, modal open
  complex: { min: 250, max: 500 },    // complex choreography
  max: 500,                            // hard ceiling
};

// Layout properties that should never be animated
export const LAYOUT_PROPERTIES = [
  'width', 'height', 'top', 'left', 'right', 'bottom',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'font-size', 'line-height', 'border-width',
];

// Compositor-only properties (safe to animate)
export const COMPOSITOR_PROPERTIES = [
  'transform', 'opacity', 'filter', 'clip-path', 'backdrop-filter',
];

// Interactive elements that need state coverage
export const INTERACTIVE_ELEMENTS = [
  'button', 'a', 'input', 'select', 'textarea', 'details', 'summary',
];

// Data view indicators
export const DATA_VIEW_PATTERNS = [
  'loading', 'isLoading', 'isPending', 'fetching',
  'empty', 'isEmpty', 'noData', 'noResults',
  'error', 'isError', 'hasError',
];

// Motion tokens that should be defined
export const MOTION_TOKENS = {
  durations: ['--duration-micro', '--duration-fast', '--duration-normal', '--duration-slow', '--duration-complex'],
  easings: ['--ease-out', '--ease-in', '--ease-in-out', '--ease-standard'],
};

// Generic blue CTA patterns (the "AI slop" signature)
export const GENERIC_CTA_PATTERNS = [
  /bg-blue-500|bg-blue-600|bg-indigo-500|bg-indigo-600/,
  /background:\s*#3b82f6|#4f46e5|#2563eb/,
  /background-color:\s*blue/i,
];

// Rules registry
export const RULES = [
  // --- Motion ---
  { id: 'motion/no-layout-animation', category: CATEGORIES.MOTION, severity: SEVERITY.ERROR,
    description: 'Animations must use only compositor properties (transform, opacity). Never animate layout properties (width, height, top, margin, etc.).' },
  { id: 'motion/duration-range', category: CATEGORIES.MOTION, severity: SEVERITY.WARNING,
    description: 'Animation durations should be between 100ms and 500ms. Micro: 100-150ms, transitions: 150-300ms, complex: 250-500ms.' },
  { id: 'motion/known-easing', category: CATEGORIES.MOTION, severity: SEVERITY.WARNING,
    description: 'Easing curves should be from the known set (ease-out, ease-in, ease-in-out, or standard cubic-bezier values).' },
  { id: 'motion/reduced-motion', category: CATEGORIES.MOTION, severity: SEVERITY.ERROR,
    description: 'All animations must respect prefers-reduced-motion. Check for @media (prefers-reduced-motion) or useReducedMotion hook.' },
  { id: 'motion/stagger-interval', category: CATEGORIES.MOTION, severity: SEVERITY.INFO,
    description: 'Staggered animations should use 30-50ms intervals between items.' },

  // --- Interaction ---
  { id: 'interaction/hover-state', category: CATEGORIES.INTERACTION, severity: SEVERITY.ERROR,
    description: 'Every interactive element (button, link, input) must have a hover state.' },
  { id: 'interaction/focus-visible', category: CATEGORIES.INTERACTION, severity: SEVERITY.ERROR,
    description: 'Every interactive element must have a focus-visible state for keyboard navigation.' },
  { id: 'interaction/disabled-state', category: CATEGORIES.INTERACTION, severity: SEVERITY.WARNING,
    description: 'Interactive elements that can be disabled must have a disabled state.' },
  { id: 'interaction/loading-state', category: CATEGORIES.INTERACTION, severity: SEVERITY.WARNING,
    description: 'Data-fetching components must have a loading state (skeleton, spinner, or placeholder).' },
  { id: 'interaction/empty-state', category: CATEGORIES.INTERACTION, severity: SEVERITY.WARNING,
    description: 'Data views must have an empty state for when there is no data.' },
  { id: 'interaction/error-state', category: CATEGORIES.INTERACTION, severity: SEVERITY.WARNING,
    description: 'Data views must have an error state for failed requests.' },
  { id: 'interaction/active-route', category: CATEGORIES.INTERACTION, severity: SEVERITY.INFO,
    description: 'Navigation must indicate the active route/page.' },

  // --- Accessibility ---
  { id: 'a11y/focus-management', category: CATEGORIES.ACCESSIBILITY, severity: SEVERITY.ERROR,
    description: 'Modals and drawers must trap focus and return focus on close.' },
  { id: 'a11y/keyboard-nav', category: CATEGORIES.ACCESSIBILITY, severity: SEVERITY.ERROR,
    description: 'All interactive elements must be keyboard-accessible (no onClick-only divs).' },
  { id: 'a11y/aria-dynamic', category: CATEGORIES.ACCESSIBILITY, severity: SEVERITY.WARNING,
    description: 'Dynamic content changes must use aria-live or appropriate ARIA attributes.' },
  { id: 'a11y/contrast', category: CATEGORIES.ACCESSIBILITY, severity: SEVERITY.ERROR,
    description: 'Text must meet WCAG 4.5:1 contrast ratio (AA).' },
  { id: 'a11y/touch-targets', category: CATEGORIES.ACCESSIBILITY, severity: SEVERITY.WARNING,
    description: 'Interactive elements must have minimum 44x44px touch targets.' },

  // --- Performance ---
  { id: 'perf/compositor-only', category: CATEGORIES.PERFORMANCE, severity: SEVERITY.ERROR,
    description: 'Animations must run on the compositor thread (use transform/opacity, avoid will-change abuse).' },
  { id: 'perf/no-layout-thrash', category: CATEGORIES.PERFORMANCE, severity: SEVERITY.WARNING,
    description: 'Avoid interleaving DOM reads and writes (layout thrashing).' },

  // --- Consistency ---
  { id: 'consistency/motion-tokens', category: CATEGORIES.CONSISTENCY, severity: SEVERITY.WARNING,
    description: 'Motion values (durations, easings) should be defined as CSS custom properties / design tokens.' },
  { id: 'consistency/single-language', category: CATEGORIES.CONSISTENCY, severity: SEVERITY.INFO,
    description: 'Use a single motion language per page (consistent easing family and duration scale).' },
  { id: 'consistency/no-generic-cta', category: CATEGORIES.CONSISTENCY, severity: SEVERITY.INFO,
    description: 'Avoid generic blue CTA buttons (the "AI slop" signature). Use brand colors.' },
  { id: 'consistency/no-card-grid-hero', category: CATEGORIES.CONSISTENCY, severity: SEVERITY.INFO,
    description: 'Avoid card grids in the hero section. Use full-bleed imagery and brand-first hierarchy.' },
];

export function getRule(id) {
  return RULES.find(r => r.id === id);
}

export function getRulesByCategory(category) {
  return RULES.filter(r => r.category === category);
}
