# HCI research pilot (experimental)

This is **not** a new linting layer or a WCAG conformance checker. It curates 20 research-linked observations across six domains: motor control, feedback, cognition, perception, navigation and motion.

## Current scope

- `src/research/catalog.js`: IDs, sources, finding classification, signal names, recommended action, verification strategy, applicability limits.
- `src/research/evaluate.js`: takes **explicit observations with evidence** and returns recommendations and abstentions.
- `tests/research.test.js`: contract tests for grounding and non-inference.

Current evaluation is **caller-supplied evidence only**. It does not automatically observe the DOM, inspect screenshots, or validate that cited papers prove the exact UI outcome. It is not yet wired into the CLI/MCP, quality score, or agent loop.

## Example (Node ESM)

```js
import { evaluateHciResearch } from './src/research/evaluate.js';

const result = evaluateHciResearch({
  context: { task: 'Navigate a product submenu' },
  observations: [{
    signal: 'fragile-pointer-corridor',
    observed: true,
    provenance: 'rendered',
    elementRef: '#products-menu',
    evidence: 'Submenu is separated from its parent by a gap traversed by the pointer.',
  }]
});
console.log(result.findings);
```

Absence of an observation produces **abstention**, not a pass. `observed: false` means a specific signal was inspected and not found, not that the whole interface is compliant. Confidence is intentionally conservative.

## Evidence requirements

1. Identify the actual user task and interface state.
2. Capture rendered measurements, observable behaviors, task analysis or user-study evidence.
3. Map the observation to a specific signal; keep evidence and element reference attached.
4. Review the source and exceptions before raising a normative claim.
5. Offer a context-dependent implementation proposal.
6. Test the result against the original task and compare errors, completion time, or usability.

A citation is not proof that a design remedy improves this particular application. Numerical thresholds are used only where the underlying standard defines them.

## Next engineering steps

1. Build typed observation extractors for a few defensible browser signals (focus occlusion, pointer target bounding boxes, modal keyboard containment).
2. Add Playwright task scripts for submenu and form interactions; preserve recordings and traces.
3. Add explicit task-graph metadata and intent before evaluating cognitive, perceptual or motion claims.
4. Add provenance validation and a review protocol for research sources.
5. Compare agent-with and agent-without findings on equivalent real-world tasks, with blinded human review and overhead tracking.
6. Connect to CLI/MCP only after provenance and test coverage are reliable.

Avoid auto-assigning numeric scores or imposing universal animation preferences from this catalog.
