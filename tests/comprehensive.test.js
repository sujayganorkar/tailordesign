import { test } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { run } from '../src/index.js';
import { runDecisions } from '../src/decisions/index.js';
import { runFull } from '../src/workflow/full.js';
import { createStateSnapshot, detectRegressions } from '../src/state/persistence.js';
import { addFeedback, loadFeedback, getUnresolved, resolveFeedback, FEEDBACK_CATEGORIES } from '../src/feedback/review.js';
import { generateEscalations } from '../src/escalation/cards.js';
import { generateMotionSpec, getSpecSummary } from '../src/spec/motion-spec.js';
import { applyFixes } from '../src/fixer.js';
import { checkContrast, hexToRgb, contrastRatio } from '../src/parsers/color.js';
import { getSource, getRule, RULES } from '../src/config.js';

const FIXTURES = 'tests/fixtures';

// ─── Quality Gate Tests ─────────────────────────────────────────────────────

test('quality gate: bad component scores below threshold', async () => {
  const result = await run(`${FIXTURES}/BadComponent.jsx`, { format: 'json' });
  assert.ok(result.score < 80, `Expected score < 80, got ${result.score}`);
  assert.ok(result.errors > 0, 'Expected errors');
  assert.ok(result.totalIssues > 0, 'Expected issues');
});

test('quality gate: good component scores higher than bad', async () => {
  const bad = await run(`${FIXTURES}/BadComponent.jsx`, { format: 'json' });
  const good = await run(`${FIXTURES}/GoodComponent.jsx`, { format: 'json' });
  assert.ok(good.score > bad.score, `Good (${good.score}) should score higher than bad (${bad.score})`);
});

test('quality gate: good CSS passes', async () => {
  const result = await run(`${FIXTURES}/good.css`, { format: 'json' });
  assert.strictEqual(result.totalIssues, 0, `Expected 0 issues, got ${result.totalIssues}`);
  assert.ok(result.passed, 'Expected pass');
});

test('quality gate: bad CSS fails', async () => {
  const result = await run(`${FIXTURES}/bad.css`, { format: 'json' });
  assert.ok(result.totalIssues > 0, 'Expected issues');
  assert.ok(!result.passed, 'Expected fail');
});

test('quality gate: JSON output has required fields', async () => {
  const result = await run(`${FIXTURES}/BadComponent.jsx`, { format: 'json' });
  assert.ok(typeof result.score === 'number');
  assert.ok(Array.isArray(result.issues));
  assert.ok(result.issues.length > 0);
  assert.ok(result.issues[0].rule);
  assert.ok(result.issues[0].severity);
  assert.ok(result.issues[0].message);
  assert.ok(result.issues[0].file);
});

test('quality gate: --rules filter works', async () => {
  const result = await run(`${FIXTURES}/BadComponent.jsx`, { format: 'json', rules: 'interaction/hover-state' });
  for (const issue of result.issues) {
    assert.strictEqual(issue.rule, 'interaction/hover-state', 'Should only return filtered rule');
  }
});

test('quality gate: empty directory returns 100', async () => {
  const dir = '/tmp/opencode/empty-test-dir';
  try { rmSync(dir, { recursive: true }); } catch {}
  mkdirSync(dir, { recursive: true });
  const result = await run(dir, { format: 'json' });
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.totalIssues, 0);
  assert.ok(result.passed);
});

// ─── Decision Engine Tests ──────────────────────────────────────────────────

test('decision engine: detects components in bad component', async () => {
  const decisions = await runDecisions(`${FIXTURES}/BadComponent.jsx`, { format: 'json' });
  assert.ok(Array.isArray(decisions));
  assert.ok(decisions.length > 0, 'Should detect components');
});

test('decision engine: detects components in good component', async () => {
  const decisions = await runDecisions(`${FIXTURES}/GoodComponent.jsx`, { format: 'json' });
  assert.ok(Array.isArray(decisions));
  assert.ok(decisions.length > 0, 'Should detect components');
});

test('decision engine: provides required states', async () => {
  const decisions = await runDecisions(`${FIXTURES}/BadComponent.jsx`, { format: 'json' });
  for (const d of decisions) {
    assert.ok(Array.isArray(d.requiredStates), 'Should have requiredStates array');
    assert.ok(Array.isArray(d.recommendedMotion), 'Should have recommendedMotion array');
    assert.ok(Array.isArray(d.antiPatterns), 'Should have antiPatterns array');
    assert.ok(d.consequence, 'Should have consequence');
  }
});

// ─── Full Workflow Tests ────────────────────────────────────────────────────

test('full workflow: runs without errors', async () => {
  const result = await runFull(`${FIXTURES}/GoodComponent.jsx`, { format: 'json' });
  assert.ok(typeof result.score === 'number');
  assert.ok(typeof result.complianceScore === 'number');
  assert.ok(Array.isArray(result.issues));
  assert.ok(Array.isArray(result.decisions));
  assert.ok(Array.isArray(result.compliance));
});

test('full workflow: compliance score is between 0 and 100', async () => {
  const result = await runFull(`${FIXTURES}/BadComponent.jsx`, { format: 'json' });
  assert.ok(result.complianceScore >= 0 && result.complianceScore <= 100);
});

// ─── State Persistence Tests ────────────────────────────────────────────────

test('state: creates snapshot', () => {
  const snapshot = createStateSnapshot({ score: 80, totalIssues: 5, errors: 2, warnings: 3, issues: [] }, null);
  assert.ok(snapshot.timestamp);
  assert.strictEqual(snapshot.score, 80);
  assert.strictEqual(snapshot.totalIssues, 5);
});

