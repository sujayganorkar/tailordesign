// src/rules/index.js - Rule implementations

import { checkContrast } from '../parsers/color.js';
import { getRuleKind } from '../config.js';
import { isExperimental } from '../experimental.js';
import { isKnownLibrary } from '../primitives/registry.js';
import { isMobileOnly } from '../platform.js';

export function runRules(parsed, allFiles) {
  const issues = [];

  const projectFiles = Array.isArray(allFiles) ? allFiles : [];
  const otherFileHasReducedMotion = projectFiles.some(f => f && f !== parsed && f.hasReducedMotion);

  // Build a component capability index from the project (Phase 3).
  const componentIndex = new Map();
  for (const f of projectFiles) {
    if (!f || !f.filePath) continue;
    const key = String(f.filePath).split('/').pop().replace(/\.(jsx|tsx|js|ts|dart)$/, '');
    componentIndex.set(key, {
      hasInteractiveElements: Array.isArray(f.interactiveElements) && f.interactiveElements.length > 0,
    });
  }
  // Suppress hover/focus only when the file delegates to an interactive component
  // (a local component that itself contains interactive elements, or a known
  // headless library). This avoids muting real errors in files that merely
  // import utilities.
  const importsInteractiveComponent = Array.isArray(parsed.imports) && parsed.imports.some(src => {
    if (typeof src !== 'string') return false;
    if (isKnownLibrary(src)) return true;
    const key = src.split('/').pop().replace(/\.(jsx|tsx|js|ts)$/, '');
    const cap = componentIndex.get(key);
    return !!(cap && cap.hasInteractiveElements);
  });
  const delegatesInteractionStates = importsInteractiveComponent;

  // --- MOTION & INTERACTION RULES (JSX/HTML only - CSS and Dart have their own blocks below) ---
  // Sources: web.dev (layout thrashing), MDN (prefers-reduced-motion), Material Design (duration, easing, stagger)
  if (parsed.type !== 'css' && parsed.type !== 'dart') {
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

    if (parsed.animations && parsed.animations.length > 0 && !parsed.hasReducedMotion && !otherFileHasReducedMotion) {
      issues.push({ rule: 'motion/reduced-motion', severity: 'error', message: 'Animations found but no prefers-reduced-motion handling.', file: parsed.filePath });
    }

    // Only suggest stagger for lists/grids with multiple items, not single components with transition utilities
    const isListContext = /\.map\(|grid-cols|<ul|<ol|<li/i.test(parsed._content || '');
    if (isListContext && parsed.animations && parsed.animations.length > 3) {
      const hasStagger = /stagger|animation-delay|delay.*\d/i.test(parsed._content || '');
      if (!hasStagger) {
        issues.push({ rule: 'motion/stagger-interval', severity: 'info', message: 'Multiple animations but no stagger pattern. Consider 20-40ms stagger for rhythm.', file: parsed.filePath });
      }
    }

    // Suppress hover/focus findings for files that delegate to imported components:
    // their states are defined in the component implementation, not inline here.
    const suppressInteractionStates = delegatesInteractionStates;
    const lackingHover = (parsed.interactiveElements || []).filter(e => !e.hasHover).length;
    const lackingFocus = (parsed.interactiveElements || []).filter(e => !e.hasFocusVisible).length;
    if (lackingHover > 0 && !suppressInteractionStates) {
      issues.push({ rule: 'interaction/hover-state', severity: 'error', message: `Found ${lackingHover} interactive element(s) without a hover state.`, file: parsed.filePath });
    }

    if (lackingFocus > 0 && !suppressInteractionStates) {
      issues.push({ rule: 'interaction/focus-visible', severity: 'error', message: `Found ${lackingFocus} interactive element(s) without a focus-visible state.`, file: parsed.filePath });
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

    if (parsed.hasModal && !parsed.hasFocusManagement && !parsed.hasPrimitiveModal) {
      issues.push({ rule: 'a11y/focus-management', severity: 'error', message: 'Modal/dialog/drawer but no focus management (focus-trap).', file: parsed.filePath });
    }

    if (parsed.hasModal && !parsed.hasAriaLive && !parsed.hasPrimitiveModal) {
      issues.push({ rule: 'a11y/aria-dynamic', severity: 'warning', message: 'Modal/dialog but no ARIA attributes.', file: parsed.filePath });
    }

    if (parsed.interactiveElements && parsed.interactiveElements.length > 3) {
      const hasTouchTargets = /min-h-\[4[4-9]px\]|min-w-\[4[4-9]px\]|min-h-11|min-w-11/i.test(parsed._content || '');
      if (!hasTouchTargets) {
        issues.push({ rule: 'a11y/touch-targets', severity: 'info', message: 'No explicit touch target sizing (min 44×44px).', file: parsed.filePath });
      }
    }

    // a11y/contrast - experimental, shallow static check. Enable with --experimental.
    if (isExperimental()) {
      try {
        const contrastIssues = checkContrast(parsed._content || '');
        if (contrastIssues.length > 0) {
          issues.push({ rule: 'a11y/contrast', severity: 'warning', message: `Potential contrast issues (${contrastIssues.length}): ${contrastIssues.slice(0, 2).map(c => 'ratio ' + c.ratio).join(', ')}. WCAG AA requires 4.5:1. (experimental)`, file: parsed.filePath });
        }
      } catch (e) { /* color parser not available */ }
    }

    if (parsed.hasNav && !parsed.hasActiveRoute) {
      issues.push({ rule: 'interaction/active-route', severity: 'info', message: 'Navigation but no active route indication.', file: parsed.filePath });
    }

    if (parsed.genericCTA) {
      issues.push({ rule: 'consistency/no-generic-cta', severity: 'info', message: 'Generic blue CTA detected. Use brand colors.', file: parsed.filePath });
    }

    if (parsed.cardGridHero) {
      issues.push({ rule: 'consistency/no-card-grid-hero', severity: 'info', message: 'Card grid in hero. Use full-bleed imagery.', file: parsed.filePath });
    }

    // perf/layout-thrash - only when a read and write occur in the same function scope
    if (parsed.layoutThrash) {
      issues.push({ rule: 'perf/layout-thrash', severity: 'info', message: 'Potential layout thrashing: DOM reads and writes in same function. Batch reads before writes.', file: parsed.filePath });
    }

    const hasInlineMotion = /style\s*=\s*\{\{[^}]*transition\s*:|animation\s*:|transform\s*:/i.test(parsed._content || '') || /animate=|variants=|whileHover|whileTap/i.test(parsed._content || '');
    if (hasInlineMotion && parsed.animations && parsed.animations.length > 0 && !parsed.motionTokens) {
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
    if (parsed.animations && parsed.animations.length > 0 && !parsed.hasReducedMotion && !otherFileHasReducedMotion) {
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
    // Only require hover/focus-visible in CSS files that look like component stylesheets
    const looksLikeComponentCss = /\b(button|input|textarea|select)\s*[,{]|\ba\s*\{|\.btn\b/i.test(parsed._content || '');
    if (looksLikeComponentCss && !parsed.hasHover) {
      issues.push({ rule: 'interaction/hover-state', severity: 'warning', message: 'No :hover styles in CSS.', file: parsed.filePath });
    }
    if (looksLikeComponentCss && !parsed.hasFocusVisible) {
      issues.push({ rule: 'interaction/focus-visible', severity: 'warning', message: 'No :focus-visible styles in CSS.', file: parsed.filePath });
    }
    if (looksLikeComponentCss && parsed.animations && parsed.animations.length > 0 && !parsed.hasMotionTokens) {
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
    if (parsed.hasAnimations && !parsed.hasReducedMotion && !otherFileHasReducedMotion) {
      issues.push({ rule: 'motion/reduced-motion', severity: 'error', message: 'Flutter animations but no reduced motion handling.', file: parsed.filePath });
    }
    const isMobileDart = isMobileOnly(parsed._content || '');
    if (!isMobileDart && parsed.interactiveElements && parsed.interactiveElements.length > 0 && !parsed.hasHover) {
      issues.push({ rule: 'interaction/hover-state', severity: 'warning', message: `Flutter has ${parsed.interactiveElements.length} interactive widget(s) but no hover handling.`, file: parsed.filePath });
    }
    if (!isMobileDart && parsed.interactiveElements && parsed.interactiveElements.length > 0 && !parsed.hasFocus) {
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
    if (parsed.hasAnimations && !parsed.hasMotionTokens && /duration\s*:\s*Duration|Curve\./i.test(parsed._content || '')) {
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
