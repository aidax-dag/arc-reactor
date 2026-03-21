import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Task, TaskResult, ExecutionContext } from '../types/task.js';
import type { Team } from '../types/team.js';
import type { Executor } from './executor.js';

/**
 * Multi-repo orchestration.
 *
 * When a project has multiple services (e.g., frontend repo + backend repo),
 * tasks can be routed to different directories based on team type.
 *
 * Configuration in .arc-reactor.json:
 * {
 *   "repos": {
 *     "frontend": "../my-frontend",
 *     "backend": "../my-backend",
 *     "default": "."
 *   }
 * }
 */

export interface RepoMap {
  [teamOrDefault: string]: string;  // team type → relative path to repo
}

export class MultiRepoExecutor implements Executor {
  private inner: Executor;
  private repoMap: RepoMap;
  private baseDir: string;

  constructor(inner: Executor, repoMap: RepoMap, baseDir: string) {
    this.inner = inner;
    this.repoMap = repoMap;
    this.baseDir = baseDir;
  }

  async execute(task: Task, team: Team, context: ExecutionContext): Promise<TaskResult> {
    // Resolve repo path for this team
    const repoPath = this.repoMap[task.team] || this.repoMap['default'] || '.';
    const resolvedPath = join(this.baseDir, repoPath);

    if (!existsSync(resolvedPath)) {
      return {
        taskId: task.id,
        status: 'failure',
        outputs: [],
        summary: `Repo path not found: ${resolvedPath}`,
        errors: [`Directory ${resolvedPath} does not exist`],
        tokensUsed: 0,
      };
    }

    // Override projectRoot for this task
    const overriddenContext: ExecutionContext = {
      ...context,
      projectRoot: resolvedPath,
    };

    return this.inner.execute(task, team, overriddenContext);
  }
}

/**
 * Validate that all repo paths exist.
 */
export function validateRepoMap(repoMap: RepoMap, baseDir: string): string[] {
  const errors: string[] = [];

  for (const [key, path] of Object.entries(repoMap)) {
    const resolved = join(baseDir, path);
    if (!existsSync(resolved)) {
      errors.push(`Repo "${key}" path not found: ${resolved}`);
    }
  }

  return errors;
}
