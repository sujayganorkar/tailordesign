// src/spec/motion-spec.js - Machine-readable motion spec as source of truth

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const SPEC_FILE = 'motion-spec.json';

// Generate a motion spec from decision analysis
export function generateMotionSpec(decisions) {
  const spec = {
    version: '1.0',
    generated: null, // deterministic: no wall-clock in spec output
    components: {},
  };

  for (const d of decisions) {
    const key = `${d.file}::${d.component}`;
    if (!spec.components[key]) {
      spec.components[key] = {
        file: d.file,
        component: d.component,
        count: d.count,
        consequence: d.consequence,
        contexts: d.contexts,
        requiredStates: d.requiredStates,
        motion: d.recommendedMotion.map(m => parseMotion(m)),
        antiPatterns: d.antiPatterns,
        approved: false,
        approvedBy: null,
        approvedAt: null,
      };
    }
  }

  return spec;
}

// Parse a motion recommendation string into structured data
function parseMotion(motionStr) {
  // Extract duration
  const durMatch = motionStr.match(/(\d+)(?:-(\d+))?\s*ms/);
  const duration = durMatch ? parseInt(durMatch[1]) : null;
  const durationMax = durMatch && durMatch[2] ? parseInt(durMatch[2]) : duration;

  // Extract easing
  const easingMatch = motionStr.match(/ease-(?:out|in|in-out)|ease\b/);
  const easing = easingMatch ? easingMatch[0] : null;

  // Extract pattern type
  let pattern = 'unknown';
  if (/entrance|fade-in|reveal/i.test(motionStr)) pattern = 'entrance';
  else if (/hover/i.test(motionStr)) pattern = 'hover';
  else if (/press|scale.*press/i.test(motionStr)) pattern = 'press';
  else if (/loading|spinner|skeleton/i.test(motionStr)) pattern = 'loading';
  else if (/exit/i.test(motionStr)) pattern = 'exit';
  else if (/slide/i.test(motionStr)) pattern = 'slide';
  else if (/stagger/i.test(motionStr)) pattern = 'stagger';

  return {
    description: motionStr,
    pattern,
    duration,
    durationMax,
    easing,
  };
}

// Write motion spec to file
export function writeMotionSpec(spec, dir) {
  const path = join(dir, SPEC_FILE);
  writeFileSync(path, JSON.stringify(spec, null, 2));
  return path;
}

// Read motion spec from file
export function readMotionSpec(dir) {
  const path = join(dir, SPEC_FILE);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

// Verify implementation against motion spec
export function verifyAgainstSpec(spec, parsed, content) {
  const issues = [];
  const file = parsed.filePath;

  // Find spec entries for this file
  const entries = Object.values(spec.components).filter(c => c.file === file);

  for (const entry of entries) {
    // Check required states
    for (const state of entry.requiredStates) {
      // This is handled by the quality gate rules - but we add spec-specific checks
    }

    // Check motion durations against spec
    for (const motion of entry.motion) {
      if (motion.duration && parsed.durations) {
        const outOfRange = parsed.durations.filter(d => {
          if (motion.durationMax) {
            return d < motion.duration * 0.5 || d > motion.durationMax * 2;
          }
          return Math.abs(d - motion.duration) > motion.duration * 0.5;
        });
        if (outOfRange.length > 0) {
          issues.push({
            rule: 'spec/motion-mismatch',
            severity: 'warning',
            message: `Spec says ${motion.pattern} should be ~${motion.duration}ms, but found ${outOfRange.join(', ')}ms in ${entry.component}.`,
            file,
          });
        }
      }
    }
  }

  return issues;
}

// Approve a component in the spec
export function approveComponent(spec, file, component, approvedBy) {
  const key = `${file}::${component}`;
  if (spec.components[key]) {
    spec.components[key].approved = true;
    spec.components[key].approvedBy = approvedBy || 'human';
    spec.components[key].approvedAt = new Date().toISOString();
  }
  return spec;
}

// Get unapproved components
export function getUnapproved(spec) {
  return Object.values(spec.components).filter(c => !c.approved);
}

// Get spec summary
export function getSpecSummary(spec) {
  const components = Object.values(spec.components);
  return {
    total: components.length,
    approved: components.filter(c => c.approved).length,
    unapproved: components.filter(c => !c.approved).length,
    files: new Set(components.map(c => c.file)).size,
  };
}
