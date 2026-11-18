import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/index.js';

async function scan(code, name = 'C.jsx') {
  const dir = mkdtempSync(join(tmpdir(), 'uiq-inp-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', name), code);
  const res = await run(join(dir, 'src'), { format: 'json', silent: true });
  rmSync(dir, { recursive: true, force: true });
  return res;
}

const CASES = {
  'empty file': '',
  'only whitespace': '   \n\n  \t  ',
  'minified single line': 'export default function A(){return <button className="bg-blue-500 hover:bg-blue-600 focus-visible:ring-2 px-4 py-2" onClick={()=>{}}>go</button>;}',
  'deeply nested': 'export default function A(){return <div><div><div><div><button className="bg-blue-500">x</button></div></div></div></div>;}',
  'unicode identifiers': 'export default function Caf\u00e9(){ return <button className="bg-blue-500">\u{1F600}</button>; }',
  'CRLF line endings': 'export default function A(){\r\n  return <button className="bg-blue-500">go</button>;\r\n}',
  'BOM prefix': '\uFEFFexport default function A(){ return <button className="bg-blue-500">go</button>; }',
  'huge file (2000 lines)': 'export default function A(){\n' + '  const x = 1;\n'.repeat(1998) + '  return <button className="bg-blue-500">go</button>;\n}',
  'TSX generics': 'export default function A<T extends {x:number}>(p:T){ return <button className="bg-blue-500">{p.x}</button>; }',
  'spread + rest': 'export default function A({...p}){ return <button {...p} className="bg-blue-500">go</button>; }',
  'template literal className': 'export default function A(){ const c="x"; return <div className={`a ${c} b`}>hi</div>; }',
  'nested ternary': 'export default function A({l}){ return <div>{l ? <button className="bg-blue-500">a</button> : <span>b</span>}</div>; }',
  'comment-only': '// just a comment\n/* block */',
  'jsx fragment': 'export default function A(){ return <><button className="bg-blue-500">a</button><button className="bg-blue-500">b</button></>; }',
};

for (const [name, code] of Object.entries(CASES)) {
  test(`adversarial-input: ${name} does not crash and yields valid result`, async () => {
    const res = await scan(code);
    assert.ok(res && typeof res === 'object', 'result must be object');
    assert.ok(typeof res.score === 'number' && res.score >= 0 && res.score <= 100, 'score in range');
    assert.ok(typeof res.passed === 'boolean', 'passed boolean');
    assert.ok(Array.isArray(res.issues), 'issues array');
    for (const i of res.issues) {
      assert.ok(typeof i.rule === 'string' && i.rule.length > 0, 'rule id');
      assert.ok(['error','warning','info'].includes(i.severity), 'severity');
      assert.ok(typeof i.file === 'string', 'file');
    }
    // JSON-serializable
    JSON.stringify(res);
  });
}
