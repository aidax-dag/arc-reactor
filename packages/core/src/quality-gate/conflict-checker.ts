import type { ExecutionResult, QualityCheck } from '../types/task.js';

export function checkConflicts(result: ExecutionResult): QualityCheck {
  const fileToTasks = new Map<string, string[]>();

  for (const taskResult of result.results) {
    for (const output of taskResult.outputs) {
      const existing = fileToTasks.get(output.path) || [];
      existing.push(taskResult.taskId);
      fileToTasks.set(output.path, existing);
    }
  }

  const conflicts = Array.from(fileToTasks.entries())
    .filter(([, tasks]) => tasks.length > 1);

  return {
    name: 'no-conflicts',
    passed: conflicts.length === 0,
    details: conflicts.length === 0
      ? 'No file conflicts'
      : `${conflicts.length} conflict(s): ${conflicts.map(([p, t]) => `${p} (${t.join(', ')})`).join('; ')}`,
  };
}
