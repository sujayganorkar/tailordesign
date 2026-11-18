import { test } from 'node:test';
import assert from 'node:assert';
import Ajv from 'ajv';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/index.js';
import { runFull } from '../src/workflow/full.js';

const ajv = new Ajv({ allErrors: true, strict: false });

const issueSchema = {
  type: 'object',
  required: ['rule', 'severity', 'message', 'file'],
  properties: {
    rule: { type: 'string' },
    severity: { enum: ['error', 'warning', 'info'] },
    kind: { enum: ['objective', 'recommendation'] },
    message: { type: 'string' },
    file: { type: 'string' },
    line: { type: ['number', 'null'] },
    suppressedCount: { type: 'number' },
  },
};

const gateSchema = {
  type: 'object',
  required: ['minScore', 'mode', 'blockedByErrors'],
  properties: {
    minScore: { type: 'number' },
    mode: { enum: ['objective', 'strict'] },
    blockedByErrors: { type: 'boolean' },
  },
};

const resultSchema = {
  type: 'object',
  required: ['filesScanned', 'filesWithIssues', 'totalIssues', 'errors', 'warnings', 'infos', 'score', 'passed', 'issues'],
  properties: {
    filesScanned: { type: 'number', minimum: 0 },
    filesWithIssues: { type: 'number', minimum: 0 },
    totalIssues: { type: 'number', minimum: 0 },
    errors: { type: 'number', minimum: 0 },
    warnings: { type: 'number', minimum: 0 },
    infos: { type: 'number', minimum: 0 },
    score: { type: 'number', minimum: 0, maximum: 100 },
    passed: { type: 'boolean' },
    gate: gateSchema,
    advisoryCount: { type: 'number', minimum: 0 },
    suppressedCount: { type: 'number', minimum: 0 },
    issues: { type: 'array', items: issueSchema },
  },
};

const validateResult = ajv.compile(resultSchema);

test('contract: run() output validates against schema', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-ctr-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'A.jsx'), `export default function A(){ return <button className="bg-blue-500">go</button>; }`);
  const res = await run(join(dir, 'src'), { format: 'json', silent: true });
  const ok = validateResult(res);
  assert.ok(ok, 'schema violations: ' + JSON.stringify(validateResult.errors));
  rmSync(dir, { recursive: true, force: true });
});

test('contract: run() output validates in strict mode', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-ctr-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'A.jsx'), `export default function A(){ return <button className="bg-blue-500">go</button>; }`);
  const res = await run(join(dir, 'src'), { format: 'json', silent: true, strict: true });
  assert.ok(validateResult(res), JSON.stringify(validateResult.errors));
  rmSync(dir, { recursive: true, force: true });
});

test('contract: runFull() output validates and has required full fields', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-ctr-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'A.jsx'), `export default function A(){ return <button className="bg-blue-500">go</button>; }`);
  const res = await runFull(join(dir, 'src'), { format: 'json', silent: true });
  assert.ok(validateResult(res), JSON.stringify(validateResult.errors));
  assert.ok(typeof res.complianceScore === 'number');
  assert.ok(Array.isArray(res.decisions));
  assert.ok(Array.isArray(res.compliance));
  rmSync(dir, { recursive: true, force: true });
});

test('contract: empty project output validates', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-ctr-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  const res = await run(join(dir, 'src'), { format: 'json', silent: true });
  assert.ok(validateResult(res), JSON.stringify(validateResult.errors));
  assert.strictEqual(res.score, 100);
  rmSync(dir, { recursive: true, force: true });
});

test('contract: --format json stdout is parseable JSON (CLI)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-ctr-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'A.jsx'), `export default function A(){ return <button className="bg-blue-500">go</button>; }`);
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync(process.execPath, [join(process.cwd(), 'bin', 'cli.js'), join(dir, 'src'), '--format', 'json'], { encoding: 'utf8' });
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(out); });
  assert.ok(validateResult(parsed), JSON.stringify(validateResult.errors));
  rmSync(dir, { recursive: true, force: true });
});
