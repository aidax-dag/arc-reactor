import type { Executor } from './executor.js';
import type { ExecutionPlan, ExecutionContext, ExecutionResult, TaskResult } from '../types/task.js';
import type { ArcReactorConfig } from '../types/config.js';
import { TeamRegistry } from '../teams/team-registry.js';
import { dryRunWave } from './dry-run.js';

export class WaveExecutor {
  private config: ArcReactorConfig;
  private teamRegistry: TeamRegistry;
  private onWaveStart?: (wave: number, taskCount: number) => void;
  private onTaskComplete?: (taskId: string, status: string, duration: number) => void;
  private onDryRunConflict?: (originalCount: number, splitCount: number, conflicts: string[]) => void;

  constructor(
    config: ArcReactorConfig,
    teamRegistry: TeamRegistry,
    callbacks?: {
      onWaveStart?: (wave: number, taskCount: number) => void;
      onTaskComplete?: (taskId: string, status: string, duration: number) => void;
      onDryRunConflict?: (originalCount: number, splitCount: number, conflicts: string[]) => void;
    }
  ) {
    this.config = config;
    this.teamRegistry = teamRegistry;
    this.onWaveStart = callbacks?.onWaveStart;
    this.onTaskComplete = callbacks?.onTaskComplete;
    this.onDryRunConflict = callbacks?.onDryRunConflict;
  }

  async execute(plan: ExecutionPlan, executor: Executor): Promise<ExecutionResult> {
    const startTime = Date.now();
    const results: TaskResult[] = [];
    let globalWaveOrder = 0;

    for (const wave of plan.waves) {
      const waveTasks = wave.taskIds.map(id => plan.tasks.find(t => t.id === id)!);

      // Dry Run: check for file conflicts in parallel waves
      let subWaves = [{ order: 1, taskIds: wave.taskIds }];
      if (waveTasks.length > 1) {
        const mode = this.config.mode === 'api' ? 'api' as const : 'subagent' as const;
        const teamMap = new Map(waveTasks.map(t => [t.team, this.teamRegistry.get(t.team)]));
        subWaves = await dryRunWave(waveTasks, teamMap, this.config, mode);

        if (subWaves.length > 1) {
          const conflictInfo = subWaves.map(sw => `[${sw.taskIds.join(',')}]`);
          this.onDryRunConflict?.(waveTasks.length, subWaves.length, conflictInfo);
        }
      }

      // Execute sub-waves sequentially (each sub-wave's tasks run in parallel)
      for (const subWave of subWaves) {
        globalWaveOrder++;
        this.onWaveStart?.(globalWaveOrder, subWave.taskIds.length);

        const waveResults = await Promise.all(
          subWave.taskIds.map(async (taskId) => {
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

        // Retry failures
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
