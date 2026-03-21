import { execFileSync } from 'node:child_process';
import type { ExecutionResult } from './types/task.js';

export interface GitOpsConfig {
  autoCommit: boolean;
  autoBranch: boolean;
  branchPrefix: string;
}

export const DEFAULT_GIT_CONFIG: GitOpsConfig = {
  autoCommit: false,
  autoBranch: false,
  branchPrefix: 'arc-reactor/',
};

function runGit(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: 'pipe' });
}

function isGitRepo(cwd: string): boolean {
  try {
    runGit(['rev-parse', '--is-inside-work-tree'], cwd);
    return true;
  } catch {
    return false;
  }
}

export function initGitIfNeeded(cwd: string): void {
  if (!isGitRepo(cwd)) {
    runGit(['init'], cwd);
    runGit(['branch', '-m', 'main'], cwd);
  }
}

export function createBranch(cwd: string, branchName: string): void {
  try {
    runGit(['checkout', '-b', branchName], cwd);
  } catch {
    // Branch may already exist
    runGit(['checkout', branchName], cwd);
  }
}

export function commitResults(cwd: string, result: ExecutionResult): string | null {
  const files = result.results.flatMap((r) => r.outputs.map((o) => o.path));
  if (files.length === 0) return null;

  try {
    // Stage all generated files
    runGit(['add', ...files], cwd);

    // Check if there's anything to commit
    const status = runGit(['status', '--porcelain'], cwd).trim();
    if (!status) return null;

    const goal = result.plan.goal;
    const teamNames = [...new Set(result.plan.tasks.map((t) => t.team))].join(', ');
    const message = `feat(arc-reactor): ${goal}\n\nTeams: ${teamNames}\nFiles: ${files.length}\nTokens: ${result.totalTokensUsed.toLocaleString()}`;

    runGit(['commit', '-m', message], cwd);

    const sha = runGit(['rev-parse', '--short', 'HEAD'], cwd).trim();
    return sha;
  } catch (err) {
    return null;
  }
}

export function autoGit(
  cwd: string,
  result: ExecutionResult,
  config: GitOpsConfig
): { branch?: string; commit?: string } {
  if (!config.autoCommit && !config.autoBranch) return {};

  const output: { branch?: string; commit?: string } = {};

  initGitIfNeeded(cwd);

  if (config.autoBranch) {
    const slug = result.plan.goal
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    const branchName = `${config.branchPrefix}${slug}`;
    createBranch(cwd, branchName);
    output.branch = branchName;
  }

  if (config.autoCommit) {
    const sha = commitResults(cwd, result);
    if (sha) output.commit = sha;
  }

  return output;
}
