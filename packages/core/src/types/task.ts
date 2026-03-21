export type TaskStatus = 'success' | 'failure';

export interface Task {
  id: string;
  title: string;
  description: string;
  team: TeamType;
  dependencies: string[];
  priority: 'high' | 'medium' | 'low';
  acceptanceCriteria: string[];
  featureId?: string;              // Vibranium feature ID for tracking
}

export type TeamType = 'frontend' | 'backend' | 'qa' | 'design' | 'devops';

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  outputs: FileChange[];
  testResults?: TestResult[];
  summary: string;
  errors?: string[];
  tokensUsed: number;
}

export interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface Wave {
  order: number;
  taskIds: string[];
}

export interface GoalAnalysis {
  summary: string;
  components: string[];
  concerns: string[];
  constraints: string[];
}

export interface ExecutionPlan {
  goal: string;
  analysis: GoalAnalysis;
  tasks: Task[];
  waves: Wave[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
}

export interface ExecutionContext {
  goal: string;
  priorResults: TaskResult[];
  priorFilePaths: string[];
  projectRoot: string;
}

export interface ExecutionResult {
  plan: ExecutionPlan;
  results: TaskResult[];
  qualityReport: QualityReport;
  totalTokensUsed: number;
  durationMs: number;
}

export interface QualityReport {
  passed: boolean;
  checks: QualityCheck[];
  failedTasks: string[];
  summary: string;
}

export interface QualityCheck {
  name: string;
  passed: boolean;
  details: string;
}
