import type { Task, Wave } from '../types/task.js';

export function buildWaves(tasks: Task[]): Wave[] {
  const assigned = new Set<string>();
  const waves: Wave[] = [];

  while (assigned.size < tasks.length) {
    const waveTaskIds: string[] = [];

    for (const task of tasks) {
      if (assigned.has(task.id)) continue;
      const depsResolved = task.dependencies.every(dep => assigned.has(dep));
      if (depsResolved) waveTaskIds.push(task.id);
    }

    if (waveTaskIds.length === 0) {
      const remaining = tasks.filter(t => !assigned.has(t.id)).map(t => t.id);
      waves.push({ order: waves.length + 1, taskIds: remaining });
      break;
    }

    waves.push({ order: waves.length + 1, taskIds: waveTaskIds });
    waveTaskIds.forEach(id => assigned.add(id));
  }

  return waves;
}
