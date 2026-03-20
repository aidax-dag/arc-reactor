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
  .action(async (goal: string, options: Record<string, string | boolean>) => {
    const config: Record<string, unknown> = {};
    if (options.teams) config.enabledTeams = (options.teams as string).split(',');
    if (options.mode) config.mode = options.mode;
    if (options.verbose) config.verbose = true;

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
