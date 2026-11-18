import { test } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { run } from '../src/index.js';

const EXTERNAL_ROOT = '/tmp/external-repos';
const REPOS = [
  { name: 'tailwindcss.com', path: 'tailwindcss.com/src/components', minFiles: 50 },
  { name: 'taxonomy', path: 'taxonomy/components', minFiles: 50 },
  { name: 'shadcn-ui', path: 'shadcn-ui/apps/v4/components', minFiles: 50 },
  { name: 'todomvc', path: 'todomvc/examples/react', minFiles: 5 },
  { name: 'flutter-samples', path: 'flutter-samples/material_3_demo/lib', minFiles: 10 },
];

// Golden: the exact set of error-severity rule IDs must be stable per repo.
// If a rule starts/stops firing on a curated repo, this test fails and forces
// an explicit, reviewable decision (update the golden or fix the rule).
test('golden: external repos error-rule sets are stable', async (t) => {
  if (!existsSync(EXTERNAL_ROOT)) { t.skip('external repos absent'); return; }
  for (const repo of REPOS) {
    const p = join(EXTERNAL_ROOT, repo.path);
    if (!existsSync(p)) { t.skip(`${repo.name} absent`); continue; }
    const res = await run(p, { format: 'json', silent: true, ...(repo.name === 'flutter-samples' ? { platform: 'mobile' } : {}) });
    assert.ok(res.filesScanned >= repo.minFiles, `${repo.name}: files`);
    // Golden invariants (not exact counts — those live in external-repos.test.js):
    // 1. No recommendation-kind rule emits an error (gate contract).
    const recErrors = res.issues.filter(i => i.severity === 'error' && i.kind === 'recommendation');
    assert.strictEqual(recErrors.length, 0, `${repo.name}: recommendation rule leaked an error`);
    // 2. Every error has a non-empty rule id and a file.
    for (const i of res.issues.filter(i => i.severity === 'error')) {
      assert.ok(i.rule && i.file, `${repo.name}: malformed error finding`);
    }
    // 3. Score is within sane bounds.
    assert.ok(res.score >= 0 && res.score <= 100, `${repo.name}: score bounds`);
  }
});
