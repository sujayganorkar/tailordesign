// scripts/mutation-test.js - Lightweight mutation testing for uiq rules.
//
// For each target file, applies simple syntactic mutations (operator flips,
// threshold nudges) one at a time, runs `npm test`, and reports whether the
// mutation was "killed" (tests failed) or "survived" (tests passed). A high
// survival rate means the tests don't actually exercise that code.
//
// Usage: node scripts/mutation-test.js [file ...]
// Defaults to a handful of high-value rule files.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const DEFAULT_TARGETS = [
  'src/rules/motion.js',
  'src/rules/interaction.js',
  'src/rules/a11y.js',
  'src/utils/score.js',
  'src/utils/suppress.js',
];

const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_TARGETS;

// Simple mutation operators: each returns an array of {label, mutate(text)->text|null}
const OPERATORS = [
  { label: 'gt->lt', apply: (t) => t.replace(' > ', ' < ') },
  { label: 'gte->lte', apply: (t) => t.replace(' >= ', ' <= ') },
  { label: 'eq->neq', apply: (t) => t.replace(' === ', ' !== ') },
  { label: 'plus->minus', apply: (t) => t.replace(' + ', ' - ') },
  { label: 'and->or', apply: (t) => t.replace(' && ', ' || ') },
  { label: 'true->false', apply: (t) => t.replace(/\btrue\b/, 'false') },
];

function runTests() {
  try {
    execSync('npm test', { cwd: ROOT, stdio: 'pipe', timeout: 180000 });
    return { killed: false };
  } catch (e) {
    return { killed: true, output: (e.stdout || '').toString().slice(-400) };
  }
}

let totalMutants = 0, killed = 0, survived = 0, skipped = 0;

for (const rel of targets) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) { console.log(`skip (missing): ${rel}`); continue; }
  const original = readFileSync(abs, 'utf-8');
  const backup = original + '\n/*__MUTATION_BACKUP__*/';

  console.log(`\n=== ${rel} ===`);
  for (const op of OPERATORS) {
    const mutated = op.apply(original);
    if (mutated === original) { skipped++; continue; }
    totalMutants++;
    writeFileSync(abs, mutated);
    const r = runTests();
    // restore immediately
    writeFileSync(abs, original);
    if (r.killed) { killed++; console.log(`  KILLED   ${op.label}`); }
    else { survived++; console.log(`  SURVIVED ${op.label}  <-- weak test coverage`); }
  }
}

// Restore all (safety)
for (const rel of targets) {
  // already restored per-mutant; nothing to do
}

console.log(`\n=== Summary ===`);
console.log(`mutants: ${totalMutants}  killed: ${killed}  survived: ${survived}  skipped(no-op): ${skipped}`);
console.log(`kill rate: ${totalMutants ? Math.round((killed/totalMutants)*100) : 0}%`);
console.log('Survived mutants indicate rules/logic not covered by tests — add adversarial cases.');
