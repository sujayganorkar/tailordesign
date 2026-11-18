import { test } from 'node:test';
import assert from 'node:assert';
import { run } from '../src/index.js';
import { runDecisions } from '../src/decisions/index.js';
import { runFull } from '../src/workflow/full.js';

test('corpus: scanner runs without crashing on realistic components', async () => {
  const result = await run('tests/corpus', { format: 'json' });
  assert.ok(typeof result.score === 'number');
  assert.ok(result.filesScanned >= 4, `Expected >=4 files, got ${result.filesScanned}`);
  assert.ok(Array.isArray(result.issues));
});

test('corpus: messy AI-generated component scores below threshold', async () => {
  const result = await run('tests/corpus/MessyAI.jsx', { format: 'json' });
  assert.ok(result.score < 80, `Expected score < 80, got ${result.score}`);
  assert.ok(result.errors > 0, 'Expected errors');
  const rules = result.issues.map(i => i.rule);
  assert.ok(rules.includes('interaction/hover-state') || rules.includes('a11y/keyboard-nav'),
    'Expected interaction/a11y issues');
});

test('corpus: decision engine runs without crashing', async () => {
  const orig = console.log;
  console.log = () => {};
  try {
    await runDecisions('tests/corpus', { format: 'json' });
  } finally {
    console.log = orig;
  }
  assert.ok(true);
});

test('corpus: full workflow runs without crashing', async () => {
  const orig = console.log;
  console.log = () => {};
  try {
    await runFull('tests/corpus', { format: 'json', minScore: 0 });
  } finally {
    console.log = orig;
  }
  assert.ok(true);
});
