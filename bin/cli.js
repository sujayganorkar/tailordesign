#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('uiq')
  .description('Quality gate for UI code. 20 objective rules across motion, interaction states, accessibility, performance, and consistency. Plus interaction decision engine.')
  .version('0.1.0')
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
  .option('--no-color', 'Disable colored output')
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
      const config = loadConfig(targetPath);

      if (opts.full) {
        const { runFull } = await import('../src/workflow/full.js');
        await runFull(targetPath, { ...opts, config });
      } else if (opts.decide) {
        const { runDecisions } = await import('../src/decisions/index.js');
        await runDecisions(targetPath, { ...opts, config });
      } else {
        const { run } = await import('../src/index.js');
        const result = await run(targetPath, { ...opts, config });
        if (opts.ci && !result.passed) process.exit(1);

        // Auto-fix
        if (opts.fix) {
          const { applyFixes } = await import('../src/fixer.js');
          const fixed = applyFixes(targetPath, result.issues);
          if (fixed > 0) {
            console.log(`\n  Auto-fixed ${fixed} issue(s). Re-run to verify.`);
          }
        }

        // State saving
        if (opts.state) {
          const { createStateSnapshot, saveState, detectRegressions, formatRegressionReport, loadState } = await import('../src/state/persistence.js');
          const prevState = loadState(targetPath);
          const snapshot = createStateSnapshot(result, null);
          const stateDir = fs.statSync(targetPath).isFile()
            ? targetPath.split('/').slice(0, -1).join('/') || '.'
            : targetPath;
          saveState(stateDir, snapshot);
          if (!opts.quiet) console.log(formatRegressionReport(detectRegressions(snapshot, prevState)));
        }
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
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
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Escalation command
program
  .command('escalate')
  .description('View or resolve escalations (issues needing human judgment)')
  .option('--dir <path>', 'Project directory', '.')
  .action(async (options) => {
    try {
      const { formatEscalationReport, resolveEscalation } = await import('../src/escalation/cards.js');
      const dir = options.dir || '.';

      const args = process.argv;
      const resolveIdx = args.indexOf('resolve');
      if (resolveIdx >= 0 && args[resolveIdx + 1]) {
        const id = args[resolveIdx + 1];
        const optionIdx = args.indexOf('--option');
        const optionNum = optionIdx >= 0 ? parseInt(args[optionIdx + 1]) : 1;
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
  .option('--dir <path>', 'Project directory', '.')
  .action(async (options) => {
    try {
      const { loadState } = await import('../src/state/persistence.js');
      const dir = options.dir || '.';
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

function loadConfig(targetPath) {
  const fs = require('fs');
  const path = require('path');
  const dir = fs.statSync(targetPath).isFile()
    ? path.dirname(targetPath)
    : targetPath;
  const configPath = path.join(dir, '.uiqrc.json');
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

program.parse();
EOF
echo "Written"