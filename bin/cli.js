#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('uiq')
  .description('Quality gate for UI code. 22 core rules + 1 experimental across motion, interaction states, accessibility, performance, and consistency. Plus interaction decision engine.')
  .version('0.5.0')
  .argument('[path]', 'Path to scan', '.')
  .option('-f, --format <format>', 'Output format: text, json, markdown', 'text')
  .option('--fix', 'Auto-fix simple issues (reduced-motion, motion tokens)')
  .option('--rules <rules>', 'Comma-separated rule IDs to run')
  .option('--ignore <patterns>', 'Comma-separated glob patterns to ignore')
  .option('--ci', 'CI mode: exit with non-zero code on errors')
  .option('--min-score <score>', 'Minimum score to pass (0-100)', '80')
  .option('--decide', 'Run interaction decision analysis')
  .option('--full', 'Run full workflow: decisions + quality + compliance')
  .option('--state', 'Save state and detect regressions')
  .option('--control', 'Show process control report (setpoint tracking, alarms, control points)')
  .option('--human', 'Human-readable decision output (for non-technical review)')
  .option('--no-color', 'Disable colored output')
  .option('--experimental', 'Enable experimental rules (e.g. a11y/contrast)')
  .option('--library', 'Audit as a component library: component-level compliance report')
  .option('--platform <platform>', 'Target platform: auto, mobile, web', 'auto')
  .option('--render <url>', 'Run optional browser-based rendered evaluation (requires playwright)')
  .option('--write-spec', 'Write motion-spec.json when running with --decide')
  .option('--strict', 'Include heuristic (recommendation) rules in the score and gate')
  .option('--quiet', 'Suppress non-essential output')
  .action(async (path, options, command) => {
    try {
      const targetPath = path || '.';
      const opts = options || command?.opts() || {};

      // Validate path
      const fs = await import('fs');
      if (!fs.existsSync(targetPath)) {
        console.error(`Error: Path not found: ${targetPath}`);
        process.exit(1);
      }

      // Load config file if exists
      const config = await loadConfig(targetPath);

      if (opts.full) {
        const { runFull } = await import('../src/workflow/full.js');
        const result = await runFull(targetPath, { ...opts, config });
        if (opts.ci && result && !result.passed) process.exit(1);
      } else if (opts.decide) {
        const { runDecisions } = await import('../src/decisions/index.js');
        const result = await runDecisions(targetPath, { ...opts, config });
        const hasUnknown = Array.isArray(result) && result.some(d => d.component === 'unknown-interactive');
        if (opts.ci && hasUnknown) process.exit(1);
      } else {
        const { run } = await import('../src/index.js');
        const result = await run(targetPath, { ...opts, config });
        if (opts.ci && !result.passed) process.exit(1);

        // Auto-fix
        if (opts.fix) {
          const { applyFixes } = await import('../src/fixer.js');
          const fixed = await applyFixes(targetPath, result.issues);
          if (fixed > 0) {
            console.log(`\n  Auto-fixed ${fixed} issue(s). Re-run to verify.`);
          }
        }

        // State saving
        if (opts.state) {
          const fsMod = await import('fs');
          const { createStateSnapshot, saveState, detectRegressions, formatRegressionReport, loadState } = await import('../src/state/persistence.js');
          const prevState = loadState(targetPath);
          const snapshot = createStateSnapshot(result, null);
          const stateDir = fsMod.statSync(targetPath).isFile()
            ? targetPath.split('/').slice(0, -1).join('/') || '.'
            : targetPath;
          saveState(stateDir, snapshot);
          if (!opts.quiet) console.log(formatRegressionReport(detectRegressions(snapshot, prevState)));
        }

        // Rendered evaluation (optional, requires playwright)
        if (opts.render) {
          const { evaluateRendered } = await import('../src/render/evaluator.js');
          const res = await evaluateRendered(opts.render);
          if (!res.available) {
            console.log(`  ${res.reason}`);
          } else {
            console.log(`  Rendered checks: ${res.checks.filter(c=>c.passed).length}/${res.checks.length} passed`);
            for (const c of res.checks) console.log(`    ${c.passed ? '✓' : '✗'} ${c.id}: ${c.message}`);
            for (const s of res.subjective) console.log(`    ? ${s.id}: ${s.message}`);
          }
        }

        // Process control report
        if (opts.control) {
          const { createProcessState, updateVariables, formatControlReport, getControlDecision } = await import('../src/control/process.js');
          const state = createProcessState(parseInt(opts.minScore) || 80);
          // Standalone scan has no compliance measurement; avoid false "missing states" alarm.
          state.variables.compliance_score = null;
          updateVariables(state, result);
          console.log(formatControlReport(state));
          const decision = getControlDecision(state);
          console.log(`  Next action: ${decision.action} (${decision.priority}) - ${decision.message}`);
          console.log('');
        }
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Evidence-grounded HCI research review; kept separate from UI quality scores.
program
  .command('research')
  .description('Inspect a trusted local UI with task context and return HCI research review candidates')
  .requiredOption('--url <url>', 'Local development URL (localhost or loopback)')
  .option('--task <file>', 'JSON file specifying task intent and optional modal selectors')
  .option('--format <format>', 'Output: json or text', 'text')
  .option('--width <pixels>', 'Viewport width', '1280')
  .option('--height <pixels>', 'Viewport height', '800')
  .action(async (opts) => {
    try {
      const { readFileSync } = await import('node:fs');
      const task = opts.task ? JSON.parse(readFileSync(opts.task, 'utf8')) : {};
      const { inspectResearchPage } = await import('../src/research/browser.js');
      const result = await inspectResearchPage(opts.url, {
        task, width: Number(opts.width), height: Number(opts.height),
      });
      if (opts.format === 'json') console.log(JSON.stringify(result, null, 2));
      else {
        if (!result.available) {
          console.log(result.reason);
          return;
        }
        console.log('HCI research review: ' + result.research.matched + ' candidate(s), ' +
          result.research.abstained.length + ' uninspected signal(s).');
        for (const finding of result.research.findings) {
          console.log(' - ' + finding.id + ': ' + finding.evidence);
          console.log('   Suggestion: ' + finding.action);
          console.log('   Research: ' + finding.source.url);
        }
        console.log('Not an accessibility conformance test or automatic design score.');
      }
    } catch (error) {
      console.error('Research evaluation failed: ' + error.message);
      process.exitCode = 1;
    }
  });

// Feedback command
program
  .command('review')
  .description('Add or view human feedback on UI interactions')
  .option('--dir <path>', 'Project directory', '.')
  .option('--add', 'Add a feedback entry')
  .option('--file <file>', 'File path for feedback')
  .option('--component <name>', 'Component name')
  .option('--category <cat>', 'Feedback category')
  .option('--note <text>', 'Additional note')
  .option('--list', 'List unresolved feedback')
  .option('--resolve <id>', 'Resolve a feedback entry by ID')
  .action(async (options) => {
    try {
      const { addFeedback, formatFeedbackReport, getUnresolved, resolveFeedback } = await import('../src/feedback/review.js');
      const dir = options.dir || '.';

      if (options.add) {
        if (!options.file || !options.component || !options.category) {
          console.error('Required: --file, --component, --category');
          process.exit(1);
        }
        const entry = addFeedback(dir, {
          file: options.file,
          component: options.component,
          category: options.category,
          note: options.note,
        });
        console.log(`Feedback added: ${entry.id} - ${entry.categoryLabel}`);
      } else if (options.resolve) {
        const resolved = resolveFeedback(dir, options.resolve);
        if (resolved) console.log(`Resolved: ${resolved.id}`);
        else console.log('Not found');
      } else if (options.list) {
        const unresolved = getUnresolved(dir);
        console.log(`Unresolved feedback: ${unresolved.length}`);
        for (const e of unresolved) {
          console.log(`  [${e.id}] ${e.file.split('/').pop()} → ${e.component}: ${e.categoryLabel}`);
        }
      } else {
        console.log(formatFeedbackReport(dir));
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Escalation command
program
  .command('escalate')
  .description('View or resolve escalations (issues needing human judgment)')
  .argument('[action]', 'Action: resolve')
  .argument('[id]', 'Escalation ID to resolve')
  .option('--dir <path>', 'Project directory', '.')
  .option('--option <n>', 'Option number to resolve with', '1')
  .action(async (action, id, options) => {
    try {
      const { formatEscalationReport, resolveEscalation } = await import('../src/escalation/cards.js');
      const dir = options.dir || '.';

      if (action === 'resolve' && id) {
        const optionNum = parseInt(options.option, 10) || 1;
        const esc = resolveEscalation(dir, id, `Option ${optionNum}`, 'human');
        if (esc) console.log(`Resolved: ${esc.id} → ${esc.resolution}`);
        else console.log('Not found');
      } else {
        console.log(formatEscalationReport(dir));
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// State command
program
  .command('state')
  .description('View state history and regressions')
  .argument('[path]', 'Project directory or scan path', '.')
  .option('--dir <path>', 'Project directory (legacy)')
  .action(async (pathArg, options) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { loadState } = await import('../src/state/persistence.js');
      const dir = options.dir || pathArg || '.';
      let state = loadState(dir);
      if (!state) {
        const candidate = path.join(dir, 'src');
        if (fs.existsSync(path.join(candidate, '.uiq-state.json'))) state = loadState(candidate);
      }
      if (!state) {
        console.log('No state file found. Run with --state to create one.');
        return;
      }
      console.log(`Last scan: ${state.timestamp}`);
      console.log(`Score: ${state.score}/100`);
      console.log(`Issues: ${state.totalIssues} (${state.errors} errors, ${state.warnings} warnings)`);
      console.log(`Files: ${Object.keys(state.files || {}).length}`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Scaffold a .uiqrc.json config file')
  .option('--dir <path>', 'Project directory', '.')
  .action(async (options) => {
    try {
      const fs = await import('fs');
      const dir = options.dir || '.';
      const configPath = `${dir}/.uiqrc.json`;
      if (fs.existsSync(configPath)) {
        console.log('.uiqrc.json already exists.');
        return;
      }
      const template = {
        minScore: 80,
        rules: {},
        ignore: ['node_modules/**', 'dist/**', '*.test.*', '*.spec.*'],
        framework: 'auto',
      };
      fs.writeFileSync(configPath, JSON.stringify(template, null, 2));
      console.log(`Created ${configPath}`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Watch command
program
  .command('watch')
  .description('Watch for file changes and re-scan')
  .argument('[path]', 'Path to watch', '.')
  .option('-f, --format <format>', 'Output format: text, json, markdown', 'text')
  .action(async (path, options) => {
    try {
      const fs = await import('fs');
      const targetPath = path || '.';
      console.log(`Watching ${targetPath} for changes... (Ctrl+C to stop)`);
      let timeout;
      const scan = async () => {
        console.clear();
        const { run } = await import('../src/index.js');
        await run(targetPath, options);
      };
      await scan();
      fs.watch(targetPath, { recursive: true }, () => {
        clearTimeout(timeout);
        timeout = setTimeout(scan, 300);
      });
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

async function loadConfig(targetPath) {
  const fs = await import('fs');
  const path = await import('path');
  // Config discovery: check the target directory, then walk up parents so
  // `uiq ./src` picks up a project-root .uiqrc.json.
  const startDir = fs.statSync(targetPath).isFile()
    ? path.dirname(targetPath)
    : targetPath;
  let dir = path.resolve(startDir);
  let configPath = null;
  while (true) {
    const candidate = path.join(dir, '.uiqrc.json');
    if (fs.existsSync(candidate)) {
      configPath = candidate;
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // filesystem root
    dir = parent;
  }
  if (!configPath) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.error('Warning: .uiqrc.json must be a JSON object; ignoring.');
      return null;
    }
    if (parsed.minScore !== undefined && typeof parsed.minScore !== 'number') {
      console.error('Warning: .uiqrc.json minScore must be a number; ignoring config.');
      return null;
    }
    if (parsed.ignore !== undefined && !Array.isArray(parsed.ignore)) {
      console.error('Warning: .uiqrc.json ignore must be an array; ignoring config.');
      return null;
    }
    if (parsed.rules !== undefined && (typeof parsed.rules !== 'object' || parsed.rules === null || Array.isArray(parsed.rules))) {
      console.error('Warning: .uiqrc.json rules must be an object; ignoring config.');
      return null;
    }
    if (parsed.rules) {
      for (const [id, sev] of Object.entries(parsed.rules)) {
        if (!['error', 'warning', 'info', 'off'].includes(sev)) {
          console.error(`Warning: .uiqrc.json rules["${id}"] must be "error", "warning", "info", or "off"; ignoring config.`);
          return null;
        }
      }
    }
    if (parsed.suppressions !== undefined && (typeof parsed.suppressions !== 'object' || parsed.suppressions === null || Array.isArray(parsed.suppressions))) {
      console.error('Warning: .uiqrc.json suppressions must be an object; ignoring config.');
      return null;
    }
    return parsed;
  } catch {
    console.error('Warning: .uiqrc.json is not valid JSON; ignoring.');
    return null;
  }
}

// Create command (starter funnel)
program
  .command('create')
  .description('Create a new frontend project with the UI quality gate wired in')
  .argument('[path]', 'Project directory', '.')
  .action(async (path) => {
    try {
      const { scaffold } = await import('../src/scaffold/index.js');
      const dir = path || '.';
      const results = scaffold(dir);
      console.log('Created project:');
      for (const r of results) console.log(`  ✓ ${r}`);
      console.log(`\nNext steps:`);
      console.log(`  1. cd ${dir} && npm install`);
      console.log(`  2. npm run dev          (start Vite dev server)`);
      console.log(`  3. npm run lint         (run the UI quality gate)`);
      console.log(`  4. Edit src/App.jsx and components in src/components/`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Scaffold command (alias-friendly, lower-level)
program
  .command('scaffold')
  .description('Scaffold a new project with UI quality gates, design tokens, and component templates')
  .argument('[path]', 'Project directory', '.')
  .action(async (path) => {
    try {
      const { scaffold } = await import('../src/scaffold/index.js');
      const dir = path || '.';
      const results = scaffold(dir);
      console.log('Scaffolded project:');
      for (const r of results) console.log(`  ✓ ${r}`);
      console.log(`\nNext steps:`);
      console.log(`  1. Import tokens.css in your main CSS file`);
      console.log(`  2. Use the component templates in src/components/`);
      console.log(`  3. Run: npx @sujayganorkar/uiq ./src`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Explain command
program
  .command('explain')
  .description('Explain a rule in plain English with examples and sources')
  .argument('[rule]', 'Rule ID to explain (or "all" for all rules)')
  .action(async (rule) => {
    try {
      const { RULES, SOURCES } = await import('../src/config.js');
      const { FIX_SUGGESTIONS } = await import('../src/fixer-suggestions.js');

      if (!rule || rule === 'all') {
        console.log('\nAll rules (22 core + 1 experimental):\n');
        for (const r of RULES) {
          console.log(`  ${r.id} (${r.severity})`);
          console.log(`    ${r.description}`);
          if (r.source) console.log(`    Source: ${r.source.url}`);
          console.log('');
        }
        return;
      }

      const found = RULES.find(r => r.id === rule);
      if (!found) {
        console.log(`Rule not found: ${rule}`);
        console.log('Run "uiq explain all" to see all rules.');
        return;
      }

      const source = SOURCES[rule] || found.source;
      const fix = FIX_SUGGESTIONS[rule];

      console.log(`\n${'━'.repeat(60)}`);
      console.log(`  ${found.id}`);
      console.log(`${'━'.repeat(60)}\n`);
      console.log(`  Severity: ${found.severity}`);
      console.log(`  Category: ${found.category}`);
      console.log(`  Description: ${found.description}\n`);

      if (source) {
        console.log(`  Why this rule exists:`);
        console.log(`    ${source.summary}\n`);
        console.log(`  Source: ${source.url}`);
        if (source.also) console.log(`  Also: ${source.also}`);
        console.log('');
      }

      if (fix) {
        console.log(`  How to fix:`);
        console.log(`    ${fix.description}`);
        console.log(`    CSS: ${fix.css}`);
        console.log(`    JSX: ${fix.jsx}`);
        console.log(`    Example:`);
        console.log(`    ${fix.example.split('\n').join('\n    ')}`);
        console.log('');
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Dashboard command (human-facing web UI)
program
  .command('dashboard')
  .description('Open a local web dashboard for visual issue review')
  .argument('[path]', 'Path to scan', '.')
  .option('--port <port>', 'Port number', '3456')
  .action(async (path, options) => {
    try {
      const { run } = await import('../src/index.js');
      const result = await run(path || '.', { format: 'json', silent: true });
      const port = parseInt(options.port) || 3456;

      const http = await import('http');
      const { generateDashboardHTML } = await import('../src/dashboard.js');
      const server = http.createServer((req, res) => {
        if (req.url === '/') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(generateDashboardHTML(result));
        } else if (req.url === '/api/results') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      server.listen(port, () => {
        console.log(`Dashboard running at http://localhost:${port}`);
        console.log('Press Ctrl+C to stop.');
      });
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });





// Verify command
program
  .command('verify')
  .description('Verify a project passes quality + compliance (for CI/agent loop)')
  .argument('[path]', 'Path to verify', '.')
  .option('--min-score <score>', 'Minimum score', '80')
  .option('--min-compliance <score>', 'Minimum compliance %', '80')
  .action(async (path, options) => {
    try {
      const { runFull } = await import('../src/workflow/full.js');
      const result = await runFull(path || '.', { format: 'json', minScore: options.minScore, silent: true });
      const minScore = parseInt(options.minScore) || 80;
      const minComp = parseInt(options.minCompliance) || 80;
      const ok = result.score >= minScore && (result.complianceScore ?? 100) >= minComp && result.errors === 0;
      console.log(`VERIFY: ${ok ? 'PASS' : 'FAIL'} (score=${result.score}/${minScore}, compliance=${result.complianceScore}%/${minComp}, errors=${result.errors})`);
      if (!ok) {
        // One glanceable reason list; full detail via `uiq <path> --full`.
        for (const i of result.issues.filter(i => i.severity === 'error').slice(0, 10)) {
          console.log(`  ✗ ${i.rule}: ${i.file}${i.line ? `:${i.line}` : ''} — ${i.message}`);
        }
        if (result.complianceScore < minComp) {
          const missing = (result.compliance || []).filter(c => !c.present);
          for (const m of missing.slice(0, 10)) {
            console.log(`  ✗ missing ${m.state} in ${m.component} (${m.file})`);
          }
        }
        process.exit(1);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Loop command (agent-driven refinement scaffold)
program
  .command('loop')
  .description('Run the inspect->decide->evaluate loop with guards (agent implements fixes between iterations)')
  .argument('[path]', 'Path to scan', '.')
  .option('--max-iterations <n>', 'Max iterations per loop', '5')
  .option('--reset', 'Clear loop state and start a fresh loop')
  .action(async (path, options) => {
    try {
      const { createLoopState, recordIteration, shouldContinue, formatLoopReport, loadLoopState, saveLoopState, clearLoopState, loopStateDir } = await import('../src/loop/agent-loop.js');
      const { runFull } = await import('../src/workflow/full.js');
      const target = path || '.';
      const stateDir = loopStateDir(target);

      if (options.reset) {
        clearLoopState(stateDir);
        console.log('Loop state cleared. Starting fresh.');
      }

      // Cross-invocation loop: resume persisted state, or start a new loop.
      const state = loadLoopState(stateDir) || createLoopState({ maxIterations: parseInt(options.maxIterations) || 5 });
      state.iteration = state.history.length;

      const result = await runFull(target, { format: 'json', silent: true });
      recordIteration(state, result);
      state.iteration = state.history.length;

      if (shouldContinue(state, result)) {
        saveLoopState(stateDir, state);
        console.log(`Iteration ${state.history.length} complete. Score=${result.score}.`);
        console.log('Implement fixes, then run `uiq loop` again to continue the loop.');
        console.log(formatLoopReport(state));
      } else {
        // Loop finished (target reached, plateau, score-gaming, or max iterations):
        // report the final state and clear it so the next `uiq loop` starts fresh.
        console.log(formatLoopReport(state));
        console.log(`Loop finished: ${state.stopReason}. State cleared — next \`uiq loop\` starts a new loop.`);
        clearLoopState(stateDir);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Motion spec commands (show + approve — makes the spec a real artifact
// with a lifecycle instead of write-only output)
const specCmd = program
  .command('spec')
  .description('Show or approve the motion spec (motion-spec.json)');

specCmd
  .command('show')
  .description('Show motion-spec.json summary and unapproved components')
  .argument('[path]', 'Project directory containing motion-spec.json', '.')
  .action(async (path) => {
    try {
      const { readMotionSpec, getSpecSummary, getUnapproved } = await import('../src/spec/motion-spec.js');
      const dir = path || '.';
      const spec = readMotionSpec(dir);
      if (!spec) {
        console.log('No motion-spec.json found. Generate one with: uiq <path> --decide --write-spec');
        return;
      }
      const summary = getSpecSummary(spec);
      console.log('');
      console.log('━'.repeat(60));
      console.log('  Motion Spec');
      console.log('━'.repeat(60));
      console.log('');
      console.log(`  Components: ${summary.total} (${summary.approved} approved, ${summary.unapproved} unapproved)`);
      console.log(`  Files:      ${summary.files}`);
      console.log('');
      const unapproved = getUnapproved(spec);
      if (unapproved.length > 0) {
        console.log('  Unapproved components (approve with `uiq spec approve <file> <component>`):');
        for (const c of unapproved) {
          console.log(`    ○ ${c.component}  (${c.file})`);
        }
      } else {
        console.log('  ✓ All components approved.');
      }
      console.log('');
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

specCmd
  .command('approve')
  .description('Approve a component in motion-spec.json')
  .argument('<file>', 'File path as recorded in the spec')
  .argument('<component>', 'Component name')
  .option('--by <name>', 'Approver name', 'human')
  .argument('[path]', 'Project directory containing motion-spec.json', '.')
  .action(async (file, component, path, options) => {
    try {
      const { readMotionSpec, writeMotionSpec, approveComponent, getSpecSummary } = await import('../src/spec/motion-spec.js');
      const dir = path || '.';
      const spec = readMotionSpec(dir);
      if (!spec) {
        console.error('No motion-spec.json found. Generate one with: uiq <path> --decide --write-spec');
        process.exit(1);
      }
      const key = `${file}::${component}`;
      if (!spec.components || !spec.components[key]) {
        console.error(`Component not in spec: ${key}`);
        console.error('Run `uiq spec show` to list exact file/component identifiers.');
        process.exit(1);
      }
      approveComponent(spec, file, component, options.by);
      writeMotionSpec(spec, dir);
      const summary = getSpecSummary(spec);
      console.log(`✓ Approved ${component} (by ${options.by}). ${summary.approved}/${summary.total} components approved.`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
