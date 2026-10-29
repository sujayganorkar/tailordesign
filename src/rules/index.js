// src/rules/index.js - Rule implementations

import { checkContrast } from '../parsers/color.js';
import { getRuleKind } from '../config.js';

export function runRules(parsed, allFiles) {
  const issues = [];

  // --- MOTION RULES (JSX/HTML only - CSS has its own block below) ---
  // Sources: web.dev (layout thrashing), MDN (prefers-reduced-motion), Material Design (duration, easing, stagger)
  if (parsed.type !== 'css') {
    if (parsed.layoutAnimations && parsed.layoutAnimations.length > 0) {
      issues.push({ rule: 'motion/no-layout-animation', severity: 'error', message: `Found ${parsed.layoutAnimations.length} animation(s) on layout properties: ${parsed.layoutAnimations.slice(0, 3).join(', ')}. Use transform/opacity instead.`, file: parsed.filePath });
    }

    if (parsed.durations && parsed.durations.length > 0) {
      const outOfRange = parsed.durations.filter(d => d < 50 || d > 500);
      if (outOfRange.length > 0) {
        issues.push({ rule: 'motion/duration-range', severity: 'warning', message: `Found ${outOfRange.length} duration(s) outside 100-500ms: ${outOfRange.slice(0, 5).join(', ')}ms.`, file: parsed.filePath });
      }
    }

    if (parsed.easings && parsed.easings.length > 0) {
      const knownEasings = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'];
      const unknown = parsed.easings.filter(e => {
        const n = e.trim().toLowerCase().replace(/\s+/g, '');
        if (knownEasings.includes(n)) return false;
        if (n.startsWith('cubic-bezier')) return false;
        return true;
      });
      if (unknown.length > 0) {
        issues.push({ rule: 'motion/known-easing', severity: 'info', message: `Unknown easing: ${[...new Set(unknown)].slice(0, 3).join(', ')}. Use ease-out/ease-in/ease-in-out.`, file: parsed.filePath });
      }
    }

    if (parsed.animations && parsed.animations.length > 0 && !parsed.hasReducedMotion) {
      issues.push({ rule: 'motion/reduced-motion', severity: 'error', message: 'Animations found but no prefers-reduced-motion handling.', file: parsed.filePath });
    }

    if (parsed.animations && parsed.animations.length > 3) {
      const hasStagger = /stagger|animation-delay|delay.*\d/i.test(parsed._content || '');
      if (!hasStagger) {
        issues.push({ rule: 'motion/stagger-interval', severity: 'info', message: 'Multiple animations but no stagger pattern. Consider 20-40ms stagger for rhythm.', file: parsed.filePath });
      }
    }

    if (parsed.interactiveElements && parsed.interactiveElements.length > 0 && !parsed.hasHover) {
      issues.push({ rule: 'interaction/hover-state', severity: 'error', message: `Found ${parsed.interactiveElements.length} interactive element(s) but no hover state.`, file: parsed.filePath });
    }

    if (parsed.interactiveElements && parsed.interactiveElements.length > 0 && !parsed.hasFocusVisible) {
      issues.push({ rule: 'interaction/focus-visible', severity: 'error', message: `Found ${parsed.interactiveElements.length} interactive element(s) but no focus-visible state.`, file: parsed.filePath });
    }

    if (parsed.interactiveElements && parsed.interactiveElements.length > 2) {
      const hasDisabled = /disabled|isDisabled|isLoading/i.test(parsed._content || '');
      if (!hasDisabled) {
        issues.push({ rule: 'interaction/disabled-state', severity: 'info', message: 'Interactive elements found but no disabled state handling.', file: parsed.filePath });
      }
    }

    if (parsed.hasOnClickDiv) {
      issues.push({ rule: 'a11y/keyboard-nav', severity: 'error', message: 'onClick on non-interactive element (div/span/p). Use <button> or add role+tabIndex+onKeyDown.', file: parsed.filePath });
    }

    const hasDataFetching = /fetch\(|axios\.|useQuery|useSWR|useMutation/i.test(parsed._content || '');
    if (hasDataFetching && !parsed.hasLoadingState) {
      issues.push({ rule: 'interaction/loading-state', severity: 'warning', message: 'Data fetching but no loading state (skeleton/spinner).', file: parsed.filePath });
    }
    if (hasDataFetching && !parsed.hasEmptyState) {
      issues.push({ rule: 'interaction/empty-state', severity: 'warning', message: 'Data fetching but no empty state.', file: parsed.filePath });
    }
    if (hasDataFetching && !parsed.hasErrorState) {
      issues.push({ rule: 'interaction/error-state', severity: 'warning', message: 'Data fetching but no error state.', file: parsed.filePath });
    }

    if (parsed.hasModal && !parsed.hasFocusManagement) {
      issues.push({ rule: 'a11y/focus-management', severity: 'error', message: 'Modal/dialog/drawer but no focus management (focus-trap).', file: parsed.filePath });
    }

    if (parsed.hasModal && !parsed.hasAriaLive) {
      issues.push({ rule: 'a11y/aria-dynamic', severity: 'warning', message: 'Modal/dialog but no ARIA attributes.', file: parsed.filePath });
    }

    if (parsed.interactiveElements && parsed.interactiveElements.length > 3) {
      const hasTouchTargets = /min-h-\[4[4-9]px\]|min-w-\[4[4-9]px\]|min-h-11|min-w-11/i.test(parsed._content || '');
      if (!hasTouchTargets) {
        issues.push({ rule: 'a11y/touch-targets', severity: 'info', message: 'No explicit touch target sizing (min 44×44px).', file: parsed.filePath });
      }
    }

    // a11y/contrast - check for potential contrast issues
    try {
      const contrastIssues = checkContrast(parsed._content || '');
      if (contrastIssues.length > 0) {
        issues.push({ rule: 'a11y/contrast', severity: 'warning', message: `Potential contrast issues (${contrastIssues.length}): ${contrastIssues.slice(0, 2).map(c => 'ratio ' + c.ratio).join(', ')}. WCAG AA requires 4.5:1.`, file: parsed.filePath });
      }
    } catch (e) { /* color parser not available */ }

    if (parsed.hasNav && !parsed.hasActiveRoute) {
      issues.push({ rule: 'interaction/active-route', severity: 'info', message: 'Navigation but no active route indication.', file: parsed.filePath });
    }

    if (parsed.genericCTA) {
      issues.push({ rule: 'consistency/no-generic-cta', severity: 'info', message: 'Generic blue CTA detected. Use brand colors.', file: parsed.filePath });
    }

    if (parsed.cardGridHero) {
      issues.push({ rule: 'consistency/no-card-grid-hero', severity: 'info', message: 'Card grid in hero. Use full-bleed imagery.', file: parsed.filePath });
    }

    // perf/layout-thrash - check for interleaved DOM reads and writes
    const hasLayoutRead = /offsetWidth|offsetHeight|getBoundingClientRect|clientWidth|clientHeight|scrollTop|scrollLeft/i.test(parsed._content || '');
    const hasLayoutWrite = /\.style\.\w+\s*=|classList\.(add|remove|toggle)|\.innerHTML\s*=/i.test(parsed._content || '');
    if (hasLayoutRead && hasLayoutWrite) {
      issues.push({ rule: 'perf/layout-thrash', severity: 'info', message: 'Potential layout thrashing: DOM reads and writes in same file. Batch reads before writes.', file: parsed.filePath });
    }

    if (parsed.animations && parsed.animations.length > 0 && !parsed.motionTokens) {
      issues.push({ rule: 'consistency/motion-tokens', severity: 'warning', message: 'Animations but no motion design tokens.', file: parsed.filePath });
    }

    if (parsed.easings && parsed.easings.length > 3) {
      const unique = new Set(parsed.easings.map(e => e.trim().toLowerCase()));
      if (unique.size > 3) {
        issues.push({ rule: 'consistency/single-language', severity: 'info', message: `${unique.size} different easing curves. Use 1-2 for consistency.`, file: parsed.filePath });
      }
    }
  }

  // --- CSS RULES ---
  if (parsed.type === 'css') {
    if (parsed.animations && parsed.animations.length > 0 && !parsed.hasReducedMotion) {
      issues.push({ rule: 'motion/reduced-motion', severity: 'error', message: 'CSS animations but no prefers-reduced-motion media query.', file: parsed.filePath });
    }
    if (parsed.layoutAnimations && parsed.layoutAnimations.length > 0) {
      issues.push({ rule: 'motion/no-layout-animation', severity: 'error', message: `CSS animates layout properties: ${parsed.layoutAnimations.slice(0, 3).join(', ')}.`, file: parsed.filePath });
      issues.push({ rule: 'perf/compositor-only', severity: 'info', message: 'CSS animations on layout properties run on main thread. Use transform/opacity for compositor-only.', file: parsed.filePath });
    }
    if (parsed.durations && parsed.durations.length > 0) {
      const outOfRange = parsed.durations.filter(d => d < 50 || d > 500);
      if (outOfRange.length > 0) {
        issues.push({ rule: 'motion/duration-range', severity: 'warning', message: `CSS durations outside 100-500ms: ${outOfRange.slice(0, 5).join(', ')}ms`, file: parsed.filePath });
      }
    }
    if (!parsed.hasHover) {
      issues.push({ rule: 'interaction/hover-state', severity: 'warning', message: 'No :hover styles in CSS.', file: parsed.filePath });
    }
    if (!parsed.hasFocusVisible) {
      issues.push({ rule: 'interaction/focus-visible', severity: 'warning', message: 'No :focus-visible styles in CSS.', file: parsed.filePath });
    }
    if (parsed.animations && parsed.animations.length > 0 && !parsed.hasMotionTokens) {
      issues.push({ rule: 'consistency/motion-tokens', severity: 'warning', message: 'CSS animations but no motion tokens.', file: parsed.filePath });
    }
  }
  if (parsed.type === 'dart') {
    if (parsed.layoutAnimations && parsed.layoutAnimations.length > 0) {
      issues.push({ rule: 'motion/no-layout-animation', severity: 'error', message: `Flutter animates layout properties: ${parsed.layoutAnimations.slice(0, 3).join(', ')}.`, file: parsed.filePath });
    }
    if (parsed.durations && parsed.durations.length > 0) {
      const outOfRange = parsed.durations.filter(d => d < 50 || d > 500);
      if (outOfRange.length > 0) {
        issues.push({ rule: 'motion/duration-range', severity: 'warning', message: `Flutter durations outside 100-500ms: ${outOfRange.slice(0, 5).join(', ')}ms`, file: parsed.filePath });
      }
    }
    if (parsed.hasAnimations && !parsed.hasReducedMotion) {
      issues.push({ rule: 'motion/reduced-motion', severity: 'error', message: 'Flutter animations but no reduced motion handling.', file: parsed.filePath });
    }
    if (parsed.interactiveElements && parsed.interactiveElements.length > 0 && !parsed.hasHover) {
      issues.push({ rule: 'interaction/hover-state', severity: 'warning', message: `Flutter has ${parsed.interactiveElements.length} interactive widget(s) but no hover handling.`, file: parsed.filePath });
    }
    if (parsed.interactiveElements && parsed.interactiveElements.length > 0 && !parsed.hasFocus) {
      issues.push({ rule: 'interaction/focus-visible', severity: 'warning', message: 'Flutter interactive widgets but no focus handling.', file: parsed.filePath });
    }
    const hasDataFetching = /FutureBuilder|StreamBuilder|http\.get|dio\.|supabase/i.test(parsed._content || '');
    if (hasDataFetching && !parsed.hasLoadingState) {
      issues.push({ rule: 'interaction/loading-state', severity: 'warning', message: 'Data fetching but no loading state.', file: parsed.filePath });
    }
    if (hasDataFetching && !parsed.hasEmptyState) {
      issues.push({ rule: 'interaction/empty-state', severity: 'warning', message: 'Data fetching but no empty state.', file: parsed.filePath });
    }
    if (hasDataFetching && !parsed.hasErrorState) {
      issues.push({ rule: 'interaction/error-state', severity: 'warning', message: 'Data fetching but no error state.', file: parsed.filePath });
    }
    if (parsed.hasModal && !parsed.hasFocusManagement) {
      issues.push({ rule: 'a11y/focus-management', severity: 'error', message: 'Dialog/bottom sheet but no focus management.', file: parsed.filePath });
    }
    if (!parsed.hasSemantics && parsed.interactiveElements && parsed.interactiveElements.length > 0) {
      issues.push({ rule: 'a11y/aria-dynamic', severity: 'warning', message: 'Interactive widgets but no Semantics widget.', file: parsed.filePath });
    }
    if (parsed.hasAnimations && !parsed.hasMotionTokens) {
      issues.push({ rule: 'consistency/motion-tokens', severity: 'warning', message: 'Animations but no motion tokens (ThemeData).', file: parsed.filePath });
    }
    if (parsed.genericCTA) {
      issues.push({ rule: 'consistency/no-generic-cta', severity: 'info', message: 'Generic blue CTA (Colors.blue). Use theme colors.', file: parsed.filePath });
    }
    if (parsed.cardGridHero) {
      issues.push({ rule: 'consistency/no-card-grid-hero', severity: 'info', message: 'Card grid in hero. Use full-bleed imagery.', file: parsed.filePath });
    }
  }

  for (const i of issues) { if (!i.kind) i.kind = getRuleKind(i.rule); }
  return issues;
}
