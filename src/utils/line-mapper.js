// src/utils/line-mapper.js - Map rules to line numbers in source code

import { findFirstLine, getCodeSnippet } from './lines.js';

// Map each rule to a regex pattern to find the relevant line
const RULE_LINE_PATTERNS = {
  'motion/no-layout-animation': /transition-all|transition:\s*\w+\s+\d|animation:\s*\w+\s+\d/i,
  'motion/duration-range': /duration[-:]?\s*\d|duration-\d+/i,
  'motion/known-easing': /ease[-:]?\s*\w|cubic-bezier/i,
  'motion/reduced-motion': /animation|transition/i,
  'motion/stagger-interval': /animation|transition/i,
  'interaction/hover-state': /<button|<a |<input|<select|<textarea/i,
  'interaction/focus-visible': /<button|<a |<input|<select|<textarea/i,
  'interaction/disabled-state': /<button|<input/i,
  'interaction/loading-state': /fetch\(|useQuery|useSWR|axios\./i,
  'interaction/empty-state': /fetch\(|useQuery|useSWR|axios\./i,
  'interaction/error-state': /fetch\(|useQuery|useSWR|axios\./i,
  'interaction/active-route': /<nav|<Nav|navigation/i,
  'a11y/keyboard-nav': /<[a-zA-Z][^>]*\sonClick/i,
  'a11y/focus-management': /modal|dialog|drawer|Modal|Dialog|Drawer/i,
  'a11y/aria-dynamic': /modal|dialog|drawer|Modal|Dialog|Drawer/i,
  'a11y/touch-targets': /<button|<a |<input/i,
  'a11y/contrast': /text-\w+-\d+.*bg-\w+-\d+|bg-\w+-\d+.*text-\w+-\d+/i,
  'consistency/motion-tokens': /animation|transition/i,
  'consistency/single-language': /ease[-:]?\s*\w|cubic-bezier/i,
  'consistency/no-generic-cta': /bg-blue-500|bg-blue-600|bg-indigo-500/i,
  'consistency/no-card-grid-hero': /hero/i,
  'perf/layout-thrash': /offsetWidth|getBoundingClientRect|\.style\./i,
  'perf/compositor-only': /transition-all|animation:/i,
};

export function addLineNumbers(issues, content) {
  for (const issue of issues) {
    if (!issue.line) {
      const pattern = RULE_LINE_PATTERNS[issue.rule];
      if (pattern) {
        issue.line = findFirstLine(content, pattern);
      }
    }
    if (issue.line) {
      issue.snippet = getCodeSnippet(content, issue.line, 1);
    }
  }
  return issues;
}

export function formatIssueLocation(issue) {
  if (issue.line) {
    return `${issue.file}:${issue.line}`;
  }
  return issue.file;
}
