// uiq.d.ts — TypeScript definitions for uiq

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
}

export interface UiqIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
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
}

export function run(path: string, options?: UiqOptions): Promise<UiqResult>;
export function runDecisions(path: string, options?: UiqOptions): Promise<UiqDecision[]>;
export function runFull(path: string, options?: UiqOptions): Promise<UiqFullResult>;
EOF
echo "Written"