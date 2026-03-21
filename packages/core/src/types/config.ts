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

  // Git
  autoCommit: boolean;
  autoBranch: boolean;
  branchPrefix: string;
  createPR: boolean;
  featureId?: string;
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
