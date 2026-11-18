import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/index.js';
import { setPlatform } from '../src/platform.js';

function tempDir() { return mkdtempSync(join(tmpdir(), 'uiq-chaos-')); }

test('chaos: invalid .uiqrc.json (not JSON) is ignored, scan still runs', async () => {
  const dir = tempDir();
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'A.jsx'), `export default function A(){ return <button className="bg-blue-500">go</button>; }`);
  writeFileSync(join(dir, '.uiqrc.json'), '{ this is not json');
  const res = await run(join(dir, 'src'), { format: 'json', silent: true });
  assert.ok(res.totalIssues > 0, 'scan must still find issues');
  rmSync(dir, { recursive: true, force: true });
});

test('chaos: .uiqrc.json with wrong shape is ignored', async () => {
  const dir = tempDir();
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'A.jsx'), `export default function A(){ return <button className="bg-blue-500">go</button>; }`);
  writeFileSync(join(dir, '.uiqrc.json'), JSON.stringify([1,2,3]));
  const res = await run(join(dir, 'src'), { format: 'json', silent: true });
  assert.ok(res.totalIssues > 0);
  rmSync(dir, { recursive: true, force: true });
});

test('chaos: unknown rule IDs in config.rules are ignored, not crash', async () => {
  const dir = tempDir();
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'A.jsx'), `export default function A(){ return <button className="bg-blue-500">go</button>; }`);
  const res = await run(join(dir, 'src'), { format: 'json', silent: true, config: { rules: { 'no/such-rule': 'error' } } });
  assert.ok(res.totalIssues > 0);
  rmSync(dir, { recursive: true, force: true });
});

test('chaos: invalid severity value in config.rules is ignored', async () => {
  const dir = tempDir();
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'A.jsx'), `export default function A(){ return <button className="bg-blue-500">go</button>; }`);
  const res = await run(join(dir, 'src'), { format: 'json', silent: true, config: { rules: { 'interaction/hover-state': 'banana' } } });
  // invalid severity -> config ignored entirely -> hover-state still fires as warning/error
  assert.ok(res.issues.some(i => i.rule === 'interaction/hover-state'));
  rmSync(dir, { recursive: true, force: true });
});

test('chaos: unreadable file (permission denied) does not crash the scan', async () => {
  const dir = tempDir();
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'A.jsx'), `export default function A(){ return <button className="bg-blue-500">go</button>; }`);
  writeFileSync(join(dir, 'src', 'Secret.jsx'), `export default function S(){ return <button className="bg-blue-500">secret</button>; }`);
  try { chmodSync(join(dir, 'src', 'Secret.jsx'), 0o000); } catch {}
  let res;
  try { res = await run(join(dir, 'src'), { format: 'json', silent: true }); } catch (e) { res = null; }
  // Restore perms for cleanup
  try { chmodSync(join(dir, 'src', 'Secret.jsx'), 0o644); } catch {}
  assert.ok(res && typeof res === 'object', 'scan must not throw on unreadable file');
  rmSync(dir, { recursive: true, force: true });
});

test('chaos: path with spaces works', async () => {
  const base = tempDir();
  const dir = join(base, 'my project', 'src');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'A.jsx'), `export default function A(){ return <button className="bg-blue-500">go</button>; }`);
  const res = await run(dir, { format: 'json', silent: true });
  assert.ok(res.filesScanned >= 1);
  rmSync(base, { recursive: true, force: true });
});

test('chaos: empty directory yields score 100, no crash', async () => {
  const dir = tempDir();
  mkdirSync(join(dir, 'src'), { recursive: true });
  const res = await run(join(dir, 'src'), { format: 'json', silent: true });
  assert.strictEqual(res.score, 100);
  assert.strictEqual(res.passed, true);
  rmSync(dir, { recursive: true, force: true });
});

test('chaos: minScore override respected', async () => {
  const dir = tempDir();
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'A.jsx'), `export default function A(){ return <button className="bg-blue-500">go</button>; }`);
  const res = await run(join(dir, 'src'), { format: 'json', silent: true, minScore: 999 });
  assert.strictEqual(res.passed, false, 'impossibly high minScore must fail');
  rmSync(dir, { recursive: true, force: true });
});

test('chaos: --strict flag toggles gate mode', async () => {
  const dir = tempDir();
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'A.jsx'), `export default function A(){ return <button className="bg-blue-500 text-white px-4 py-2">go</button>; }`);
  const loose = await run(join(dir, 'src'), { format: 'json', silent: true });
  const strict = await run(join(dir, 'src'), { format: 'json', silent: true, strict: true });
  assert.strictEqual(loose.gate.mode, 'objective');
  assert.strictEqual(strict.gate.mode, 'strict');
  rmSync(dir, { recursive: true, force: true });
});

test('chaos: platform unsupported value throws', () => {
  assert.throws(() => setPlatform('desktop'), /Unsupported platform/);
});
