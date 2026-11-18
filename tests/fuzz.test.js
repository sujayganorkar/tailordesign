import { test } from 'node:test';
import assert from 'node:assert';
import * as fc from 'fast-check';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseJSX } from '../src/parsers/jsx.js';
import { run } from '../src/index.js';
import { runRules } from '../src/rules/index.js';
import { isSuppressed } from '../src/utils/suppress.js';

function tempDir() { return mkdtempSync(join(tmpdir(), 'uiq-fuzz-')); }

// ── Parser must never throw on arbitrary input ─────────────────────────────

test('fuzz: parseJSX never throws on arbitrary strings', () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 500 }), (s) => {
      let result;
      try { result = parseJSX(s, 'fuzz.jsx'); } catch (e) { return false; }
      // Result must be an object with the expected shape (may be partial).
      return typeof result === 'object' && result !== null;
    }),
    { numRuns: 200 }
  );
});

test('fuzz: parseJSX never throws on unicode / adversarial JSX', () => {
  const adversarial = [
    '<div onClick={() => {}} className="x">text</div>',
    '<button className="bg-blue-500 hover:bg-blue-600 focus-visible:ring-2">go</button>',
    '<>{...props}</>',
    '<Comp a={1} b={"str"} c={fn()} />',
    'const x = 1; export default function A(){ return <div/>; }',
    '<div style={{ width: 100 }} className={`cls ${x}`}>hi</div>',
    '<Foo.Bar.Baz onClick={e=>e.target.closest(".x")} />',
    '<input type="text" disabled={loading} aria-label="x" />',
    'export default () => (<>\n  <button>1</button>\n  <button>2</button>\n</>)',
    '/* unterminated comment',
    'const a = "unterminated string',
    '<div className="a b c" onClick={handle} onKeyDown={kd} role="button" tabIndex={0}></div>',
  ];
  for (const s of adversarial) {
    assert.doesNotThrow(() => parseJSX(s, 'adv.jsx'), `must not throw on: ${s.slice(0, 40)}`);
  }
  // Also random unicode
  fc.assert(
    fc.property(fc.string({ maxLength: 300 }), (s) => {
      try { parseJSX(s, 'uni.jsx'); return true; } catch { return false; }
    }),
    { numRuns: 100 }
  );
});

// ── run() must never throw and must emit a valid, bounded result ───────────

test('fuzz: run() never throws on arbitrary single-file projects', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string({ maxLength: 400 }), async (content) => {
      const dir = tempDir();
      mkdirSync(join(dir, 'src'), { recursive: true });
      writeFileSync(join(dir, 'src', 'Fuzz.jsx'), content);
      let ok = true;
      try {
        const res = await run(join(dir, 'src'), { format: 'json', silent: true });
        if (!res || typeof res !== 'object') ok = false;
        else if (typeof res.score !== 'number' || res.score < 0 || res.score > 100) ok = false;
        else if (typeof res.passed !== 'boolean') ok = false;
        else if (!Array.isArray(res.issues)) ok = false;
        else {
          for (const i of res.issues) {
            if (typeof i.rule !== 'string' || typeof i.severity !== 'string' || typeof i.file !== 'string') { ok = false; break; }
            if (i.line != null && (typeof i.line !== 'number' || i.line < 0)) { ok = false; break; }
          }
          if (ok) { try { JSON.stringify(res); } catch { ok = false; } }
        }
      } catch {
        ok = false;
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
      return ok;
    }),
    { numRuns: 40 }
  );
});

// ── runRules must never throw on parsed output ─────────────────────────────

test('fuzz: runRules never throws on arbitrary parsed results', () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 300 }), (content) => {
      const parsed = parseJSX(content, 'f.jsx');
      const allParsed = [parsed];
      try { runRules(parsed, allParsed); return true; } catch { return false; }
    }),
    { numRuns: 100 }
  );
});

// ── suppress module must never throw ───────────────────────────────────────

test('fuzz: isSuppressed never throws on arbitrary inputs', () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 200 }), fc.string({ maxLength: 50 }), (content, rule) => {
      const issue = { rule, line: Math.floor(Math.random() * 20) + 1, file: 'x.jsx' };
      try { isSuppressed(issue, content, { suppressions: { '*': ['**/*'] } }); return true; } catch { return false; }
    }),
    { numRuns: 100 }
  );
});

// ── Score bounds invariant ─────────────────────────────────────────────────

test('fuzz: calculateScore always in [0,100] for random issue sets', async () => {
  const { calculateScore } = await import('../src/utils/score.js');
  const sev = ['error', 'warning', 'info'];
  const kind = ['objective', 'recommendation'];
  fc.assert(
    fc.property(
      fc.array(fc.record({ severity: fc.constantFrom(...sev), kind: fc.constantFrom(...kind), file: fc.constant('a.jsx') }), { maxLength: 50 }),
      (issues) => {
        const s = calculateScore(issues, 5);
        return typeof s === 'number' && s >= 0 && s <= 100;
      }
    ),
    { numRuns: 200 }
  );
});
