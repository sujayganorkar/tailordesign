import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const CLI = join(process.cwd(), 'bin', 'cli.js');
const NODE = process.execPath;

function runCli(args, cwd) {
  const r = spawnSync(NODE, [CLI, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function project(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-e2e-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, 'src', name), content);
  return dir;
}

const CLEAN = `export default function Ok(){ return <button className="hover:bg-gray-100 focus-visible:ring-2 min-h-[44px]">ok</button>; }\n`;
const BAD = `export default function Bad(){ return <button className="bg-blue-500 text-white px-4 py-2">go</button>; }\n`;

// ── Exit codes ──────────────────────────────────────────────────────────────

test('e2e: clean project exits 0 (pass)', () => {
  const dir = project({ 'Ok.jsx': CLEAN });
  const r = runCli([join(dir, 'src')], dir);
  assert.strictEqual(r.code, 0, `expected exit 0, got ${r.code}\n${r.stdout}`);
  rmSync(dir, { recursive: true, force: true });
});

test('e2e: bad project exits 1 under --ci', () => {
  const dir = project({ 'Bad.jsx': BAD });
  const r = runCli([join(dir, 'src'), '--ci'], dir);
  assert.strictEqual(r.code, 1, `expected exit 1, got ${r.code}`);
  rmSync(dir, { recursive: true, force: true });
});

test('e2e: bad project without --ci still exits 0 (report only)', () => {
  const dir = project({ 'Bad.jsx': BAD });
  const r = runCli([join(dir, 'src')], dir);
  // Default scan does not exit non-zero; only --ci/--verify do.
  assert.strictEqual(r.code, 0, `expected exit 0 without --ci, got ${r.code}`);
  rmSync(dir, { recursive: true, force: true });
});

test('e2e: verify exits 1 on failure, 0 on pass', () => {
  const bad = project({ 'Bad.jsx': BAD });
  const r1 = runCli(['verify', join(bad, 'src')], bad);
  assert.strictEqual(r1.code, 1);
  assert.match(r1.stdout, /VERIFY: FAIL/);
  rmSync(bad, { recursive: true, force: true });

  const good = project({ 'Ok.jsx': CLEAN });
  const r2 = runCli(['verify', join(good, 'src')], good);
  assert.strictEqual(r2.code, 0);
  assert.match(r2.stdout, /VERIFY: PASS/);
  rmSync(good, { recursive: true, force: true });
});

// ── Output formats ──────────────────────────────────────────────────────────

test('e2e: --format json produces parseable JSON on stdout', () => {
  const dir = project({ 'Bad.jsx': BAD });
  const r = runCli([join(dir, 'src'), '--format', 'json'], dir);
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(r.stdout); });
  assert.ok(parsed && typeof parsed.score === 'number');
  assert.ok(Array.isArray(parsed.issues));
  rmSync(dir, { recursive: true, force: true });
});

