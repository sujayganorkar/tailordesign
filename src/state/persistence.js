// src/state/persistence.js - State persistence + baseline + regression detection

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const STATE_FILE = '.uiq-state.json';

// Load state from file
export function loadState(dir) {
  const path = join(dir, STATE_FILE);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

// Save state to file
export function saveState(dir, state) {
  const path = join(dir, STATE_FILE);
  writeFileSync(path, JSON.stringify(state, null, 2));
  return path;
}

// Create a state snapshot from scan results
export function createStateSnapshot(scanResult, decisions) {
  const snapshot = {
    timestamp: new Date().toISOString(),
    score: scanResult.score,
    totalIssues: scanResult.totalIssues,
    errors: scanResult.errors,
    warnings: scanResult.warnings,
    files: {},
  };

  // Per-file state
  const fileIssues = {};
  for (const issue of scanResult.issues) {
    if (!fileIssues[issue.file]) fileIssues[issue.file] = [];
    fileIssues[issue.file].push(issue.rule);
  }

  for (const [file, rules] of Object.entries(fileIssues)) {
    snapshot.files[file] = {
      issueCount: rules.length,
      rules: rules,
      lastScanned: new Date().toISOString(),
    };
  }

  // Decision state
  if (decisions) {
    snapshot.decisions = decisions.map(d => ({
      file: d.file,
      component: d.component,
      requiredStates: d.requiredStates,
      timestamp: new Date().toISOString(),
    }));
  }

  return snapshot;
}

// Compare current scan against baseline (previous state)
export function detectRegressions(currentState, previousState) {
  const regressions = [];
  const improvements = [];
  const newFiles = [];
  const removedFiles = [];

  if (!previousState) return { regressions, improvements, newFiles, removedFiles, hasBaseline: false };

  const prevFiles = new Set(Object.keys(previousState.files || {}));
  const currFiles = new Set(Object.keys(currentState.files || {}));

  // New files
  for (const f of currFiles) {
    if (!prevFiles.has(f)) newFiles.push(f);
  }

  // Removed files
  for (const f of prevFiles) {
    if (!currFiles.has(f)) removedFiles.push(f);
  }

  // Compare existing files
  for (const file of currFiles) {
    if (!prevFiles.has(file)) continue;

    const prev = previousState.files[file];
    const curr = currentState.files[file];

    // New issues (regressions)
    const prevRules = new Set(prev.rules || []);
    const currRules = new Set(curr.rules || []);

    for (const rule of currRules) {
      if (!prevRules.has(rule)) {
        regressions.push({ file, rule, type: 'new-issue' });
      }
    }

    // Fixed issues (improvements)
    for (const rule of prevRules) {
      if (!currRules.has(rule)) {
        improvements.push({ file, rule, type: 'fixed' });
      }
    }

    // Issue count increased
    if (curr.issueCount > prev.issueCount) {
      regressions.push({ file, type: 'more-issues', from: prev.issueCount, to: curr.issueCount });
    } else if (curr.issueCount < prev.issueCount) {
      improvements.push({ file, type: 'fewer-issues', from: prev.issueCount, to: curr.issueCount });
    }
  }

  // Score regression
  if (currentState.score < (previousState.score || 0)) {
    regressions.push({ type: 'score-drop', from: previousState.score, to: currentState.score });
  } else if (currentState.score > (previousState.score || 0)) {
    improvements.push({ type: 'score-improve', from: previousState.score, to: currentState.score });
  }

  return { regressions, improvements, newFiles, removedFiles, hasBaseline: true };
}

// Format regression report
export function formatRegressionReport(regressionResult) {
  const lines = [];

  if (!regressionResult.hasBaseline) {
    lines.push('  No previous scan found. This scan establishes the baseline.');
    return lines.join('\n');
  }

  const { regressions, improvements, newFiles, removedFiles } = regressionResult;

  if (regressions.length === 0 && improvements.length === 0 && newFiles.length === 0 && removedFiles.length === 0) {
    lines.push('  ✓ No changes since last scan.');
    return lines.join('\n');
  }

  if (regressions.length > 0) {
    lines.push(`  ⚠ ${regressions.length} regression(s):`);
    for (const r of regressions) {
      if (r.type === 'new-issue') lines.push(`    • ${r.file.split('/').pop()}: new issue ${r.rule}`);
      else if (r.type === 'more-issues') lines.push(`    • ${r.file.split('/').pop()}: ${r.from} → ${r.to} issues`);
      else if (r.type === 'score-drop') lines.push(`    • Score dropped: ${r.from} → ${r.to}`);
    }
  }

  if (improvements.length > 0) {
    lines.push(`  ✓ ${improvements.length} improvement(s):`);
    for (const i of improvements) {
      if (i.type === 'fixed') lines.push(`    • ${i.file.split('/').pop()}: fixed ${i.rule}`);
      else if (i.type === 'fewer-issues') lines.push(`    • ${i.file.split('/').pop()}: ${i.from} → ${i.to} issues`);
      else if (i.type === 'score-improve') lines.push(`    • Score improved: ${i.from} → ${i.to}`);
    }
  }

  if (newFiles.length > 0) {
    lines.push(`  + ${newFiles.length} new file(s) scanned`);
  }

  if (removedFiles.length > 0) {
    lines.push(`  - ${removedFiles.length} file(s) removed`);
  }

  return lines.join('\n');
}
