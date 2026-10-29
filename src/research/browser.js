// Opt-in rendered HCI research observations from trusted local development sites.
// These checks identify review candidates, not WCAG conformance failures.
import { evaluateHciResearch } from './evaluate.js';

export function validateResearchUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Expected an absolute local HTTP(S) URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username || url.password) {
    throw new Error('Research browser access is limited to trusted localhost/loopback HTTP(S) servers.');
  }
  return url.toString();
}

function observation(signal, observed, evidence, elementRef) {
  return { signal, observed, provenance: 'rendered', ...(evidence ? { evidence } : {}), ...(elementRef ? { elementRef } : {}) };
}

// Unknown signals stay uninspected and abstained. Only a task-specified modal may be opened.
export async function inspectResearchPage(url, options = {}) {
  const target = validateResearchUrl(url);
  const task = options.task ?? {};
  if (!task || typeof task !== 'object' || Array.isArray(task)) throw new TypeError('task must be an object');
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch {
    return { available: false, reason: 'Install optional playwright and npx playwright install chromium.',
      research: evaluateHciResearch({ context: task }), observations: [], checks: [] };
  }
  const viewport = {
    width: Math.max(320, Math.min(2560, Number(options.width) || 1280)),
    height: Math.max(320, Math.min(1600, Number(options.height) || 800)),
  };
  const maxTargets = Math.max(1, Math.min(100, Number(options.maxTargets) || 50));
  const timeout = Math.max(1000, Math.min(30000, Number(options.timeoutMs) || 15000));
  const observations = [], checks = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    // Keep the browser confined to local dev-server resources.
    await context.route('**/*', route => {
      try {
        const requestUrl = new URL(route.request().url());
        if (['http:', 'https:'].includes(requestUrl.protocol) &&
            ['localhost', '127.0.0.1', '[::1]'].includes(requestUrl.hostname)) {
          return route.continue();
        }
      } catch { /* abort malformed requests */ }
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout });
    validateResearchUrl(page.url());
    if (task.readySelector) await page.locator(task.readySelector).waitFor({ state: 'visible', timeout });

    // WCAG 2.5.8 spacing: only non-inline targets and nearby targets.
    // Essential, equivalent, and user-agent exceptions cannot be inferred from geometry.
    const targets = await page.evaluate(limit => {
      const selector = 'button, a[href], input:not([type=hidden]), select, textarea, [role="button"], [role="link"]';
      const candidates = Array.from(document.querySelectorAll(selector)).slice(0, limit);
      const entries = candidates.map((el, index) => {
        const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
        const visible = rect.width > 0 && rect.height > 0 &&
          style.visibility !== 'hidden' && style.display !== 'none' &&
          rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
        return { index, visible, inline: style.display === 'inline', width: rect.width,
          height: rect.height, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2,
          x: rect.x, y: rect.y, ref: el.id ? '#' + el.id : el.tagName.toLowerCase() + '[sample-' + index + ']' };
      }).filter(t => t.visible && !t.inline);
      const tooSmall = entries.filter(t => t.width < 24 && t.height < 24), potential = [];
      for (const small of tooSmall) {
        const near = entries.some(other => {
          if (other === small) return false;
          if (other.width < 24 && other.height < 24) return Math.hypot(small.cx - other.cx, small.cy - other.cy) < 24;
          const px = Math.max(other.x, Math.min(small.cx, other.x + other.width));
          const py = Math.max(other.y, Math.min(small.cy, other.y + other.height));
          return Math.hypot(px - small.cx, py - small.cy) < 12;
        });
        if (near) potential.push({ ref: small.ref, width: Math.round(small.width), height: Math.round(small.height) });
      }
      return { sampled: candidates.length, inspected: entries.length, small: tooSmall.length, potential: potential.slice(0, 10) };
    }, maxTargets);
    checks.push({ id: 'hci/target-geometry', status: targets.inspected ? 'inspected' : 'abstained', ...targets });
    if (targets.inspected) {
      const hit = targets.potential.length > 0;
      observations.push(observation('potentialUndersizedTarget', hit,
        hit ? 'Closely spaced undersized targets in CSS px: ' + JSON.stringify(targets.potential) + '. Other exceptions untested.' : undefined,
        hit ? targets.potential[0].ref : undefined));
    }

    // Keyboard traversal. elementFromPoint sampling estimates full occlusion;
    // it is not an exhaustive WCAG focus audit.
    const seen = new Set(), obscured = [];
    for (let i = 0; i < Math.min(maxTargets, 20); i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || el === document.documentElement) return null;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.left < 0 || rect.top < 0 ||
            rect.right > innerWidth || rect.bottom > innerHeight) return { visible: false };
        const sample = [0.25, 0.5, 0.75];
        const exposed = sample.some(x => sample.some(y => {
          const hit = document.elementFromPoint(rect.left + x * rect.width, rect.top + y * rect.height);
          return hit && (hit === el || el.contains(hit));
        }));
        const allFocusables = Array.from(document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'));
        const ordinal = allFocusables.indexOf(el);
        return { visible: true, exposed, ref: el.id ? '#' + el.id : el.tagName.toLowerCase() + '[focus-' + ordinal + ']' };
      });
      if (!info) break;
      if (!info.visible) continue;
      if (seen.has(info.ref)) break;
      seen.add(info.ref);
      if (!info.exposed) obscured.push(info.ref);
    }
    checks.push({ id: 'hci/focus-occlusion', status: seen.size ? 'inspected' : 'abstained', inspected: seen.size, obscured });
    if (seen.size) {
      const blocked = obscured.length > 0;
      observations.push(observation('focusedControlFullyObscured', blocked,
        blocked ? 'All focus-box sample points hit an overlay for: ' + obscured.join(', ') : undefined,
        blocked ? obscured[0] : undefined));
    }

    // Modal test is opt-in and task specific, never guessed from generic dialogs.
    if (typeof task.modalSelector === 'string' && task.modalSelector.trim()) {
      if (task.modalTriggerSelector) await page.locator(task.modalTriggerSelector).click({ timeout });
      const modal = page.locator(task.modalSelector);
      const active = await modal.isVisible().catch(() => false);
      if (!active) checks.push({ id: 'hci/modal-focus', status: 'abstained', reason: 'Declared modal is not visible.' });
      else {
        const metadata = await modal.evaluate(el => ({
          modal: el.getAttribute('aria-modal') === 'true' || (el.tagName === 'DIALOG' && el.matches(':modal')),
          focusables: el.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])').length,
        }));
        if (!metadata.modal || !metadata.focusables) {
          checks.push({ id: 'hci/modal-focus', status: 'abstained', reason: 'Not a declared modal with focusable controls.' });
        } else {
          let escaped = !(await modal.evaluate(el => el.contains(document.activeElement)));
          for (let i = 0; i < Math.min(metadata.focusables + 2, 15) && !escaped; i++) {
            await page.keyboard.press('Tab');
            escaped = !(await modal.evaluate(el => el.contains(document.activeElement)));
          }
          checks.push({ id: 'hci/modal-focus', status: 'inspected', escaped });
          observations.push(observation('modalFocusEscapes', escaped,
            escaped ? 'Keyboard focus escaped modal ' + task.modalSelector : undefined,
            escaped ? task.modalSelector : undefined));
        }
      }
    }
    return { available: true, url: target, viewport, checks, observations,
      research: evaluateHciResearch({ context: task, observations }) };
  } finally {
    if (browser) await browser.close();
  }
}
