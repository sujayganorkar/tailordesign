// src/utils/score.js - Meaningful, size-independent scoring
//
// Instead of a flat deduction from 100 (which punishes large projects
// disproportionately), we compute a per-file score and average across files.
// Each file starts at 100; errors/warnings/info deduct weighted points.
// Files with no issues score 100. The overall score is the unweighted mean
// of per-file scores, so a 100-file project with one warning per file scores
// ~97, not 0.

const WEIGHTS = { error: 10, warning: 3, info: 1 };

export function scoreFile(issues) {
  let score = 100;
  for (const i of issues) {
    score -= WEIGHTS[i.severity] || 1;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateScore(issues, fileCount) {
  if (fileCount === 0) return 100;
  // Group issues by file
  const byFile = new Map();
  for (const i of issues) {
    const f = i.file || '__unknown__';
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(i);
  }
  // Ensure every scanned file counts (files with no issues score 100)
  let total = 0;
  const filesWithIssues = byFile.size;
  const cleanFiles = Math.max(0, fileCount - filesWithIssues);
  total += cleanFiles * 100;
  for (const [, iss] of byFile) {
    total += scoreFile(iss);
  }
  // If byFile has more files than fileCount (shouldn't), clamp denominator
  const denom = Math.max(fileCount, byFile.size, 1);
  return Math.max(0, Math.min(100, Math.round(total / denom)));
}

export function scoreIssues(issues) {
  return issues.reduce((acc, i) => acc + (WEIGHTS[i.severity] || 1), 0);
}
