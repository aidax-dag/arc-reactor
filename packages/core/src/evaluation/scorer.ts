import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { ExecutionResult, Task, TaskResult, QualityReport } from '../types/task.js';

const EVAL_DIR = join(homedir(), '.arc-reactor', 'evaluations');

// --- Types ---

export interface TeamScore {
  team: string;
  planAccuracy: number;      // 0-100: 계획대로 결과를 냈는가
  codeQuality: number;       // 0-100: QA에서 이슈 없이 구현했는가
  deliverySpeed: number;     // 0-100: 시간 효율성
  tokenEfficiency: number;   // 0-100: 토큰 사용 효율성
  overallScore: number;      // 0-100: 종합 점수
  issues: string[];          // 발견된 이슈 목록
}

export interface RunEvaluation {
  runId: string;
  goal: string;
  projectId?: string;
  timestamp: string;
  teamScores: TeamScore[];
  overallScore: number;
  planVsResult: {
    plannedTasks: number;
    completedTasks: number;
    failedTasks: number;
    accuracy: number;        // 완료율 (%)
  };
  qualityMetrics: {
    checksTotal: number;
    checksPassed: number;
    checksWarned: number;
    checksFailed: number;
    qualityScore: number;    // 0-100
  };
  filesGenerated: number;
  totalTokensUsed: number;
  totalDurationMs: number;
}

