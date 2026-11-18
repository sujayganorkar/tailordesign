// src/utils/suppress.js - Suppression helpers (inline + config)
//
// Inline: a line containing `uiq-ignore` suppresses issues reported against
// that line. `uiq-ignore rule-a,rule-b` limits it to those rules; a bare
// `uiq-ignore` suppresses any rule on that line.
//
// Config (.uiqrc.json):
//   "suppressions": {
//     "rule-id": ["glob-or-exact-path", ...],
//     "*": ["**/legacy/**"]
//   }

// Inline suppression: check the issue's line for a uiq-ignore marker.
// Also supports the "comment on the line above" convention: a comment-only
// line containing `uiq-ignore` suppresses issues on the following line.
export function isInlineSuppressed(issue, content) {
  if (!issue.line || typeof content !== 'string') return false;
  const lines = content.split('\n');
  const lineText = lines[issue.line - 1] || '';
  if (lineText.includes('uiq-ignore')) {
    return matchesIgnoreRule(lineText, issue.rule);
  }
  const prevLine = lines[issue.line - 2] || '';
  if (isCommentOnlyLine(prevLine) && prevLine.includes('uiq-ignore')) {
    return matchesIgnoreRule(prevLine, issue.rule);
  }
  return false;
}

function matchesIgnoreRule(lineText, rule) {
  const m = lineText.match(/uiq-ignore(?::|\s+)([A-Za-z0-9/_,-]*)/);
  const ids = ((m && m[1]) || '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.length === 0 || ids.includes(rule);
}

function isCommentOnlyLine(lineText) {
  const t = lineText.trim();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') ||
    t.startsWith('<!--') || t.startsWith('{/*') || t.endsWith('*/');
}

// Config suppression: { "suppressions": { "rule-id|*": ["glob", ...] } }
export function isConfigSuppressed(issue, config) {
  const suppressions = config?.suppressions;
  if (!suppressions || typeof suppressions !== 'object' || Array.isArray(suppressions)) return false;
  for (const [ruleId, patterns] of Object.entries(suppressions)) {
    if (ruleId !== '*' && ruleId !== issue.rule) continue;
    if (Array.isArray(patterns) && patterns.some(p => matchGlob(issue.file || '', p))) return true;
  }
  return false;
}

export function isSuppressed(issue, content, config) {
  return isInlineSuppressed(issue, content) || isConfigSuppressed(issue, config);
}

// Minimal glob matcher supporting `**`, `*`, and exact paths (enough for
// ignore/suppression patterns without pulling in a matcher dependency).
export function matchGlob(path, pattern) {
  if (!path || !pattern) return false;
  const normalized = String(path).replace(/\\/g, '/');
  const pat = String(pattern).replace(/\\/g, '/');
  if (pat === normalized) return true;
  const re = pat
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*');
  return new RegExp(`^${re}$`).test(normalized);
}
