// Evidence-gated research recommendations. No static-guess fallback, no quality score.
import { HCI_FINDINGS, listHciFindings } from './catalog.js';

const PROVENANCE = new Set(['rendered', 'task-analysis', 'human-review', 'user-study']);

export function evaluateHciResearch(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Research input must be an object.');
  }
  const observations = input.observations ?? [];
  if (!Array.isArray(observations)) {
    throw new TypeError('observations must be an array.');
  }
  const catalogBySignal = new Map(HCI_FINDINGS.map(f => [f.signal, f]));
  const seen = new Set();
  const findings = [];
  const abstained = [];
  const inspected = [];

  for (const observation of observations) {
    if (!observation || typeof observation !== 'object' || Array.isArray(observation)) {
      throw new TypeError('Each observation must be an object.');
    }
    const { signal, observed, evidence, provenance, elementRef } = observation;
    const rule = catalogBySignal.get(signal);
    if (!rule) throw new Error(`Unknown research signal: ${signal}`);
    if (seen.has(signal)) throw new Error(`Duplicate research signal: ${signal}`);
    seen.add(signal);
    if (typeof observed !== 'boolean') {
      throw new TypeError(`Observation ${signal}: observed must be a boolean.`);
    }
    if (!PROVENANCE.has(provenance)) {
      throw new TypeError(`Observation ${signal}: invalid provenance.`);
    }
    if (!rule.allowedEvidence.includes(provenance)) {
      throw new Error(`Observation ${signal}: ${provenance} is insufficient evidence. Requires one of: ${rule.allowedEvidence.join(', ')}.`);
    }
    if (observed && (typeof evidence !== 'string' || !evidence.trim())) {
      throw new TypeError(`Observation ${signal}: provide concrete evidence for observed=true.`);
    }
    inspected.push(signal);
    if (!observed) continue;
    // Evidence is supplied by caller: this suggests a review, not proof of WCAG compliance/noncompliance.
    findings.push({
      id: rule.id,
      signal,
      domain: rule.domain,
      title: rule.title,
      classification: rule.kind === 'standard-guided' ? 'candidate-standard-issue' : 'design-recommendation',
      source: rule.source,
      evidence: evidence.trim(),
      provenance,
      ...(typeof elementRef === 'string' && elementRef.trim() ? { elementRef: elementRef.trim() } : {}),
      action: rule.action,
      verification: rule.verify,
      applicabilityLimits: rule.limits,
      confidence: provenance === 'user-study' || provenance === 'rendered' ? 'medium' : 'low',
    });
  }
  for (const rule of HCI_FINDINGS) {
    if (!seen.has(rule.signal)) abstained.push({ id: rule.id, signal: rule.signal, reason: 'No observation supplied; cannot infer applicability.' });
  }
  return {
    schemaVersion: 1,
    context: input.context ?? {},
    evaluated: inspected.length,
    matched: findings.length,
    findings,
    abstained,
    disclaimer: 'Candidates for design review, not verified accessibility failures or a research-derived UI quality score. Confirm exceptions and test outcomes.',
  };
}

export { listHciFindings };
