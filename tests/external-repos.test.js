import { test } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { run } from '../src/index.js';

const EXTERNAL_ROOT = '/tmp/external-repos';

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
    assert.strictEqual(res.passed, true, `${repo.name}: audit must pass`);

    const hoverIssues = res.issues.filter(i => i.rule === 'interaction/hover-state');
    assert.ok(
      hoverIssues.length <= repo.maxHoverIssues,
      `${repo.name}: hover issues (${hoverIssues.length}) exceeded max allowed false positive threshold (${repo.maxHoverIssues})`
    );
  }
});
