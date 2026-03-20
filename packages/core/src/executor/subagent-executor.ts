import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Executor } from './executor.js';
import type { Task, TaskResult, ExecutionContext, FileChange } from '../types/task.js';
import type { Team } from '../types/team.js';
import type { ArcReactorConfig } from '../types/config.js';

export class SubagentExecutor implements Executor {
  private config: ArcReactorConfig;

  constructor(config: ArcReactorConfig) {
    this.config = config;
  }

  async execute(task: Task, team: Team, context: ExecutionContext): Promise<TaskResult> {
    const taskPrompt = this.buildPrompt(task, context);

    // Snapshot files before execution
    const beforeFiles = this.scanFiles(context.projectRoot);

    try {
      const stdout = execFileSync('claude', [
        '--print',
        '--allowedTools', 'Read,Write,Edit,Bash',
        '--system-prompt', team.systemPrompt,
        taskPrompt,
      ], {
        cwd: context.projectRoot,
        encoding: 'utf-8',
        timeout: 180_000,
        maxBuffer: 10 * 1024 * 1024,
      });

      // Snapshot after and diff
      const afterFiles = this.scanFiles(context.projectRoot);
      const outputs = this.diffSnapshots(beforeFiles, afterFiles);

      return {
        taskId: task.id,
        status: 'success',
        outputs,
        summary: stdout.slice(0, 500),
        tokensUsed: 0,
      };
    } catch (err) {
      return {
        taskId: task.id,
        status: 'failure',
        outputs: [],
        summary: 'Subagent execution failed',
        errors: [err instanceof Error ? err.message : String(err)],
        tokensUsed: 0,
      };
    }
  }

  private buildPrompt(task: Task, context: ExecutionContext): string {
    let prompt = `Task: ${task.title}\n\n${task.description}\n\n`;
    prompt += `Acceptance Criteria:\n`;
    task.acceptanceCriteria.forEach(c => { prompt += `- ${c}\n`; });

    if (context.priorFilePaths.length > 0) {
      prompt += `\nFiles from previous teams:\n`;
      context.priorFilePaths.forEach(p => { prompt += `- ${p}\n`; });
    }

    return prompt;
  }

  private scanFiles(dir: string, base?: string): Map<string, number> {
    const root = base ?? dir;
    const files = new Map<string, number>();

    try {
      for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === '.git') continue;
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          for (const [k, v] of this.scanFiles(fullPath, root)) {
            files.set(k, v);
          }
        } else {
          files.set(relative(root, fullPath), stat.mtimeMs);
        }
      }
    } catch {
      // directory might not exist yet
    }

    return files;
  }

  private diffSnapshots(before: Map<string, number>, after: Map<string, number>): FileChange[] {
    const changes: FileChange[] = [];

    for (const [path, mtime] of after) {
      if (!before.has(path)) {
        changes.push({ path, action: 'create' });
      } else if (before.get(path) !== mtime) {
        changes.push({ path, action: 'modify' });
      }
    }

    for (const path of before.keys()) {
      if (!after.has(path)) {
        changes.push({ path, action: 'delete' });
      }
    }

    return changes;
  }
}

export function isClaudeCodeEnvironment(): boolean {
  try {
    execFileSync('which', ['claude'], { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
