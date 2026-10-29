// src/loop/agent-loop.js - Agentic refinement loop with guards
//
// Workflow: Inspect -> Decide -> Implement (human/agent) -> Render -> Evaluate -> Refine -> Verify
// This module automates the Inspect/Evaluate/Verify portions and provides
// guards against infinite loops, score gaming, and unnecessary changes.

export const LOOP_DEFAULTS = {
  maxIterations: 5,
  minImprovement: 2, // minimum score improvement per iteration to continue
  complianceFloor: 80,
};

export function createLoopState(options = {}) {
  return {
    iteration: 0,
    maxIterations: options.maxIterations || LOOP_DEFAULTS.maxIterations,
    history: [], // { iteration, score, compliance, issues }
    stopped: false,
    stopReason: null,
  };
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
  if (state.history.length === 0) return true;
  const prev = state.history[state.history.length - 1];
  // Score gaming guard: score up but compliance down
  if (newResult.score > prev.score && (newResult.complianceScore ?? 100) < prev.compliance - 5) {
    state.stopped = true;
    state.stopReason = 'score-gaming-detected';
    return false;
  }
  // Plateau guard: no meaningful improvement
  if (state.history.length >= 2) {
    const lastTwo = state.history.slice(-2);
    const improvement = newResult.score - lastTwo[0].score;
    if (improvement < LOOP_DEFAULTS.minImprovement && newResult.score >= (state.history[0].score + LOOP_DEFAULTS.minImprovement)) {
      // already plateaued
    }
    if (newResult.score <= prev.score && state.iteration > 1) {
      state.stopped = true;
      state.stopReason = 'plateau';
      return false;
    }
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
