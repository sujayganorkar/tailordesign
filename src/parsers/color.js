// src/parsers/color.js - Color parsing and contrast calculation utilities

// Parse a hex color to RGB
export function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

// Parse rgb/rgba string
export function rgbStringToRgb(str) {
  const match = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) {
    return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
  }
  return null;
}

// Calculate relative luminance (WCAG formula)
export function relativeLuminance(rgb) {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two colors
export function contrastRatio(color1, color2) {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Tailwind color to approximate hex (common colors)
const TAILWIND_COLORS = {
  'white': '#ffffff', 'black': '#000000',
  'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db', 'gray-400': '#9ca3af', 'gray-500': '#6b7280',
  'gray-600': '#4b5563', 'gray-700': '#374151', 'gray-800': '#1f2937',
  'gray-900': '#111827', 'gray-950': '#030712',
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b',
  'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b',
  'slate-900': '#0f172a', 'slate-950': '#020617',
  'zinc-50': '#fafafa', 'zinc-100': '#f4f4f5', 'zinc-200': '#e4e4e7',
  'zinc-300': '#d4d4d8', 'zinc-400': '#a1a1aa', 'zinc-500': '#71717a',
  'zinc-600': '#52525b', 'zinc-700': '#3f3f46', 'zinc-800': '#27272a',
  'zinc-900': '#18181b', 'zinc-950': '#09090b',
  'red-500': '#ef4444', 'red-600': '#dc2626', 'red-700': '#b91c1c',
  'blue-500': '#3b82f6', 'blue-600': '#2563eb', 'blue-700': '#1d4ed8',
  'green-500': '#22c55e', 'green-600': '#16a34a', 'green-700': '#15803d',
  'yellow-500': '#eab308', 'yellow-600': '#ca8a04',
  'purple-500': '#a855f7', 'purple-600': '#9333ea',
  'indigo-500': '#6366f1', 'indigo-600': '#4f46e5',
  'pink-500': '#ec4899', 'pink-600': '#db2777',
  'orange-500': '#f97316', 'orange-600': '#ea580c',
  'teal-500': '#14b8a6', 'teal-600': '#0d9488',
  'cyan-500': '#06b6d4', 'cyan-600': '#0891b2',
};

// Parse Tailwind text color class
export function parseTailwindTextColor(className) {
  const match = className.match(/text-(\w+-\d+|\w+)/);
  if (match) {
    const color = match[1];
    if (TAILWIND_COLORS[color]) return hexToRgb(TAILWIND_COLORS[color]);
    if (TAILWIND_COLORS[color.toLowerCase()]) return hexToRgb(TAILWIND_COLORS[color.toLowerCase()]);
  }
  return null;
}

// Parse Tailwind background color class
export function parseTailwindBgColor(className) {
  const match = className.match(/bg-(\w+-\d+|\w+)/);
  if (match) {
    const color = match[1];
    if (TAILWIND_COLORS[color]) return hexToRgb(TAILWIND_COLORS[color]);
    if (TAILWIND_COLORS[color.toLowerCase()]) return hexToRgb(TAILWIND_COLORS[color.toLowerCase()]);
  }
  return null;
}

// Check if a file has potential contrast issues (basic heuristic)
export function checkContrast(content) {
  const issues = [];
  // Find text color + bg color pairs in className
  const classRegex = /className=["']([^"']+)["']/g;
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    const classes = match[1];
    const textColor = parseTailwindTextColor(classes);
    const bgColor = parseTailwindBgColor(classes);
    if (textColor && bgColor) {
      const ratio = contrastRatio(textColor, bgColor);
      if (ratio < 4.5) {
        issues.push({ ratio: ratio.toFixed(2), classes: classes.slice(0, 60) });
      }
    }
  }
  return issues;
}