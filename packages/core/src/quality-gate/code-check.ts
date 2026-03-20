import type { ExecutionResult, QualityCheck } from '../types/task.js';

export function checkCodeGenerated(result: ExecutionResult): QualityCheck {
  const tasksWithoutOutput = result.results.filter(
    r => r.outputs.length === 0 && r.status === 'success'
  );
  const totalFiles = result.results.flatMap(r => r.outputs).length;

  return {
    name: 'code-generated',
    passed: tasksWithoutOutput.length === 0,
    details: tasksWithoutOutput.length === 0
      ? `${totalFiles} files generated`
      : `${tasksWithoutOutput.length} task(s) produced no files`,
  };
}
