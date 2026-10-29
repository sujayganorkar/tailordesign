// src/fixer-suggestions.js - Actionable fix suggestions for agents

// Map each rule to a specific, actionable fix suggestion
export const FIX_SUGGESTIONS = {
  'motion/no-layout-animation': {
    description: 'Replace layout property animations with transform/opacity',
    css: 'Change "transition: width 300ms" to "transition: transform 300ms" and use transform: scaleX() instead of width',
    jsx: 'Replace "transition-all" with "transition-transform" or "transition-opacity". Use transform: scale() or translate() instead of width/height.',
    example: '// Before: className="transition-all duration-300 hover:w-full"\n// After:  className="transition-transform duration-300 hover:scale-105"',
  },
  'motion/duration-range': {
    description: 'Adjust duration to 100-500ms range',
    css: 'Change duration to 150ms (micro), 250ms (transition), or 350ms (complex)',
    jsx: 'Change duration-500 to duration-200, or duration-1000 to duration-300',
    example: '// Micro-interactions: 100-150ms\n// Transitions: 150-300ms\n// Complex: 250-500ms',
  },
  'motion/known-easing': {
    description: 'Use standard easing curves',
    css: 'Replace unknown easing with: ease-out (entrances), ease-in (exits), ease-in-out (moves)',
    jsx: 'Use "ease-out" for entrances, "ease-in" for exits, "ease-in-out" for moves',
    example: '// Entrances: ease-out (decelerate into place)\n// Exits: ease-in (accelerate out)\n// Moves: ease-in-out (smooth both ways)',
  },
  'motion/reduced-motion': {
    description: 'Add prefers-reduced-motion handling',
    css: 'Add: @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }',
    jsx: 'Import useReducedMotion from framer-motion and conditionally disable animations',
    example: '// CSS:\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after {\n    animation-duration: 0.01ms !important;\n    transition-duration: 0.01ms !important;\n  }\n}',
  },
  'motion/stagger-interval': {
    description: 'Add stagger to multiple animations',
    css: 'Add animation-delay: 20-40ms per item',
    jsx: 'Add style={{ animationDelay: `${index * 40}ms` }} to mapped items',
    example: '// React:\n{items.map((item, i) => (\n  <div style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-in">\n))}',
  },
  'interaction/hover-state': {
    description: 'Add hover state to interactive elements',
    css: ':hover { background-color: ...; } or use Tailwind hover: classes',
    jsx: 'Add "hover:bg-gray-100" or "hover:scale-105" to className',
    example: '// Before: className="px-4 py-2 bg-blue-500"\n// After:  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 transition-colors"',
  },
  'interaction/focus-visible': {
    description: 'Add focus-visible state for keyboard navigation',
    css: ':focus-visible { outline: 2px solid blue; outline-offset: 2px; }',
    jsx: 'Add "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" to className',
    example: '// Tailwind:\nclassName="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
  },
  'interaction/disabled-state': {
    description: 'Add disabled state styling',
    css: ':disabled { opacity: 0.5; cursor: not-allowed; }',
    jsx: 'Add "disabled:opacity-50 disabled:cursor-not-allowed" to className',
    example: '// Tailwind:\nclassName="... disabled:opacity-50 disabled:cursor-not-allowed"',
  },
  'interaction/loading-state': {
    description: 'Add loading state (skeleton, spinner, or placeholder)',
    css: 'N/A - requires component logic',
    jsx: 'Add conditional rendering: {loading ? <Skeleton /> : <Content />}',
    example: '// React:\nif (loading) return <div className="animate-pulse bg-gray-200 h-4 rounded" />;',
  },
  'interaction/empty-state': {
    description: 'Add empty state for when data is empty',
    css: 'N/A - requires component logic',
    jsx: 'Add conditional rendering: {data.length === 0 ? <EmptyState /> : <List />}',
    example: '// React:\nif (!data || data.length === 0) return <p className="text-gray-500">No items found.</p>;',
  },
  'interaction/error-state': {
    description: 'Add error state for failed requests',
    css: 'N/A - requires component logic',
    jsx: 'Add conditional rendering: {error ? <ErrorState onRetry={retry} /> : <Content />}',
    example: '// React:\nif (error) return <div role="alert">Failed to load. <button onClick={retry}>Retry</button></div>;',
  },
  'interaction/active-route': {
    description: 'Add active route indication in navigation',
    css: 'Add .active class styling for current route',
    jsx: 'Add aria-current="page" and active styling based on current route',
    example: '// React Router:\n<NavLink className={({ isActive }) => isActive ? "text-blue-600 font-bold" : "text-gray-600"}>',
  },
  'a11y/keyboard-nav': {
    description: 'Replace onClick on divs with button or add keyboard support',
    css: 'N/A - requires HTML change',
    jsx: 'Replace <div onClick={...}> with <button onClick={...}> or add role="button" tabIndex={0} onKeyDown',
    example: '// Before: <div onClick={handleClick}>Click me</div>\n// After:  <button onClick={handleClick}>Click me</button>',
  },
  'a11y/focus-management': {
    description: 'Add focus trapping and restoration to modals/drawers',
    css: 'N/A - requires component logic',
    jsx: 'Use focus-trap-react or implement manually: trap focus inside modal, restore on close',
    example: '// React:\nuseEffect(() => {\n  if (isOpen) previousFocus.current = document.activeElement;\n  else previousFocus.current?.focus();\n}, [isOpen]);',
  },
  'a11y/aria-dynamic': {
    description: 'Add ARIA attributes for dynamic content',
    css: 'N/A - requires HTML change',
    jsx: 'Add role="dialog", aria-modal="true", aria-labelledby, aria-live="polite" as needed',
    example: '// Modal:\n<div role="dialog" aria-modal="true" aria-labelledby="modal-title">\n// Live region:\n<div aria-live="polite" aria-atomic="true">{status}</div>',
  },
  'a11y/touch-targets': {
    description: 'Add minimum 44×44px touch targets',
    css: 'min-height: 44px; min-width: 44px;',
    jsx: 'Add "min-h-[44px] min-w-[44px]" to interactive elements',
    example: '// Tailwind:\nclassName="... min-h-[44px] min-w-[44px]"',
  },
  'a11y/contrast': {
    description: 'Fix color contrast to meet WCAG 4.5:1',
    css: 'Increase text darkness or background lightness',
    jsx: 'Use darker text on light backgrounds (gray-700+ on white, gray-300- on dark)',
    example: '// Before: text-gray-400 on bg-gray-100 (low contrast)\n// After:  text-gray-700 on bg-gray-100 (4.5:1+)',
  },
  'consistency/motion-tokens': {
    description: 'Define motion design tokens as CSS custom properties',
    css: 'Add :root { --duration-fast: 150ms; --ease-out: cubic-bezier(0, 0, 0.2, 1); }',
    jsx: 'Define CSS variables in :root or tailwind.config.js',
    example: ':root {\n  --duration-micro: 100ms;\n  --duration-fast: 150ms;\n  --duration-normal: 250ms;\n  --ease-out: cubic-bezier(0, 0, 0.2, 1);\n}',
  },
  'consistency/single-language': {
    description: 'Reduce number of different easing curves',
    css: 'Standardize on 1-2 easing curves across the page',
    jsx: 'Use consistent ease-out for entrances, ease-in for exits',
    example: '// Pick one: ease-out (entrances), ease-in (exits)\n// Don\'t mix: ease, ease-in, ease-out, ease-in-out, linear, cubic-bezier(...)',
  },
  'consistency/no-generic-cta': {
    description: 'Replace generic blue CTA with brand colors',
    css: 'Change background from #3b82f6 to your brand color',
    jsx: 'Change bg-blue-500 to bg-brand-500 or your brand color class',
    example: '// Before: className="bg-blue-500 text-white"\n// After:  className="bg-brand-600 text-white"',
  },
  'consistency/no-card-grid-hero': {
    description: 'Replace card grid in hero with full-bleed imagery',
    css: 'N/A - requires layout change',
    jsx: 'Use a full-bleed hero image with brand-first hierarchy instead of card grid',
    example: '// Before: <div className="grid grid-cols-3"><Card/>...</div> in hero\n// After:  <section className="relative h-screen"><img className="absolute inset-0" .../></section>',
  },
  'perf/layout-thrash': {
    description: 'Batch DOM reads before writes to avoid layout thrashing',
    css: 'N/A - requires JS change',
    jsx: 'Read all DOM measurements first, then write all changes',
    example: '// Before: el.style.width = el.offsetWidth + 10 + "px"; // read+write interleaved\n// After:  const w = el.offsetWidth; el.style.width = w + 10 + "px"; // batched',
  },
  'perf/compositor-only': {
    description: 'Use transform/opacity for compositor-only animations',
    css: 'Replace width/height/top/left animations with transform: translate/scale',
    jsx: 'Use transform and opacity instead of width, height, top, left, margin',
    example: '// Before: transition: width 300ms\n// After:  transition: transform 300ms; transform: scaleX(var(--scale))',
  },
};

export function getFixSuggestion(ruleId) {
  return FIX_SUGGESTIONS[ruleId] || null;
}

export function getAllFixSuggestions() {
  return FIX_SUGGESTIONS;
}
