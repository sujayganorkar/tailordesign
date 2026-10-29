# Benchmarks

Representative UI interfaces used to evaluate uiq's effectiveness.

## Interfaces
- `landing.jsx` — marketing landing page (hero, nav, feature grid, CTA)
- `dashboard.jsx` — data dashboard (nav, stats cards, data list, fetch)
- `form.jsx` — contact form (input, submit, fetch)

## Run
```
node benchmarks/run.js
```

## What this measures
uiq scores and issue counts on each interface. Useful for detecting regressions in
rule effectiveness and for comparing before/after when changing rules.

## What this does NOT measure
Agent-only vs agent+uiq comparisons require running a coding agent on identical
tasks with and without uiq, then human-rating the results. This harness does not
fabricate those numbers. To perform such an evaluation, run the agent twice on
each interface with a fixed task prompt, score both outputs with uiq and a human
reviewer, and record the delta.

## Reported limitations
See README.md "Limitations and honesty" section.
