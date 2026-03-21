import type { TeamType } from './task.js';

export interface ArcReactorConfig {
  mode: 'auto' | 'api' | 'subagent';
  apiKey?: string;
  model: string;
  ceoModel: string;

  enabledTeams: TeamType[];

  maxTaskRetries: number;
  maxApiRetries: number;
  runTests: boolean;

  maxTokensPerTask: number;
  maxTotalTokens: number;
  maxParallelTasks: number;

  outputDir: string;
  verbose: boolean;

  // Project
  projectId?: string;            // Project identifier for multi-project management

  // Git
  autoCommit: boolean;
  autoBranch: boolean;
  branchPrefix: string;
  createPR: boolean;
  featureId?: string;

  // Notifications
  webhookUrl?: string;            // Slack/Discord/custom webhook for alerts
  webhookEvents?: ('run_complete' | 'run_failed' | 'quality_gate_failed')[];
}

export const DEFAULT_CONFIG: ArcReactorConfig = {
  mode: 'subagent',
  model: 'claude-sonnet-4-6',
  ceoModel: 'claude-opus-4-6',

  enabledTeams: ['frontend', 'backend', 'qa', 'design', 'devops', 'security', 'docs', 'product'],

  maxTaskRetries: 1,
  maxApiRetries: 3,
  runTests: true,

  maxTokensPerTask: 50_000,
  maxTotalTokens: 200_000,
  maxParallelTasks: 3,

  outputDir: process.cwd(),
  verbose: false,

  autoCommit: false,
  autoBranch: false,
  branchPrefix: 'feature/',
  createPR: false,
};
