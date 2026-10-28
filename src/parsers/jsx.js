// src/parsers/jsx.js — Parse JSX/TSX files for UI patterns

export function parseJSX(content, filePath) {
  content = content == null ? '' : String(content);
  const result = {
    filePath,
    type: 'jsx',
    interactiveElements: [],
    hasHover: false,
    hasFocusVisible: false,
    hasReducedMotion: false,
    hasLoadingState: false,
    hasEmptyState: false,
    hasErrorState: false,
    hasFocusManagement: false,
    hasAriaLive: false,
    animations: [],
    durations: [],
    easings: [],
    motionTokens: false,
    hasOnClickDiv: false,
    hasModal: false,
    hasForm: false,
    hasNav: false,
    hasActiveRoute: false,
    layoutAnimations: [],
    genericCTA: false,
    cardGridHero: false,
    imports: [],
  };

  // Detect imports
  const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    result.imports.push(match[1]);
  }

  // Detect interactive elements with their states
  // Buttons
  const buttonRegex = /<button[^>]*>/gi;
  const buttons = content.match(buttonRegex) || [];
  result.interactiveElements.push(...buttons.map(b => ({ type: 'button', raw: b })));

  // Links
  const linkRegex = /<a[^>]*>/gi;
  const links = content.match(linkRegex) || [];
  result.interactiveElements.push(...links.map(l => ({ type: 'a', raw: l })));

  // Inputs
  const inputRegex = /<input[^>]*>/gi;
  const inputs = content.match(inputRegex) || [];
  result.interactiveElements.push(...inputs.map(i => ({ type: 'input', raw: i })));

  // Detect onClick on non-interactive elements (div, span, etc.)
  const onClickDivRegex = /<(div|span|p|section|article)[^>]*onClick[^>]*>/gi;
  if (onClickDivRegex.test(content)) {
    result.hasOnClickDiv = true;
  }

  // Detect hover states
  if (/hover:|:hover|onMouseEnter|onMouseOver/i.test(content)) {
    result.hasHover = true;
  }

  // Detect focus-visible
  if (/focus-visible:|focus:|:focus-visible|:focus\b/i.test(content)) {
    result.hasFocusVisible = true;
  }

  // Detect reduced motion
  if (/prefers-reduced-motion|useReducedMotion|reducedMotion/i.test(content)) {
    result.hasReducedMotion = true;
  }

  // Detect loading states
  if (/loading|isLoading|isPending|fetching|skeleton|spinner|Skeleton|Spinner/i.test(content)) {
    result.hasLoadingState = true;
  }

  // Detect empty states
  if (/empty|isEmpty|noData|noResults|NoData|EmptyState|no .* found|nothing to show/i.test(content)) {
    result.hasEmptyState = true;
  }

  // Detect error states
  if (/error|isError|hasError|ErrorState|errorBoundary/i.test(content)) {
    result.hasErrorState = true;
  }

  // Detect focus management (modals/drawers)
  if (/focus-trap|FocusTrap|trapFocus|useFocusTrap|focusTrap/i.test(content)) {
    result.hasFocusManagement = true;
  }
  // Detect modal/dialog
  if (/modal|dialog|drawer|Drawer|Modal|Dialog/i.test(content)) {
    result.hasModal = true;
  }

  // Detect ARIA live regions
  if (/aria-live|aria-expanded|aria-controls|role="dialog"|role="alert"/i.test(content)) {
    result.hasAriaLive = true;
  }

  // Detect forms
  if (/<form|onSubmit|handleSubmit/i.test(content)) {
    result.hasForm = true;
  }

  // Detect nav
  if (/<nav|<Nav|navigation|Navigation/i.test(content)) {
    result.hasNav = true;
  }

  // Detect active route
  if (/isActive|activeRoute|activePath|useLocation|usePathname|aria-current/i.test(content)) {
    result.hasActiveRoute = true;
  }

  // Detect animations (CSS-in-JS, Tailwind, Framer Motion, GSAP)
  // Tailwind animation classes
  const tailwindAnimRegex = /(?:animate-|transition-|duration-|ease-|delay-)[a-z0-9-]+/gi;
  const twAnims = content.match(tailwindAnimRegex) || [];
  result.animations.push(...twAnims);

  // Framer Motion
  const framerRegex = /(?:motion\.\w+|animate=|initial=|exit=|whileHover|whileTap|whileInView|variants=)/gi;
  const framerAnims = content.match(framerRegex) || [];
  result.animations.push(...framerAnims);

  // CSS transition/animation in style objects
  const cssAnimRegex = /(?:transition|animation|transform)\s*[:=]/gi;
  const cssAnims = content.match(cssAnimRegex) || [];
  result.animations.push(...cssAnims);

  // Detect durations
  const durationRegex = /duration[-:]?\s*(\d+(?:\.\d+)?)\s*(ms|s)?/gi;
  let durMatch;
  while ((durMatch = durationRegex.exec(content)) !== null) {
    let val = parseFloat(durMatch[1]);
    if (durMatch[2] === 's') val *= 1000;
    result.durations.push(val);
  }
  // Tailwind duration classes
  const twDurRegex = /duration-(\d+)/g;
  let twDurMatch;
  while ((twDurMatch = twDurRegex.exec(content)) !== null) {
    result.durations.push(parseInt(twDurMatch[1]));
  }

  // Detect easings
  const easingRegex = /ease[-:]?\s*[-a-z]+|cubic-bezier\([^)]+\)/gi;
  const easings = content.match(easingRegex) || [];
  result.easings.push(...easings);

  // Detect motion tokens
  if (/--duration|--ease|--motion/.test(content)) {
    result.motionTokens = true;
  }

  // Detect layout animations (animating width/height/top/margin/etc.)
  // Tailwind: transition-all is dangerous (animates all properties including layout)
  const twTransitionAll = content.match(/transition-all/g) || [];
  result.layoutAnimations.push(...twTransitionAll.map(() => 'transition-all (Tailwind)'));

  // Style objects: transition/animation with layout properties on the same line
  const styleAnimRegex = /(?:transition|animation)\s*[:=]\s*['"][^'"]*(?:width|height|top|left|right|bottom|margin|padding)[^'"]*['"]/gi;
  const styleAnims = content.match(styleAnimRegex) || [];
  result.layoutAnimations.push(...styleAnims);

  // Framer Motion: animate={{ width: ..., height: ... }}
  const framerLayoutRegex = /animate\s*=\s*\{\{\s*[^}]*?(?:width|height)\s*:/gi;
  const framerLayout = content.match(framerLayoutRegex) || [];
  result.layoutAnimations.push(...framerLayout);

  // Detect generic blue CTA
  for (const pattern of [
    /bg-blue-500|bg-blue-600|bg-indigo-500|bg-indigo-600/,
    /background:\s*#3b82f6|#4f46e5|#2563eb/,
  ]) {
    if (pattern.test(content)) {
      result.genericCTA = true;
      break;
    }
  }

  // Detect card grid in hero
  if (/hero/i.test(content) && /grid.*card|card.*grid|grid-cols.*card/i.test(content)) {
    result.cardGridHero = true;
  }

  return result;
}
