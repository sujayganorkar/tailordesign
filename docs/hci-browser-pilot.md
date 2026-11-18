# HCI browser pilot: task-grounded observations

This branch adds **experimental** UI research inspection. It does not affect the existing static quality score.

## Run

Requires Node 22.18+ or Node 24.11+, optional Playwright and a Chromium browser:

~~~sh
npm install --save-optional playwright
npx playwright install chromium
uiq research --url http://localhost:3000 --task ./hci-task.json --format json
~~~

Example task file:

~~~json
{
  "goal": "Navigate a modal form and return to the original page",
  "readySelector": "#app",
  "modalTriggerSelector": "#open-settings",
  "modalSelector": "[role=dialog][aria-modal=true]"
}
~~~

MCP agents can call \`uiq_research\` with \`url\` and \`task\` (an object rather than a file path). The browser accepts **only localhost/loopback HTTP(S)**. Requests outside loopback are blocked at the HTTP routing layer. Use only trusted local applications; this does not sandbox arbitrary untrusted JavaScript.

## Actual observations

1. **Pointer target geometry:** samples up to 50 visible interactive elements at one viewport. Flags small targets in close proximity; does **not** test essential/equivalent/user-agent exceptions. Findings are review candidates, never definitive WCAG failures.
2. **Focus occlusion:** tabs through up to 20 focusable elements and checks a grid of hit-tested points. Fully hidden focus samples are review candidates; not a substitute for an accessibility tree or assistive technology.
3. **Modal focus containment:** runs only when a task explicitly identifies a real modal (with \`aria-modal=true\` or native modal dialog), optionally clicking the given trigger. Tests forward Tab cycle; does not yet test reverse Tab, Escape, or restoration.

The 17 other research findings remain **abstained**, not passed. No visual aesthetics scoring, no design-quality score changes, no inferred task frequency, and no universal animation advice.

## Research validation path

- Test both deliberately broken and correct browser fixtures.
- Validate on three real local app tasks; record false positive/negative rates per signal.
- Measure blind task outcomes and agent overhead with and without the research layer.
- Add viewport sets, keyboard sequences and task recording only after this baseline is reliable.

Run \`npm test\`; the browser integration test skips if Chromium is unavailable. Existing tests must continue passing.
