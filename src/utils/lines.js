// src/utils/lines.js — Line number utilities for precise issue reporting

// Find line numbers for a regex pattern in content
export function findLineNumbers(content, pattern) {
  const lines = content.split('\n');
  const result = [];
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'gi');
  
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      result.push(i + 1); // 1-based
      regex.lastIndex = 0; // reset regex state
    }
  }
  return result;
}

// Find the first line number matching a pattern
export function findFirstLine(content, pattern) {
  const lines = findLineNumbers(content, pattern);
  return lines.length > 0 ? lines[0] : null;
}

// Find line numbers for a specific string
export function findStringLines(content, str) {
  const lines = content.split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(str)) {
      result.push(i + 1);
    }
  }
  return result;
}

// Get a code snippet around a line number
export function getCodeSnippet(content, lineNumber, context = 2) {
  const lines = content.split('\n');
  const start = Math.max(0, lineNumber - 1 - context);
  const end = Math.min(lines.length, lineNumber + context);
  const snippet = [];
  for (let i = start; i < end; i++) {
    const marker = i === lineNumber - 1 ? '>' : ' ';
    snippet.push(`${marker} ${i + 1}: ${lines[i]}`);
  }
  return snippet.join('\n');
}
