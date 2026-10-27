// src/rules/index.js — Rule implementations

import { LAYOUT_PROPERTIES, DURATION_RANGES, GENERIC_CTA_PATTERNS } from '../config.js';

export function runRules(parsed, allFiles) {
  const issues = [];

  // --- MOTION RULES (JSX/HTML only — CSS has its own block below) ---
  if (parsed.type !== 'css') {
    if (parsed.layoutAnimations && parsed.layoutAnimations.length > 0) {
      issues.push({
        rule: 'motion/no-layout-animation',
        severity: 'error',
        message: `Found ${parsed.layoutAnimations.length} animation(s) on layout properties: ${parsed.layoutAnimations.slice(0, 3).join(', ')}. Use transform/opacity instead.`,
        file: parsed.filePath,
      });
    }

    if (parsed.durations && parsed.durations.length > 0) {
      const outOfRange = parsed.durations.filter(d => d < 50 || d > 500);
      if (outOfRange.length > 0) {
        issues.push({
          rule: 'motion/duration-range',
          severity: 'warning',
          message: `Found ${outOfRange.length} duration(s) outside 100-500ms range: ${outOfRange.slice(0, 5).join(', ')}ms. Micro: 100-150ms, transitions: 150-300ms, complex: 250-500ms.`,
          file: parsed.filePath,
        });
      }
    }

    if (parsed.animations && parsed.animations.length > 0 && !parsed.hasReducedMotion) {
      issues.push({
        rule: 'motion/reduced-motion',
        severity: 'error',
        message: 'Animations found but no prefers-reduced-motion handling. Add @media (prefers-reduced-motion: reduce) or useReducedMotion hook.',
        file: parsed.filePath,
      });
    }
  }

  // --- INTERACTION RULES (JSX only) ---
  if (parsed.type === 'jsx' || parsed.type === 'html') {
    if (parsed.interactiveElements && parsed.interactiveElements.length > 0 && !parsed.hasHover) {
      issues.push({
        rule: 'interaction/hover-state',
        severity: 'error',
        message: `Found ${parsed.interactiveElements.length} interactive element(s) but no hover state detected. Add hover: or :hover styles.`,
        file: parsed.filePath,
      });
    }

    if (parsed.interactiveElements && parsed.interactiveElements.length > 0 && !parsed.hasFocusVisible) {
      issues.push({
        rule: 'interaction/focus-visible',
        severity: 'error',
        message: `Found ${parsed.interactiveElements.length} interactive element(s) but no focus-visible state. Add focus-visible: or :focus-visible styles.`,
        file: parsed.filePath,
      });
    }

    if (parsed.hasOnClickDiv) {
      issues.push({
        rule: 'a11y/keyboard-nav',
        severity: 'error',
        message: 'onClick handler on non-interactive element (div/span/p). Use <button> or add role="button" + tabIndex + onKeyDown.',
        file: parsed.filePath,
      });
    }

    const hasDataFetching = /fetch\(|axios\.|useQuery|useSWR|useMutation/i.test(parsed._content || '');
    if (hasDataFetching && !parsed.hasLoadingState) {
      issues.push({
        rule: 'interaction/loading-state',
        severity: 'warning',
        message: 'Data fetching detected but no loading state (skeleton/spinner). Add loading UI.',
        file: parsed.filePath,
      });
    }

    if (hasDataFetching && !parsed.hasEmptyState) {
      issues.push({
        rule: 'interaction/empty-state',
        severity: 'warning',
        message: 'Data fetching detected but no empty state. Add UI for when data is empty.',
        file: parsed.filePath,
      });
    }

    if (hasDataFetching && !parsed.hasErrorState) {
      issues.push({
        rule: 'interaction/error-state',
        severity: 'warning',
        message: 'Data fetching detected but no error state. Add UI for failed requests.',
        file: parsed.filePath,
      });
    }

    if (parsed.hasModal && !parsed.hasFocusManagement) {
      issues.push({
        rule: 'a11y/focus-management',
        severity: 'error',
        message: 'Modal/dialog/drawer detected but no focus management (focus-trap). Add focus trapping and focus restoration.',
        file: parsed.filePath,
      });
    }

    if (parsed.hasModal && !parsed.hasAriaLive) {
      issues.push({
        rule: 'a11y/aria-dynamic',
        severity: 'warning',
        message: 'Modal/dialog detected but no ARIA attributes (aria-live, aria-expanded, role="dialog"). Add for screen readers.',
        file: parsed.filePath,
      });
    }

    if (parsed.hasNav && !parsed.hasActiveRoute) {
      issues.push({
        rule: 'interaction/active-route',
        severity: 'info',
        message: 'Navigation detected but no active route indication. Add aria-current or active styling.',
        file: parsed.filePath,
      });
    }

    if (parsed.genericCTA) {
      issues.push({
        rule: 'consistency/no-generic-cta',
        severity: 'info',
        message: 'Generic blue CTA button detected (AI slop signature). Use brand colors instead.',
        file: parsed.filePath,
      });
    }

    if (parsed.cardGridHero) {
      issues.push({
        rule: 'consistency/no-card-grid-hero',
        severity: 'info',
        message: 'Card grid in hero section detected. Use full-bleed imagery and brand-first hierarchy instead.',
        file: parsed.filePath,
      });
    }

    if (parsed.animations && parsed.animations.length > 0 && !parsed.motionTokens) {
      issues.push({
        rule: 'consistency/motion-tokens',
        severity: 'warning',
        message: 'Animations found but no motion design tokens (--duration-*, --ease-*). Define motion tokens for consistency.',
        file: parsed.filePath,
      });
    }
  }

  // --- CSS RULES ---
  if (parsed.type === 'css') {
    if (parsed.animations && parsed.animations.length > 0 && !parsed.hasReducedMotion) {
      issues.push({
        rule: 'motion/reduced-motion',
        severity: 'error',
        message: 'CSS animations found but no prefers-reduced-motion media query.',
        file: parsed.filePath,
      });
    }

    if (parsed.layoutAnimations && parsed.layoutAnimations.length > 0) {
      issues.push({
        rule: 'motion/no-layout-animation',
        severity: 'error',
        message: `CSS animates layout properties: ${parsed.layoutAnimations.slice(0, 3).join(', ')}. Use transform/opacity.`,
        file: parsed.filePath,
      });
    }

    if (parsed.durations && parsed.durations.length > 0) {
      const outOfRange = parsed.durations.filter(d => d < 50 || d > 500);
      if (outOfRange.length > 0) {
        issues.push({
          rule: 'motion/duration-range',
          severity: 'warning',
          message: `CSS durations outside 100-500ms: ${outOfRange.slice(0, 5).join(', ')}ms`,
          file: parsed.filePath,
        });
      }
    }

    if (!parsed.hasHover) {
      issues.push({
        rule: 'interaction/hover-state',
        severity: 'warning',
        message: 'No :hover styles found in CSS. Interactive elements need hover states.',
        file: parsed.filePath,
      });
    }

    if (!parsed.hasFocusVisible) {
      issues.push({
        rule: 'interaction/focus-visible',
        severity: 'warning',
        message: 'No :focus-visible styles found in CSS. Add focus indicators for keyboard navigation.',
        file: parsed.filePath,
      });
    }

    if (parsed.animations && parsed.animations.length > 0 && !parsed.hasMotionTokens) {
      issues.push({
        rule: 'consistency/motion-tokens',
        severity: 'warning',
        message: 'CSS animations found but no motion tokens (--duration-*, --ease-*). Define for consistency.',
        file: parsed.filePath,
      });
    }
  }

  // --- DART/FLUTTER RULES ---
  if (parsed.type === 'dart') {
    // Motion
    if (parsed.layoutAnimations && parsed.layoutAnimations.length > 0) {
      issues.push({
        rule: 'motion/no-layout-animation',
        severity: 'error',
        message: `Flutter animates layout properties: ${parsed.layoutAnimations.slice(0, 3).join(', ')}. Use Transform/Opacity instead of width/height.`,
        file: parsed.filePath,
      });
    }

    if (parsed.durations && parsed.durations.length > 0) {
      const outOfRange = parsed.durations.filter(d => d < 50 || d > 500);
      if (outOfRange.length > 0) {
        issues.push({
          rule: 'motion/duration-range',
          severity: 'warning',
          message: `Flutter durations outside 100-500ms: ${outOfRange.slice(0, 5).join(', ')}ms`,
          file: parsed.filePath,
        });
      }
    }

    if (parsed.hasAnimations && !parsed.hasReducedMotion) {
      issues.push({
        rule: 'motion/reduced-motion',
        severity: 'error',
        message: 'Flutter animations found but no reduced motion handling. Check MediaQuery.disableAnimations or Semantics.',
        file: parsed.filePath,
      });
    }

    // Interaction
    if (parsed.interactiveElements && parsed.interactiveElements.length > 0 && !parsed.hasHover) {
      issues.push({
        rule: 'interaction/hover-state',
        severity: 'warning',
        message: `Flutter has ${parsed.interactiveElements.length} interactive widget(s) but no hover handling (onHover/MouseRegion).`,
        file: parsed.filePath,
      });
    }

    if (parsed.interactiveElements && parsed.interactiveElements.length > 0 && !parsed.hasFocus) {
      issues.push({
        rule: 'interaction/focus-visible',
        severity: 'warning',
        message: `Flutter has interactive widget(s) but no focus handling (Focus/onFocus).`,
        file: parsed.filePath,
      });
    }

    // Data fetching without states
    const hasDataFetching = /FutureBuilder|StreamBuilder|http\.get|dio\.|supabase/i.test(parsed._content || '');
    if (hasDataFetching && !parsed.hasLoadingState) {
      issues.push({
        rule: 'interaction/loading-state',
        severity: 'warning',
        message: 'Data fetching detected but no loading state (CircularProgressIndicator/shimmer).',
        file: parsed.filePath,
      });
    }
    if (hasDataFetching && !parsed.hasEmptyState) {
      issues.push({
        rule: 'interaction/empty-state',
        severity: 'warning',
        message: 'Data fetching detected but no empty state.',
        file: parsed.filePath,
      });
    }
    if (hasDataFetching && !parsed.hasErrorState) {
      issues.push({
        rule: 'interaction/error-state',
        severity: 'warning',
        message: 'Data fetching detected but no error state.',
        file: parsed.filePath,
      });
    }

    // Accessibility
    if (parsed.hasModal && !parsed.hasFocusManagement) {
      issues.push({
        rule: 'a11y/focus-management',
        severity: 'error',
        message: 'Dialog/bottom sheet detected but no focus management (FocusScope/FocusTrap).',
        file: parsed.filePath,
      });
    }

    if (!parsed.hasSemantics && parsed.interactiveElements && parsed.interactiveElements.length > 0) {
      issues.push({
        rule: 'a11y/aria-dynamic',
        severity: 'warning',
        message: 'Interactive widgets found but no Semantics widget. Add for screen reader support.',
        file: parsed.filePath,
      });
    }

    // Consistency
    if (parsed.hasAnimations && !parsed.hasMotionTokens) {
      issues.push({
        rule: 'consistency/motion-tokens',
        severity: 'warning',
        message: 'Animations found but no motion tokens (ThemeData/ThemeExtension). Define for consistency.',
        file: parsed.filePath,
      });
    }

    if (parsed.genericCTA) {
      issues.push({
        rule: 'consistency/no-generic-cta',
        severity: 'info',
        message: 'Generic blue CTA (Colors.blue) detected. Use theme colors.',
        file: parsed.filePath,
      });
    }

    if (parsed.cardGridHero) {
      issues.push({
        rule: 'consistency/no-card-grid-hero',
        severity: 'info',
        message: 'Card grid in hero detected. Use full-bleed imagery.',
        file: parsed.filePath,
      });
    }
  }

  return issues;
}
