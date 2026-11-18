#!/usr/bin/env node
// Benchmark browser observations against a labeled manifest; does not compute a design-quality score.
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { inspectResearchPage } from '../../src/research/browser.js';
import { calculateDetectionMetrics } from './metrics.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(here, 'fixtures');

export function validateManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.viewports) ||
      !Array.isArray(manifest.cases) || !manifest.cases.length) throw new Error('Expected a v1 benchmark manifest with cases and viewports');
  const ids = new Set();
  for (const v of manifest.viewports) {
    if (!v.name || !Number.isInteger(v.width) || !Number.isInteger(v.height) ||
        v.width < 320 || v.height < 320) throw new Error('Invalid viewport');
  }
  for (const c of manifest.cases) {
    if (!c.id || ids.has(c.id)) throw new Error('Missing or duplicate case ID');
    ids.add(c.id);
    if (!!c.route === !!c.url) throw new Error('Each case needs exactly one of route (local fixture) or url (running local application)');
    if (!c.expected || !Object.keys(c.expected).length) throw new Error('Case must include labeled expected signals');
    if (!c.task || typeof c.task !== 'object') throw new Error('Case needs explicit task context');
  }
  return manifest;
}

async function fixtureServer() {
  const server = createServer((req, res) => {
    const name = (req.url || '/').split('?')[0].slice(1);
    // No arbitrary path traversal. Only predeclared fixture filenames are accessible.
    if (!/^[a-z0-9-]+\.html$/.test(name)) {
      res.writeHead(404); res.end('Unknown fixture'); return;
    }
    const file = join(fixtures, name);
    if (!existsSync(file)) { res.writeHead(404); res.end('Missing fixture'); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(readFileSync(file, 'utf8'));
  });
  await new Promise(resolveServer => server.listen(0, '127.0.0.1', resolveServer));
  return { server, baseUrl: 'http://127.0.0.1:' + server.address().port };
}

export async function runManifest(manifest, options = {}) {
  validateManifest(manifest);
  const needsFixtureServer = manifest.cases.some(c => c.route);
  const host = needsFixtureServer ? await fixtureServer() : null;
  const results = [];
  try {
    for (const c of manifest.cases) {
      for (const viewport of manifest.viewports) {
        const url = c.route ? host.baseUrl + '/' + c.route : (options.baseUrl ? new URL(c.url, options.baseUrl).toString() : c.url);
        try {
          const result = await inspectResearchPage(url, {
            task: c.task, width: viewport.width, height: viewport.height
          });
          if (!result.available) throw new Error(result.reason);
          results.push({
            caseId: c.id, viewport: viewport.name, expected: c.expected, task: c.task,
            observations: result.observations, checks: result.checks
          });
        } catch (error) {
          // A broken probe is not a negative observation. It is an abstention.
          if (options.throwOnError) throw error;
          results.push({
            caseId: c.id, viewport: viewport.name, expected: c.expected,
            observations: [], checks: [], probeError: error.message
          });
        }
      }
    }
    return {
      schemaVersion: 1,
      dataset: manifest.dataset ?? 'unspecified',
      provenance: manifest.provenance ?? 'unverified',
      reportType: 'signal-detection-not-user-experience',
      cases: results,
      detection: calculateDetectionMetrics(results)
    };
  } finally {
    if (host) await new Promise(resolveServer => host.server.close(resolveServer));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const manifestPath = args[0] && !args[0].startsWith('--') ? args[0] : join(here, 'manifest.fixtures.json');
    const outIndex = args.indexOf('--out');
    if (outIndex >= 0 && !args[outIndex + 1]) throw new Error('Expected filename after --out');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const baseIndex = args.indexOf('--base-url');
    if (baseIndex >= 0 && !args[baseIndex + 1]) throw new Error('Expected URL after --base-url');
    const report = await runManifest(manifest, {
      throwOnError: args.includes('--strict'),
      ...(baseIndex >= 0 ? { baseUrl: args[baseIndex + 1] } : {})
    });
    const json = JSON.stringify(report, null, 2);
    if (outIndex >= 0) writeFileSync(args[outIndex + 1], json + '\n');
    console.log(json);
    if (args.includes('--strict') && report.detection.mistakes.length) process.exitCode = 1;
  } catch (error) {
    console.error('HCI benchmark failed:', error.message);
    process.exitCode = 1;
  }
}
