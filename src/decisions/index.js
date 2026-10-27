// src/decisions/index.js — Decision analysis entry point

import { glob } from 'glob';
import { readFileSync } from 'fs';
import { parseJSX } from '../parsers/jsx.js';
import { parseCSS } from '../parsers/css.js';
import { parseDart } from '../parsers/dart.js';
import { analyzeDecisions, formatDecisionReport, formatDecisionJson } from './engine.js';

const IGNORE_PATTERNS = [
  'node_modules/**', 'dist/**', 'build/**', '.git/**',
  '*.min.js', '*.min.css', 'coverage/**', '*.test.*', '*.spec.*',
];

function looksLikeUI(content) {
  return /<[A-Z]/.test(content) || /className=/.test(content) ||
    /<div|<button|<input|<a /.test(content) || /styled\./.test(content) || /css`/.test(content);
}

function looksLikeFlutterUI(content) {
  return /Widget|StatelessWidget|StatefulWidget|BuildContext|Scaffold|Container|Column|Row|ListView|GridView/i.test(content);
}

export async function runDecisions(targetPath, options = {}) {
  const ignore = [...IGNORE_PATTERNS];

  let files;
  const stat = (await import('fs')).statSync(targetPath);
  if (stat.isFile()) {
    files = [targetPath];
  } else {
    files = await glob('**/*.{jsx,tsx,js,ts,css,scss,less,html,htm,dart,vue,svelte}', {
      cwd: targetPath, ignore, absolute: true,
    });
  }

  const relevantFiles = files.filter(f => {
    const name = f.split('/').pop();
    if (name.includes('.test.') || name.includes('.spec.') || name.includes('.config.')) return false;
    return true;
  });

  const allDecisions = [];

  for (const file of relevantFiles) {
    let content;
    try { content = readFileSync(file, 'utf-8'); } catch { continue; }
    if (content.length < 50) continue;

    const ext = file.split('.').pop().toLowerCase();
    let parsed;

    if (['jsx', 'tsx', 'js', 'ts'].includes(ext)) {
      if (!looksLikeUI(content)) continue;
      parsed = parseJSX(content, file);
      parsed._content = content;
    } else if (['css', 'scss', 'less'].includes(ext)) {
      parsed = parseCSS(content, file);
      parsed._content = content;
    } else if (['html', 'htm'].includes(ext)) {
      parsed = parseJSX(content, file);
      parsed._content = content;
      parsed.type = 'html';
    } else if (ext === 'dart') {
      if (!looksLikeFlutterUI(content)) continue;
      parsed = parseDart(content, file);
    } else {
      continue;
    }

    const decisions = analyzeDecisions(parsed, content);
    allDecisions.push(...decisions);
  }

  const format = options.format || 'text';
  if (format === 'json') {
    console.log(formatDecisionJson(allDecisions));
  } else {
    console.log(formatDecisionReport(allDecisions));
  }

  // Generate motion spec file
  try {
    const { generateMotionSpec, writeMotionSpec } = await import('../spec/motion-spec.js');
    const spec = generateMotionSpec(allDecisions);
    const stateDir = stat.isFile() ? (targetPath.includes('/') ? targetPath.split('/').slice(0, -1).join('/') : '.') : targetPath;
    writeMotionSpec(spec, stateDir);
    if (format === 'text') console.log(`\n  Motion spec written to ${stateDir}/motion-spec.json`);
  } catch (e) { /* non-critical */ }

  return allDecisions;
}
