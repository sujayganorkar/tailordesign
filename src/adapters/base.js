// src/adapters/base.js - Base adapter interface for all UI frameworks

export class BaseAdapter {
  constructor(name) {
    this.name = name;
    this.fileExtensions = [];
    this.componentPatterns = {};
    this.statePatterns = {};
    this.motionPatterns = {};
    this.accessibilityPatterns = {};
  }

  // Detect if this adapter applies to a file
  detect(content, filePath) {
    return this.fileExtensions.some(ext => filePath.endsWith(ext));
  }

  // Parse a file into uiq's universal model
  parse(content, filePath) {
    throw new Error('parse() must be implemented by subclass');
  }

  // Get framework-specific rules to add
  getRules() {
    return [];
  }

  // Get framework-specific control points
  getControlPoints() {
    return [];
  }

  // Translate framework-specific issue to universal format
  normalize(issue) {
    return issue;
  }
}

// Universal component model (what every adapter produces)
export function createUniversalComponent(type, metadata = {}) {
  return {
    type, // button, card, modal, etc.
    framework: metadata.framework || 'unknown',
    filePath: metadata.filePath,
    lineNumber: metadata.lineNumber || null,
    hasHover: metadata.hasHover || false,
    hasFocus: metadata.hasFocus || false,
    hasDisabled: metadata.hasDisabled || false,
    hasLoading: metadata.hasLoading || false,
    hasEmpty: metadata.hasEmpty || false,
    hasError: metadata.hasError || false,
    hasReducedMotion: metadata.hasReducedMotion || false,
    hasSemantics: metadata.hasSemantics || false,
    animations: metadata.animations || [],
    durations: metadata.durations || [],
    easings: metadata.easings || [],
    motionTokens: metadata.motionTokens || false,
    contexts: metadata.contexts || [],
    raw: metadata.raw || null,
  };
}

// Universal issue model
export function createUniversalIssue(rule, severity, message, file, line = null, framework = 'unknown') {
  return {
    rule,
    severity,
    message,
    file,
    line,
    framework,
    source: 'uiq',
  };
}
