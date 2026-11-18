import { test } from 'node:test';
import assert from 'node:assert';
import { run } from '../src/index.js';
import { calculateScore } from '../src/utils/score.js';
import { getRuleKind } from '../src/config.js';

test('every issue has a kind field', async () => {
  const result = await run('tests/fixtures/BadComponent.jsx', { format: 'json' });
  for (const i of result.issues) {
    assert.ok(i.kind === 'objective' || i.kind === 'recommendation', `issue ${i.rule} missing kind`);
  }
});

test('getRuleKind returns objective for a11y rules', () => {
  assert.strictEqual(getRuleKind('a11y/keyboard-nav'), 'objective');
  assert.strictEqual(getRuleKind('motion/reduced-motion'), 'objective');
  assert.strictEqual(getRuleKind('consistency/no-generic-cta'), 'recommendation');
});

test('calculateScore is size-independent (many clean files)', () => {
  const issues = [{ severity: 'warning', file: 'a.jsx' }];
  const scoreSmall = calculateScore(issues, 1);
  const scoreLarge = calculateScore(issues, 100);
  // With 100 files, one warning in one file should score ~99, not tanked
  assert.ok(scoreLarge >= 95, `large project score too low: ${scoreLarge}`);
  assert.ok(scoreSmall < scoreLarge || scoreSmall === scoreLarge, 'smaller should not score higher');
});

test('calculateScore returns 100 for no issues', () => {
  assert.strictEqual(calculateScore([], 5), 100);
});

test('false positive: file with hover on one element but not another still reports hover-state only if none', async () => {
  // GoodComponent should not report hover-state
  const result = await run('tests/fixtures/GoodComponent.jsx', { format: 'json' });
  const hoverIssues = result.issues.filter(i => i.rule === 'interaction/hover-state');
  assert.strictEqual(hoverIssues.length, 0, 'GoodComponent should have hover state');
});

test('loading-state false positive reduced: component mentioning "loading" in comment only', async () => {
  const { writeFileSync, unlinkSync, mkdirSync } = await import('fs');
  const { tmpdir } = await import('os');
  const { join } = await import('path');
  const dir = join(tmpdir(), 'uiq-fp-test');
  mkdirSync(dir, { recursive: true });
  const f = join(dir, 'comp.jsx');
  writeFileSync(f, `import React from 'react';\n// loading state handled elsewhere\nexport default function C(){ return <button onClick={()=>{}}>x</button>; }`);
  const result = await run(f, { format: 'json' });
  const loadingIssues = result.issues.filter(i => i.rule === 'interaction/loading-state');
  assert.strictEqual(loadingIssues.length, 0, 'should not flag loading-state without data fetching');
  unlinkSync(f);
});

test('kind field present in full workflow output', async () => {
  const { runFull } = await import('../src/workflow/full.js');
  const result = await runFull('tests/fixtures/BadComponent.jsx', { format: 'json' });
  for (const i of result.issues) {
    assert.ok(i.kind === 'objective' || i.kind === 'recommendation');
  }
});
