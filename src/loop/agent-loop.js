// src/loop/agent-loop.js - Agentic refinement loop with guards
//
// Workflow: Inspect -> Decide -> Implement (human/agent) -> Render -> Evaluate -> Refine -> Verify
// This module automates the Inspect/Evaluate/Verify portions and provides
// guards against infinite loops, score gaming, and unnecessary changes.
//
// The loop is cross-invocation: state is persisted to `.uiq-loop.json` in the
// target directory, so each `uiq loop` run records one iteration against the
// previous ones. The guards (max-iterations, plateau, score-gaming, target)
// evaluate the whole history, not a single sample. When the loop stops, the
// state file is cleared so the next `uiq loop` starts a fresh loop.

import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';

export const LOOP_STATE_FILE = '.uiq-loop.json';

export const LOOP_DEFAULTS = {
  maxIterations: 5,
  minImprovement: 2, // minimum score improvement per iteration to continue
};

export function createLoopState(options = {}) {
  return {
    startedAt: new Date().toISOString(),
    iteration: 0,
    maxIterations: options.maxIterations || LOOP_DEFAULTS.maxIterations,
    history: [], // { iteration, score, compliance, issues }
    stopped: false,
    stopReason: null,
  };
}

// Resolve the directory loop state lives in (same convention as state/escalations:
// a file target maps to its parent directory; a directory maps to itself).
export function loopStateDir(targetPath) {
  try {
    return statSync(targetPath).isFile() ? join(targetPath, '..') : targetPath;
  } catch {
    return targetPath;
  }
}

export function loadLoopState(dir) {
  const path = join(dir, LOOP_STATE_FILE);
  if (!existsSync(path)) return null;
  try {
    const state = JSON.parse(readFileSync(path, 'utf-8'));
    if (typeof state !== 'object' || state === null || !Array.isArray(state.history)) return null;
    return state;
  } catch {
    return null;
  }
}

export function saveLoopState(dir, state) {
  writeFileSync(join(dir, LOOP_STATE_FILE), JSON.stringify(state, null, 2));
}

export function clearLoopState(dir) {
  const path = join(dir, LOOP_STATE_FILE);
  if (existsSync(path)) unlinkSync(path);
}

export function recordIteration(state, result) {
  state.history.push({
    iteration: state.iteration,
    score: result.score,
    compliance: result.complianceScore ?? 100,
    issues: result.totalIssues,
  });
}

export function shouldContinue(state, newResult) {
  if (state.iteration >= state.maxIterations) {
    state.stopped = true;
    state.stopReason = 'max-iterations';
    return false;
  }
  // First iteration: nothing to compare against yet.
  if (state.history.length <= 1) return true;
  // `newResult` is the just-recorded current iteration; compare against the
  // PREVIOUS one (history[length-2]).
  const prev = state.history[state.history.length - 2];
  // Score gaming guard: score up but compliance down
  if (newResult.score > prev.score && (newResult.complianceScore ?? 100) < prev.compliance - 5) {
    state.stopped = true;
    state.stopReason = 'score-gaming-detected';
    return false;
  }
  // Plateau guard: less than the minimum meaningful improvement per iteration.
  const improvement = newResult.score - prev.score;
  if (improvement < LOOP_DEFAULTS.minImprovement) {
    state.stopped = true;
    state.stopReason = 'plateau';
    return false;
  }
  // Target reached
  if (newResult.score >= 90 && (newResult.complianceScore ?? 100) >= 90) {
    state.stopped = true;
    state.stopReason = 'target-reached';
    return false;
  }
  return true;
}

export function formatLoopReport(state) {
  const lines = [];
  lines.push('');
  lines.push('━'.repeat(60));
  lines.push('  Agentic Refinement Loop Report');
  lines.push('━'.repeat(60));
  lines.push('');
  lines.push(`  Iterations: ${state.history.length}/${state.maxIterations}`);
  lines.push(`  Stop reason: ${state.stopReason || 'n/a'}`);
  lines.push('');
  for (const h of state.history) {
    lines.push(`  Iter ${h.iteration}: score=${h.score} compliance=${h.compliance}% issues=${h.issues}`);
  }
  lines.push('');
  if (state.history.length >= 2) {
    const first = state.history[0];
    const last = state.history[state.history.length - 1];
    lines.push(`  Net change: score ${first.score} -> ${last.score} (${last.score - first.score >= 0 ? '+' : ''}${last.score - first.score})`);
  }
  lines.push('━'.repeat(60));
  lines.push('');
  return lines.join('\n');
}
