import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { TaskResult, QualityCheck } from '../types/task.js';

const DEBUG_DIR = join(homedir(), '.arc-reactor', 'debug-reports');

/**
 * Structured debugging workflow — QA 이슈 발견 시 체계적 디버깅 프로세스
 *
 * 흐름: 이슈 감지 → 로그 수집 → 재현 → 근본 원인 가설 → 수정 → 재검증 → 리포트
 */

export interface DebugIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  component: string;           // 관련 팀/모듈
  taskId: string;
  title: string;
  description: string;
  reproductionSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  logs?: string;
  filePaths: string[];         // 관련 파일
  rootCause?: string;
  fix?: string;
  status: 'open' | 'investigating' | 'fixing' | 'resolved' | 'wontfix';
  createdAt: string;
  resolvedAt?: string;
}

export interface DebugReport {
  runId: string;
  goal: string;
  timestamp: string;
  issues: DebugIssue[];
  summary: {
    total: number;
    critical: number;
    major: number;
    minor: number;
    resolved: number;
  };
}

/**
 * Generate debug issues from failed tasks and quality gate results.
 */
export function generateDebugReport(
  runId: string,
  goal: string,
  failedResults: TaskResult[],
  qualityChecks: QualityCheck[],
  tasks: { id: string; team: string; title: string; description: string }[],
): DebugReport {
  const issues: DebugIssue[] = [];

  // Issues from failed tasks
  for (const result of failedResults) {
    const task = tasks.find(t => t.id === result.taskId);
    if (!task) continue;

    issues.push({
      id: `debug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      severity: 'major',
      component: task.team,
      taskId: result.taskId,
      title: `Task failed: ${task.title}`,
      description: result.summary || 'Task execution failed',
      reproductionSteps: [
        `1. Run arc-reactor ignite "${goal}"`,
        `2. Wait for ${task.team} team to execute task "${task.title}"`,
        `3. Observe failure`,
      ],
      expectedBehavior: `Task "${task.title}" completes successfully with code output`,
      actualBehavior: result.errors?.join('; ') || 'Task returned failure status',
      logs: result.errors?.join('\n'),
      filePaths: result.outputs.map(o => o.path),
      status: 'open',
      createdAt: new Date().toISOString(),
    });
  }

  // Issues from quality gate failures
  for (const check of qualityChecks) {
    if (check.passed || check.severity === 'warning') continue;

    issues.push({
      id: `debug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      severity: check.name === 'tests-pass' ? 'critical' : 'major',
      component: 'quality-gate',
      taskId: '',
      title: `Quality check failed: ${check.name}`,
      description: check.details,
      reproductionSteps: [
        `1. Run arc-reactor ignite "${goal}"`,
        `2. Wait for all phases to complete`,
        `3. Observe quality gate failure: ${check.name}`,
      ],
      expectedBehavior: `Quality check "${check.name}" passes`,
      actualBehavior: check.details,
      filePaths: [],
      status: 'open',
      createdAt: new Date().toISOString(),
    });
  }

  const report: DebugReport = {
    runId,
    goal,
    timestamp: new Date().toISOString(),
    issues,
    summary: {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      major: issues.filter(i => i.severity === 'major').length,
      minor: issues.filter(i => i.severity === 'minor').length,
      resolved: issues.filter(i => i.status === 'resolved').length,
    },
  };

  // Save report
  if (issues.length > 0) {
    if (!existsSync(DEBUG_DIR)) mkdirSync(DEBUG_DIR, { recursive: true });
    writeFileSync(
      join(DEBUG_DIR, `${runId}-debug.json`),
      JSON.stringify(report, null, 2)
    );
  }

  return report;
}

/**
 * Format debug report as markdown for display.
 */
export function formatDebugReport(report: DebugReport): string {
  if (report.issues.length === 0) return '';

  const lines = [
    ``,
    `🐛 Debug Report: ${report.summary.total} issue(s) found`,
    `   Critical: ${report.summary.critical} | Major: ${report.summary.major} | Minor: ${report.summary.minor}`,
  ];

  for (const issue of report.issues) {
    const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'major' ? '🟠' : '🟡';
    lines.push(`   ${icon} [${issue.component}] ${issue.title}`);
    if (issue.logs) {
      lines.push(`      └─ ${issue.logs.slice(0, 100)}`);
    }
  }

  return lines.join('\n');
}
