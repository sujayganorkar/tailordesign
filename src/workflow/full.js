// src/workflow/full.js — Unified decision + quality gate workflow

import { glob } from 'glob';
import { readFileSync } from 'fs';
import { parseJSX } from '../parsers/jsx.js';
import { parseCSS } from '../parsers/css.js';
import { parseDart } from '../parsers/dart.js';
import { runRules } from '../rules/index.js';
import { analyzeDecisions } from '../decisions/engine.js';
import chalk from 'chalk';

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

// Map decision required states → quality gate rule IDs
const STATE_TO_RULE = {
  'hover': 'interaction/hover-state',
  'focus-visible': 'interaction/focus-visible',
  'active': null, // no direct rule yet
  'disabled': 'interaction/disabled-state',
  'loading': 'interaction/loading-state',
  'empty': 'interaction/empty-state',
  'error': 'interaction/error-state',
  'active-route': 'interaction/active-route',
  'open': null,
  'close': null,
  'backdrop': null,
};

export async function runFull(targetPath, options = {}) {
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

  const allIssues = [];
  const allDecisions = [];
  const compliance = []; // { file, component, requiredState, found }

  for (const file of relevantFiles) {
    let content;
    try { content = readFileSync(file, 'utf-8'); } catch { continue; }
    if (content.length < 50) continue;

    const ext = file.split('.').pop().toLowerCase();
    let parsed;

    const { detectAdapter } = await import('../adapters/registry.js');
    const adapter = detectAdapter(content, file);
    const adapterResult = adapter.parse(content, file);
    if (!adapterResult) continue;
    parsed = adapterResult.parsed;
    parsed._content = content;
    parsed._framework = adapterResult.framework;

    // Run quality gate
    const issues = runRules(parsed, []);
    allIssues.push(...issues);

    // Run decision analysis
    const decisions = analyzeDecisions(parsed, content);
    allDecisions.push(...decisions);

    // Cross-reference: check if required states from decisions are actually present
    for (const dec of decisions) {
      for (const state of dec.requiredStates) {
        const ruleId = STATE_TO_RULE[state];
        if (!ruleId) continue;
        // Check if this state's rule was triggered (meaning it's MISSING)
        const missing = issues.some(i => i.rule === ruleId && i.file === file);
        compliance.push({
          file,
          component: dec.component,
          state,
          ruleId,
          present: !missing,
        });
      }
    }
  }

  // Calculate score
  let score = 100;
  for (const issue of allIssues) {
    if (issue.severity === 'error') score -= 10;
    else if (issue.severity === 'warning') score -= 3;
    else score -= 1;
  }
  score = Math.max(0, Math.round(score));

  // Compliance score
  const totalRequired = compliance.length;
  const presentCount = compliance.filter(c => c.present).length;
  const complianceScore = totalRequired > 0 ? Math.round((presentCount / totalRequired) * 100) : 100;

  const result = {
    filesScanned: relevantFiles.length,
    totalIssues: allIssues.length,
    errors: allIssues.filter(i => i.severity === 'error').length,
    warnings: allIssues.filter(i => i.severity === 'warning').length,
    infos: allIssues.filter(i => i.severity === 'info').length,
    score,
    passed: score >= (options.minScore ? parseInt(options.minScore) : 80),
    complianceScore,
    compliancePresent: presentCount,
    complianceTotal: totalRequired,
    issues: allIssues,
    decisions: allDecisions,
    compliance,
  };

  // Save state for regression detection
  try {
    const { createStateSnapshot, saveState, detectRegressions, formatRegressionReport, loadState } = await import('../state/persistence.js');
    const prevState = loadState(targetPath === '.' ? process.cwd() : targetPath);
    const snapshot = createStateSnapshot(result, result.decisions);
    const stateDir = stat.isFile() ? (targetPath.includes('/') ? targetPath.split('/').slice(0, -1).join('/') : '.') : targetPath;
    saveState(stateDir, snapshot);

    const regression = detectRegressions(snapshot, prevState);
    result.regression = regression;
  } catch (e) {
    // State saving is non-critical
  }

  // Generate escalations for errors that need human judgment
  try {
    const { generateEscalations, addEscalations } = await import('../escalation/cards.js');
    const newEscalations = generateEscalations(result, result.decisions);
    if (newEscalations.length > 0) {
      const stateDir = stat.isFile() ? (targetPath.includes('/') ? targetPath.split('/').slice(0, -1).join('/') : '.') : targetPath;
      addEscalations(stateDir, newEscalations);
      result.escalations = newEscalations;
    }
  } catch (e) {
    // Escalation is non-critical
  }
  // Generate motion spec
  try {
    const { generateMotionSpec, writeMotionSpec } = await import('../spec/motion-spec.js');
    const spec = generateMotionSpec(result.decisions);
    const stateDir = stat.isFile() ? (targetPath.includes('/') ? targetPath.split('/').slice(0, -1).join('/') : '.') : targetPath;
    writeMotionSpec(spec, stateDir);
  } catch (e) { /* non-critical */ }

  // Process control report
  if (options?.control) {
    const { createProcessState, updateVariables, formatControlReport, getControlDecision, completeControlPoint } = await import('../control/process.js');
    const state = createProcessState(parseInt(options.minScore) || 80);
    updateVariables(state, result, result.complianceScore);
    completeControlPoint(state, 'post-scan', { issues: result.totalIssues });
    console.log(formatControlReport(state));
    const decision = getControlDecision(state);
    console.log(`  Next action: ${decision.action} (${decision.priority}) — ${decision.message}`);
    console.log('');
  }

  // Format output
  const format = options?.format || 'text';
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else if (format === 'markdown') {
    console.log(formatFullMarkdown(result));
  } else {
    console.log(formatFullText(result));
  }

  return result;
}

