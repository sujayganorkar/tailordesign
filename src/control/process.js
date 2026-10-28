// src/control/process.js — Process control engineering for the human-agent-tool workflow
//
// Applies process control concepts to UI quality:
// - Setpoint: quality threshold (default 80)
// - Sensor: quality gate (measures current state)
// - Controller: agent (decides actions)
// - Actuator: code changes (fixes issues)
// - Feedback loop: re-scan after changes
// - PID: proportional (fix current), integral (track accumulated), derivative (detect regressions)
// - Control points: moments where human can intervene
// - Alarms: when quality drops below threshold

import { loadState, saveState, createStateSnapshot, detectRegressions } from '../state/persistence.js';

// Control modes
export const CONTROL_MODES = {
  AUTO: 'auto',       // Agent runs everything, human sees final result
  SEMI_AUTO: 'semi',  // Agent pauses at control points for approval
  MANUAL: 'manual',   // Human runs everything step by step
};

// Process variables (what we measure)
export const PROCESS_VARS = {
  QUALITY_SCORE: 'quality_score',       // 0-100
  COMPLIANCE_SCORE: 'compliance_score', // 0-100%
  ERROR_COUNT: 'error_count',
  WARNING_COUNT: 'warning_count',
  ISSUE_COUNT: 'issue_count',
  REGRESSION_COUNT: 'regression_count',
  FEEDBACK_COUNT: 'feedback_count',
  SCAN_COUNT: 'scan_count',
};

// Control points (where human can intervene)
export const CONTROL_POINTS = {
  PRE_SCAN: {
    id: 'pre-scan',
    name: 'Pre-scan configuration',
    description: 'Set quality threshold and rules before scanning',
    humanRequired: false,
    agentCanOverride: true,
  },
  POST_DECISION: {
    id: 'post-decision',
    name: 'Review interaction decisions',
    description: 'Review what interactions each component should have before implementing',
    humanRequired: false, // agent can proceed, but human review recommended
    agentCanOverride: true,
  },
  POST_SCAN: {
    id: 'post-scan',
    name: 'Review quality issues',
    description: 'Review issues before agent auto-fixes',
    humanRequired: false,
    agentCanOverride: true,
  },
  POST_FIX: {
    id: 'post-fix',
    name: 'Review auto-fixes',
    description: 'Review what the agent changed before re-scanning',
    humanRequired: false,
    agentCanOverride: true,
  },
  POST_COMPLIANCE: {
    id: 'post-compliance',
    name: 'Review compliance gaps',
    description: 'Review which decision requirements are not yet implemented',
    humanRequired: false,
    agentCanOverride: true,
  },
  ESCALATION: {
    id: 'escalation',
    name: 'Resolve escalation',
    description: 'Human must choose an option when agent is stuck',
    humanRequired: true,
    agentCanOverride: false,
  },
  FEEL_CHECK: {
    id: 'feel-check',
    name: 'Experiential review',
    description: 'Human checks if the UI feels right (cannot be automated)',
    humanRequired: true,
    agentCanOverride: false,
  },
  FINAL_APPROVAL: {
    id: 'final-approval',
    name: 'Final approval',
    description: 'Human approves the final result',
    humanRequired: true,
    agentCanOverride: false,
  },
};

// Process state
export function createProcessState(setpoint = 80) {
  return {
    setpoint,
    mode: CONTROL_MODES.AUTO,
    variables: {
      [PROCESS_VARS.QUALITY_SCORE]: 0,
      [PROCESS_VARS.COMPLIANCE_SCORE]: 0,
      [PROCESS_VARS.ERROR_COUNT]: 0,
      [PROCESS_VARS.WARNING_COUNT]: 0,
      [PROCESS_VARS.ISSUE_COUNT]: 0,
      [PROCESS_VARS.REGRESSION_COUNT]: 0,
      [PROCESS_VARS.FEEDBACK_COUNT]: 0,
      [PROCESS_VARS.SCAN_COUNT]: 0,
    },
    history: [],
    controlPoints: {},
    alarms: [],
    startedAt: new Date().toISOString(),
  };
}

// Update process variables from scan result
export function updateVariables(state, scanResult, complianceResult = null, regressionResult = null) {
  state.variables[PROCESS_VARS.QUALITY_SCORE] = scanResult.score;
  state.variables[PROCESS_VARS.ERROR_COUNT] = scanResult.errors;
  state.variables[PROCESS_VARS.WARNING_COUNT] = scanResult.warnings;
  state.variables[PROCESS_VARS.ISSUE_COUNT] = scanResult.totalIssues;
  state.variables[PROCESS_VARS.SCAN_COUNT]++;

  if (complianceResult !== null) {
    state.variables[PROCESS_VARS.COMPLIANCE_SCORE] = complianceResult;
  }

  if (regressionResult) {
    state.variables[PROCESS_VARS.REGRESSION_COUNT] = regressionResult.regressions?.length || 0;
  }

  // Record history
  state.history.push({
    timestamp: new Date().toISOString(),
    scanCount: state.variables[PROCESS_VARS.SCAN_COUNT],
    qualityScore: state.variables[PROCESS_VARS.QUALITY_SCORE],
    complianceScore: state.variables[PROCESS_VARS.COMPLIANCE_SCORE],
    errorCount: state.variables[PROCESS_VARS.ERROR_COUNT],
    issueCount: state.variables[PROCESS_VARS.ISSUE_COUNT],
  });

  // Check alarms
  checkAlarms(state);

  return state;
}

