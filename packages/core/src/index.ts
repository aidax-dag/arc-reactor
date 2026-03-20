export type {
  Task,
  TaskResult,
  TaskStatus,
  TeamType,
  FileChange,
  TestResult,
  Wave,
  GoalAnalysis,
  ExecutionPlan,
  ExecutionContext,
  ExecutionResult,
  QualityReport,
  QualityCheck,
} from './types/task.js';

export type { Team } from './types/team.js';
export type { ArcReactorConfig } from './types/config.js';
export { DEFAULT_CONFIG } from './types/config.js';
export type { Feature, UserScenario, DataField, TaskSpec, ProtocolSpec } from './types/feature.js';

export { TeamRegistry } from './teams/team-registry.js';
export { createFrontendTeam } from './teams/frontend-team.js';
export { createBackendTeam } from './teams/backend-team.js';
export { createQaTeam } from './teams/qa-team.js';

export { CEOAgent } from './orchestrator/ceo-agent.js';
export { buildWaves } from './orchestrator/dependency-analyzer.js';
export { validateTaskRouting } from './orchestrator/task-router.js';

export type { Executor } from './executor/executor.js';
export { APIExecutor } from './executor/api-executor.js';
export { SubagentExecutor, isClaudeCodeEnvironment } from './executor/subagent-executor.js';
export { WaveExecutor } from './executor/wave-executor.js';
