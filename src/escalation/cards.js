// src/escalation/cards.js — Escalation protocol for agent→human

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ESCALATION_FILE = '.uiq-escalations.json';

// Issue types that require human judgment (can't be auto-fixed)
const ESCALATION_TRIGGERS = {
  'motion/reduced-motion': {
    reason: 'Requires design decision: which animations to keep vs. remove for reduced motion',
    options: ['Remove all animations', 'Reduce to opacity-only', 'Replace with instant transitions', 'Keep but slow down'],
  },
  'interaction/hover-state': {
    reason: 'Requires design decision: what hover feedback is appropriate for this component',
    options: ['Color shift', 'Scale + shadow', 'Underline', 'Background highlight', 'None (not interactive)'],
  },
  'consistency/no-generic-cta': {
    reason: 'Requires brand decision: what color should CTAs use',
    options: ['Use primary brand color', 'Use accent color', 'Keep blue (intentional)'],
  },
  'a11y/focus-management': {
    reason: 'Requires implementation decision: how to trap and restore focus',
    options: ['Use focus-trap library', 'Manual focus management', 'Native dialog element'],
  },
  'motion/no-layout-animation': {
    reason: 'Requires refactoring: animation uses layout properties that cause jank',
    options: ['Convert to transform/opacity', 'Use FLIP technique', 'Remove animation'],
  },
};

// Load escalations
export function loadEscalations(dir) {
  const path = join(dir, ESCALATION_FILE);
  if (!existsSync(path)) return { escalations: [] };
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return { escalations: [] };
  }
}

// Save escalations
export function saveEscalations(dir, data) {
  const path = join(dir, ESCALATION_FILE);
  writeFileSync(path, JSON.stringify(data, null, 2));
  return path;
}

// Create escalation from an issue
export function createEscalation(issue, context = {}) {
  const trigger = ESCALATION_TRIGGERS[issue.rule];
  return {
    id: `esc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    rule: issue.rule,
    severity: issue.severity,
    file: issue.file,
    message: issue.message,
    reason: trigger?.reason || 'Requires human judgment',
    options: trigger?.options || ['Fix manually', 'Skip this rule', 'Disable rule'],
    context: {
      component: context.component || 'unknown',
      decision: context.decision || null,
      qualityScore: context.qualityScore || null,
    },
    resolved: false,
    resolution: null,
    resolvedBy: null,
    resolvedAt: null,
  };
}

// Generate escalations from scan results
export function generateEscalations(scanResult, decisions = []) {
  const escalations = [];
  const decisionMap = {};
  for (const d of decisions) {
    decisionMap[d.file] = d;
  }

  for (const issue of scanResult.issues) {
    if (issue.severity !== 'error') continue;
    if (!ESCALATION_TRIGGERS[issue.rule]) continue;

    const dec = decisionMap[issue.file];
    const esc = createEscalation(issue, {
      component: dec?.component,
      decision: dec ? {
        requiredStates: dec.requiredStates,
        recommendedMotion: dec.recommendedMotion,
      } : null,
      qualityScore: scanResult.score,
    });
    escalations.push(esc);
  }

  return escalations;
}

// Add escalations to file
export function addEscalations(dir, newEscalations) {
  const data = loadEscalations(dir);
  data.escalations.push(...newEscalations);
  saveEscalations(dir, data);
  return data;
}

// Resolve an escalation
export function resolveEscalation(dir, id, resolution, resolvedBy) {
  const data = loadEscalations(dir);
  const esc = data.escalations.find(e => e.id === id);
  if (esc) {
    esc.resolved = true;
    esc.resolution = resolution;
    esc.resolvedBy = resolvedBy || 'human';
    esc.resolvedAt = new Date().toISOString();
    saveEscalations(dir, data);
  }
  return esc;
}

// Get pending escalations
export function getPending(dir) {
  const data = loadEscalations(dir);
  return data.escalations.filter(e => !e.resolved);
}

// Format escalation report
export function formatEscalationReport(dir) {
  const data = loadEscalations(dir);
  const pending = data.escalations.filter(e => !e.resolved);

  const lines = [];
  lines.push('');
  lines.push('━'.repeat(60));
  lines.push('  Escalation Report');
  lines.push('━'.repeat(60));
  lines.push('');

  if (data.escalations.length === 0) {
    lines.push('  No escalations recorded.');
    return lines.join('\n');
  }

  lines.push(`  Total: ${data.escalations.length} | Pending: ${pending.length} | Resolved: ${data.escalations.length - pending.length}`);
  lines.push('');

  if (pending.length > 0) {
    lines.push('  Pending (needs human decision):');
    for (const esc of pending) {
      lines.push('');
      lines.push(`  ┌─ [${esc.id}] ${esc.rule}`);
      lines.push(`  │  File: ${esc.file.split('/').pop()}`);
      lines.push(`  │  Issue: ${esc.message}`);
      lines.push(`  │  Why escalated: ${esc.reason}`);
      lines.push(`  │  Options:`);
      for (let i = 0; i < esc.options.length; i++) {
        lines.push(`  │    ${i + 1}. ${esc.options[i]}`);
      }
      if (esc.context.component) {
        lines.push(`  │  Component: ${esc.context.component}`);
      }
      lines.push(`  └─ Resolve: uiq escalate resolve ${esc.id} --option <number>`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
