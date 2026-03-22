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

export { Director } from './orchestrator/director.js';
export { buildWaves } from './orchestrator/dependency-analyzer.js';
export { validateTaskRouting } from './orchestrator/task-router.js';
export { enforceTeamDependencies, getTaskPhase, TEAM_DEPENDENCIES, TEAM_MIN_PHASE, PHASE_ORDER } from './orchestrator/phase-rules.js';

export type { Executor } from './executor/executor.js';
export { APIExecutor } from './executor/api-executor.js';
export { SubagentExecutor, isClaudeCodeEnvironment } from './executor/subagent-executor.js';
export { WaveExecutor } from './executor/wave-executor.js';
export { dryRunWave } from './executor/dry-run.js';
export type { DryRunResult } from './executor/dry-run.js';

export { runQualityGate } from './quality-gate/gate.js';
export { loadConfig } from './config-loader.js';
export { autoGit, commitResults, initGitIfNeeded, createFeatureBranch, pushBranch, createPR } from './git-ops.js';
export type { GitOpsConfig } from './git-ops.js';
export { createRun, updateRun, completeRun, getRun, listRuns, listProjects, getRunDetail } from './run-store.js';
export type { StoredRun } from './run-store.js';
export { sendNotification } from './notifications.js';
export type { WebhookEvent } from './notifications.js';
export { loadCustomTeam, saveCustomTeam, listCustomTeams, resetCustomTeam } from './teams/custom-loader.js';
export {
  buildMemoryContext,
  loadGlobalPatterns,
  saveGlobalPattern,
  loadProjectContext,
  saveProjectContext,
  updateProjectContext,
  addDecision,
  loadProjectLearnings,
  saveProjectLearning,
  loadPreferences,
  updatePreferences,
} from './memory/memory-store.js';
export type { ExecutionPattern, ProjectContext, Decision, UserPreferences } from './memory/memory-store.js';
export { learnFromExecution } from './memory/auto-learn.js';
export { ArcLogger, readLogs, readRunLogs, getLogMetricsForRun } from './logger/logger.js';
export type { LogEntry, LogLevel, LogCategory, LogMetrics } from './logger/logger.js';
export { submitFeedback, listFeedback, resolveFeedback, buildFeedbackContext } from './feedback/feedback-collector.js';
export type { UserFeedback } from './feedback/feedback-collector.js';
export { MultiRepoExecutor, validateRepoMap } from './executor/multi-repo.js';
export type { RepoMap } from './executor/multi-repo.js';
export { AgentBus, agentBus } from './executor/agent-bus.js';
export type { AgentMessage } from './executor/agent-bus.js';
export {
  createPhaseTracker,
  updatePhaseStatus,
  completeExecution,
  pauseExecution,
  requestShutdown,
  isShutdownRequested,
  getActiveExecution,
  allPhasesComplete,
  getRemainingPhases,
  clearTracker,
} from './executor/phase-tracker.js';
export type { PhaseProgress, PhaseStatus } from './executor/phase-tracker.js';
export {
  createPlanIndex,
  updatePlanIndex,
  finalizePlanIndex,
  writeCurrentPhase,
  updateCurrentPhaseTask,
  completeCurrentPhase,
} from './plan-manager/plan-writer.js';
export { generateDesignDoc } from './plan-manager/design-doc.js';
export { evaluateRun, loadAllEvaluations, computeCumulativeEvaluation } from './evaluation/scorer.js';
export type { TeamScore, RunEvaluation, CumulativeEvaluation } from './evaluation/scorer.js';
export { generateDebugReport, formatDebugReport } from './evaluation/debug-workflow.js';
export type { DebugIssue, DebugReport } from './evaluation/debug-workflow.js';
export { generateTestInfra } from './testing/test-infra.js';
export { checkContracts, formatContractResults } from './testing/contract-test.js';
export type { ContractCheckResult } from './testing/contract-test.js';
export { generateVisualTestScript, runVisualTests, formatVisualResults } from './testing/visual-regression.js';
export type { VisualTestResult } from './testing/visual-regression.js';
export { generateDeployScript, generateVercelCanaryConfig, DEFAULT_CANARY_CONFIG } from './deploy/canary.js';
export type { CanaryConfig, DeploymentResult } from './deploy/canary.js';
export {
  startTrace, recordToolCall, completeTrace,
  verifyTrace, verifyAllTraces, formatVerificationResults,
  loadTrace, DEFAULT_TEAM_ASSERTIONS,
} from './verification/execution-trace.js';
export type { ToolCall, ExecutionTrace, ToolAssertion, AssertionResult } from './verification/execution-trace.js';
export { buildMCPExpectations, verifyMCPCalls, formatMCPVerification } from './verification/mcp-verifier.js';
export type { MCPExpectation, MCPVerificationResult } from './verification/mcp-verifier.js';
