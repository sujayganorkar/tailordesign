// src/adapters/web.js — Web adapter (React, Vue, Svelte, HTML, CSS, Tailwind)
import { BaseAdapter, createUniversalComponent } from './base.js';
import { parseJSX } from '../parsers/jsx.js';
import { parseCSS } from '../parsers/css.js';

export class WebAdapter extends BaseAdapter {
  constructor() {
    super('web');
    this.fileExtensions = ['.jsx', '.tsx', '.js', '.ts', '.vue', '.svelte', '.html', '.htm', '.css', '.scss', '.less'];
  }

  detect(content, filePath) {
    return this.fileExtensions.some(ext => filePath.endsWith(ext));
  }

  parse(content, filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    let parsed;

    // Skip non-UI files
    if (['css', 'scss', 'less'].includes(ext)) {
      parsed = parseCSS(content, filePath);
      if (!/animation|transition|:hover|:focus/i.test(content)) {
        // Still parse CSS but it's low priority
      }
    } else {
      // Check if it looks like UI code
      if (!/<[A-Z]|className=|<div|<button|<input|<a |styled\.|css`/.test(content)) {
        return null;
      }
      parsed = parseJSX(content, filePath);
      parsed._content = content;
    }

    // Convert to universal model...

    // Convert to universal model
    const component = createUniversalComponent('web-component', {
      framework: this.detectFramework(content),
      filePath,
      hasHover: parsed.hasHover,
      hasFocus: parsed.hasFocusVisible,
      hasDisabled: false,
      hasLoading: parsed.hasLoadingState,
      hasEmpty: parsed.hasEmptyState,
      hasError: parsed.hasErrorState,
      hasReducedMotion: parsed.hasReducedMotion,
      hasSemantics: parsed.hasAriaLive,
      animations: parsed.animations,
      durations: parsed.durations,
      easings: parsed.easings,
      motionTokens: parsed.motionTokens,
      contexts: this.detectContexts(content),
      raw: parsed,
    });

    return { parsed, component, framework: component.framework };
  }

  detectFramework(content) {
    if (/from ['"]react['"]/.test(content) || /import React/.test(content)) return 'react';
    if (/from ['"]vue['"]/.test(content) || /<template>/.test(content)) return 'vue';
    if (/\$:/m.test(content) || /export let/.test(content)) return 'svelte';
    if (/<html|<!DOCTYPE/i.test(content)) return 'html';
    if (/@tailwind|tailwindcss/.test(content)) return 'tailwind';
    return 'web';
  }

  detectContexts(content) {
    const contexts = [];
    if (/scroll|useInView|whileInView|IntersectionObserver/i.test(content)) contexts.push('scroll');
    if (/onClick|onPress|onSubmit/i.test(content)) contexts.push('click');
    if (/onMouseEnter|onHover|hover:/i.test(content)) contexts.push('hover');
    if (/onFocus|focus:/i.test(content)) contexts.push('focus');
    if (/fetch\(|useQuery|useSWR|axios\./i.test(content)) contexts.push('data');
    if (/Link|NavLink|useNavigate|useRouter|href=/i.test(content)) contexts.push('navigation');
    if (/animate|motion\.|transition/i.test(content)) contexts.push('animation');
    return contexts;
  }

  getRules() {
    return []; // Uses default rules
  }
}
