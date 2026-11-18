import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/index.js';

test('perf: scanning 1000 files completes within budget', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-perf-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  const template = (i) => `export default function C${i}(){ return <button className="bg-blue-500 hover:bg-blue-600 focus-visible:ring-2 px-4 py-2" onClick={() => {}}>go ${i}</button>; }\n`;
  for (let i = 0; i < 1000; i++) {
    writeFileSync(join(dir, 'src', `C${i}.jsx`), template(i));
  }
  const t0 = Date.now();
  const res = await run(join(dir, 'src'), { format: 'json', silent: true });
  const elapsed = Date.now() - t0;
  assert.ok(res.filesScanned === 1000, `expected 1000 files, got ${res.filesScanned}`);
  // Generous budget: 30s. Real projects rarely exceed a few hundred files.
  assert.ok(elapsed < 30000, `scan took ${elapsed}ms, budget 30000ms`);
  console.log(`  perf: 1000 files in ${elapsed}ms (${(elapsed/1000).toFixed(1)}ms/file)`);
  rmSync(dir, { recursive: true, force: true });
});
