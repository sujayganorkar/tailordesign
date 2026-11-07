import { test } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { run } from '../src/index.js';

test('component graph: hover check muted only when importing interactive component', async () => {
  const dir = join(tmpdir(), 'uiq-cg-' + Date.now());
  mkdirSync(dir, { recursive: true });
  // Button defines hover
  writeFileSync(join(dir, 'Button.jsx'), `import React from 'react';\nexport default function Button(){ return <button className="hover:bg-blue-500">x</button>; }\n`);
  // Page imports Button and has a native button without hover -> should be suppressed
  writeFileSync(join(dir, 'Page.jsx'), `import React from 'react';\nimport Button from './Button';\nexport default function Page(){ return <div><Button/> <button>raw</button></div>; }\n`);
  const result = await run(dir, { format: 'json' });
  const hover = result.issues.filter(i => i.rule === 'interaction/hover-state');
  // Page's native button hover suppressed because Button is interactive component
  assert.equal(hover.length, 0, 'expected suppression, got ' + hover.length);
  rmSync(dir, { recursive: true });
});

test('component graph: no suppression when importing only utilities', async () => {
  const dir = join(tmpdir(), 'uiq-cg2-' + Date.now());
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'utils.js'), `export function formatDate(d){ return d; }\n`);
  writeFileSync(join(dir, 'Page.jsx'), `import React from 'react';\nimport { formatDate } from './utils';\nexport default function Page(){ return <button>raw</button>; }\n`);
  const result = await run(dir, { format: 'json' });
  const hover = result.issues.filter(i => i.rule === 'interaction/hover-state');
  assert.ok(hover.length > 0, 'expected hover flag on native button');
  rmSync(dir, { recursive: true });
});