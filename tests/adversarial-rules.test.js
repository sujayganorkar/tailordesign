import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/index.js';

async function scan(code) {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-adv-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'C.jsx'), code);
  const res = await run(join(dir, 'src'), { format: 'json', silent: true });
  rmSync(dir, { recursive: true, force: true });
  return res;
}

function hasRule(res, rule) { return res.issues.some(i => i.rule === rule); }

// ── motion/reduced-motion ────────────────────────────────────────────────────

test('adversarial: motion/reduced-motion fires on animation without reduced-motion', async () => {
  const r = await scan(`export default function A(){ return <div className="animate-spin">x</div>; }`);
  assert.ok(hasRule(r, 'motion/reduced-motion'), 'should fire');
});

test('adversarial: motion/reduced-motion stays silent with motion-reduce:', async () => {
  const r = await scan(`export default function A(){ return <div className="animate-spin motion-reduce:animate-none">x</div>; }`);
  assert.ok(!hasRule(r, 'motion/reduced-motion'), 'should not fire');
});

test('adversarial: motion/reduced-motion stays silent with motion-safe:', async () => {
  const r = await scan(`export default function A(){ return <div className="motion-safe:animate-spin">x</div>; }`);
  assert.ok(!hasRule(r, 'motion/reduced-motion'), 'should not fire');
});

// ── interaction/hover-state ──────────────────────────────────────────────────

test('adversarial: hover-state fires on button without hover:', async () => {
  const r = await scan(`export default function A(){ return <button className="bg-blue-500 text-white px-4 py-2">go</button>; }`);
  assert.ok(hasRule(r, 'interaction/hover-state'), 'should fire');
});

test('adversarial: hover-state stays silent on button with hover:', async () => {
  const r = await scan(`export default function A(){ return <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2">go</button>; }`);
  assert.ok(!hasRule(r, 'interaction/hover-state'), 'should not fire');
});

test('adversarial: hover-state stays silent on backdrop (fixed inset-0)', async () => {
  const r = await scan(`export default function A(){ return <button className="fixed inset-0 bg-black/50">x</button>; }`);
  assert.ok(!hasRule(r, 'interaction/hover-state'), 'backdrop must not be flagged');
});

// ── interaction/focus-visible ────────────────────────────────────────────────

test('adversarial: focus-visible fires on button without focus-visible:', async () => {
  const r = await scan(`export default function A(){ return <button className="bg-blue-500 text-white px-4 py-2">go</button>; }`);
  assert.ok(hasRule(r, 'interaction/focus-visible'), 'should fire');
});

test('adversarial: focus-visible stays silent with focus-visible:', async () => {
  const r = await scan(`export default function A(){ return <button className="bg-blue-500 focus-visible:ring-2 text-white px-4 py-2">go</button>; }`);
  assert.ok(!hasRule(r, 'interaction/focus-visible'), 'should not fire');
});

// ── a11y/keyboard-nav ───────────────────────────────────────────────────────

test('adversarial: keyboard-nav fires on div with onClick', async () => {
  const r = await scan(`export default function A(){ return <div onClick={() => {}}>x</div>; }`);
  assert.ok(hasRule(r, 'a11y/keyboard-nav'), 'should fire');
});

test('adversarial: keyboard-nav stays silent on button with onClick', async () => {
  const r = await scan(`export default function A(){ return <button onClick={() => {}}>x</button>; }`);
  assert.ok(!hasRule(r, 'a11y/keyboard-nav'), 'should not fire');
});

test('adversarial: keyboard-nav stays silent on delegated handler (event.target.closest)', async () => {
  const r = await scan(`export default function A(){
    return <div onClick={(e) => { const t = e.target.closest('.card'); if (t) console.log(t); }}>x</div>;
  }`);
  // Delegation is a legitimate pattern; must not be flagged.
  assert.ok(!hasRule(r, 'a11y/keyboard-nav'), 'delegated handler must not be flagged');
});

test('adversarial: keyboard-nav does not fire on destructured { onClick } param', async () => {
  const r = await scan(`export default function A({ onClick }) { return <button onClick={onClick}>x</button>; }`);
  // No onClick on a non-interactive element -> no keyboard-nav finding.
  assert.ok(!hasRule(r, 'a11y/keyboard-nav'), 'destructured param must not be mistaken for a handler');
});

// ── spread props abstention ──────────────────────────────────────────────────

test('adversarial: spread props abstain (no hover/focus assertion)', async () => {
  const r = await scan(`export default function A(props){ return <button {...props} className="bg-blue-500 text-white px-4 py-2">go</button>; }`);
  assert.ok(!hasRule(r, 'interaction/hover-state'), 'spread must abstain on hover');
  assert.ok(!hasRule(r, 'interaction/focus-visible'), 'spread must abstain on focus');
});

// ── motion/no-layout-animation ───────────────────────────────────────────────

test('adversarial: no-layout-animation fires on transition-all', async () => {
  const r = await scan(`export default function A(){ return <div className="transition-all">x</div>; }`);
  assert.ok(hasRule(r, 'motion/no-layout-animation'), 'should fire');
});

test('adversarial: no-layout-animation stays silent on transform-only', async () => {
  const r = await scan(`export default function A(){ return <div className="transition-transform">x</div>; }`);
  assert.ok(!hasRule(r, 'motion/no-layout-animation'), 'transform-only must not fire');
});

// ── consistency/no-generic-cta ───────────────────────────────────────────────

test('adversarial: no-generic-cta fires on bg-blue-500 button', async () => {
  const r = await scan(`export default function A(){ return <button className="bg-blue-500 text-white">go</button>; }`);
  assert.ok(hasRule(r, 'consistency/no-generic-cta'), 'should fire');
});

test('adversarial: no-generic-cta stays silent on brand color', async () => {
  const r = await scan(`export default function A(){ return <button className="bg-brand-500 text-white">go</button>; }`);
  assert.ok(!hasRule(r, 'consistency/no-generic-cta'), 'brand color must not fire');
});

// ── a11y/focus-management ────────────────────────────────────────────────────

test('adversarial: focus-management fires on modal without focus handling', async () => {
  const r = await scan(`export default function A(){ return <div className="modal">content</div>; }`);
  assert.ok(hasRule(r, 'a11y/focus-management'), 'should fire');
});

// ── library/no-raw-interactive exempts component definition files ────────────

test('adversarial: library mode exempts component definitions under components/', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-lib-'));
  mkdirSync(join(dir, 'components'), { recursive: true });
  writeFileSync(join(dir, 'components', 'Button.jsx'), `export default function Button(){ return <button className="bg-blue-500">x</button>; }`);
  const res = await run(join(dir, 'components'), { format: 'json', silent: true, library: true });
  // Component definition files must not be flagged as raw interactive usage.
  assert.ok(!res.issues.some(i => i.rule === 'library/no-raw-interactive'), 'component def must be exempt');
  rmSync(dir, { recursive: true, force: true });
});
