// src/feedback/review.js - Human feedback capture (structured)

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const FEEDBACK_FILE = '.uiq-feedback.json';

// Feedback categories (structured, not free-form)
const FEEDBACK_CATEGORIES = {
  'too-slow': { label: 'Too slow', description: 'Animation takes too long', adjust: { duration: 0.7 } },
  'too-fast': { label: 'Too fast', description: 'Animation is too quick to perceive', adjust: { duration: 1.3 } },
  'janky': { label: 'Janky', description: 'Not smooth, drops frames', adjust: { performance: true } },
  'wrong-easing': { label: 'Wrong easing', description: 'Motion feels unnatural', adjust: { easing: true } },
  'unnecessary': { label: 'Unnecessary', description: 'Animation adds no value', adjust: { remove: true } },
  'missing': { label: 'Missing', description: 'Expected animation but none present', adjust: { add: true } },
  'too-much': { label: 'Too much motion', description: 'Overwhelming, too many animations', adjust: { reduce: true } },
  'too-little': { label: 'Too little motion', description: 'Feels static, needs more life', adjust: { increase: true } },
  'wrong-trigger': { label: 'Wrong trigger', description: 'Animation fires at wrong time', adjust: { trigger: true } },
  'accessibility': { label: 'Accessibility issue', description: 'Motion causes discomfort or is inaccessible', adjust: { reducedMotion: true } },
};

// Load feedback
export function loadFeedback(dir) {
  const path = join(dir, FEEDBACK_FILE);
  if (!existsSync(path)) return { entries: [], summary: {} };
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return { entries: [], summary: {} };
  }
}

// Save feedback
export function saveFeedback(dir, feedback) {
  const path = join(dir, FEEDBACK_FILE);
  writeFileSync(path, JSON.stringify(feedback, null, 2));
  return path;
}

// Add a feedback entry
export function addFeedback(dir, entry) {
  const feedback = loadFeedback(dir);
  const newEntry = {
    id: `fb-${Date.now()}`,
    timestamp: new Date().toISOString(),
    file: entry.file,
    component: entry.component,
    category: entry.category,
    categoryLabel: FEEDBACK_CATEGORIES[entry.category]?.label || entry.category,
    note: entry.note || '',
    resolved: false,
  };
  feedback.entries.push(newEntry);

  // Update summary
  if (!feedback.summary[entry.category]) feedback.summary[entry.category] = 0;
  feedback.summary[entry.category]++;

  saveFeedback(dir, feedback);
  return newEntry;
}

// Get unresolved feedback
export function getUnresolved(dir) {
  const feedback = loadFeedback(dir);
  return feedback.entries.filter(e => !e.resolved);
}

// Resolve a feedback entry
export function resolveFeedback(dir, id) {
  const feedback = loadFeedback(dir);
  const entry = feedback.entries.find(e => e.id === id);
  if (entry) {
    entry.resolved = true;
    entry.resolvedAt = new Date().toISOString();
    saveFeedback(dir, feedback);
  }
  return entry;
}

// Generate adjustment recommendations from feedback
export function getAdjustments(dir) {
  const feedback = loadFeedback(dir);
  const unresolved = feedback.entries.filter(e => !e.resolved);
  const adjustments = [];

  // Group by file+component
  const grouped = {};
  for (const entry of unresolved) {
    const key = `${entry.file}::${entry.component}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  }

  for (const [key, entries] of Object.entries(grouped)) {
    const [file, component] = key.split('::');
    const categories = entries.map(e => e.category);
    const adjust = {};

    for (const cat of categories) {
      const catDef = FEEDBACK_CATEGORIES[cat];
      if (catDef?.adjust) {
        Object.assign(adjust, catDef.adjust);
      }
    }

    adjustments.push({
      file,
      component,
      feedbackCount: entries.length,
      categories,
      adjustments: adjust,
      entries: entries.map(e => ({ id: e.id, category: e.category, note: e.note })),
    });
  }

  return adjustments;
}

// Format feedback report
export function formatFeedbackReport(dir) {
  const feedback = loadFeedback(dir);
  const unresolved = feedback.entries.filter(e => !e.resolved);

  const lines = [];
  lines.push('');
  lines.push('━'.repeat(60));
  lines.push('  Human Feedback Report');
  lines.push('━'.repeat(60));
  lines.push('');

  if (feedback.entries.length === 0) {
    lines.push('  No feedback recorded yet.');
    lines.push('');
    lines.push('  To add feedback: uiq review <file> --component <name> --category <category>');
    lines.push('  Categories: ' + Object.keys(FEEDBACK_CATEGORIES).join(', '));
    return lines.join('\n');
  }

  lines.push(`  Total entries: ${feedback.entries.length}`);
  lines.push(`  Unresolved: ${unresolved.length}`);
  lines.push('');

  // Summary by category
  lines.push('  By category:');
  for (const [cat, count] of Object.entries(feedback.summary || {})) {
    const label = FEEDBACK_CATEGORIES[cat]?.label || cat;
    lines.push(`    ${label}: ${count}`);
  }
  lines.push('');

  if (unresolved.length > 0) {
    lines.push('  Unresolved feedback:');
    for (const e of unresolved) {
      lines.push(`    • [${e.id}] ${e.file.split('/').pop()} → ${e.component}: ${e.categoryLabel}${e.note ? ` (${e.note})` : ''}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

export { FEEDBACK_CATEGORIES };
