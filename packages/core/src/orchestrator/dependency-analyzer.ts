import type { Task, Wave } from '../types/task.js';
import { enforceTeamDependencies, getTaskPhase } from './phase-rules.js';

/**
 * Build execution waves from tasks.
 *
 * 1. Enforce team-level dependencies (Product → Architect → Backend → Frontend → QA → Security)
 * 2. Sort by phase number
 * 3. Topological sort within same phase (respecting task-level dependencies)
 * 4. Group into waves (tasks with all deps resolved run in parallel)
 */
export function buildWaves(tasks: Task[]): Wave[] {
  // Step 1: Add implicit team dependencies
  const enrichedTasks = enforceTeamDependencies(tasks);

  // Step 2: Sort by phase (stable sort preserves original order within same phase)
  const sorted = [...enrichedTasks].sort((a, b) => getTaskPhase(a) - getTaskPhase(b));

  // Step 3: Topological sort into waves
  const assigned = new Set<string>();
  const waves: Wave[] = [];

  while (assigned.size < sorted.length) {
    const waveTaskIds: string[] = [];

    for (const task of sorted) {
      if (assigned.has(task.id)) continue;
      const depsResolved = task.dependencies.every(dep => assigned.has(dep));
      if (depsResolved) waveTaskIds.push(task.id);
    }

    if (waveTaskIds.length === 0) {
      const remaining = sorted.filter(t => !assigned.has(t.id)).map(t => t.id);
      waves.push({ order: waves.length + 1, taskIds: remaining });
      break;
    }

    waves.push({ order: waves.length + 1, taskIds: waveTaskIds });
    waveTaskIds.forEach(id => assigned.add(id));
  }

  return waves;
}
