// src/reporter.js - Output formatting

import chalk from 'chalk';

export function formatText(result) {
  const lines = [];

  lines.push('');
  lines.push(chalk.bold('━'.repeat(60)));
  lines.push(chalk.bold('  AI UI Quality Gate Report'));
  lines.push(chalk.bold('━'.repeat(60)));
  lines.push('');

  // Summary
  const scoreColor = result.score >= 80 ? chalk.green : result.score >= 60 ? chalk.yellow : chalk.red;
  lines.push(`  Files scanned:  ${result.filesScanned}`);
  lines.push(`  Files w/ issues: ${result.filesWithIssues}`);
  lines.push(`  Total issues:   ${result.totalIssues} (${result.errors} errors, ${result.warnings} warnings, ${result.infos} info)`);
  if (result.advisoryCount > 0) {
    lines.push(chalk.dim(`  Advisory:       ${result.advisoryCount} heuristic finding(s) — shown, not scored`));
  }
  if (result.suppressedCount > 0) {
    lines.push(chalk.dim(`  Suppressed:     ${result.suppressedCount} (uiq-ignore / config)`));
  }
  lines.push(`  Score:          ${scoreColor(result.score + '/100')} ${result.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL')}`);
  if (!result.passed && result.gate?.blockedByErrors && result.errors > 0) {
    lines.push(chalk.dim(`  Gate:           blocked by ${result.errors} error(s) (errors always fail, regardless of score)`));
  }
  lines.push('');

  // Library audit report (component-level compliance, --library)
  if (result.libraryReport) {
    lines.push(chalk.bold('  Library compliance (per file):'));
    const dirty = result.libraryReport.filter(r => r.issues > 0);
    if (dirty.length === 0) {
      lines.push(chalk.green('    ✓ All library components conform.'));
    } else {
      const worst = [...dirty].sort((a, b) => b.errors - a.errors || b.issues - a.issues).slice(0, 10);
      for (const r of worst) {
        const icon = r.errors > 0 ? chalk.red('✗') : chalk.yellow('⚠');
        lines.push(`    ${icon} ${r.file} — ${r.issues} issue(s)${r.errors > 0 ? `, ${r.errors} error(s)` : ''}`);
      }
      if (dirty.length > worst.length) {
        lines.push(chalk.dim(`    …and ${dirty.length - worst.length} more file(s) with issues (full list in --format json)`));
      }
    }
    lines.push('');
  }

  if (result.issues.length === 0) {
    lines.push(chalk.green('  ✓ No issues found. Your UI passes the quality gate.'));
    lines.push('');
    return lines.join('\n');
  }

  // Group by file
  const byFile = {};
  for (const issue of result.issues) {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  }

  for (const [file, issues] of Object.entries(byFile).sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    lines.push(chalk.bold(`  ${file}`));
    for (const issue of issues) {
      const advisory = issue.kind === 'recommendation' && result.gate?.mode !== 'strict';
      const icon = advisory ? chalk.blue('ℹ') : issue.severity === 'error' ? chalk.red('✗') : issue.severity === 'warning' ? chalk.yellow('⚠') : chalk.blue('ℹ');
      const rule = advisory ? `${chalk.dim(issue.rule)} ${chalk.dim('[advisory]')}` : chalk.dim(issue.rule);
      lines.push(`    ${icon} ${rule}`);
      if (issue.line) {
        lines.push(`      ${chalk.dim(`Line ${issue.line}:`)} ${issue.snippet ? issue.snippet.split('\n')[1]?.trim() || '' : ''}`);
      }
      lines.push(`      ${issue.message}`);
      if (issue.fix) {
        const isJsx = issue.file && /\.(jsx|tsx|js|ts)$/.test(issue.file);
        lines.push(`      ${chalk.dim('Fix:')} ${isJsx ? (issue.fix.jsx || issue.fix.description) : (issue.fix.css || issue.fix.description)}`);
      }
    }
    lines.push('');
  }

  // Actionable summary
  lines.push(chalk.bold('  Quick fixes:'));
  const autoFixable = result.issues.filter(i =>
    i.rule === 'motion/no-layout-animation' ||
    i.rule === 'motion/reduced-motion' ||
    i.rule === 'interaction/hover-state' ||
    i.rule === 'interaction/focus-visible'
  );
  if (autoFixable.length > 0) {
    lines.push(`    Run with --fix to auto-fix ${autoFixable.length} issue(s).`);
  }
  lines.push(`    ${result.errors} error(s) must be fixed manually.`);
  lines.push('');

  return lines.join('\n');
}

export function formatJson(result) {
  return JSON.stringify(result, null, 2);
}

export function formatMarkdown(result) {
  const lines = [];
  lines.push('# AI UI Quality Gate Report');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Files scanned | ${result.filesScanned} |`);
  lines.push(`| Files with issues | ${result.filesWithIssues} |`);
  lines.push(`| Total issues | ${result.totalIssues} |`);
  lines.push(`| Errors | ${result.errors} |`);
  lines.push(`| Warnings | ${result.warnings} |`);
  lines.push(`| Info | ${result.infos} |`);
  lines.push(`| Score | ${result.score}/100 |`);
  lines.push(`| Status | ${result.passed ? 'PASS ✓' : 'FAIL ✗'} |`);
  if (result.advisoryCount > 0) {
    lines.push(`| Advisory (not scored) | ${result.advisoryCount} |`);
  }
  if (result.suppressedCount > 0) {
    lines.push(`| Suppressed | ${result.suppressedCount} |`);
  }
  lines.push('');

  // Library audit report (component-level compliance, --library)
  if (result.libraryReport) {
    const dirty = result.libraryReport.filter(r => r.issues > 0);
    lines.push('## Library compliance');
    lines.push('');
    if (dirty.length === 0) {
      lines.push('All library components conform. ✓');
    } else {
      lines.push('| File | Issues | Errors |');
      lines.push('|------|--------|--------|');
      for (const r of [...dirty].sort((a, b) => b.errors - a.errors || b.issues - a.issues)) {
        lines.push(`| ${r.file} | ${r.issues} | ${r.errors} |`);
      }
    }
    lines.push('');
  }

  if (result.issues.length === 0) {
    lines.push('No issues found. ✓');
    return lines.join('\n');
  }

  // Group by file
  const byFile = {};
  for (const issue of result.issues) {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  }

  for (const [file, issues] of Object.entries(byFile).sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    lines.push(`## ${file}`);
    lines.push('');
    for (const issue of issues) {
      const advisory = issue.kind === 'recommendation' && result.gate?.mode !== 'strict';
      const icon = advisory ? 'ℹ' : issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ';
      const tag = advisory ? ' _(advisory — not scored)_' : '';
      lines.push(`- ${icon} **${issue.rule}**${tag} - ${issue.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
