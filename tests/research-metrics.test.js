import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDetectionMetrics } from '../benchmarks/hci/metrics.js';
import { validateManifest } from '../benchmarks/hci/run.js';

test('signal detection counts FP FN TN TP and abstentions separately', () => {
  const cases = [
    { caseId: 'one', expected: { modalFocusEscapes: true }, observations: [{ signal: 'modalFocusEscapes', observed: true }] },
    { caseId: 'two', expected: { modalFocusEscapes: false }, observations: [{ signal: 'modalFocusEscapes', observed: true }] },
    { caseId: 'three', expected: { modalFocusEscapes: true }, observations: [{ signal: 'modalFocusEscapes', observed: false }] },
    { caseId: 'four', expected: { modalFocusEscapes: false }, observations: [{ signal: 'modalFocusEscapes', observed: false }] },
    { caseId: 'five', expected: { modalFocusEscapes: true }, observations: [] }
  ];
  const m = calculateDetectionMetrics(cases);
  assert.deepEqual([m.metrics.modalFocusEscapes.tp,m.metrics.modalFocusEscapes.fp,m.metrics.modalFocusEscapes.fn,m.metrics.modalFocusEscapes.tn,m.metrics.modalFocusEscapes.abstained],[1,1,1,1,1]);
  assert.equal(m.metrics.modalFocusEscapes.coverage, 0.8);
  assert.equal(m.metrics.modalFocusEscapes.precision, 0.5);
  assert.equal(m.metrics.modalFocusEscapes.recall, 0.5);
  assert.equal(m.metrics.modalFocusEscapes.falsePositiveRate, 0.5);
});

test('rejects invented expected labels and duplicate observations', () => {
  assert.throws(() => calculateDetectionMetrics([{ caseId:'x',expected:{anything:true},observations:[] }]), /Unknown/);
  assert.throws(() => calculateDetectionMetrics([{ caseId:'x',expected:{modalFocusEscapes:true},observations:[
    {signal:'modalFocusEscapes',observed:true}, {signal:'modalFocusEscapes',observed:true}
  ] }]), /Duplicate/);
});

test('rejects incomplete benchmark manifests', () => {
  assert.throws(() => validateManifest({ schemaVersion:1,cases:[{ id:'x' }],viewports:[{name:'laptop',width:1280,height:800}] }), /exactly one/);
  assert.throws(() => validateManifest({schemaVersion:1,viewports:[],cases:[]}), /manifest/);
});