function formatFullText(result) {
  const lines = [];

  lines.push('');
  lines.push('━'.repeat(70));
  lines.push('  AI UI Quality Gate — Full Report (Decisions + Quality)');
  lines.push('━'.repeat(70));
  lines.push('');

  const scoreColor = result.score >= 80 ? chalk.green : result.score >= 60 ? chalk.yellow : chalk.red;
  lines.push(`  Files scanned:     ${result.filesScanned}`);
  lines.push(`  Quality score:     ${scoreColor(result.score + '/100')} ${result.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL')}`);
  lines.push(`  Compliance score:  ${result.complianceScore}% (${result.compliancePresent}/${result.complianceTotal} required states present)`);
  lines.push(`  Total issues:      ${result.totalIssues} (${result.errors} errors, ${result.warnings} warnings, ${result.infos} info)`);
  lines.push(`  Components found:  ${result.decisions.length} (across ${new Set(result.decisions.map(d => d.component)).size} types)`);
  lines.push('');

  // Compliance section
  if (result.compliance.length > 0) {
    lines.push(chalk.bold('  ── Compliance (Decisions vs. Implementation) ──'));
    lines.push('');
    const missing = result.compliance.filter(c => !c.present);
    if (missing.length === 0) {
      lines.push(chalk.green('  ✓ All required states from decision analysis are implemented.'));
    } else {
      lines.push(chalk.red(`  ✗ ${missing.length} required state(s) missing:`));
      for (const m of missing) {
        lines.push(`    • ${m.component} in ${m.file.split('/').pop()} — missing: ${m.state} (${m.ruleId})`);
      }
    }
    lines.push('');
  }

  // Quality issues
  if (result.issues.length > 0) {
    lines.push(chalk.bold('  ── Quality Issues ──'));
    lines.push('');
    const byFile = {};
    for (const issue of result.issues) {
      if (!byFile[issue.file]) byFile[issue.file] = [];
      byFile[issue.file].push(issue);
    }
    for (const [file, issues] of Object.entries(byFile)) {
      lines.push(chalk.bold(`  ${file}`));
      for (const issue of issues) {
        const icon = issue.severity === 'error' ? chalk.red('✗') : issue.severity === 'warning' ? chalk.yellow('⚠') : chalk.blue('ℹ');
        lines.push(`    ${icon} ${chalk.dim(issue.rule)} — ${issue.message}`);
      }
      lines.push('');
    }
  }

  // Decision summary
  if (result.decisions.length > 0) {
    lines.push(chalk.bold('  ── Interaction Decisions ──'));
    lines.push('');
    const componentTypes = {};
    for (const d of result.decisions) {
      if (!componentTypes[d.component]) componentTypes[d.component] = 0;
      componentTypes[d.component] += d.count;
    }
    for (const [type, count] of Object.entries(componentTypes).sort((a, b) => b[1] - a[1])) {
      lines.push(`    ${type}: ${count}`);
    }
    lines.push('');
  }

  lines.push('━'.repeat(70));
  lines.push('');

  return lines.join('\n');
}

function formatFullMarkdown(result) {
  const lines = [];
  lines.push('# AI UI Quality Gate — Full Report');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Files scanned | ${result.filesScanned} |`);
  lines.push(`| Quality score | ${result.score}/100 |`);
  lines.push(`| Status | ${result.passed ? 'PASS ✓' : 'FAIL ✗'} |`);
  lines.push(`| Compliance score | ${result.complianceScore}% |`);
  lines.push(`| Required states present | ${result.compliancePresent}/${result.complianceTotal} |`);
  lines.push(`| Total issues | ${result.totalIssues} |`);
  lines.push(`| Components analyzed | ${result.decisions.length} |`);
  lines.push('');

  const missing = result.compliance.filter(c => !c.present);
  if (missing.length > 0) {
    lines.push('## Missing Required States');
    lines.push('');
    for (const m of missing) {
      lines.push(`- **${m.component}** in \`${m.file.split('/').pop()}\` — missing: ${m.state}`);
    }
    lines.push('');
  }

  if (result.issues.length > 0) {
    lines.push('## Quality Issues');
    lines.push('');
    const byFile = {};
    for (const issue of result.issues) {
      if (!byFile[issue.file]) byFile[issue.file] = [];
      byFile[issue.file].push(issue);
    }
    for (const [file, issues] of Object.entries(byFile)) {
      lines.push(`### ${file}`);
      for (const issue of issues) {
        lines.push(`- ${issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ'} **${issue.rule}** — ${issue.message}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
