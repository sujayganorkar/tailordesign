// src/decisions/humanize.js — Translate technical decisions into human-readable language

// Human-readable descriptions for each component type
export const COMPONENT_DESCRIPTIONS = {
  'button': 'A clickable button (like "Submit" or "Buy now")',
  'button-primary': 'The main action button on the page (like "Get started" or "Sign up")',
  'button-destructive': 'A dangerous action button (like "Delete account" or "Remove")',
  'card': 'A content card (like a product tile or blog post preview)',
  'card-clickable': 'A clickable card that takes you somewhere when clicked',
  'modal': 'A popup dialog (like "Are you sure?" or "Edit profile")',
  'drawer': 'A slide-in panel (like a mobile menu or settings panel)',
  'accordion': 'An expandable section (like FAQ items that open/close)',
  'form': 'A form with inputs (like a signup or contact form)',
  'input': 'A text input field',
  'list': 'A list of items (like search results or notifications)',
  'data-view': 'A section that loads data from a server',
  'image': 'An image on the page',
  'link': 'A clickable text link',
  'nav': 'Navigation bar or menu',
  'tab-bar': 'Tab navigation (like "Overview / Details / Reviews")',
  'tooltip': 'A small popup on hover (like a hint or explanation)',
  'loading': 'A loading indicator (spinner or skeleton)',
  'unknown-interactive': 'An element that is clickable but not a standard button',
};

// Human-readable descriptions for each state
export const STATE_DESCRIPTIONS = {
  'hover': 'Changes appearance when the mouse is over it (signals "you can click this")',
  'focus-visible': 'Shows a visible outline when navigating with keyboard (accessibility)',
  'active': 'Changes appearance when being clicked (confirms the click registered)',
  'disabled': 'Looks grayed out when the action is not available',
  'loading': 'Shows a spinner or skeleton while data is loading',
  'empty': 'Shows a friendly message when there is no data',
  'error': 'Shows an error message with a retry option when something fails',
  'open': 'The popup/panel is visible',
  'close': 'The popup/panel is hidden',
  'backdrop': 'A dark overlay behind the popup',
  'expanded': 'The section is open and showing content',
  'collapsed': 'The section is closed and hiding content',
  'idle': 'The form is waiting for input',
  'submitting': 'The form is being submitted (button shows spinner)',
  'success': 'The form was submitted successfully (shows checkmark)',
  'validation': 'Shows error messages under invalid fields',
  'loaded': 'The image has finished loading',
  'visible': 'The tooltip/popup is showing',
  'hidden': 'The tooltip/popup is hidden',
  'selected': 'The item is selected (highlighted)',
  'active-route': 'Shows which page/section the user is currently on',
};

// Human-readable descriptions for each motion type
export const MOTION_DESCRIPTIONS = {
  'entrance': 'Appears on screen with a fade and slight upward movement',
  'hover': 'Subtle movement when the mouse hovers over it',
  'press': 'Slightly shrinks when clicked (like a real button being pressed)',
  'loading': 'Shows a pulsing or spinning animation while waiting',
  'exit': 'Fades out when closing',
  'slide': 'Slides in from the edge of the screen',
  'stagger': 'Items appear one after another (like a wave)',
};

// Consequence level descriptions
export const CONSEQUENCE_DESCRIPTIONS = {
  'instant-reversible': 'Quick, reversible action (like toggling a switch)',
  'navigation': 'Takes the user to another page or section',
  'structural': 'Opens or closes part of the interface (modal, drawer, accordion)',
  'data-mutation': 'Changes data (submitting a form, saving, deleting)',
  'destructive': 'Irreversible action (deleting an account, removing data)',
  'passive-consumption': 'User is just reading or browsing (no action needed)',
  'unknown': 'Could not determine the purpose of this component',
};

// Translate a technical motion string to human-readable
export function humanizeMotion(motionStr) {
  // Extract duration
  const durMatch = motionStr.match(/(\d+)(?:-(\d+))?\s*ms/);
  const duration = durMatch ? durMatch[1] : null;
  const durationMax = durMatch && durMatch[2] ? durMatch[2] : null;

  // Determine motion type
  let type = 'movement';
  if (/entrance|fade-in|reveal/i.test(motionStr)) type = 'entrance';
  else if (/hover/i.test(motionStr)) type = 'hover';
  else if (/press|scale.*press/i.test(motionStr)) type = 'press';
  else if (/loading|spinner|skeleton/i.test(motionStr)) type = 'loading';
  else if (/exit/i.test(motionStr)) type = 'exit';
  else if (/slide/i.test(motionStr)) type = 'slide';
  else if (/stagger/i.test(motionStr)) type = 'stagger';

  // Build human description
  let desc = MOTION_DESCRIPTIONS[type] || motionStr;

  // Add duration context
  if (duration) {
    const ms = parseInt(duration);
    let speed = 'normal speed';
    if (ms <= 100) speed = 'very fast (instant feel)';
    else if (ms <= 200) speed = 'fast';
    else if (ms <= 350) speed = 'normal speed';
    else speed = 'slow (deliberate)';
    desc += ` — ${speed} (${duration}${durationMax ? '-' + durationMax : ''}ms)`;
  }

  return desc;
}

