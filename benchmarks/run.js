// benchmarks/run.js - Run uiq on benchmark interfaces and report scores.
// Usage: node benchmarks/run.js
// This does NOT fabricate agent comparisons. It reports uiq scores on
// representative interfaces so regressions in rule effectiveness are visible.

import { run } from '../src/index.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const interfaces = ['landing', 'dashboard', 'form'];

for (const name of interfaces) {
  const dir = mkdtempSync(join(tmpdir(), `uiq-bench-${name}-`));
  const src = join(dir, 'src');
  const { mkdirSync } = await import('fs');
  mkdirSync(src, { recursive: true });
  const { readFileSync } = await import('fs');
  const content = readFileSync(`benchmarks/interfaces/${name}.jsx`, 'utf-8');
  writeFileSync(join(src, `${name}.jsx`), content);
  const origLog = console.log;
  console.log = () => {};
  const result = await run(src, { format: 'json' });
  console.log = origLog;
  console.log(`\n=== ${name} ===`);
  console.log(`  score=${result.score} issues=${result.totalIssues} errors=${result.errors} warnings=${result.warnings} infos=${result.infos}`);
  rmSync(dir, { recursive: true, force: true });
}
