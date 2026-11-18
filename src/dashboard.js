function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateDashboardHTML(result) {
  const issuesByFile = {};
  for (const issue of result.issues) {
    if (!issuesByFile[issue.file]) issuesByFile[issue.file] = [];
    issuesByFile[issue.file].push(issue);
  }

  const scoreColor = result.score >= 80 ? '#22c55e' : result.score >= 60 ? '#eab308' : '#ef4444';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>uiq Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
    .header { display: flex; align-items: center; gap: 2rem; margin-bottom: 2rem; }
    .score { font-size: 3rem; font-weight: bold; color: ${scoreColor}; }
    .stats { display: flex; gap: 1.5rem; }
    .stat { text-align: center; }
    .stat-value { font-size: 1.5rem; font-weight: bold; }
    .stat-label { font-size: 0.75rem; color: #94a3b8; }
    .card { background: #1e293b; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1rem; }
    .file { font-weight: bold; color: #60a5fa; margin-bottom: 0.5rem; }
    .issue { padding: 0.5rem 0; border-bottom: 1px solid #334155; }
    .issue:last-child { border-bottom: none; }
    .severity-error { color: #f87171; }
    .severity-warning { color: #fbbf24; }
    .severity-info { color: #60a5fa; }
    .rule { font-family: monospace; font-size: 0.85rem; }
    .message { font-size: 0.9rem; color: #cbd5e1; margin-top: 0.25rem; }
    .fix { font-size: 0.8rem; color: #94a3b8; margin-top: 0.25rem; font-style: italic; }
    .line { font-size: 0.75rem; color: #64748b; }
    h2 { margin: 1.5rem 0 1rem; }
  </style>
</head>
<body>
  <div class="header">
    <div class="score">${result.score}<span style="font-size:1rem;color:#94a3b8">/100</span></div>
    <div class="stats">
      <div class="stat"><div class="stat-value">${result.filesScanned}</div><div class="stat-label">Files</div></div>
      <div class="stat"><div class="stat-value" style="color:#f87171">${result.errors}</div><div class="stat-label">Errors</div></div>
      <div class="stat"><div class="stat-value" style="color:#fbbf24">${result.warnings}</div><div class="stat-label">Warnings</div></div>
      <div class="stat"><div class="stat-value" style="color:#60a5fa">${result.infos}</div><div class="stat-label">Info</div></div>
      <div class="stat"><div class="stat-value">${result.passed ? '✓' : '✗'}</div><div class="stat-label">Status</div></div>
    </div>
  </div>

  <h2>Issues by file</h2>
  ${Object.entries(issuesByFile).map(([file, issues]) => `
    <div class="card">
      <div class="file">${escapeHtml(file)}</div>
      ${issues.map(issue => `
        <div class="issue">
          <span class="severity-${issue.severity}">${issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ'}</span>
          <span class="rule">${escapeHtml(issue.rule)}</span>
          ${issue.line ? `<span class="line"> (line ${escapeHtml(issue.line)})</span>` : ''}
          <div class="message">${escapeHtml(issue.message)}</div>
          ${issue.fix ? `<div class="fix">Fix: ${escapeHtml(issue.fix.jsx || issue.fix.css || issue.fix.description)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `).join('')}

  ${result.issues.length === 0 ? '<div class="card"><p style="color:#22c55e">✓ No issues found. Your UI passes the quality gate.</p></div>' : ''}
</body>
</html>`;
}