export interface CumulativeEvaluation {
  totalRuns: number;
  teamAverages: Record<string, {
    avgPlanAccuracy: number;
    avgCodeQuality: number;
    avgDeliverySpeed: number;
    avgTokenEfficiency: number;
    avgOverallScore: number;
    totalTasks: number;
    totalIssues: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  overallAvgScore: number;
  improvementSuggestions: string[];
  lastUpdated: string;
}

// --- Scoring Functions ---

function scorePlanAccuracy(task: Task, result: TaskResult): number {
  if (result.status === 'failure') return 0;
  if (result.outputs.length === 0) return 20; // Ran but no output

  // Check how many acceptance criteria could be verified
  const criteriaCount = task.acceptanceCriteria.length;
  if (criteriaCount === 0) return 80; // No criteria defined

  // Files generated is a proxy for work done
  const fileScore = Math.min(result.outputs.length * 20, 60);
  const baseScore = 40 + fileScore;
  return Math.min(baseScore, 100);
}

function scoreCodeQuality(result: TaskResult, qualityReport: QualityReport): number {
  if (result.status === 'failure') return 0;

  let score = 100;

  // Deduct for quality gate failures
  for (const check of qualityReport.checks) {
    if (!check.passed) {
      if (check.severity === 'warning') score -= 10;
      else score -= 25;
    }
  }

  // Deduct for errors
  if (result.errors && result.errors.length > 0) {
    score -= result.errors.length * 15;
  }

  return Math.max(score, 0);
}

function scoreDeliverySpeed(durationMs: number, complexity: string): number {
  // Expected times by complexity
  const expected: Record<string, number> = {
    simple: 30_000,    // 30s
    medium: 60_000,    // 60s
    complex: 120_000,  // 120s
  };

  const expectedMs = expected[complexity] || 60_000;
  const ratio = expectedMs / Math.max(durationMs, 1000);

  if (ratio >= 1) return 100;        // Faster than expected
  if (ratio >= 0.5) return 80;       // Within 2x
  if (ratio >= 0.25) return 60;      // Within 4x
  return 40;                          // Slower
}

function scoreTokenEfficiency(tokensUsed: number, filesCreated: number): number {
  if (filesCreated === 0) return 0;

  const tokensPerFile = tokensUsed / filesCreated;

  // Baseline: ~5000 tokens per file is efficient
  if (tokensPerFile <= 3000) return 100;
  if (tokensPerFile <= 5000) return 90;
  if (tokensPerFile <= 10000) return 70;
  if (tokensPerFile <= 20000) return 50;
  return 30;
}

// --- Main Evaluation ---

export function evaluateRun(result: ExecutionResult): RunEvaluation {
  const teamScores: TeamScore[] = [];
  const teamTasks = new Map<string, { tasks: Task[]; results: TaskResult[] }>();

  // Group tasks by team
  for (const task of result.plan.tasks) {
    const taskResult = result.results.find(r => r.taskId === task.id);
    if (!taskResult) continue;

    const existing = teamTasks.get(task.team) || { tasks: [], results: [] };
    existing.tasks.push(task);
    existing.results.push(taskResult);
    teamTasks.set(task.team, existing);
  }

  // Score each team
  for (const [team, { tasks, results: teamResults }] of teamTasks) {
    const planScores = tasks.map((t, i) => scorePlanAccuracy(t, teamResults[i]));
    const qualityScores = teamResults.map(r => scoreCodeQuality(r, result.qualityReport));
    const totalTokens = teamResults.reduce((sum, r) => sum + r.tokensUsed, 0);
    const totalFiles = teamResults.flatMap(r => r.outputs).length;

    const avgPlanAccuracy = planScores.reduce((a, b) => a + b, 0) / planScores.length;
    const avgCodeQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    const deliverySpeed = scoreDeliverySpeed(result.durationMs / tasks.length, result.plan.estimatedComplexity);
    const tokenEfficiency = scoreTokenEfficiency(totalTokens, totalFiles);

    const issues = teamResults
      .filter(r => r.status === 'failure' || (r.errors && r.errors.length > 0))
      .flatMap(r => r.errors || ['Task failed']);

    const overallScore = Math.round(
      avgPlanAccuracy * 0.35 +
      avgCodeQuality * 0.30 +
      deliverySpeed * 0.15 +
      tokenEfficiency * 0.20
    );

    teamScores.push({
      team,
      planAccuracy: Math.round(avgPlanAccuracy),
      codeQuality: Math.round(avgCodeQuality),
      deliverySpeed: Math.round(deliverySpeed),
      tokenEfficiency: Math.round(tokenEfficiency),
      overallScore,
      issues,
    });
  }

  // Plan vs Result
  const completedTasks = result.results.filter(r => r.status === 'success').length;
  const failedTasks = result.results.filter(r => r.status === 'failure').length;

  // Quality metrics
  const { checks } = result.qualityReport;
  const checksPassed = checks.filter(c => c.passed).length;
  const checksWarned = checks.filter(c => c.severity === 'warning').length;
  const checksFailed = checks.filter(c => !c.passed && c.severity !== 'warning').length;

  const evaluation: RunEvaluation = {
    runId: `eval-${Date.now()}`,
    goal: result.plan.goal,
    timestamp: new Date().toISOString(),
    teamScores,
    overallScore: teamScores.length > 0
      ? Math.round(teamScores.reduce((sum, t) => sum + t.overallScore, 0) / teamScores.length)
      : 0,
    planVsResult: {
      plannedTasks: result.plan.tasks.length,
      completedTasks,
      failedTasks,
      accuracy: Math.round((completedTasks / Math.max(result.plan.tasks.length, 1)) * 100),
    },
    qualityMetrics: {
      checksTotal: checks.length,
      checksPassed,
      checksWarned,
      checksFailed,
      qualityScore: checks.length > 0
        ? Math.round((checksPassed / checks.length) * 100)
        : 100,
    },
    filesGenerated: result.results.flatMap(r => r.outputs).length,
    totalTokensUsed: result.totalTokensUsed,
    totalDurationMs: result.durationMs,
  };

  // Save evaluation
  saveEvaluation(evaluation);

  return evaluation;
}

// --- Persistence ---

function ensureDir(): void {
  if (!existsSync(EVAL_DIR)) mkdirSync(EVAL_DIR, { recursive: true });
}

function saveEvaluation(evaluation: RunEvaluation): void {
  ensureDir();
  writeFileSync(
    join(EVAL_DIR, `${evaluation.runId}.json`),
    JSON.stringify(evaluation, null, 2)
  );
}

export function loadAllEvaluations(): RunEvaluation[] {
  ensureDir();
  const { readdirSync } = require('node:fs');
  return readdirSync(EVAL_DIR)
    .filter((f: string) => f.endsWith('.json') && f.startsWith('eval-'))
    .map((f: string) => JSON.parse(readFileSync(join(EVAL_DIR, f), 'utf-8')))
    .sort((a: RunEvaluation, b: RunEvaluation) => b.timestamp.localeCompare(a.timestamp));
}

// --- Cumulative Analysis ---

export function computeCumulativeEvaluation(): CumulativeEvaluation {
  const evaluations = loadAllEvaluations();

  if (evaluations.length === 0) {
    return {
      totalRuns: 0,
      teamAverages: {},
      overallAvgScore: 0,
      improvementSuggestions: ['No evaluations yet. Run arc-reactor ignite to generate data.'],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Aggregate by team
  const teamData: Record<string, {
    planScores: number[]; qualityScores: number[];
    speedScores: number[]; tokenScores: number[];
    overallScores: number[]; totalIssues: number;
  }> = {};

  for (const eval_ of evaluations) {
    for (const ts of eval_.teamScores) {
      if (!teamData[ts.team]) {
        teamData[ts.team] = {
          planScores: [], qualityScores: [],
          speedScores: [], tokenScores: [],
          overallScores: [], totalIssues: 0,
        };
      }
      const td = teamData[ts.team];
      td.planScores.push(ts.planAccuracy);
      td.qualityScores.push(ts.codeQuality);
      td.speedScores.push(ts.deliverySpeed);
      td.tokenScores.push(ts.tokenEfficiency);
      td.overallScores.push(ts.overallScore);
      td.totalIssues += ts.issues.length;
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const teamAverages: CumulativeEvaluation['teamAverages'] = {};
  for (const [team, data] of Object.entries(teamData)) {
    // Trend: compare last 3 vs first 3
    const recent = data.overallScores.slice(0, 3);
    const early = data.overallScores.slice(-3);
    const recentAvg = avg(recent);
    const earlyAvg = avg(early);
    const trend = recentAvg > earlyAvg + 5 ? 'improving' : recentAvg < earlyAvg - 5 ? 'declining' : 'stable';

    teamAverages[team] = {
      avgPlanAccuracy: Math.round(avg(data.planScores)),
      avgCodeQuality: Math.round(avg(data.qualityScores)),
      avgDeliverySpeed: Math.round(avg(data.speedScores)),
      avgTokenEfficiency: Math.round(avg(data.tokenScores)),
      avgOverallScore: Math.round(avg(data.overallScores)),
      totalTasks: data.overallScores.length,
      totalIssues: data.totalIssues,
      trend,
    };
  }

  // Generate improvement suggestions
  const suggestions: string[] = [];
  for (const [team, stats] of Object.entries(teamAverages)) {
    if (stats.avgPlanAccuracy < 60) {
      suggestions.push(`[${team}] Plan accuracy is low (${stats.avgPlanAccuracy}%). Consider improving task descriptions or system prompt.`);
    }
    if (stats.avgCodeQuality < 60) {
      suggestions.push(`[${team}] Code quality needs improvement (${stats.avgCodeQuality}%). Review QA failures for common patterns.`);
    }
    if (stats.avgTokenEfficiency < 50) {
      suggestions.push(`[${team}] Token usage is high (efficiency: ${stats.avgTokenEfficiency}%). Consider optimizing prompts.`);
    }
    if (stats.trend === 'declining') {
      suggestions.push(`[${team}] Performance is declining. Review recent changes to system prompts or task complexity.`);
    }
    if (stats.totalIssues > stats.totalTasks * 0.3) {
      suggestions.push(`[${team}] High issue rate (${stats.totalIssues} issues in ${stats.totalTasks} tasks). Investigate common failure modes.`);
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('All teams performing within expected range. Continue monitoring.');
  }

  return {
    totalRuns: evaluations.length,
    teamAverages,
    overallAvgScore: Math.round(avg(evaluations.map(e => e.overallScore))),
    improvementSuggestions: suggestions,
    lastUpdated: new Date().toISOString(),
  };
}
