# HCI evaluation: detection, false positives, and agent comparisons

This benchmark does **not** prove TailorDesign improves UX. It measures detector mistakes and defines a separate real-agent comparison.

## 1. Controlled browser benchmark

Commands:

    npm ci
    npm install --no-save playwright
    npx playwright install chromium
    node benchmarks/hci/run.js --strict --out /tmp/hci-report.json

Six authored HTML fixtures model three task types: commerce sorting, operations navigation, and settings dialogs. Each has a clean and intentionally broken variant. Two viewports (390×844 and 1280×800) produce 12 browser runs.

Labeled signals: (1) pointer-target spacing candidate, (2) keyboard focus entirely obscured, (3) modal focus escaping. These signals are not an exhaustive accessibility audit.

Each labeled observation contributes TP, FP, FN, or TN. A missing observation is an **abstention**, lowering coverage rather than counting as a true negative. Precision/recall are null if their denominator is zero. Strict mode fails on mismatches and abstentions.

**Limit:** intentionally constructed fixture accuracy is not a production false-positive rate. Avoid marketing controlled benchmark accuracy as generalization.

## 2. Real published UI reference

The browser CI validates pinned W3C ARIA Authoring Practices interactive dialog and alertdialog pages.

- Source: https://github.com/w3c/aria-practices
- Commit: 0f765e4dc33e966026114ac12a8380db1de3b787
- Manifest: benchmarks/hci/manifest.w3c.json

These are actual published implementations, not invented code. Only modal focus containment has a trusted expected label. Other observations are not scored without independent ground truth.

A second independent repo is also exercised:

- TodoMVC ES5: https://github.com/tastejs/todomvc
- Commit: ff43b02e59dfa604386bb382034b2cd07c2bcd8a
- Manifest: benchmarks/hci/manifest.todomvc.json
- Labeled signal: focus not fully obscured in the initial task-entry state, across both viewports.

Together these provide three published example interfaces from two upstream repositories. This is not a general production false-positive rate.

Test an existing local app using a case manifest with explicit task and reviewed labels:

    node benchmarks/hci/run.js ./your-manifest.json --base-url http://127.0.0.1:3000 --out ./research-results.json

Browser inspection requires trusted loopback HTTP(S) sites. It blocks third-party requests. Each case must identify the intended task, tested viewport, and labeled signals. The W3C sample itself is not a blanket accessibility certification.

## 3. Agent A/B comparison (NOT EXECUTED)

Template: benchmarks/hci/agent-study.template.json
Analyzer: benchmarks/hci/compare-agents.js

Protocol:

1. Pin a specific coding-agent model/version, settings and tool permissions.
2. For each task and seed, create one identical initial UI snapshot. Clone it into clean isolated worktrees.
3. Ask the control and treatment to improve the same UI using the identical core task prompt. Only the treatment receives evidence-grounded HCI recommendations from the original baseline.
4. Randomize arm execution order. Keep model context, test data, tool budgets and agent memory isolated between runs.
5. Independently run E2E task tests; collect browser runtime errors, agent time, token usage, and artifacts.
6. Capture both outputs at the same viewports. Have independent reviewers blind-rate anonymous outputs before revealing which arm produced them.
7. Record actual runs with taskId, runId, seed, arm, model, promptHash, commit, taskSuccess (0 or 1), runtimeErrors, elapsedSeconds, tokens, and optional blindQualityRatings (integer 1–5).
8. Analyze actual runs:

    node benchmarks/hci/compare-agents.js ./actual-study.json

The analyzer calculates paired deltas; it never fabricates run data. Fewer than three distinct paired tasks are insufficient; a descriptive difference is not a statistically demonstrated causal effect.

## Decision gates

- **Detection:** labeled false-positive, false-negative, coverage and abstention rates on independently reviewed real-app tasks.
- **Agent:** improvement in blinded usability and E2E task success at reasonable token/time overhead.
- **Product:** without an established agent improvement, position this as a targeted implementation-quality and workflow tool rather than a general design intelligence engine.
