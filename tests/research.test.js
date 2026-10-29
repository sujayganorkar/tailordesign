import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HCI_FINDINGS, getHciFinding, listHciFindings } from '../src/research/catalog.js';
import { evaluateHciResearch } from '../src/research/evaluate.js';

test('research catalog contains 20 distinct evidence-bearing findings', () => {
  assert.equal(HCI_FINDINGS.length, 20);
  assert.equal(new Set(HCI_FINDINGS.map(f => f.id)).size, 20);
  assert.equal(new Set(HCI_FINDINGS.map(f => f.signal)).size, 20);
  assert.ok(HCI_FINDINGS.every(f => f.source.url.startsWith('https://') && f.limits && f.verify));
  assert.equal(getHciFinding('fragile-pointer-corridor').source.type, 'empirical');
  assert.equal(listHciFindings('motion').length, 3);
});

test('abstains when there is no supporting observation', () => {
  const output = evaluateHciResearch();
  assert.equal(output.findings.length, 0);
  assert.equal(output.abstained.length, 20);
});

test('emits a source-linked recommendation with supplied evidence', () => {
  const output = evaluateHciResearch({ observations: [{
    signal: 'fragile-pointer-corridor',
    observed: true,
    provenance: 'rendered',
    evidence: 'Pointer path between primary menu and submenu contains a 14px gap.',
    elementRef: '#products-menu',
  }] });
  assert.equal(output.matched, 1);
  assert.equal(output.findings[0].classification, 'design-recommendation');
  assert.match(output.findings[0].source.url, /^https:/);
  assert.equal(output.findings[0].elementRef, '#products-menu');
  assert.equal(output.abstained.length, 19);
});

test('true observation without evidence is rejected', () => {
  assert.throws(() => evaluateHciResearch({ observations: [{
    signal: 'fragile-pointer-corridor', observed: true, provenance: 'rendered'
  }] }), /concrete evidence/);
});

test('unknown signals, duplicate signals, and invalid provenance are rejected', () => {
  assert.throws(() => evaluateHciResearch({ observations: [{
    signal: 'missing', observed: false, provenance: 'rendered'
  }] }), /Unknown/);
  const repeated = { signal: 'fragile-pointer-corridor', observed: false, provenance: 'rendered' };
  assert.throws(() => evaluateHciResearch({ observations: [repeated, repeated] }), /Duplicate/);
  assert.throws(() => evaluateHciResearch({ observations: [{
    signal: 'fragile-pointer-corridor', observed: false, provenance: 'static'
  }] }), /invalid provenance/);
});

test('negative evidence means inspected, not flagged', () => {
  const result = evaluateHciResearch({ observations: [{
    signal: 'fragile-pointer-corridor', observed: false, provenance: 'rendered'
  }] });
  assert.equal(result.findings.length, 0);
  assert.equal(result.evaluated, 1);
  assert.equal(result.abstained.length, 19);
});
