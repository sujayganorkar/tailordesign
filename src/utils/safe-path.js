// src/utils/safe-path.js — Path safety helpers for untrusted input (MCP, etc.)

import { normalize, sep } from 'path';

export function isSafePath(p) {
  if (typeof p !== 'string' || p.length === 0) return false;
  if (p.includes('\0')) return false;
  const segments = normalize(p).split(sep);
  if (segments.includes('..')) return false;
  return true;
}

export function assertSafePath(p, label = 'path') {
  if (!isSafePath(p)) {
    throw new Error(`${label} must be a non-empty string without '..' traversal or null bytes`);
  }
  return p;
}
