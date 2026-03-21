import type { ExecutionResult, QualityCheck } from '../types/task.js';

export function checkCodeGenerated(result: ExecutionResult): QualityCheck {
  const tasksWithoutOutput = result.results.filter(
    r => r.outputs.length === 0 && r.status === 'success'
  );
  const totalFiles = result.results.flatMap(r => r.outputs).length;

  if (tasksWithoutOutput.length === 0) {
    return {
      name: 'code-generated',
      passed: true,
      severity: 'pass',
      details: `${totalFiles} files generated`,
    };
  }

  // Some tasks without output is a warning if other tasks did produce files
  const hasAnyOutput = totalFiles > 0;
  return {
    name: 'code-generated',
    passed: hasAnyOutput,
    severity: hasAnyOutput ? 'warning' : 'fail',
    details: hasAnyOutput
      ? `${totalFiles} files generated (${tasksWithoutOutput.length} task(s) had no output)`
      : `No files generated`,
  };
}
