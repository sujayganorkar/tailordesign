// src/index.js - Main entry point

import { glob } from 'glob';
import { readFileSync } from 'fs';
import { parseJSX } from './parsers/jsx.js';
import { parseCSS } from './parsers/css.js';
import { parseDart } from './parsers/dart.js';
import { runRules } from './rules/index.js';
import { formatText, formatJson, formatMarkdown } from './reporter.js';
import chalk from 'chalk';
import { calculateScore } from './utils/score.js';
import { isSuppressed } from './utils/suppress.js';

const IGNORE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.git/**',
  '*.min.js',
  '*.min.css',
  'coverage/**',
];

const FILE_EXTENSIONS = {
  jsx: ['.jsx', '.tsx', '.js', '.ts'],
  css: ['.css', '.scss', '.less'],
  html: ['.html', '.htm'],
};

export async function run(targetPath, options = {}) {
  // Load config file
  const config = options.config || null;
  const { configurePrimitives } = await import('./primitives/registry.js');
  configurePrimitives(config);
  const { setExperimental } = await import('./experimental.js');
  setExperimental(!!(options.experimental || config?.experimental));
  const { setLibraryMode } = await import('./library.js');
  setLibraryMode(!!options.library);
  const { setPlatform } = await import('./platform.js');
  setPlatform(options.platform || config?.platform || 'auto');
  const ignore = [...IGNORE_PATTERNS, ...(options.ignore ? options.ignore.split(',') : []), ...(config?.ignore || [])];
  const strict = !!options.strict;

  // Collect files
  let files;
  const stat = (await import('fs')).statSync(targetPath);
  if (stat.isFile()) {
    files = [targetPath];
  } else {
    files = await glob('**/*.{jsx,tsx,js,ts,css,scss,less,html,htm,dart,vue,svelte}', {
      cwd: targetPath,
      ignore,
      absolute: true,
    });
  }
  // Deterministic processing order: sort so identical inputs yield identical output.
  files.sort();

  // Filter to relevant files
  const relevantFiles = files.filter(f => {
    const name = f.split('/').pop();
    if (name.includes('.test.') || name.includes('.spec.') || name.includes('.config.')) return false;
    if (name === 'package.json' || name === 'tsconfig.json') return false;
    // Skip obvious non-UI scripts
    if (/^(add-|generate-|build-|migrate-|sync-)/.test(name)) return false;
    if (/\/(scripts|cli|bin|tools|mcp|server|dist|build)\//.test(f)) return false;
    // In library mode, only audit component definition files
    if (options.library) {
      const isComponentDir = /\/components\//i.test(f);
      // We'll refine after reading content; keep broad here, filter below
      if (!isComponentDir && !/\.(jsx|tsx)$/i.test(f)) return false;
    }
    return true;
  });

  const allParsed = [];
  let allIssues = [];
  let suppressedCount = 0;

  if (relevantFiles.length === 0) {
    if (!options.silent && !options.quiet) console.log('No UI files found in the specified path.');
    return { filesScanned: 0, filesWithIssues: 0, totalIssues: 0, errors: 0, warnings: 0, infos: 0, score: 100, passed: true, gate: { minScore: options.minScore ? parseInt(options.minScore) : 80, mode: options.strict ? 'strict' : 'objective', blockedByErrors: false }, advisoryCount: 0, suppressedCount: 0, issues: [] };
  }

  // Filter rules if explicitly requested via CLI (--rules). Config `rules`
  // entries are severity overrides / disables, not an include-filter.
  const ruleFilter = options.rules ? options.rules.split(',').map(r => r.trim()) : null;

  // First pass: parse all files so project-wide context (reduced-motion, hover, etc.) is available.
  for (const file of relevantFiles) {
    let content;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    // Skip very small files
    if (content.length < 50) continue;

    // In library mode, only audit component definition files
    if (options.library) {
      const isComponentDir = /\/components\//i.test(file);
      const exportsComponent = /export\s+default\s+function\s+[A-Z]/.test(content) || /export\s+const\s+[A-Z]\w*\s*=/.test(content);
      if (!isComponentDir && !exportsComponent) continue;
    }

    // Use adapter system for framework detection
    const { detectAdapter } = await import('./adapters/registry.js');
    const adapter = detectAdapter(content, file);
    const adapterResult = adapter.parse(content, file);
    if (!adapterResult) continue;
    const parsed = adapterResult.parsed;
    parsed._content = content;
    parsed._framework = adapterResult.framework;

    allParsed.push(parsed);
  }

  // Second pass: run rules with full project context.
  for (const parsed of allParsed) {
    const issues = runRules(parsed, allParsed);
    const filteredIssues = ruleFilter
      ? issues.filter(i => ruleFilter.includes(i.rule))
      : issues;

    // Add fix suggestions and line numbers to each issue
    const { getFixSuggestion } = await import('./fixer-suggestions.js');
    const { addLineNumbers } = await import('./utils/line-mapper.js');
    for (const issue of filteredIssues) {
      const suggestion = getFixSuggestion(issue.rule);
      if (suggestion) {
        issue.fix = suggestion;
      }
      const { getRuleKind } = await import('./config.js');
      issue.kind = getRuleKind(issue.rule);
      // objective vs subjective/recommendation
    }
    addLineNumbers(filteredIssues, parsed._content || '');

    // Inline suppressions: `uiq-ignore` on the issue's line (optionally with rule IDs).
    let suppressedInFile = 0;
    const keptIssues = [];
    for (const issue of filteredIssues) {
      if (isSuppressed(issue, parsed._content || '', config)) {
        suppressedInFile++;
        continue;
      }
      keptIssues.push(issue);
    }

    allIssues.push(...keptIssues);
    suppressedCount += suppressedInFile;
  }

  // Config severity overrides / disables (`rules: { "id": "error"|"warning"|"info"|"off" }`)
  const { applySeverityOverrides } = await import('./config.js');
  const { kept: finalIssues, disabledCount } = applySeverityOverrides(allIssues, config);
  allIssues = finalIssues;
  suppressedCount += disabledCount;

  // Sort issues deterministically: file, then line, then rule.
  allIssues.sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    const la = a.line || 0, lb = b.line || 0;
    if (la !== lb) return la - lb;
    return a.rule < b.rule ? -1 : (a.rule > b.rule ? 1 : 0);
  });

  // Calculate score (objective rules only, unless strict)
  const score = calculateScore(allIssues, relevantFiles.length, { strict });
  const objectiveErrors = allIssues.filter(i => i.severity === 'error').length;

  const advisoryCount = strict ? 0 : allIssues.filter(i => i.kind === 'recommendation').length;
  const minScore = options.minScore ? parseInt(options.minScore) : 80;
  // Concreteness contract: the score reflects objective rules only, and any
  // error (standard violation or user-escalated severity) blocks passing.
  const passed = score >= minScore && objectiveErrors === 0;

  const result = {
    filesScanned: relevantFiles.length,
    filesWithIssues: new Set(allIssues.map(i => i.file)).size,
    totalIssues: allIssues.length,
    errors: objectiveErrors,
    warnings: allIssues.filter(i => i.severity === 'warning').length,
    infos: allIssues.filter(i => i.severity === 'info').length,
    score,
    passed,
    gate: { minScore, mode: strict ? 'strict' : 'objective', blockedByErrors: objectiveErrors > 0 },
    advisoryCount,
    suppressedCount,
    issues: allIssues,
  };

  if (options.library) {
    const byFile = {};
    for (const i of allIssues) {
      if (!byFile[i.file]) byFile[i.file] = [];
      byFile[i.file].push(i);
    }
    result.libraryReport = relevantFiles.map(f => ({
      file: f,
      issues: (byFile[f] || []).length,
      errors: (byFile[f] || []).filter(i => i.severity === 'error').length,
    }));
  }

  // Format output
  if (!options.silent && !options.quiet) {
    const allowedFormats = new Set(['text', 'json', 'markdown']);
    let format = options.format || 'text';
    if (!allowedFormats.has(format)) {
      console.error(`Warning: Unknown format "${format}". Falling back to "text".`);
      format = 'text';
    }
    if (format === 'json') {
      console.log(formatJson(result));
    } else if (format === 'markdown') {
      console.log(formatMarkdown(result));
    } else {
      console.log(formatText(result));
    }
  }

  return result;
}

function looksLikeFlutterUI(content) {
  return /Widget|StatelessWidget|StatefulWidget|BuildContext|Scaffold|Container|Column|Row|ListView|GridView/i.test(content);
}

function looksLikeUI(content) {
  // Heuristic: file contains JSX or UI-related code
  return (
    /<[A-Z]/.test(content) ||           // JSX component
    /className=/.test(content) ||         // className usage
    /<div|<button|<input|<a /.test(content) || // HTML elements
    /styled\./.test(content) ||           // styled-components
    /css`/.test(content)                   // tagged template CSS
  );
}