test('state: detects regressions', () => {
  const prev = createStateSnapshot({ score: 80, totalIssues: 5, errors: 2, warnings: 3, issues: [] }, null);
  const curr = createStateSnapshot({ score: 60, totalIssues: 8, errors: 4, warnings: 4, issues: [] }, null);
  const reg = detectRegressions(curr, prev);
  assert.ok(reg.hasBaseline);
  assert.ok(reg.regressions.length > 0, 'Should detect regressions');
});

test('state: detects improvements', () => {
  const prev = createStateSnapshot({ score: 60, totalIssues: 8, errors: 4, warnings: 4, issues: [] }, null);
  const curr = createStateSnapshot({ score: 80, totalIssues: 5, errors: 2, warnings: 3, issues: [] }, null);
  const reg = detectRegressions(curr, prev);
  assert.ok(reg.hasBaseline);
  assert.ok(reg.improvements.length > 0, 'Should detect improvements');
});

test('state: no baseline on first scan', () => {
  const curr = createStateSnapshot({ score: 80, totalIssues: 5, errors: 2, warnings: 3, issues: [] }, null);
  const reg = detectRegressions(curr, null);
  assert.ok(!reg.hasBaseline);
});

// ─── Feedback Tests ─────────────────────────────────────────────────────────

test('feedback: categories exist', () => {
  assert.ok(Object.keys(FEEDBACK_CATEGORIES).length >= 10);
  assert.ok(FEEDBACK_CATEGORIES['too-slow']);
  assert.ok(FEEDBACK_CATEGORIES['janky']);
});

test('feedback: add and load', () => {
  const dir = '/tmp/opencode/feedback-test';
  try { rmSync(dir, { recursive: true }); } catch {}
  mkdirSync(dir, { recursive: true });
  const entry = addFeedback(dir, { file: 'test.jsx', component: 'button', category: 'too-slow', note: 'test' });
  assert.ok(entry.id);
  assert.strictEqual(entry.category, 'too-slow');
  const feedback = loadFeedback(dir);
  assert.strictEqual(feedback.entries.length, 1);
  const unresolved = getUnresolved(dir);
  assert.strictEqual(unresolved.length, 1);
  resolveFeedback(dir, entry.id);
  const resolved = getUnresolved(dir);
  assert.strictEqual(resolved.length, 0);
});

// ─── Escalation Tests ───────────────────────────────────────────────────────

test('escalation: generates from scan result', () => {
  const scanResult = {
    score: 50,
    issues: [
      { rule: 'motion/reduced-motion', severity: 'error', message: 'No reduced motion', file: 'test.jsx' },
    ],
  };
  const escalations = generateEscalations(scanResult, []);
  assert.ok(Array.isArray(escalations));
  assert.ok(escalations.length > 0, 'Should generate escalations for errors');
  assert.ok(escalations[0].id);
  assert.ok(escalations[0].options.length > 0);
});

// ─── Motion Spec Tests ──────────────────────────────────────────────────────

test('motion spec: generates from decisions', () => {
  const decisions = [
    { file: 'test.jsx', component: 'button', count: 1, consequence: 'instant-reversible', contexts: ['click'], requiredStates: ['hover'], recommendedMotion: ['color shift on hover (100-150ms)'], antiPatterns: [] },
  ];
  const spec = generateMotionSpec(decisions);
  assert.ok(spec.version);
  assert.ok(spec.components);
  assert.ok(Object.keys(spec.components).length > 0);
  const summary = getSpecSummary(spec);
  assert.strictEqual(summary.total, 1);
});

// ─── Color Parser Tests ─────────────────────────────────────────────────────

test('color: hexToRgb', () => {
  const rgb = hexToRgb('#ff0000');
  assert.deepStrictEqual(rgb, { r: 255, g: 0, b: 0 });
});

test('color: contrast ratio', () => {
  const black = hexToRgb('#000000');
  const white = hexToRgb('#ffffff');
  const ratio = contrastRatio(black, white);
  assert.ok(ratio > 20, 'Black on white should have high contrast');
});

test('color: checkContrast finds issues', () => {
  const issues = checkContrast('className="text-gray-400 bg-gray-100"');
  assert.ok(Array.isArray(issues));
});

// ─── Config Tests ───────────────────────────────────────────────────────────

test('config: getRule returns rule', () => {
  const rule = getRule('motion/reduced-motion');
  assert.ok(rule);
  assert.strictEqual(rule.id, 'motion/reduced-motion');
  assert.ok(rule.source, 'Rule should have source');
  assert.ok(rule.source.url, 'Source should have URL');
});

test('config: getSource returns source', () => {
  const source = getSource('motion/reduced-motion');
  assert.ok(source);
  assert.ok(source.url.startsWith('https://'));
  assert.ok(source.title);
  assert.ok(source.summary);
});

test('config: all rules have sources', () => {
  for (const rule of RULES) {
    assert.ok(rule.source, `Rule ${rule.id} should have a source`);
    assert.ok(rule.source.url, `Rule ${rule.id} source should have URL`);
    assert.ok(rule.source.url.startsWith('https://'), `Rule ${rule.id} URL should be HTTPS`);
  }
});

// ─── Fixer Tests ────────────────────────────────────────────────────────────

test('fixer: applies fixes to CSS', async () => {
  const dir = '/tmp/opencode/fixer-test';
  try { rmSync(dir, { recursive: true }); } catch {}
  mkdirSync(dir, { recursive: true });
  const cssPath = `${dir}/test.css`;
  writeFileSync(cssPath, '.hero { animation: fadeIn 300ms; }\n');
  const fixed = await applyFixes(cssPath, []);
  assert.ok(fixed >= 0, 'Should return number');
  const content = readFileSync(cssPath, 'utf-8');
  assert.ok(content.includes('prefers-reduced-motion'), 'Should add reduced-motion');
});
