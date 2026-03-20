import type { Task, TaskResult, ExecutionContext } from '../types/task.js';
import type { Team } from '../types/team.js';

export interface Executor {
  execute(task: Task, team: Team, context: ExecutionContext): Promise<TaskResult>;
}
