import type { ExecutionResult, QualityReport, QualityCheck } from '../types/task.js';
import type { ArcReactorConfig } from '../types/config.js';
import { checkCodeGenerated } from './code-check.js';
import { checkConflicts } from './conflict-checker.js';
import { runTests } from './test-runner.js';

export async function runQualityGate(
  result: ExecutionResult,
  config: ArcReactorConfig
): Promise<QualityReport> {
  const checks: QualityCheck[] = [];

  checks.push(checkCodeGenerated(result));

  const conflictCheck = checkConflicts(result);
  // Conflicts are warnings, not blockers — last wave wins by design
  conflictCheck.severity = conflictCheck.passed ? 'pass' : 'warning';
  checks.push(conflictCheck);

  if (config.runTests) {
    checks.push(await runTests(result, config));
  }

  const failedTasks = result.results
    .filter(r => r.status === 'failure')
    .map(r => r.taskId);

  // Only hard failures block: failed tasks or tests failing
  // Conflicts and missing files from some tasks are warnings
  const hardFailures = checks.filter(c => c.severity === 'fail' || (!c.passed && c.severity !== 'warning'));
  const passed = hardFailures.length === 0 && failedTasks.length === 0;

  return {
    passed,
    checks,
    failedTasks,
    summary: passed
      ? `All checks passed${checks.some(c => c.severity === 'warning') ? ' (with warnings)' : ''}`
      : `${hardFailures.length} check(s) failed`,
  };
}
