// src/fixer.js — Auto-fix simple issues

import { readFileSync, writeFileSync } from 'fs';

export function applyFixes(targetPath, issues) {
  let fixed = 0;
  const fs = require('fs');
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    fixed += fixFile(targetPath);
  } else {
    const files = new Set(issues.map(i => i.file));
    for (const file of files) {
      fixed += fixFile(file);
    }
  }

  return fixed;
}

function fixFile(filePath) {
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return 0;
  }

  let fixed = 0;
  const ext = filePath.split('.').pop().toLowerCase();

  if (['css', 'scss', 'less'].includes(ext)) {
    // Fix: Add prefers-reduced-motion if missing
    if (/animation|transition/i.test(content) && !/prefers-reduced-motion/i.test(content)) {
      content += '\n\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n  }\n}\n';
      fixed++;
    }

    // Fix: Add motion tokens to :root if missing
    if (/animation|transition/i.test(content) && !/--duration|--ease|--motion/.test(content)) {
      // Add to existing :root or create one
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
      writeFileSync(filePath, content);
    }
  }

  // For JSX/TSX, we can't safely auto-fix. Log what would need manual fixing.
  if (['jsx', 'tsx', 'js', 'ts'].includes(ext)) {
    // Auto-fix is not safe for JSX — return 0
    return 0;
  }

  return fixed;
}
EOF
echo "Written"