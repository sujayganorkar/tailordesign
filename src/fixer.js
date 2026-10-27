// src/fixer.js — Auto-fix simple issues

import { readFileSync, writeFileSync } from 'fs';

export async function applyFixes(targetPath, issues) {
  const fs = await import('fs');
  let fixed = 0;

  if (fs.statSync(targetPath).isFile()) {
    fixed += await fixFile(targetPath, fs);
  } else {
    const files = new Set(issues.map(i => i.file));
    for (const file of files) {
      try {
        fixed += await fixFile(file, fs);
      } catch (e) { /* skip */ }
    }
  }

  return fixed;
}

async function fixFile(filePath, fs) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return 0;
  }

  let fixed = 0;
  const ext = filePath.split('.').pop().toLowerCase();

  if (['css', 'scss', 'less'].includes(ext)) {
    if (/animation|transition/i.test(content) && !/prefers-reduced-motion/i.test(content)) {
      content += '\n\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n  }\n}\n';
      fixed++;
    }

    if (/animation|transition/i.test(content) && !/--duration|--ease|--motion/.test(content)) {
      if (/:root\s*\{/.test(content)) {
        content = content.replace(
          /(:root\s*\{)/,
          '$1\n  --duration-micro: 100ms;\n  --duration-fast: 150ms;\n  --duration-normal: 250ms;\n  --duration-slow: 350ms;\n  --ease-out: cubic-bezier(0, 0, 0.2, 1);\n  --ease-in: cubic-bezier(0.4, 0, 1, 1);\n  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);'
        );
      } else {
        content = `:root {\n  --duration-micro: 100ms;\n  --duration-fast: 150ms;\n  --duration-normal: 250ms;\n  --duration-slow: 350ms;\n  --ease-out: cubic-bezier(0, 0, 0.2, 1);\n  --ease-in: cubic-bezier(0.4, 0, 1, 1);\n  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);\n}\n\n${content}`;
      }
      fixed++;
    }

    if (fixed > 0) {
      fs.writeFileSync(filePath, content);
    }
  }

  return fixed;
}
