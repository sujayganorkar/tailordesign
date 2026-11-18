import { test } from 'node:test';
import assert from 'node:assert';
import { isSafePath, assertSafePath } from '../src/utils/safe-path.js';
import { generateDashboardHTML } from '../src/dashboard.js';
import { parseJSX } from '../src/parsers/jsx.js';
import { parseCSS } from '../src/parsers/css.js';
import { parseDart } from '../src/parsers/dart.js';

test('security: path guard rejects traversal', () => {
  assert.strictEqual(isSafePath('../../etc/passwd'), false);
  assert.strictEqual(isSafePath('foo/../../bar'), false);
  assert.throws(() => assertSafePath('../x'), /traversal/);
  assert.throws(() => assertSafePath('a\0b'), /null bytes/);
  assert.throws(() => assertSafePath(''), /non-empty/);
  assert.throws(() => assertSafePath(42), /non-empty/);
});

test('security: path guard allows normal paths', () => {
  assert.strictEqual(isSafePath('src/Foo.jsx'), true);
  assert.strictEqual(isSafePath('/abs/path/file.js'), true);
  assert.doesNotThrow(() => assertSafePath('src/Foo.jsx'));
});

test('security: dashboard escapes HTML in issue fields', () => {
  const payload = '<script>alert(1)</script>';
  const result = {
    score: 50, filesScanned: 1, errors: 1, warnings: 0, infos: 0, passed: false,
    issues: [{ severity: 'error', rule: payload, file: payload, line: 1, message: payload, fix: { description: payload } }],
  };
  const html = generateDashboardHTML(result);
  assert.ok(!html.includes('<script>alert(1)</script>'), 'raw script must not appear');
  assert.ok(html.includes('&lt;script&gt;'), 'HTML must be escaped');
});

test('security: parsers do not crash on adversarial input', () => {
  const inputs = [
    '', 'a'.repeat(100000), '<'.repeat(5000), '{{{{', '/*' + '*'.repeat(10000) + '/',
    'import x from "y";'.repeat(1000),
  ];
  for (const inp of inputs) {
    assert.doesNotThrow(() => parseJSX(inp, 't.jsx'));
    assert.doesNotThrow(() => parseCSS(inp, 't.css'));
    assert.doesNotThrow(() => parseDart(inp, 't.dart'));
  }
});

test('security: parsers handle null/undefined gracefully', () => {
  assert.doesNotThrow(() => parseJSX(null, 't.jsx'));
  assert.doesNotThrow(() => parseCSS(undefined, 't.css'));
  assert.doesNotThrow(() => parseDart('', 't.dart'));
});
