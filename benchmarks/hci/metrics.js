// Ground-truth evaluation of individual research signals.
// Only known observations count; unobserved signals are abstentions.
export const EVALUATED_SIGNALS = Object.freeze([
  'potentialUndersizedTarget',
  'focusedControlFullyObscured',
  'modalFocusEscapes',
]);

function rate(n, d) { return d ? Math.round(n / d * 10000) / 10000 : null; }

export function calculateDetectionMetrics(rows) {
  if (!Array.isArray(rows)) throw new TypeError('rows must be an array');
  const totals = Object.fromEntries(EVALUATED_SIGNALS.map(s => [s, {
    tp: 0, fp: 0, fn: 0, tn: 0, abstained: 0, expectedCount: 0
  }]));
  const mistakes = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object' || typeof row.caseId !== 'string' ||
        !row.expected || typeof row.expected !== 'object') throw new TypeError('invalid benchmark case');
    const observed = new Map();
    for (const o of row.observations ?? []) {
      if (!EVALUATED_SIGNALS.includes(o.signal)) continue;
      if (observed.has(o.signal)) throw new Error('Duplicate signal in case ' + row.caseId);
      if (typeof o.observed !== 'boolean') throw new TypeError('invalid observed value');
      observed.set(o.signal, o.observed);
    }
    for (const [signal, expected] of Object.entries(row.expected)) {
      if (!EVALUATED_SIGNALS.includes(signal)) throw new Error('Unknown expected signal: ' + signal);
      if (typeof expected !== 'boolean') throw new TypeError('expected labels must be true or false');
      const t = totals[signal];
      t.expectedCount++;
      if (!observed.has(signal)) {
        t.abstained++;
        mistakes.push({ caseId: row.caseId, viewport: row.viewport, signal, kind: 'abstention', expected });
        continue;
      }
      const actual = observed.get(signal);
      const key = expected ? (actual ? 'tp' : 'fn') : (actual ? 'fp' : 'tn');
      t[key]++;
      if (key === 'fp' || key === 'fn') {
        mistakes.push({ caseId: row.caseId, viewport: row.viewport, signal, kind: key, expected, actual });
      }
    }
  }
  const summary = {};
  for (const [signal, v] of Object.entries(totals)) {
    const inspected = v.tp + v.fp + v.fn + v.tn;
    summary[signal] = {
      ...v, inspected,
      coverage: rate(inspected, v.expectedCount),
      precision: rate(v.tp, v.tp + v.fp),
      recall: rate(v.tp, v.tp + v.fn),
      falsePositiveRate: rate(v.fp, v.fp + v.tn),
    };
  }
  return { sampleSize: rows.length, metrics: summary, mistakes };
}
