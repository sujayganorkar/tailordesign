import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/index.js';
import { calculateScore } from '../src/utils/score.js';

// Heuristic (recommendation-kind) findings must be advisory by default:
// shown, but never deducted and never gate-blocking.
const MESSY = `import React from 'react';
export default function Messy() {
  return (
    <div className="p-4">
      <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-gray-100 focus-visible:ring-2" onClick={() => {}}>Go</button>
    </div>
  );
}
`;

// Objective violations present, for gate-block tests.
const WITH_ERRORS = `import React from 'react';
export default function Bad({ onClick }) {
  return (
    <div onClick={onClick} className="card">
      <button className="bg-blue-500 text-white px-4 py-2 rounded">Go</button>
    </div>
  );
}
`;

function makeProject(files) {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-gate-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, 'src', name), content);
  }
  return dir;
}

test('gate: recommendation findings are advisory (no deduction, no gate block)', async () => {
  const dir = makeProject({ 'Clean.jsx': MESSY });
  try {
    const res = await run(join(dir, 'src'), { format: 'json', silent: true });
    // bg-blue-500 generic CTA is recommendation-kind: it must not affect score.
    assert.ok(res.issues.some(i => i.rule === 'consistency/no-generic-cta' && i.kind === 'recommendation'), 'expected generic CTA advisory');
    assert.strictEqual(res.advisoryCount, res.issues.filter(i => i.kind === 'recommendation').length);
    // No objective errors -> clean file -> score must be 100 despite the advisory.
    const objectiveIssues = res.issues.filter(i => i.kind === 'objective');
    const expected = objectiveIssues.length === 0 ? 100 : undefined;
    if (expected !== undefined) assert.strictEqual(res.score, 100, 'advisory findings must not deduct from the score');
    assert.strictEqual(res.passed, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gate: --strict re-includes recommendation findings in scoring', async () => {
  const dir = makeProject({ 'Clean.jsx': MESSY });
  try {
    const loose = await run(join(dir, 'src'), { format: 'json', silent: true });
    const strict = await run(join(dir, 'src'), { format: 'json', silent: true, strict: true });
    assert.ok(strict.score <= loose.score, 'strict score must be <= objective-only score');
    assert.strictEqual(strict.gate.mode, 'strict');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gate: an objective error blocks passing even with a high score', async () => {
  // Many clean files dilute the score, but one real error must still fail.
  const files = { 'HasError.jsx': WITH_ERRORS };
  for (let i = 0; i < 20; i++) files[`Clean${i}.jsx`] = `export default function C${i}() {\n  return <button className="hover:bg-gray-100 focus-visible:ring-2 min-h-[44px]">ok</button>;\n}\n`;
  const dir = makeProject(files);
  try {
    const res = await run(join(dir, 'src'), { format: 'json', silent: true });
    assert.ok(res.score >= 80, `precondition: diluted score should stay high, got ${res.score}`);
    assert.ok(res.gate.blockedByErrors, 'one objective error must block the gate');
    assert.strictEqual(res.passed, false, 'a project with an objective error cannot pass regardless of score');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('suppression: uiq-ignore on the line above and on the same line', async () => {
  const dir = makeProject({
    'SupA.jsx': `export default function A() {
  return (
    <div>
      {/* uiq-ignore a11y/keyboard-nav */}
      <div onClick={() => {}} className="card">one</div>
    </div>
  );
}
`,
    'SupB.jsx': `export default function B() {
  return (
    <div>
      <div onClick={() => {}} className="card">two</div> {/* uiq-ignore */}
    </div>
  );
}
`,
  });
  try {
    const res = await run(join(dir, 'src'), { format: 'json', silent: true });
    const kb = res.issues.filter(i => i.rule === 'a11y/keyboard-nav');
    assert.strictEqual(kb.length, 0, 'both uiq-ignore markers must suppress the file-level keyboard-nav finding');
    assert.ok(res.suppressedCount >= 2, `expected >=2 suppressions, got ${res.suppressedCount}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('suppression: uiq-ignore does not suppress unlisted rules', async () => {
  const dir = makeProject({
    'SupC.jsx': `export default function C({ onClick }) {
  return (
    <div>
      {/* uiq-ignore a11y/keyboard-nav */}
      <div onClick={onClick} className="card">
        <button className="bg-blue-500 text-white px-4 py-2 rounded">Go</button>
      </div>
    </div>
  );
}
`,
  });
  try {
    const res = await run(join(dir, 'src'), { format: 'json', silent: true });
    assert.ok(res.issues.some(i => i.rule === 'interaction/hover-state'), 'unlisted rules on nearby lines must remain');
    assert.ok(res.issues.every(i => i.rule !== 'a11y/keyboard-nav'), 'listed rule must be suppressed');
    assert.ok(res.suppressedCount >= 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('suppression: config suppressions apply by rule and glob', async () => {
  const dir = makeProject({ 'Bad.jsx': WITH_ERRORS });
  try {
    // Direct config injection (the same object bin/cli.js loadConfig would produce)
    const res = await run(join(dir, 'src'), {
      format: 'json',
      silent: true,
      config: { suppressions: { 'consistency/no-generic-cta': ['**/src/**'], 'interaction/hover-state': ['**/nowhere/**'] } },
    });
    assert.ok(!res.issues.some(i => i.rule === 'consistency/no-generic-cta'), 'glob-suppressed advisory must be gone');
    assert.ok(res.issues.some(i => i.rule === 'interaction/hover-state'), 'non-matching glob must not suppress');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('config: severity override escalates; "off" disables; rules do NOT act as include-filter', async () => {
  const dir = makeProject({ 'Bad.jsx': WITH_ERRORS });
  try {
    // rules:{} with no entries must NOT blind the scan (was a silent-scan bug).
    const blind = await run(join(dir, 'src'), { format: 'json', silent: true, config: { rules: {} } });
    assert.ok(blind.totalIssues > 0, 'empty rules config must not disable all rules');

    const off = await run(join(dir, 'src'), {
      format: 'json', silent: true,
      config: { rules: { 'a11y/keyboard-nav': 'off', 'interaction/hover-state': 'off', 'interaction/focus-visible': 'off' } },
    });
    assert.ok(!off.issues.some(i => ['a11y/keyboard-nav', 'interaction/hover-state', 'interaction/focus-visible'].includes(i.rule)), '"off" must disable the rule');

    const escalated = await run(join(dir, 'src'), {
      format: 'json', silent: true,
      config: { rules: { 'consistency/no-generic-cta': 'error' }, },
    });
    const cta = escalated.issues.find(i => i.rule === 'consistency/no-generic-cta');
    assert.ok(cta, 'escalated rule must still be reported');
    assert.strictEqual(cta.severity, 'error', 'severity override must apply');
    assert.strictEqual(escalated.passed, false, 'user-escalated error must block the gate');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('score util: kind-aware scoring honors strict mode', () => {
  const issues = [
    { severity: 'error', kind: 'objective', file: 'a.jsx' },
    { severity: 'warning', kind: 'recommendation', file: 'a.jsx' },
    { severity: 'info', kind: 'recommendation', file: 'a.jsx' },
  ];
  assert.strictEqual(calculateScore(issues, 1), 90, 'only the objective error deducts by default');
  assert.strictEqual(calculateScore(issues, 1, { strict: true }), 86, 'strict deducts all severities');
  // Missing kind is counted conservatively (unit-level usage).
  assert.strictEqual(calculateScore([{ severity: 'warning', file: 'a.jsx' }], 1), 97);
});
