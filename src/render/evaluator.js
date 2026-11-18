// src/render/evaluator.js - Optional browser-based evaluation
//
// Playwright is an OPTIONAL dependency. If it is not installed, this module
// reports `available: false` and provides no rendered checks. Install with:
//   npm install --save-optional playwright
// Then: npx playwright install chromium
//
// Deterministic checks here (console errors, layout overflow, focus order)
// are separated from subjective visual judgments (aesthetics), which are
// reported with explicit uncertainty.

export async function isPlaywrightAvailable() {
  try {
    await import('playwright');
    return true;
  } catch {
    return false;
  }
}

export async function evaluateRendered(urlOrFile, options = {}) {
  const available = await isPlaywrightAvailable();
  if (!available) {
    return {
      available: false,
      reason: 'Playwright is not installed. Run: npm install --save-optional playwright && npx playwright install chromium',
      checks: [],
      subjective: [],
    };
  }

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: options.width || 1280, height: options.height || 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  const target = urlOrFile.startsWith('http') ? urlOrFile : `file://${urlOrFile}`;
  await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => pageErrors.push(e.message));

  // Deterministic checks
  const checks = [];

  // 1. Focus visibility (before interactions)
  const focusVisible = await page.evaluate(async () => {
    const els = Array.from(document.querySelectorAll('button, a, input, [tabindex]'));
    let visible = 0;
    for (const el of els.slice(0, 20)) {
      el.focus();
      const style = getComputedStyle(el);
      if (style.outlineStyle !== 'none' || style.boxShadow !== 'none') visible++;
    }
    return { total: Math.min(els.length, 20), visible };
  });
  checks.push({
    id: 'render/focus-visible',
    kind: 'objective',
    passed: focusVisible.total === 0 || focusVisible.visible > 0,
    message: `Focus visible on ${focusVisible.visible}/${focusVisible.total} sampled interactive elements.`,
  });

  // 2. Horizontal overflow
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  checks.push({
    id: 'render/no-horizontal-overflow',
    kind: 'objective',
    passed: !overflow,
    message: overflow ? 'Page has horizontal overflow (layout breakage).' : 'No horizontal overflow.',
  });

  // 3. Trigger interactions to surface runtime errors
  try {
    const clickables = await page.$$('button, a, [role="button"]');
    for (const el of clickables.slice(0, 5)) {
      await el.click().catch(() => {});
      await page.waitForTimeout(100);
    }
  } catch (e) { pageErrors.push('interaction-error: ' + e.message); }

  // 4. Console errors (after interactions)
  checks.push({
    id: 'render/console-errors',
    kind: 'objective',
    passed: consoleErrors.length === 0 && pageErrors.length === 0,
    message: consoleErrors.length + pageErrors.length === 0
      ? 'No console or page errors.'
      : `${consoleErrors.length + pageErrors.length} console/page error(s).`,
    details: [...consoleErrors, ...pageErrors],
  });

  // Subjective (reported with uncertainty)
  const subjective = [
    {
      id: 'render/visual-balance',
      kind: 'subjective',
      confidence: 'low',
      message: 'Visual balance and aesthetic quality cannot be determined deterministically. Human review recommended.',
    },
  ];

  await browser.close();

  return {
    available: true,
    url: target,
    checks,
    subjective,
    passed: checks.every(c => c.passed),
  };
}
