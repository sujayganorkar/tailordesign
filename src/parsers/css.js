// src/parsers/css.js - Parse CSS files for UI patterns

export function parseCSS(content, filePath) {
  content = content == null ? '' : String(content);
  const result = {
    filePath,
    type: 'css',
    hasReducedMotion: false,
    animations: [],
    durations: [],
    easings: [],
    layoutAnimations: [],
    hasMotionTokens: false,
    hasHover: false,
    hasFocusVisible: false,
    contrastIssues: [],
  };

  // Reduced motion
  if (/prefers-reduced-motion/i.test(content)) {
    result.hasReducedMotion = true;
  }

  // Extract @keyframes
  const keyframesRegex = /@keyframes\s+(\w+)\s*\{([^}]+)\}/g;
  let kfMatch;
  while ((kfMatch = keyframesRegex.exec(content)) !== null) {
    result.animations.push(kfMatch[1]);
    const body = kfMatch[2];
    // Check for layout properties in keyframes
    for (const prop of ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'font-size']) {
      if (new RegExp(prop, 'i').test(body)) {
        result.layoutAnimations.push(`${kfMatch[1]}: ${prop}`);
      }
    }
  }

  // Extract transitions
  const transitionRegex = /transition\s*:\s*([^;]+)/gi;
  let tMatch;
  while ((tMatch = transitionRegex.exec(content)) !== null) {
    const val = tMatch[1];
    result.animations.push(`transition: ${val}`);
    // Extract duration
    const durMatch = val.match(/(\d+(?:\.\d+)?)\s*(ms|s)/);
    if (durMatch) {
      let val2 = parseFloat(durMatch[1]);
      if (durMatch[2] === 's') val2 *= 1000;
      if (val2 >= 1) result.durations.push(val2);
    }
    // Check for layout properties
    for (const prop of ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding']) {
      if (val.includes(prop)) {
        result.layoutAnimations.push(`transition: ${prop}`);
      }
    }
  }

  // Extract animation shorthand
  const animRegex = /animation\s*:\s*([^;]+)/gi;
  let aMatch;
  while ((aMatch = animRegex.exec(content)) !== null) {
    result.animations.push(`animation: ${aMatch[1]}`);
    const durMatch = aMatch[1].match(/(\d+(?:\.\d+)?)\s*(ms|s)/);
    if (durMatch) {
      let val = parseFloat(durMatch[1]);
      if (durMatch[2] === 's') val *= 1000;
      if (val >= 1) result.durations.push(val);
    }
  }

  // Extract durations from transition-duration / animation-duration
  const durPropRegex = /(?:transition|animation)-duration\s*:\s*(\d+(?:\.\d+)?)\s*(ms|s)/gi;
  let dpMatch;
  while ((dpMatch = durPropRegex.exec(content)) !== null) {
    let val = parseFloat(dpMatch[1]);
    if (dpMatch[2] === 's') val *= 1000;
    if (val >= 1) result.durations.push(val);
  }

  // Extract easings
  const easingRegex = /(?:transition|animation)-timing-function\s*:\s*([^;]+)/gi;
  let eMatch;
  while ((eMatch = easingRegex.exec(content)) !== null) {
    result.easings.push(eMatch[1].trim());
  }
  // Also from transition shorthand
  const bezierRegex = /cubic-bezier\([^)]+\)/g;
  const beziers = content.match(bezierRegex) || [];
  result.easings.push(...beziers);

  // Motion tokens
  if (/--duration|--ease|--motion/.test(content)) {
    result.hasMotionTokens = true;
  }

  // Hover states
  if (/:hover/.test(content)) {
    result.hasHover = true;
  }

  // Focus-visible
  if (/:focus-visible|:focus\b/.test(content)) {
    result.hasFocusVisible = true;
  }

  return result;
}
