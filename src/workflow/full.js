// src/workflow/full.js - Unified decision + quality gate workflow

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
  const config = options.config || null;
  const { configurePrimitives } = await import('../primitives/registry.js');
  configurePrimitives(config);
  const { setExperimental } = await import('../experimental.js');
  setExperimental(!!(options.experimental || config?.experimental));
  const { setLibraryMode } = await import('../library.js');
  setLibraryMode(!!options.library);
  const { setPlatform } = await import('../platform.js');
  setPlatform(options.platform || config?.platform || 'auto');
  let files;
  const stat = (await import('fs')).statSync(targetPath);
  if (stat.isFile()) {
    files = [targetPath];
  } else {
    files = await glob('**/*.{jsx,tsx,js,ts,css,scss,less,html,htm,dart,vue,svelte}', {
      cwd: targetPath, ignore, absolute: true,
    });
  }
  files.sort();

  const relevantFiles = files.filter(f => {
    const name = f.split('/').pop();
    if (name.includes('.test.') || name.includes('.spec.') || name.includes('.config.')) return false;
    if (/^(add-|generate-|build-|migrate-|sync-)/.test(name)) return false;
    if (/\/(scripts|cli|bin|tools|mcp|server|dist|build)\//.test(f)) return false;
    return true;
  });

  const allIssues = [];
  const allDecisions = [];
  const compliance = []; // { file, component, requiredState, found }
  const parsedFiles = [];
  let suppressedCount = 0;
  const strict = !!options.strict;

  // First pass: parse all files for project-wide context.
  for (const file of relevantFiles) {
    let content;
    try { content = readFileSync(file, 'utf-8'); } catch { continue; }
    if (content.length < 50) continue;

    const { detectAdapter } = await import('../adapters/registry.js');
    const adapter = detectAdapter(content, file);
    const adapterResult = adapter.parse(content, file);
    if (!adapterResult) continue;
    const parsed = adapterResult.parsed;
    parsed._content = content;
    parsed._framework = adapterResult.framework;
    parsedFiles.push({ file, content, parsed });
  }

  // Second pass: run rules + decisions with project context.
  const { addLineNumbers } = await import('../utils/line-mapper.js');
  const { isSuppressed } = await import('../utils/suppress.js');
  for (const { file, content, parsed } of parsedFiles) {
    // Run quality gate
    const issues = runRules(parsed, parsedFiles.map(p => p.parsed));
    const { getRuleKind, applySeverityOverrides } = await import('../config.js');
    for (const i of issues) i.kind = getRuleKind(i.rule);
    const { getFixSuggestion } = await import('../fixer-suggestions.js');
    for (const i of issues) {
      const suggestion = getFixSuggestion(i.rule);
      if (suggestion) i.fix = suggestion;
    }
    addLineNumbers(issues, content);
    const { kept } = applySeverityOverrides(issues.filter(i => !isSuppressed(i, content, config)), config);
    suppressedCount += issues.length - kept.length;
    allIssues.push(...kept);

    // Run decision analysis
    const decisions = analyzeDecisions(parsed, content);
    allDecisions.push(...decisions);

    // Cross-reference: check if required states from decisions are actually present
    for (const dec of decisions) {
      for (const state of dec.requiredStates) {
        const ruleId = STATE_TO_RULE[state];
        if (!ruleId) continue;
        // Check if this state's rule was triggered (meaning it's MISSING).
        // Suppressed/disabled findings count as present (user accepted them).
        const missing = kept.some(i => i.rule === ruleId && i.file === file);
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

  // Sort issues deterministically: file, then line, then rule.
  allIssues.sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    const la = a.line || 0, lb = b.line || 0;
    if (la !== lb) return la - lb;
    return a.rule < b.rule ? -1 : (a.rule > b.rule ? 1 : 0);
  });

  const { calculateScore } = await import('../utils/score.js');
  const score = calculateScore(allIssues, relevantFiles.length, { strict });
  const objectiveErrors = allIssues.filter(i => i.severity === 'error').length;
  const minScore = options.minScore ? parseInt(options.minScore) : 80;
  // Same gate contract as the default scan: objective-only score, errors block.
  const passed = score >= minScore && objectiveErrors === 0;
  const totalRequired = compliance.length;
  const presentCount = compliance.filter(c => c.present).length;
  const complianceScore = totalRequired > 0 ? Math.round((presentCount / totalRequired) * 100) : 100;

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
    advisoryCount: strict ? 0 : allIssues.filter(i => i.kind === 'recommendation').length,
    suppressedCount,
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

  // Generate escalations for errors that need human judgment.
  // addEscalations de-duplicates against existing cards and never re-raises
  // resolved ones; `added` contains only genuinely new cards.
  try {
    const { generateEscalations, addEscalations } = await import('../escalation/cards.js');
    const stateDir = stat.isFile() ? (targetPath.includes('/') ? targetPath.split('/').slice(0, -1).join('/') : '.') : targetPath;
    const added = addEscalations(stateDir, generateEscalations(result, result.decisions));
    if (added.length > 0) {
      result.escalations = added;
    }
  } catch (e) {
    // Escalation is non-critical
  }
  // Motion-spec conformance: when motion-spec.json exists in the project,
  // verify parsed components against it. Reports how many spec components
  // matched scanned files so an empty match is visible, not silent.
  try {
    const { readMotionSpec, verifyAgainstSpec } = await import('../spec/motion-spec.js');
    const specDir = stat.isFile() ? (targetPath.includes('/') ? targetPath.split('/').slice(0, -1).join('/') : '.') : targetPath;
    const spec = readMotionSpec(specDir);
    if (spec) {
      const violations = [];
      let matchedComponents = 0;
      for (const { content, parsed } of parsedFiles) {
        violations.push(...verifyAgainstSpec(spec, parsed, content));
      }
      const scannedFiles = new Set(parsedFiles.map(p => p.file));
      matchedComponents = Object.values(spec.components || {}).filter(c => scannedFiles.has(c.file)).length;
      result.specConformance = {
        spec: 'motion-spec.json',
        checked: parsedFiles.length,
        matchedComponents,
        violations,
      };
    }
  } catch (e) {
    // Spec conformance is non-critical
  }

  // Generate motion spec (opt-in)
  if (options?.writeSpec) {
    try {
      const { generateMotionSpec, writeMotionSpec } = await import('../spec/motion-spec.js');
      const spec = generateMotionSpec(result.decisions);
      const stateDir = stat.isFile() ? (targetPath.includes('/') ? targetPath.split('/').slice(0, -1).join('/') : '.') : targetPath;
      writeMotionSpec(spec, stateDir);
    } catch (e) { /* non-critical */ }
  }

  // Process control report (state persists to .uiq-control.json so scans,
  // history, and control points accumulate across runs).
  if (options?.control) {
    const { openControlState, updateVariables, formatControlReport, getControlDecision, completeControlPoint, saveControlState, resolveControlDir } = await import('../control/process.js');
    try {
      const controlDir = resolveControlDir(targetPath === '.' ? process.cwd() : targetPath);
      const state = openControlState(controlDir, parseInt(options.minScore) || 80);
      updateVariables(state, result, result.complianceScore, result.regression);
      completeControlPoint(state, 'post-scan', { issues: result.totalIssues });
      if (result.decisions?.length > 0) {
        completeControlPoint(state, 'post-decision', { components: result.decisions.length });
      }
      if (typeof result.complianceScore === 'number' && Number.isFinite(result.complianceScore)) {
        completeControlPoint(state, 'post-compliance', { compliance: result.complianceScore });
      }
      saveControlState(controlDir, state);
      const decision = getControlDecision(state);
      result.control = {
        setpoint: state.setpoint,
        variables: state.variables,
        alarms: state.alarms,
        scans: state.variables.scan_count,
        nextAction: decision,
        history: state.history.slice(-10),
      };
      // Print the text report only for text output — emitting it before JSON
      // or markdown would corrupt the primary output for agents/CI. All
      // formats carry the structured summary in result.control.
      if ((options.format || 'text') === 'text') {
        console.log(formatControlReport(state));
        console.log(`  Next action: ${decision.action} (${decision.priority}) - ${decision.message}`);
        console.log('');
      }
    } catch (e) {
      // Control reporting is non-critical
    }
  }

  // Format output. `silent` suppresses all printing so library consumers
  // (MCP, the loop command) can use the return value without corrupting
  // their own output streams.
  if (!options.silent) {
    const format = options?.format || 'text';
    if (format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else if (format === 'markdown') {
      console.log(formatFullMarkdown(result));
    } else {
      console.log(formatFullText(result));
    }
  }

  return result;
}

function formatFullText(result) {
  const lines = [];

  lines.push('');
  lines.push('━'.repeat(70));
  lines.push('  AI UI Quality Gate - Full Report (Decisions + Quality)');
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
        lines.push(`    • ${m.component} in ${m.file.split('/').pop()} - missing: ${m.state} (${m.ruleId})`);
      }
    }
    lines.push('');
  }

  // Spec conformance section
  if (result.specConformance) {
    const sc = result.specConformance;
    lines.push(chalk.bold('  ── Motion Spec Conformance ──'));
    lines.push('');
    if (sc.matchedComponents === 0) {
      lines.push(chalk.yellow('  ⚠ motion-spec.json found, but none of its components matched scanned files.'));
      lines.push(chalk.dim('    Regenerate the spec with `uiq . --decide --write-spec` in the same directory.'));
    } else if (sc.violations.length === 0) {
      lines.push(chalk.green(`  ✓ ${sc.matchedComponents} spec component(s) conform to the implementation.`));
    } else {
      lines.push(chalk.yellow(`  ⚠ ${sc.violations.length} spec mismatch(es) across ${sc.matchedComponents} matched component(s):`));
      for (const v of sc.violations) {
        lines.push(`    • ${v.message}`);
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
        lines.push(`    ${icon} ${chalk.dim(issue.rule)} - ${issue.message}`);
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
  lines.push('# AI UI Quality Gate - Full Report');
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
      lines.push(`- **${m.component}** in \`${m.file.split('/').pop()}\` - missing: ${m.state}`);
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
        lines.push(`- ${issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ'} **${issue.rule}** - ${issue.message}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
