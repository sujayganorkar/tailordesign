import { test } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { run } from '../src/index.js';

const EXTERNAL_ROOT = '/tmp/external-repos';

// Precision baselines recorded from the 2026-11 audit of these repos under the
// objective-only gate (see README "Concreteness contract"). The harness fails
// when counts INCREASE (precision regression); improvements are always allowed.
// Remaining findings above zero are known true-positive debt (e.g. real missing
// reduced-motion handling in framer-motion usage) — tracked, not ignored.
const ERROR_BASELINES = {
  'tailwindcss.com (Next.js + MDX)': 18,
  'shadcn taxonomy (Radix UI + Next.js)': 36,
  'shadcn/ui v4 (Flagship Component Library)': 22,
  'TodoMVC React (Canonical Frontend Benchmark)': 5,
  'Flutter Samples Material 3 Demo (Google Flutter)': 2,
};

test('External Repos Validation: 5 real-world production codebases', async (t) => {
  if (!existsSync(EXTERNAL_ROOT)) {
    t.skip('External repositories not present in /tmp/external-repos, skipping.');
    return;
  }

  const repos = [
    {
      name: 'tailwindcss.com (Next.js + MDX)',
      path: join(EXTERNAL_ROOT, 'tailwindcss.com/src/components'),
      minFiles: 50,
      minScore: 90,
      maxHoverIssues: 5,
    },
    {
      name: 'shadcn taxonomy (Radix UI + Next.js)',
      path: join(EXTERNAL_ROOT, 'taxonomy/components'),
      minFiles: 50,
      minScore: 90,
      maxHoverIssues: 5,
    },
    {
      name: 'shadcn/ui v4 (Flagship Component Library)',
      path: join(EXTERNAL_ROOT, 'shadcn-ui/apps/v4/components'),
      minFiles: 50,
      minScore: 90,
      maxHoverIssues: 10,
    },
    {
      name: 'TodoMVC React (Canonical Frontend Benchmark)',
      path: join(EXTERNAL_ROOT, 'todomvc/examples/react'),
      minFiles: 5,
      minScore: 90,
      maxHoverIssues: 5,
    },
    {
      name: 'Flutter Samples Material 3 Demo (Google Flutter)',
      path: join(EXTERNAL_ROOT, 'flutter-samples/material_3_demo/lib'),
      minFiles: 10,
      minScore: 90,
      maxHoverIssues: 0,
      options: { platform: 'mobile' },
    },
  ];

  for (const repo of repos) {
    if (!existsSync(repo.path)) {
      t.skip(`Repo target ${repo.name} at ${repo.path} not found`);
      continue;
    }

    const res = await run(repo.path, { format: 'json', ...(repo.options || {}) });
    assert.ok(res.filesScanned >= repo.minFiles, `${repo.name}: expected at least ${repo.minFiles} files scanned, got ${res.filesScanned}`);
    assert.ok(res.score >= repo.minScore, `${repo.name}: expected score >= ${repo.minScore}, got ${res.score}`);

    // Gate-contract invariant: no recommendation-kind rule can produce a
    // gate-blocking error by default. (Severity escalations via .uiqrc.json
    // are explicit user decisions and excluded from this invariant.)
    const recErrors = res.issues.filter(i => i.severity === 'error' && i.kind === 'recommendation');
    assert.strictEqual(recErrors.length, 0, `${repo.name}: recommendation-kind rules must not emit error-severity findings by default`);

    // Precision baseline: error counts may only decrease vs. the recorded audit.
    const baseline = ERROR_BASELINES[repo.name];
    assert.ok(
      res.errors <= baseline,
      `${repo.name}: error count ${res.errors} exceeds recorded precision baseline ${baseline} — a false-positive regression likely introduced a new gate-blocking finding`
    );

    const hoverIssues = res.issues.filter(i => i.rule === 'interaction/hover-state');
    assert.ok(
      hoverIssues.length <= repo.maxHoverIssues,
      `${repo.name}: hover issues (${hoverIssues.length}) exceeded max allowed false positive threshold (${repo.maxHoverIssues})`
    );
  }
});
