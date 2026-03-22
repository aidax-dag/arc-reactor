#!/usr/bin/env node

import { Command } from 'commander';
import { ignite } from './commands/ignite.js';
import { showConfig } from './commands/config.js';
import { showStatus } from './commands/status.js';
import { showResumeInfo } from './commands/resume.js';
import { shutdownExecution } from './commands/shutdown.js';
import { showLogs } from './commands/logs.js';
import { showEvaluation } from './commands/eval.js';
import { verifyExecution } from './commands/verify.js';

const program = new Command();

program
  .name('arc-reactor')
  .description('AI Company OS — multi-team orchestration engine')
  .version('0.5.0');

program
  .command('ignite')
  .description('Start orchestration for a goal')
  .argument('<goal>', 'The goal to accomplish')
  .option('--teams <teams>', 'Comma-separated team list')
  .option('--mode <mode>', 'Executor mode: auto, api, subagent')
  .option('--verbose', 'Enable verbose output')
  .option('--auto-commit', 'Auto-commit generated files after success')
  .option('--auto-branch', 'Create a feature branch (feature/{id})')
  .option('--create-pr', 'Push branch and create PR after commit')
  .option('--feature-id <id>', 'Feature ID for branch naming and Vibranium tracking')
  .option('--project-id <id>', 'Project ID for multi-project management')
  .action(async (goal: string, options: Record<string, string | boolean>) => {
    const config: Record<string, unknown> = {};
    if (options.teams) config.enabledTeams = (options.teams as string).split(',');
    if (options.mode) config.mode = options.mode;
    if (options.verbose) config.verbose = true;
    if (options.autoCommit) config.autoCommit = true;
    if (options.autoBranch) config.autoBranch = true;
    if (options.createPr) config.createPR = true;
    if (options.featureId) config.featureId = options.featureId;
    if (options.projectId) config.projectId = options.projectId;

    try {
      await ignite(goal, config as any);
    } catch (err) {
      console.error('❌ Error:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show current execution progress')
  .action(() => showStatus());

program
  .command('resume')
  .description('Show paused execution info and resume instructions')
  .action(() => showResumeInfo());

program
  .command('shutdown')
  .description('Gracefully stop after current phase completes')
  .action(() => shutdownExecution());

program
  .command('logs')
  .description('View execution logs and metrics')
  .option('--run <id>', 'Show logs for a specific run')
  .option('--category <cat>', 'Filter by category (director, team, wave, quality, etc.)')
  .option('--level <level>', 'Filter by level (debug, info, warn, error)')
  .option('--limit <n>', 'Max entries to show')
  .action((options: Record<string, string>) => showLogs(options));

program
  .command('eval')
  .description('View team evaluation scores and improvement suggestions')
  .option('--cumulative', 'Show cumulative analysis across all runs')
  .action((options: Record<string, boolean>) => showEvaluation(options));

program
  .command('verify')
  .description('Verify that AI agents actually called the right tools (anti-hallucination)')
  .option('--session <id>', 'Filter by session ID')
  .option('--run <id>', 'Filter by run ID')
  .action((options: Record<string, string>) => verifyExecution(options));

program
  .command('config')
  .description('Show or edit configuration')
  .option('--set <key=value>', 'Set a config value')
  .action((options: Record<string, string>) => {
    showConfig(options.set);
  });

program.parse();
