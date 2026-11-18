// uiq.d.ts - TypeScript definitions for uiq

export type RuleKind = 'objective' | 'recommendation';
export type Severity = 'error' | 'warning' | 'info';

export interface UiqOptions {
  format?: 'text' | 'json' | 'markdown';
  fix?: boolean;
  rules?: string;
  ignore?: string;
  ci?: boolean;
  minScore?: number;
  decide?: boolean;
  full?: boolean;
  state?: boolean;
  noColor?: boolean;
  quiet?: boolean;
  /** Include heuristic (recommendation-kind) rules in the score and gate. */
  strict?: boolean;
  /** Loaded from .uiqrc.json when run via the CLI. */
  config?: UiqConfig | null;
}

export interface UiqConfig {
  minScore?: number;
  /** Severity overrides: "error" | "warning" | "info" | "off" */
  rules?: Record<string, 'error' | 'warning' | 'info' | 'off'>;
  /** Rule/file suppressions: { "rule-id" | "*": glob[] } */
  suppressions?: Record<string, string[]>;
  ignore?: string[];
  framework?: string;
  platform?: 'auto' | 'web' | 'mobile';
  experimental?: boolean;
  primitives?: Record<string, string[]>;
  componentMappings?: Record<string, string>;
}

export interface UiqIssue {
  rule: string;
  severity: Severity;
  kind: RuleKind;
  message: string;
  file: string;
  line?: number;
  snippet?: string;
  fix?: { description: string; css?: string; jsx?: string; example?: string };
}

export interface UiqGate {
  minScore: number;
  /** "objective": only objective rules score; "strict": recommendations score too. */
  mode: 'objective' | 'strict';
  /** True when error-severity findings (which always fail the gate) are present. */
  blockedByErrors: boolean;
}

export interface UiqResult {
  filesScanned: number;
  filesWithIssues: number;
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  score: number;
  passed: boolean;
  gate: UiqGate;
  /** Recommendation-kind findings reported but not scored (0 in strict mode). */
  advisoryCount: number;
  /** Findings removed by uiq-ignore comments or config suppressions/disables. */
  suppressedCount: number;
  issues: UiqIssue[];
}

export interface UiqDecision {
  file: string;
  component: string;
  count: number;
  contexts: string[];
  consequence: string;
  requiredStates: string[];
  recommendedMotion: string[];
  antiPatterns: string[];
}

export interface UiqFullResult extends UiqResult {
  complianceScore: number;
  compliancePresent: number;
  complianceTotal: number;
  decisions: UiqDecision[];
  compliance: Array<{
    file: string;
    component: string;
    state: string;
    ruleId: string;
    present: boolean;
  }>;
  /** Present when motion-spec.json exists in the project. */
  specConformance?: {
    spec: string;
    checked: number;
    /** Spec components whose file was among the scanned files. */
    matchedComponents: number;
    violations: Array<{ rule: string; severity: Severity; message: string; file: string }>;
  };
  /** Present when --control is passed (persisted across runs). */
  control?: {
    setpoint: number;
    variables: Record<string, number>;
    alarms: Array<{ level: string; message: string }>;
    scans: number;
    nextAction: { action: string; priority: string; message: string };
    history: Array<{ timestamp: string; scanCount: number; qualityScore: number; complianceScore: number | null; errorCount: number; issueCount: number }>;
  };
  escalations?: Array<{
    id: string;
    rule: string;
    severity: Severity;
    file: string;
    message: string;
    reason: string;
    options: string[];
  }>;
  regression?: {
    regressions: Array<{ type: string; message: string }>;
  };
}

export function run(path: string, options?: UiqOptions): Promise<UiqResult>;
export function runDecisions(path: string, options?: UiqOptions): Promise<UiqDecision[]>;
export function runFull(path: string, options?: UiqOptions): Promise<UiqFullResult>;
