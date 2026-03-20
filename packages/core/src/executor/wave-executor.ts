import type { Executor } from './executor.js';
import type { ExecutionPlan, ExecutionContext, ExecutionResult, TaskResult } from '../types/task.js';
import type { ArcReactorConfig } from '../types/config.js';
import { TeamRegistry } from '../teams/team-registry.js';

export class WaveExecutor {
  private config: ArcReactorConfig;
  private teamRegistry: TeamRegistry;
  private onWaveStart?: (wave: number, taskCount: number) => void;
  private onTaskComplete?: (taskId: string, status: string, duration: number) => void;

  constructor(
    config: ArcReactorConfig,
    teamRegistry: TeamRegistry,
    callbacks?: {
      onWaveStart?: (wave: number, taskCount: number) => void;
      onTaskComplete?: (taskId: string, status: string, duration: number) => void;
    }
  ) {
    this.config = config;
    this.teamRegistry = teamRegistry;
    this.onWaveStart = callbacks?.onWaveStart;
    this.onTaskComplete = callbacks?.onTaskComplete;
  }

  async execute(plan: ExecutionPlan, executor: Executor): Promise<ExecutionResult> {
    const startTime = Date.now();
    const results: TaskResult[] = [];

    for (const wave of plan.waves) {
      this.onWaveStart?.(wave.order, wave.taskIds.length);

      const waveResults = await Promise.all(
        wave.taskIds.map(async (taskId) => {
          const task = plan.tasks.find(t => t.id === taskId)!;
          const team = this.teamRegistry.get(task.team);
          const context = this.buildContext(plan.goal, results);
          const taskStart = Date.now();

          const result = await executor.execute(task, team, context);
          this.onTaskComplete?.(taskId, result.status, Date.now() - taskStart);
          return result;
        })
      );

      results.push(...waveResults);

      const failures = waveResults.filter(r => r.status === 'failure');
      if (failures.length > 0 && this.config.maxTaskRetries > 0) {
        for (const failed of failures) {
          const task = plan.tasks.find(t => t.id === failed.taskId)!;
          const team = this.teamRegistry.get(task.team);
          const context = this.buildContext(plan.goal, results);
          const retryResult = await executor.execute(task, team, context);
          const idx = results.findIndex(r => r.taskId === failed.taskId);
          if (idx !== -1) results[idx] = retryResult;
        }
      }
    }

    return {
      plan,
      results,
      qualityReport: { passed: true, checks: [], failedTasks: [], summary: 'pending' },
      totalTokensUsed: results.reduce((sum, r) => sum + r.tokensUsed, 0),
      durationMs: Date.now() - startTime,
    };
  }

  private buildContext(goal: string, priorResults: TaskResult[]): ExecutionContext {
    return {
      goal,
      priorResults,
      priorFilePaths: priorResults.flatMap(r => r.outputs.map(o => o.path)),
      projectRoot: this.config.outputDir,
    };
  }
}