// Translate a technical state to human-readable
export function humanizeState(state) {
  return STATE_DESCRIPTIONS[state] || state;
}

// Translate a component type to human-readable
export function humanizeComponent(type) {
  return COMPONENT_DESCRIPTIONS[type] || type;
}

// Translate consequence level
export function humanizeConsequence(consequence) {
  return CONSEQUENCE_DESCRIPTIONS[consequence] || consequence;
}

// Generate a full human-readable decision summary
export function humanizeDecision(decision) {
  const component = humanizeComponent(decision.component);
  const consequence = humanizeConsequence(decision.consequence);

  const states = decision.requiredStates.map(s => ({
    technical: s,
    human: humanizeState(s),
  }));

  const motions = decision.recommendedMotion.map(m => ({
    technical: m,
    human: humanizeMotion(m),
  }));

  return {
    component: decision.component,
    componentDescription: component,
    consequence: decision.consequence,
    consequenceDescription: consequence,
    states,
    motions,
    antiPatterns: decision.antiPatterns,
    contexts: decision.contexts,
  };
}

// Format a human-readable decision report
export function formatHumanDecisionReport(decisions) {
  const lines = [];

  lines.push('');
  lines.push('━'.repeat(70));
  lines.push('  Interaction Decision Report (Human-Readable)');
  lines.push('━'.repeat(70));
  lines.push('');

  // Group by file
  const byFile = {};
  for (const d of decisions) {
    if (!byFile[d.file]) byFile[d.file] = [];
    byFile[d.file].push(d);
  }

  for (const [file, fileDecisions] of Object.entries(byFile)) {
    lines.push(`  📄 ${file.split('/').pop()}`);
    lines.push('');

    for (const d of fileDecisions) {
      const hd = humanizeDecision(d);
      lines.push(`  ┌─ ${hd.componentDescription}`);
      lines.push(`  │  Purpose: ${hd.consequenceDescription}`);
      lines.push(`  │`);

      if (hd.states.length > 0) {
        lines.push(`  │  What it needs to do:`);
        for (const s of hd.states) {
          lines.push(`  │    • ${s.human}`);
        }
      } else {
        lines.push(`  │  What it needs to do: (nothing interactive — passive content)`);
      }

      lines.push(`  │`);

      if (hd.motions.length > 0) {
        lines.push(`  │  How it should move:`);
        for (const m of hd.motions) {
          lines.push(`  │    → ${m.human}`);
        }
      } else {
        lines.push(`  │  How it should move: (keep it static — no animation needed)`);
      }

      if (hd.antiPatterns.length > 0) {
        lines.push(`  │`);
        lines.push(`  │  What to avoid:`);
        for (const a of hd.antiPatterns) {
          lines.push(`  │    ✗ ${a}`);
        }
      }

      lines.push(`  └─`);
      lines.push('');
    }
  }

  // Summary in plain English
  const totalComponents = decisions.reduce((sum, d) => sum + d.count, 0);
  const componentTypes = new Set(decisions.map(d => d.component));

  lines.push('━'.repeat(70));
  lines.push(`  Summary: ${totalComponents} interactive elements across ${componentTypes.size} types`);
  lines.push('');
  lines.push('  In plain English:');
  lines.push(`  - ${decisions.filter(d => d.requiredStates.includes('hover')).length} element(s) need hover feedback`);
  lines.push(`  - ${decisions.filter(d => d.requiredStates.includes('focus-visible')).length} element(s) need keyboard focus indicators`);
  lines.push(`  - ${decisions.filter(d => d.requiredStates.includes('loading')).length} element(s) need loading states`);
  lines.push(`  - ${decisions.filter(d => d.requiredStates.includes('empty')).length} element(s) need empty states`);
  lines.push(`  - ${decisions.filter(d => d.requiredStates.includes('error')).length} element(s) need error states`);
  lines.push(`  - ${decisions.filter(d => d.recommendedMotion.length > 0).length} element(s) should have animations`);
  lines.push(`  - ${decisions.filter(d => d.recommendedMotion.length === 0).length} element(s) should stay static`);
  lines.push('━'.repeat(70));
  lines.push('');

  return lines.join('\n');
}
