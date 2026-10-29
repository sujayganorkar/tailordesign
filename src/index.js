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
  const ignore = [...IGNORE_PATTERNS, ...(options.ignore ? options.ignore.split(',') : []), ...(config?.ignore || [])];

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

  // Filter to relevant files
  const relevantFiles = files.filter(f => {
    const name = f.split('/').pop();
    if (name.includes('.test.') || name.includes('.spec.') || name.includes('.config.')) return false;
    if (name === 'package.json' || name === 'tsconfig.json') return false;
    return true;
  });

  const allParsed = [];
  const allIssues = [];

  if (relevantFiles.length === 0) {
    console.log('No UI files found in the specified path.');
    return { filesScanned: 0, totalIssues: 0, errors: 0, warnings: 0, infos: 0, score: 100, passed: true, issues: [] };
  }

  // Filter rules if specified (from CLI or config)
  const ruleFilter = options.rules ? options.rules.split(',').map(r => r.trim()) : (config?.rules ? Object.keys(config.rules) : null);

  for (const file of relevantFiles) {
    let content;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    // Skip very small files
    if (content.length < 50) continue;

    const ext = file.split('.').pop().toLowerCase();
    let parsed;

    // Use adapter system for framework detection
    const { detectAdapter } = await import('./adapters/registry.js');
    const adapter = detectAdapter(content, file);
    const adapterResult = adapter.parse(content, file);
    if (!adapterResult) continue;
    parsed = adapterResult.parsed;
    parsed._content = content;
    parsed._framework = adapterResult.framework;

    allParsed.push(parsed);
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

    allIssues.push(...filteredIssues);
  }

  // Calculate score
  const score = calculateScore(allIssues, relevantFiles.length);

  const result = {
    filesScanned: relevantFiles.length,
    filesWithIssues: new Set(allIssues.map(i => i.file)).size,
    totalIssues: allIssues.length,
    errors: allIssues.filter(i => i.severity === 'error').length,
    warnings: allIssues.filter(i => i.severity === 'warning').length,
    infos: allIssues.filter(i => i.severity === 'info').length,
    score,
    passed: score >= (options.minScore ? parseInt(options.minScore) : 80),
    issues: allIssues,
  };

  // Format output
  const format = options.format || 'text';
  if (format === 'json') {
    console.log(formatJson(result));
  } else if (format === 'markdown') {
    console.log(formatMarkdown(result));
  } else {
    console.log(formatText(result));
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

