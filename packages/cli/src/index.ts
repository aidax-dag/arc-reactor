#!/usr/bin/env node

import { Command } from 'commander';
import { ignite } from './commands/ignite.js';
import { showConfig } from './commands/config.js';

const program = new Command();

program
  .name('arc-reactor')
  .description('AI Company OS — multi-team orchestration engine')
  .version('0.1.0');

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
  .command('config')
  .description('Show or edit configuration')
  .option('--set <key=value>', 'Set a config value')
  .action((options: Record<string, string>) => {
    showConfig(options.set);
  });

program.parse();
