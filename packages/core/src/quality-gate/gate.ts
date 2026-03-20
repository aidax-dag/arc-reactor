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
  checks.push(checkConflicts(result));

  if (config.runTests) {
    checks.push(await runTests(result, config));
  }

  const failedTasks = result.results
    .filter(r => r.status === 'failure')
    .map(r => r.taskId);

  const passed = checks.every(c => c.passed) && failedTasks.length === 0;

  return {
    passed,
    checks,
    failedTasks,
    summary: passed
      ? `All ${checks.length} checks passed`
      : `${checks.filter(c => !c.passed).length} check(s) failed`,
  };
}
