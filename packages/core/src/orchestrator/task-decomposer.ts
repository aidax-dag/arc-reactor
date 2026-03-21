import type { ExecutionPlan, Task, GoalAnalysis, TeamType } from '../types/task.js';
import { buildWaves } from './dependency-analyzer.js';

export function parseExecutionPlan(
  goal: string,
  raw: Record<string, unknown>
): ExecutionPlan {
  const tasks = (raw.tasks as Array<Record<string, unknown>>).map(
    (t): Task => ({
      id: String(t.id),
      title: String(t.title),
      description: String(t.description),
      team: String(t.team) as TeamType,
      dependencies: (t.dependencies as string[]) || [],
      priority: String(t.priority) as Task['priority'],
      acceptanceCriteria: (t.acceptanceCriteria as string[]) || [],
      featureId: t.featureId ? String(t.featureId) : undefined,
    })
  );

  const analysis: GoalAnalysis = {
    summary: String(raw.summary || ''),
    components: (raw.components as string[]) || [],
    concerns: (raw.concerns as string[]) || [],
    constraints: (raw.constraints as string[]) || [],
  };

  return {
    goal,
    analysis,
    tasks,
    waves: buildWaves(tasks),
    estimatedComplexity: String(raw.estimatedComplexity || 'medium') as ExecutionPlan['estimatedComplexity'],
  };
}
