#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('uiq')
  .description('Quality gate for AI-generated UI. Checks motion, interaction states, accessibility, performance, and consistency.')
  .version('0.1.0')
  .argument('[path]', 'Path to scan', '.')
  .option('-f, --format <format>', 'Output format: text, json, markdown', 'text')
  .option('--fix', 'Auto-fix where possible')
  .option('--rules <rules>', 'Comma-separated rule IDs to run')
  .option('--ignore <patterns>', 'Comma-separated glob patterns to ignore')
  .option('--ci', 'CI mode: exit with non-zero code on errors')
  .option('--min-score <score>', 'Minimum score to pass (0-100)', '80')
  .option('--decide', 'Run interaction decision analysis')
  .option('--full', 'Run full workflow: decisions + quality + compliance')
  .option('--state', 'Save state and detect regressions')
  .action(async (path, options, command) => {
    try {
      const targetPath = path || '.';
      const opts = options || command?.opts() || {};
      if (opts.full) {
        const { runFull } = await import('../src/workflow/full.js');
        await runFull(targetPath, opts);
      } else if (opts.decide) {
        const { runDecisions } = await import('../src/decisions/index.js');
        await runDecisions(targetPath, opts);
      } else {
        const { run } = await import('../src/index.js');
        const result = await run(targetPath, opts);
        if (opts.ci && !result.passed) process.exit(1);

        if (opts.state) {
          const { createStateSnapshot, saveState, detectRegressions, formatRegressionReport, loadState } = await import('../src/state/persistence.js');
          const prevState = loadState(targetPath);
          const snapshot = createStateSnapshot(result, null);
          const fs = await import('fs');
          const stateDir = fs.statSync(targetPath).isFile()
            ? targetPath.split('/').slice(0, -1).join('/') || '.'
            : targetPath;
          saveState(stateDir, snapshot);
          console.log(formatRegressionReport(detectRegressions(snapshot, prevState)));
        }
      }
    } catch (err) {
      console.error(err.message);
      process.exit(1);
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
        console.log(`Feedback added: ${entry.id} — ${entry.categoryLabel}`);
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
      console.error(err.message);
      process.exit(1);
    }
  });

// Escalation command
program
  .command('escalate')
  .description('View or resolve escalations (issues needing human judgment)')
  .option('--dir <path>', 'Project directory', '.')
  .action(async (options, command) => {
    try {
      const { formatEscalationReport, getPending, resolveEscalation } = await import('../src/escalation/cards.js');
      const dir = options?.dir || '.';

      const args = process.argv.slice(3);
      if (args[0] === 'resolve' && args[1]) {
        const id = args[1];
        const optionIdx = args.indexOf('--option');
        const optionNum = optionIdx >= 0 ? parseInt(args[optionIdx + 1]) : 1;
        const esc = resolveEscalation(dir, id, `Option ${optionNum}`, 'human');
        if (esc) console.log(`Resolved: ${esc.id} → ${esc.resolution}`);
        else console.log('Not found');
      } else {
        console.log(formatEscalationReport(dir));
      }
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

// State command
program
  .command('state')
  .description('View state history and regressions')
  .option('--dir <path>', 'Project directory', '.')
  .action(async (options) => {
    try {
      const { loadState } = await import('../src/state/persistence.js');
      const dir = options?.dir || '.';
      const state = loadState(dir);
      if (!state) {
        console.log('No state file found. Run with --state to create one.');
        return;
      }
      console.log(`Last scan: ${state.timestamp}`);
      console.log(`Score: ${state.score}/100`);
      console.log(`Issues: ${state.totalIssues} (${state.errors} errors, ${state.warnings} warnings)`);
      console.log(`Files: ${Object.keys(state.files || {}).length}`);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

program.parse();
