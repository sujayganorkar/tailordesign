// src/platform.js - Target platform configuration (web, mobile, desktop, all, auto)

let _platform = 'auto';

export function setPlatform(platform) {
  _platform = platform || 'auto';
}

export function getPlatform() {
  return _platform;
}

export function isMobileOnly(content = '') {
  if (_platform === 'mobile') return true;
  if (_platform === 'web' || _platform === 'desktop' || _platform === 'all') return false;
  // In 'auto' mode: if file has explicit web/desktop signals, it's not mobile-only
  const hasWebDesktopSignals = /kIsWeb|Platform\.is(Windows|MacOS|Linux)|PointerHoverEvent|html\.|web\b/i.test(content);
  return !hasWebDesktopSignals;
}
