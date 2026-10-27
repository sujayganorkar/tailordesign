// src/decisions/engine.js — Run the decision analysis on a codebase

import { classifyComponents } from './classifier.js';
import { getRequirements } from './requirements.js';

export function analyzeDecisions(parsed, content) {
  const { components, contexts } = classifyComponents(content, parsed.filePath);
  const decisions = [];

  for (const comp of components) {
    const req = getRequirements(comp.type, contexts);
    decisions.push({
      file: parsed.filePath,
      component: comp.type,
      count: comp.count,
      contexts,
      consequence: req.consequence,
      requiredStates: req.requiredStates,
      recommendedMotion: req.recommendedMotion,
      antiPatterns: req.antiPatterns,
    });
  }

  return decisions;
}

export function formatDecisionReport(allDecisions) {
  const lines = [];

  lines.push('');
  lines.push('━'.repeat(70));
  lines.push('  UI Interaction Decision Report');
  lines.push('━'.repeat(70));
  lines.push('');

  // Group by file
  const byFile = {};
  for (const d of allDecisions) {
    if (!byFile[d.file]) byFile[d.file] = [];
    byFile[d.file].push(d);
  }

  for (const [file, decisions] of Object.entries(byFile)) {
    lines.push(`  📄 ${file}`);
    lines.push('');

    for (const d of decisions) {
      lines.push(`  ├─ Component: ${d.component} (×${d.count})`);
      lines.push(`  │  Consequence: ${d.consequence}`);
      lines.push(`  │  Contexts: ${d.contexts.join(', ') || 'none detected'}`);
      lines.push(`  │`);
      lines.push(`  │  Required states:`);
      for (const s of d.requiredStates) {
        lines.push(`  │    • ${s}`);
      }
      if (d.requiredStates.length === 0) {
        lines.push(`  │    (none — passive component)`);
      }
      lines.push(`  │`);
      lines.push(`  │  Recommended motion:`);
      for (const m of d.recommendedMotion) {
        lines.push(`  │    → ${m}`);
      }
      if (d.recommendedMotion.length === 0) {
        lines.push(`  │    (none — keep static)`);
      }
      lines.push(`  │`);
      lines.push(`  │  Anti-patterns:`);
      for (const a of d.antiPatterns) {
        lines.push(`  │    ✗ ${a}`);
      }
      lines.push(`  │`);
    }
    lines.push('');
  }

  // Summary
  const totalComponents = allDecisions.reduce((sum, d) => sum + d.count, 0);
  const componentTypes = new Set(allDecisions.map(d => d.component));
  lines.push('━'.repeat(70));
  lines.push(`  Summary: ${totalComponents} components across ${componentTypes.size} types in ${Object.keys(byFile).length} files`);
  lines.push(`  Component types: ${[...componentTypes].join(', ')}`);
  lines.push('━'.repeat(70));
  lines.push('');

  // Motion spec template
  lines.push('  Motion Spec Template (fill in for your project):');
  lines.push('');
  lines.push('  | Component | Pattern | Trigger | Duration | Easing | Reduced motion |');
  lines.push('  |-----------|---------|---------|----------|--------|----------------|');
  for (const d of allDecisions.slice(0, 10)) {
    lines.push(`  | ${d.component} | ${d.recommendedMotion[0] || 'none'} | ${d.contexts[0] || 'click'} | — | — | instant appear |`);
  }
  lines.push('');

  return lines.join('\n');
}

export function formatDecisionJson(allDecisions) {
  return JSON.stringify(allDecisions, null, 2);
}