test('e2e: --format markdown produces a markdown report', () => {
  const dir = project({ 'Bad.jsx': BAD });
  const r = runCli([join(dir, 'src'), '--format', 'markdown'], dir);
  assert.match(r.stdout, /^# AI UI Quality Gate Report/m);
  rmSync(dir, { recursive: true, force: true });
});

test('e2e: --quiet suppresses the report', () => {
  const dir = project({ 'Bad.jsx': BAD });
  const r = runCli([join(dir, 'src'), '--quiet'], dir);
  assert.ok(!r.stdout.includes('AI UI Quality Gate Report'), 'report must be suppressed');
  rmSync(dir, { recursive: true, force: true });
});

test('e2e: --no-color produces no ANSI escapes', () => {
  const dir = project({ 'Bad.jsx': BAD });
  const r = runCli([join(dir, 'src'), '--no-color'], dir);
  // eslint-disable-next-line no-control-regex
  assert.ok(!/\x1b\[[0-9;]*m/.test(r.stdout), 'no ANSI color codes');
  rmSync(dir, { recursive: true, force: true });
});

test('e2e: unknown --format warns and falls back to text', () => {
  const dir = project({ 'Bad.jsx': BAD });
  const r = runCli([join(dir, 'src'), '--format', 'xml'], dir);
  assert.match(r.stderr, /Unknown format/);
  assert.match(r.stdout, /AI UI Quality Gate Report/);
  rmSync(dir, { recursive: true, force: true });
});

// ── Side-effect files ───────────────────────────────────────────────────────

test('e2e: --state writes .uiq-state.json', () => {
  const dir = project({ 'Ok.jsx': CLEAN });
  runCli([join(dir, 'src'), '--state'], dir);
  assert.ok(existsSync(join(dir, 'src', '.uiq-state.json')), 'state file must be written under src/');
  const snap = JSON.parse(readFileSync(join(dir, 'src', '.uiq-state.json'), 'utf8'));
  assert.ok(typeof snap.score === 'number');
  rmSync(dir, { recursive: true, force: true });
});

test('e2e: --decide --write-spec writes motion-spec.json', () => {
  const dir = project({ 'Ok.jsx': CLEAN });
  runCli([join(dir, 'src'), '--decide', '--write-spec'], dir);
  assert.ok(existsSync(join(dir, 'src', 'motion-spec.json')), 'spec must be written in the scanned directory');
  const spec = JSON.parse(readFileSync(join(dir, 'src', 'motion-spec.json'), 'utf8'));
  assert.ok(spec.components && typeof spec.components === 'object');
  rmSync(dir, { recursive: true, force: true });
});

test('e2e: --decide without --write-spec does NOT write motion-spec.json', () => {
  const dir = project({ 'Ok.jsx': CLEAN });
  runCli([join(dir, 'src'), '--decide'], dir);
  assert.ok(!existsSync(join(dir, 'src', 'motion-spec.json')), 'spec must be opt-in');
  rmSync(dir, { recursive: true, force: true });
});

// ── Concreteness contract end-to-end ─────────────────────────────────────────

test('e2e: advisory findings never block the gate', () => {
  const dir = project({ 'Bad.jsx': `export default function B(){ return <button className="bg-blue-500 text-white px-4 py-2">go</button>; }` });
  const r = runCli([join(dir, 'src'), '--format', 'json'], dir);
  const parsed = JSON.parse(r.stdout);
  // bg-blue-500 triggers consistency/no-generic-cta (recommendation-kind).
  const advisory = parsed.issues.filter(i => i.rule === 'consistency/no-generic-cta');
  assert.ok(advisory.length > 0, 'advisory finding must be reported');
  assert.ok(advisory.every(i => i.kind === 'recommendation'), 'must be recommendation-kind');
  // Advisory findings are reported but do not appear as errors.
  assert.strictEqual(parsed.errors, parsed.issues.filter(i => i.severity === 'error').length);
  rmSync(dir, { recursive: true, force: true });
});

test('e2e: uiq-ignore suppresses a finding end-to-end', () => {
  const dir = project({ 'Ign.jsx': `export default function I(){\n  // uiq-ignore a11y/keyboard-nav\n  return <div onClick={() => {}}>x</div>;\n}` });
  const r = runCli([join(dir, 'src'), '--format', 'json'], dir);
  const parsed = JSON.parse(r.stdout);
  assert.ok(!parsed.issues.some(i => i.rule === 'a11y/keyboard-nav'), 'suppressed rule must be gone');
  assert.ok(parsed.suppressedCount >= 1, 'suppressed count must be reported');
  rmSync(dir, { recursive: true, force: true });
});

test('e2e: config severity override "off" disables a rule end-to-end', () => {
  const dir = project({ 'Bad.jsx': BAD });
  writeFileSync(join(dir, '.uiqrc.json'), JSON.stringify({ rules: { 'interaction/hover-state': 'off', 'interaction/focus-visible': 'off' } }));
  const r = runCli([join(dir, 'src'), '--format', 'json'], dir);
  const parsed = JSON.parse(r.stdout);
  assert.ok(!parsed.issues.some(i => i.rule === 'interaction/hover-state'), 'off rule must be gone');
  assert.ok(!parsed.issues.some(i => i.rule === 'interaction/focus-visible'), 'off rule must be gone');
  rmSync(dir, { recursive: true, force: true });
});

// ── Determinism from user perspective ────────────────────────────────────────

test('e2e: two runs produce byte-identical JSON', () => {
  const dir = project({ 'Bad.jsx': BAD });
  const r1 = runCli([join(dir, 'src'), '--format', 'json'], dir);
  const r2 = runCli([join(dir, 'src'), '--format', 'json'], dir);
  assert.strictEqual(r1.stdout, r2.stdout, 'output must be deterministic');
  rmSync(dir, { recursive: true, force: true });
});
