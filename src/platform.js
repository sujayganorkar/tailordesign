// src/platform.js - Target platform configuration (auto, mobile, web)

// Supported platform targets. `desktop` and `all` were removed: they were
// indistinguishable from `web` in behavior (a half-baked value is worse than
// no value — it implies analysis that does not happen).
export const SUPPORTED_PLATFORMS = new Set(['auto', 'mobile', 'web']);

let _platform = 'auto';

export function setPlatform(platform) {
  const p = platform || 'auto';
  if (!SUPPORTED_PLATFORMS.has(p)) {
    throw new Error(`Unsupported platform "${p}". Supported: auto, mobile, web.`);
  }
  _platform = p;
}

export function getPlatform() {
  return _platform;
}

export function isMobileOnly(content = '') {
  if (_platform === 'mobile') return true;
  if (_platform === 'web') return false;
  // In 'auto' mode: if file has explicit web/desktop signals, it's not mobile-only
  const hasWebDesktopSignals = /kIsWeb|Platform\.is(Windows|MacOS|Linux)|PointerHoverEvent|html\.|web\b/i.test(content);
  return !hasWebDesktopSignals;
}
