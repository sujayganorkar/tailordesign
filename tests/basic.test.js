import { test } from 'node:test';
import assert from 'node:assert';
import { run } from '../src/index.js';

test('bad component scores below threshold', async () => {
  const result = await run('tests/fixtures/BadComponent.jsx', { format: 'json' });
  assert.ok(result.score < 80, `Expected score < 80, got ${result.score}`);
  assert.ok(result.errors > 0, 'Expected errors');
});

test('good component scores above bad component', async () => {
  const bad = await run('tests/fixtures/BadComponent.jsx', { format: 'json' });
  const good = await run('tests/fixtures/GoodComponent.jsx', { format: 'json' });
  assert.ok(good.score > bad.score, `Good (${good.score}) should score higher than bad (${bad.score})`);
});

test('good css passes', async () => {
  const result = await run('tests/fixtures/good.css', { format: 'json' });
  assert.strictEqual(result.totalIssues, 0, `Expected 0 issues, got ${result.totalIssues}`);
  assert.ok(result.passed, 'Expected pass');
});

test('bad css fails', async () => {
  const result = await run('tests/fixtures/bad.css', { format: 'json' });
  assert.ok(result.totalIssues > 0, 'Expected issues');
  assert.ok(!result.passed, 'Expected fail');
});

test('json output is valid', async () => {
  const result = await run('tests/fixtures/BadComponent.jsx', { format: 'json' });
  assert.ok(typeof result.score === 'number');
  assert.ok(Array.isArray(result.issues));
  assert.ok(result.issues.length > 0);
  assert.ok(result.issues[0].rule);
  assert.ok(result.issues[0].severity);
  assert.ok(result.issues[0].message);
  assert.ok(result.issues[0].file);
});
