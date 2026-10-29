#!/usr/bin/env node
// Analyze real agent-run observations. NEVER synthesize scores or declare causality.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function finite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Invalid numeric value for ' + label);
  return value;
}
function avg(xs) { return xs.length ? xs.reduce((a,b) => a + b, 0) / xs.length : null; }
function fixed(x) { return x === null ? null : Math.round(x * 1000) / 1000; }
export function compareAgentRuns(experiment) {
  if (!experiment || experiment.schemaVersion !== 1 || !Array.isArray(experiment.runs) ||
      !Array.isArray(experiment.tasks)) throw new TypeError('Expected schemaVersion:1, tasks and runs');
  const ids = new Set(experiment.tasks.map(t => t.id));
  if (ids.size !== experiment.tasks.length) throw new Error('Duplicate task IDs');
  const groups = new Map();
  for (const r of experiment.runs) {
    if (!ids.has(r.taskId)) throw new Error('Unknown task: ' + r.taskId);
    if (!['control','hci'].includes(r.arm)) throw new Error('Unknown arm: ' + r.arm);
    if (!r.model || !r.commit || !r.promptHash || !r.runId) throw new Error('Missing reproducibility fields for ' + r.taskId);
    const key = r.taskId + '::' + (r.seed ?? '');
    if (!groups.has(key)) groups.set(key, {});
    if (groups.get(key)[r.arm]) throw new Error('Duplicate arm for task/seed: ' + key);
    if (r.taskSuccess !== 0 && r.taskSuccess !== 1) throw new Error('taskSuccess must be 0 or 1');
    finite(r.elapsedSeconds, 'elapsedSeconds');
    finite(r.tokens, 'tokens');
    finite(r.runtimeErrors, 'runtimeErrors');
    if (r.blindQualityRatings !== undefined) {
      if (!Array.isArray(r.blindQualityRatings) || !r.blindQualityRatings.length ||
          !r.blindQualityRatings.every(x => Number.isInteger(x) && x >= 1 && x <= 5))
        throw new Error('blindQualityRatings require 1-5 integer values');
    }
    groups.get(key)[r.arm] = r;
  }
  const paired = [], incomplete = [], exclusions = [];
  for (const [key, {control,hci}] of groups.entries()) {
    if (!control || !hci) { incomplete.push(key); continue; }
    if (control.model !== hci.model || control.promptHash !== hci.promptHash) {
      exclusions.push({ key, reason:'Model or task prompt differs between arms' }); continue;
    }
    const controlRating = avg(control.blindQualityRatings ?? []);
    const hciRating = avg(hci.blindQualityRatings ?? []);
    paired.push({
      key, taskId: control.taskId, seed: control.seed ?? null,
      controlCommit: control.commit, hciCommit: hci.commit,
      taskSuccessDelta: hci.taskSuccess - control.taskSuccess,
      runtimeErrorDelta: hci.runtimeErrors - control.runtimeErrors,
      elapsedSecondsDelta: fixed(hci.elapsedSeconds - control.elapsedSeconds),
      tokenDelta: hci.tokens - control.tokens,
      blindQualityDelta: controlRating !== null && hciRating !== null ?
        fixed(hciRating - controlRating) : null,
    });
  }
  const distinctTaskCount = new Set(paired.map(p=>p.taskId)).size;
  const allHaveRatings = paired.length > 0 && paired.every(p => p.blindQualityDelta !== null);
  return {
    schemaVersion:1, pairedRuns: paired.length, distinctTasks: distinctTaskCount,
    incomplete, exclusions, perPair:paired,
    meanDeltas:{
      taskSuccess:fixed(avg(paired.map(p=>p.taskSuccessDelta))),
      runtimeErrors:fixed(avg(paired.map(p=>p.runtimeErrorDelta))),
      elapsedSeconds:fixed(avg(paired.map(p=>p.elapsedSecondsDelta))),
      tokens:fixed(avg(paired.map(p=>p.tokenDelta))),
      blindQuality:fixed(avg(paired.filter(p=>p.blindQualityDelta!==null).map(p=>p.blindQualityDelta)))
    },
    status: distinctTaskCount < 3 ? 'insufficient-tasks' : !allHaveRatings ? 'missing-blind-review' : 'exploratory-only',
    claim: 'Paired descriptive results only. No causal or statistical significance claim; independent runs, randomization and blind human review must be verified.',
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const file = process.argv[2];
    if (!file) throw new Error('Usage: node benchmarks/hci/compare-agents.js <study-results.json>');
    console.log(JSON.stringify(compareAgentRuns(JSON.parse(readFileSync(file, 'utf8'))), null, 2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
