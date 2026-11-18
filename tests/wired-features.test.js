import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runFull } from '../src/workflow/full.js';
import {
  createLoopState, recordIteration, shouldContinue,
  loadLoopState, saveLoopState, clearLoopState, loopStateDir, LOOP_STATE_FILE,
} from '../src/loop/agent-loop.js';
import {
  addEscalations, loadEscalations, resolveEscalation,
} from '../src/escalation/cards.js';
import {
  createProcessState, openControlState, updateVariables,
  saveControlState, loadControlState, resolveControlDir, CONTROL_STATE_FILE,
} from '../src/control/process.js';
import {
  writeMotionSpec, readMotionSpec, approveComponent, getUnapproved, getSpecSummary, verifyAgainstSpec,
} from '../src/spec/motion-spec.js';
import { setPlatform } from '../src/platform.js';

function tempProject(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-wired-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, 'src', name), content);
  }
  return dir;
}

const BAD = `import React from 'react';
export default function Bad({ onClick }) {
  return (
    <div onClick={onClick} className="card">
      <button className="bg-blue-500 text-white px-4 py-2 rounded">Go</button>
    </div>
  );
}
`;

// ── Loop: cross-invocation guards ──────────────────────────────────────────

test('loop: state persists across invocations and plateau guard stops it', () => {
  const dir = tempProject({ 'Bad.jsx': BAD });
  try {
    const stateDir = loopStateDir(dir);
    clearLoopState(stateDir);

    const state = createLoopState({ maxIterations: 5 });
    const r1 = { score: 60, complianceScore: 50, totalIssues: 4 };
    recordIteration(state, r1);
    state.iteration = state.history.length;
    assert.strictEqual(shouldContinue(state, r1), true, 'first iteration continues');
    saveLoopState(stateDir, state);

    const reloaded = loadLoopState(stateDir);
    assert.ok(reloaded, 'loop state must persist to disk');
    assert.strictEqual(reloaded.history.length, 1);

    // Second invocation with no improvement -> plateau guard stops the loop.
    reloaded.iteration = reloaded.history.length;
    const r2 = { score: 60, complianceScore: 50, totalIssues: 4 };
    recordIteration(reloaded, r2);
    reloaded.iteration = reloaded.history.length;
    assert.strictEqual(shouldContinue(reloaded, r2), false, 'no improvement stops the loop');
    assert.strictEqual(reloaded.stopReason, 'plateau');
    clearLoopState(stateDir);
    assert.strictEqual(loadLoopState(stateDir), null, 'cleared state must be gone');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loop: max-iterations guard engages on persisted history', () => {
  const state = createLoopState({ maxIterations: 2 });
  recordIteration(state, { score: 50, complianceScore: 50, totalIssues: 5 });
  state.iteration = 1;
  recordIteration(state, { score: 55, complianceScore: 50, totalIssues: 4 });
  state.iteration = 2;
  // Improvement happened, but the iteration budget is exhausted.
  assert.strictEqual(shouldContinue(state, { score: 58, complianceScore: 50, totalIssues: 3 }), false);
  assert.strictEqual(state.stopReason, 'max-iterations');
});

test('loop: score-gaming guard stops when score rises but compliance drops', () => {
  const state = createLoopState({ maxIterations: 5 });
  recordIteration(state, { score: 60, complianceScore: 80, totalIssues: 4 });
  state.iteration = 1;
  // Score rose 60 -> 70 while compliance fell 80 -> 60: the loop must refuse.
  const r2 = { score: 70, complianceScore: 60, totalIssues: 3 };
  recordIteration(state, r2);
  state.iteration = 2;
  assert.strictEqual(shouldContinue(state, r2), false);
  assert.strictEqual(state.stopReason, 'score-gaming-detected');
});

// ── Escalations: dedupe + resolution stops regeneration ────────────────────

test('escalations: same rule+file is not duplicated; resolution stops re-raising', () => {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-esc-'));
  try {
    const card = (msg) => ({ rule: 'a11y/focus-management', severity: 'error', file: '/p/src/Modal.jsx', message: msg });
    const first = addEscalations(dir, [card('missing focus trap')]);
    assert.strictEqual(first.length, 1);
    const again = addEscalations(dir, [card('missing focus trap')]);
    assert.strictEqual(again.length, 0, 'duplicate card must not be appended');

    const data = loadEscalations(dir);
    const id = data.escalations[0].id;
    resolveEscalation(dir, id, 'accepted', 'human');

    const afterResolve = addEscalations(dir, [card('missing focus trap (recounted)')]);
    assert.strictEqual(afterResolve.length, 0, 'resolved card must not be re-raised');
    const final = loadEscalations(dir);
    assert.strictEqual(final.escalations.length, 1, 'no escalation spam');
    assert.strictEqual(final.escalations[0].resolved, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Control: persisted state accumulates ───────────────────────────────────

test('control: state persists across runs (scan count, history)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-ctl-'));
  try {
    const stateDir = resolveControlDir(dir);
    const s1 = openControlState(stateDir, 80);
    assert.strictEqual(s1.variables.scan_count, 0);
    updateVariables(s1, { score: 70, errors: 1, warnings: 2, totalIssues: 4 }, null, null);
    saveControlState(stateDir, s1);
    assert.ok(existsSync(join(stateDir, CONTROL_STATE_FILE)), 'control state file must exist');

    const s2 = openControlState(stateDir, 80);
    assert.strictEqual(s2.variables.scan_count, 1, 'scan count resumes from persisted state');
    updateVariables(s2, { score: 72, errors: 0, warnings: 1, totalIssues: 2 }, null, { regressions: [] });
    saveControlState(stateDir, s2);
    assert.strictEqual(s2.history.length, 2, 'history accumulates');

    const s3 = openControlState(stateDir, 90);
    assert.strictEqual(s3.setpoint, 90, 'setpoint stays configurable on resume');
    assert.strictEqual(loadControlState(stateDir).variables.scan_count, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Spec: lifecycle (write -> show -> approve -> verify) ───────────────────

test('spec: approve flow persists and getUnapproved reflects it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-spec-'));
  try {
    const file = '/p/src/Modal.jsx';
    const spec = { version: 1, components: { [`${file}::Modal`]: { file, component: 'Modal', requiredStates: ['open'], motion: [] } } };
    writeMotionSpec(spec, dir);
    const loaded = readMotionSpec(dir);
    assert.ok(loaded, 'spec round-trips through disk');
    assert.strictEqual(getUnapproved(loaded).length, 1);

    approveComponent(loaded, file, 'Modal', 'sujay');
    writeMotionSpec(loaded, dir);
    const after = readMotionSpec(dir);
    const summary = getSpecSummary(after);
    assert.strictEqual(summary.approved, 1);
    assert.strictEqual(summary.unapproved, 0);
    assert.strictEqual(getUnapproved(after).length, 0);
    assert.strictEqual(after.components[`${file}::Modal`].approvedBy, 'sujay');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('full workflow: verifies against an existing motion-spec.json', async () => {
  const dir = tempProject({ 'Modal.jsx': `import React from 'react';\nexport default function Modal({ open }) {\n  return <div className="transition-all duration-100" style={{ display: open ? 'block' : 'none' }}>content</div>;\n}\n` });
  try {
    // Spec expects ~300ms for this component's motion; code says 100ms.
    const file = join(dir, 'src', 'Modal.jsx');
    const spec = {
      version: 1,
      components: {
        [`${file}::Modal`]: { file, component: 'Modal', requiredStates: [], motion: [{ pattern: 'fade', duration: 300 }] },
      },
    };
    writeMotionSpec(spec, dir);
    const res = await runFull(dir, { format: 'json', silent: true });
    assert.ok(res.specConformance, 'spec conformance must be reported when a spec exists');
    assert.strictEqual(res.specConformance.checked, res.filesScanned);
    assert.strictEqual(res.specConformance.matchedComponents, 1, 'spec component must match the scanned file');
    assert.ok(res.specConformance.violations.length > 0, 'duration mismatch must be a visible violation');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('full workflow: control option attaches persisted control summary', async () => {
  const dir = tempProject({ 'Ok.jsx': `export default function Ok() {\n  return <button className="hover:bg-gray-100 focus-visible:ring-2 min-h-[44px]">ok</button>;\n}\n` });
  try {
    const r1 = await runFull(dir, { format: 'json', silent: true, control: true, minScore: 80 });
    assert.ok(r1.control, 'control summary attached');
    const scans1 = r1.control.scans;
    const r2 = await runFull(dir, { format: 'json', silent: true, control: true, minScore: 80 });
    assert.strictEqual(r2.control.scans, scans1 + 1, 'control scan count accumulates across runs');
    assert.ok(r2.control.history.length >= 2, 'control history accumulates');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Platform: only supported values ────────────────────────────────────────

test('platform: desktop/all are rejected (cut, not half-implemented)', () => {
  assert.strictEqual(setPlatform('mobile'), undefined);
  assert.strictEqual(setPlatform('web'), undefined);
  assert.strictEqual(setPlatform('auto'), undefined);
  setPlatform('auto');
  assert.throws(() => setPlatform('desktop'), /Unsupported platform/);
  assert.throws(() => setPlatform('all'), /Unsupported platform/);
});
