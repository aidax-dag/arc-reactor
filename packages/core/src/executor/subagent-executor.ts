import { execFileSync } from 'node:child_process';
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

    try {
      const stdout = execFileSync('claude', [
        '--print',
        '--allowedTools', 'Read,Write,Edit,Bash',
        '--system-prompt', team.systemPrompt,
        taskPrompt,
      ], {
        cwd: context.projectRoot,
        encoding: 'utf-8',
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      });

      const outputs = this.getFileChanges(context.projectRoot);

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

  private getFileChanges(projectRoot: string): FileChange[] {
    try {
      const diff = execFileSync('git', ['diff', '--name-status'], {
        cwd: projectRoot,
        encoding: 'utf-8',
      });

      return diff
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => {
          const [status, ...pathParts] = line.split('\t');
          const path = pathParts.join('\t');
          const action = status === 'A' ? 'create' : status === 'D' ? 'delete' : 'modify';
          return { path, action } as FileChange;
        });
    } catch {
      return [];
    }
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
