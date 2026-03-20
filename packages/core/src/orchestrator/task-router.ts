import type { Task } from '../types/task.js';
import type { TeamRegistry } from '../teams/team-registry.js';

export function validateTaskRouting(tasks: Task[], registry: TeamRegistry): void {
  const taskIds = new Set(tasks.map(t => t.id));

  for (const task of tasks) {
    registry.get(task.team);

    for (const dep of task.dependencies) {
      if (!taskIds.has(dep)) {
        throw new Error(`Task "${task.id}" depends on unknown task "${dep}"`);
      }
    }
  }
}
