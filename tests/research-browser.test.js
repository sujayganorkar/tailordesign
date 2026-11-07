import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { validateResearchUrl, inspectResearchPage } from '../src/research/browser.js';

test('HCI browser allows only local HTTP(S) servers', () => {
  assert.equal(validateResearchUrl('http://localhost:3000/'), 'http://localhost:3000/');
  assert.equal(validateResearchUrl('http://127.0.0.1:8000/'), 'http://127.0.0.1:8000/');
  for (const url of ['https://example.com', 'file:///tmp/a.html',
    'http://localhost.example.com/', 'http://user:pass@localhost/', 'javascript:alert(1)']) {
    assert.throws(() => validateResearchUrl(url), /local|loopback/i);
  }
});

test('browser supplies observed HCI candidates only after real interaction', { timeout: 45000 }, async (t) => {
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch { if (process.env.UIQ_REQUIRE_BROWSER === '1') throw new Error('Required Playwright dependency is missing'); t.skip('Playwright optional dependency not installed'); return; }
  let probe;
  try { probe = await chromium.launch({ headless: true }); }
  catch { if (process.env.UIQ_REQUIRE_BROWSER === '1') throw new Error('Required Playwright Chromium browser is missing'); t.skip('Playwright Chromium browser not installed'); return; }
  await probe.close();

  // Purposefully broken fixture: adjacent tiny targets and modal with no focus trap.
  const html = String.raw`<!doctype html><html><head><style>
    body { font-family: sans-serif; }
    #small-one, #small-two { width: 12px; height: 12px; padding: 0; margin: 0; border: 0; }
    #modal { display: none; position: absolute; top: 100px; left: 40px; padding: 18px; background: white; border: 2px solid black; }
    #modal[aria-hidden="false"] { display: block; }
  </style></head><body>
    <button id="small-one" aria-label="first"></button><button id="small-two" aria-label="second"></button>
    <button id="open-modal">Open dialog</button>
    <section id="modal" role="dialog" aria-modal="true" aria-hidden="true"><button id="first-modal">First action</button></section>
    <button id="after-modal">Outside action</button>
    <script>
    document.getElementById('open-modal').addEventListener('click', () => {
      document.getElementById('modal').setAttribute('aria-hidden', 'false');
      document.getElementById('first-modal').focus();
    });
    </script></body></html>`;
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    const output = await inspectResearchPage('http://127.0.0.1:' + port, {
      task: { goal: 'Use a modal safely', modalSelector: '#modal', modalTriggerSelector: '#open-modal' },
    });
    assert.equal(output.available, true);
    const ids = output.research.findings.map(f => f.id);
    assert.ok(ids.includes('undersized-pointer-target'), JSON.stringify(output.checks));
    assert.ok(ids.includes('modal-focus-escape'), JSON.stringify(output.checks));
    assert.equal(output.research.context.goal, 'Use a modal safely');
    assert.equal(output.research.abstained.length, 17);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
