#!/usr/bin/env node
// Prepare an agent A/B study input from the three baseline UI tasks.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const baselines = resolve(root, 'benchmarks', 'interfaces');

const tasks = [
  { id: 'landing-page', file: 'landing.jsx', prompt: 'Improve this landing page for interaction quality, accessibility and motion. Keep functionality.' },
  { id: 'contact-form', file: 'form.jsx', prompt: 'Improve this contact form for interaction quality, accessibility and motion. Keep functionality.' },
  { id: 'operations-dashboard', file: 'dashboard.jsx', prompt: 'Improve this dashboard for interaction quality, accessibility and motion. Keep functionality.' },
];

function runUiq(file, args) {
  try {
    return execFileSync(process.execPath, [resolve(root, 'bin', 'cli.js'), resolve(baselines, file), ...args], {
      encoding: 'utf8', cwd: root, timeout: 60000,
    });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function tryParse(s) { try { return JSON.parse(s); } catch { return s; } }

const study = {
  schemaVersion: 1,
  studyName: 'Agent generated UI control vs source-backed HCI recommendations',
  generatedAt: new Date().toISOString(),
  tasks: [],
  runs: [],
  protocol: {
    control: 'Identical task text, no uiq recommendations',
    hci: 'Identical task text plus the embedded uiq scan/decide output from the baseline',
    honesty: 'Do not populate runs until actual agent executions exist.',
  },
};

for (const t of tasks) {
  const scan = runUiq(t.file, ['--format', 'json']);
  const decide = runUiq(t.file, ['--decide', '--format', 'json']);
  study.tasks.push({
    id: t.id,
    prompt: t.prompt,
    baselineFile: t.file,
    treatmentContext: {
      scan: tryParse(scan),
      decisions: tryParse(decide),
    },
  });
}

const outPath = process.argv[2] || resolve(here, 'study-input.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(study, null, 2) + '\n');
console.log('Wrote ' + outPath);
console.log('Tasks: ' + study.tasks.length);
console.log('Runs: 0 (populate after real agent executions)');