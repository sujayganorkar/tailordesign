import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareAgentRuns } from '../benchmarks/hci/compare-agents.js';
const task = { id:'example' };
const common = { taskId:'example', seed:42, model:'same-model', promptHash:'same-hash', commit:'abcdef',
  taskSuccess:1, runtimeErrors:0, elapsedSeconds:100, tokens:500, blindQualityRatings:[3,4] };
test('A/B comparator refuses to treat empty template as evidence', () => {
  const r=compareAgentRuns({ schemaVersion:1,tasks:[task],runs:[] });
  assert.equal(r.status,'insufficient-tasks');
  assert.equal(r.pairedRuns,0);
  assert.equal(r.meanDeltas.blindQuality,null);
});
test('A/B comparator calculates paired deltas without inventing ratings', () => {
  const r=compareAgentRuns({schemaVersion:1,tasks:[task],runs:[
    { ...common,arm:'control',runId:'a' },
    { ...common,arm:'hci',runId:'b',tokens:700,elapsedSeconds:130,blindQualityRatings:[4,5] }
  ]});
  assert.equal(r.pairedRuns,1);
  assert.equal(r.meanDeltas.tokens,200);
  assert.equal(r.meanDeltas.elapsedSeconds,30);
  assert.equal(r.meanDeltas.blindQuality,1);
  assert.equal(r.status,'insufficient-tasks');
});
test('A/B comparator excludes mismatched prompts or models', () => {
  const r=compareAgentRuns({schemaVersion:1,tasks:[task],runs:[
    { ...common,arm:'control',runId:'a' },
    { ...common,arm:'hci',runId:'b',model:'other-model' }
  ]});
  assert.equal(r.pairedRuns,0);
  assert.equal(r.exclusions.length,1);
});
test('A/B comparator rejects duplicates and invalid ratings',()=>{
  assert.throws(()=>compareAgentRuns({schemaVersion:1,tasks:[task],runs:[
    {...common,arm:'control',runId:'a'}, {...common,arm:'control',runId:'b'}
  ]}),/Duplicate arm/);
  assert.throws(()=>compareAgentRuns({schemaVersion:1,tasks:[task],runs:[
    {...common,arm:'control',runId:'a',blindQualityRatings:[7]}
  ]}),/blindQualityRatings/);
});
