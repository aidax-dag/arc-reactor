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
export { createDesignTeam } from './teams/design-team.js';
export { createDevopsTeam } from './teams/devops-team.js';
export { createSecurityTeam } from './teams/security-team.js';
export { createDocsTeam } from './teams/docs-team.js';
export { createProductTeam } from './teams/product-team.js';

export { CEOAgent } from './orchestrator/ceo-agent.js';
export { buildWaves } from './orchestrator/dependency-analyzer.js';
export { validateTaskRouting } from './orchestrator/task-router.js';

export type { Executor } from './executor/executor.js';
export { APIExecutor } from './executor/api-executor.js';
export { SubagentExecutor, isClaudeCodeEnvironment } from './executor/subagent-executor.js';
export { WaveExecutor } from './executor/wave-executor.js';

export { runQualityGate } from './quality-gate/gate.js';
export { loadConfig } from './config-loader.js';
export { autoGit, commitResults, initGitIfNeeded, createFeatureBranch, pushBranch, createPR } from './git-ops.js';
export type { GitOpsConfig } from './git-ops.js';
