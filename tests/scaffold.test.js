import { test } from 'node:test';
import assert from 'node:assert';
import { scaffold } from '../src/scaffold/index.js';
import { run } from '../src/index.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';

test('scaffold: new React project scores 100/100 with zero issues', async () => {
  const dir = join(tmpdir(), 'uiq-scaffold-test-' + Date.now());
  try {
    scaffold(dir, { framework: 'react' });
    const result = await run(dir, { format: 'json' });
    assert.strictEqual(result.score, 100, `Expected score 100, got ${result.score}`);
    assert.strictEqual(result.totalIssues, 0, `Expected 0 issues, got ${result.totalIssues}`);
    assert.strictEqual(result.passed, true);
    assert.ok(result.filesScanned >= 5, `Expected >= 5 files, got ${result.filesScanned}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
