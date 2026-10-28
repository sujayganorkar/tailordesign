// src/reporter.js — Output formatting

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
  lines.push(`  Score:          ${scoreColor(result.score + '/100')} ${result.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL')}`);
  lines.push('');

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

  for (const [file, issues] of Object.entries(byFile)) {
    lines.push(chalk.bold(`  ${file}`));
    for (const issue of issues) {
      const icon = issue.severity === 'error' ? chalk.red('✗') : issue.severity === 'warning' ? chalk.yellow('⚠') : chalk.blue('ℹ');
      const rule = chalk.dim(issue.rule);
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
  lines.push('');

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

  for (const [file, issues] of Object.entries(byFile)) {
    lines.push(`## ${file}`);
    lines.push('');
    for (const issue of issues) {
      const icon = issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ';
      lines.push(`- ${icon} **${issue.rule}** — ${issue.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