// Check for alarm conditions
export function checkAlarms(state) {
  const alarms = [];
  const q = state.variables[PROCESS_VARS.QUALITY_SCORE];

  if (q < state.setpoint * 0.5) {
    alarms.push({ level: 'critical', message: `Quality score ${q} is below 50% of setpoint (${state.setpoint}). Major issues remain.` });
  } else if (q < state.setpoint) {
    alarms.push({ level: 'warning', message: `Quality score ${q} is below setpoint (${state.setpoint}). ${state.setpoint - q} points to go.` });
  }

  const regressions = state.variables[PROCESS_VARS.REGRESSION_COUNT];
  if (regressions > 0) {
    alarms.push({ level: 'warning', message: `${regressions} regression(s) detected since last scan.` });
  }

  const errors = state.variables[PROCESS_VARS.ERROR_COUNT];
  if (errors > 0) {
    alarms.push({ level: 'error', message: `${errors} error(s) must be fixed before passing.` });
  }

  state.alarms = alarms;
  return alarms;
}

// Determine if a control point requires human intervention
export function requiresHuman(state, controlPointId) {
  const cp = CONTROL_POINTS[controlPointId];
  if (!cp) return false;
  if (cp.humanRequired) return true;
  if (state.mode === CONTROL_MODES.MANUAL) return true;
  if (state.mode === CONTROL_MODES.SEMI_AUTO && !cp.agentCanOverride) return true;
  return false;
}

// Generate a control report
export function formatControlReport(state) {
  const lines = [];
  const q = state.variables[PROCESS_VARS.QUALITY_SCORE];
  const c = state.variables[PROCESS_VARS.COMPLIANCE_SCORE];
  const setpoint = state.setpoint;

  lines.push('');
  lines.push('━'.repeat(60));
  lines.push('  Process Control Report');
  lines.push('━'.repeat(60));
  lines.push('');

  // Setpoint tracking
  const progress = Math.min(100, Math.round((q / setpoint) * 100));
  const bar = '█'.repeat(Math.round(progress / 5)) + '░'.repeat(20 - Math.round(progress / 5));
  lines.push(`  Setpoint: ${setpoint}/100`);
  lines.push(`  Current:  ${q}/100  [${bar}] ${progress}%`);
  lines.push(`  Compliance: ${c}%`);
  lines.push('');

  // Process variables
  lines.push('  Process variables:');
  lines.push(`    Quality score:     ${q}/100`);
  lines.push(`    Compliance score:  ${c}%`);
  lines.push(`    Errors:            ${state.variables[PROCESS_VARS.ERROR_COUNT]}`);
  lines.push(`    Warnings:          ${state.variables[PROCESS_VARS.WARNING_COUNT]}`);
  lines.push(`    Total issues:      ${state.variables[PROCESS_VARS.ISSUE_COUNT]}`);
  lines.push(`    Regressions:       ${state.variables[PROCESS_VARS.REGRESSION_COUNT]}`);
  lines.push(`    Scans:             ${state.variables[PROCESS_VARS.SCAN_COUNT]}`);
  lines.push('');

  // Alarms
  if (state.alarms.length > 0) {
    lines.push('  Alarms:');
    for (const alarm of state.alarms) {
      const icon = alarm.level === 'critical' ? '🔴' : alarm.level === 'error' ? '🟠' : '🟡';
      lines.push(`    ${icon} ${alarm.message}`);
    }
    lines.push('');
  } else {
    lines.push('  ✓ No alarms. All process variables within acceptable range.');
    lines.push('');
  }

  // Control points
  lines.push('  Control points:');
  for (const [id, cp] of Object.entries(CONTROL_POINTS)) {
    const human = cp.humanRequired ? '👤 human' : '🤖 agent';
    const status = state.controlPoints[id] ? '✓ done' : '○ pending';
    lines.push(`    ${status} ${cp.name} (${human})`);
  }
  lines.push('');

  // History
  if (state.history.length > 1) {
    lines.push('  History:');
    for (const h of state.history.slice(-5)) {
      lines.push(`    Scan ${h.scanCount}: Q=${h.qualityScore} C=${h.complianceScore}% E=${h.errorCount} I=${h.issueCount}`);
    }
    lines.push('');
  }

  // Mode
  lines.push(`  Mode: ${state.mode} | Started: ${state.startedAt}`);
  lines.push('━'.repeat(60));
  lines.push('');

  return lines.join('\n');
}

// Mark a control point as completed
export function completeControlPoint(state, controlPointId, result = {}) {
  state.controlPoints[controlPointId] = {
    completedAt: new Date().toISOString(),
    result,
  };
  return state;
}

// Generate a control decision (what should happen next)
export function getControlDecision(state) {
  const q = state.variables[PROCESS_VARS.QUALITY_SCORE];
  const c = state.variables[PROCESS_VARS.COMPLIANCE_SCORE];
  const errors = state.variables[PROCESS_VARS.ERROR_COUNT];
  const regressions = state.variables[PROCESS_VARS.REGRESSION_COUNT];

  if (errors > 0) {
    return { action: 'fix-errors', priority: 'high', message: `${errors} error(s) must be fixed before proceeding.` };
  }
  if (q < state.setpoint) {
    return { action: 'fix-warnings', priority: 'medium', message: `Quality ${q}/${state.setpoint}. Fix warnings to reach threshold.` };
  }
  if (c < 90) {
    return { action: 'fix-compliance', priority: 'medium', message: `Compliance ${c}%. ${100 - c}% of required states missing.` };
  }
  if (regressions > 0) {
    return { action: 'fix-regressions', priority: 'high', message: `${regressions} regression(s) need attention.` };
  }
  return { action: 'feel-check', priority: 'low', message: 'All automated checks pass. Human should verify "feel."' };
}
