import { execFileSync } from 'node:child_process';
import type { ExecutionResult, QualityCheck } from '../types/task.js';
import type { ArcReactorConfig } from '../types/config.js';

export async function runTests(
  result: ExecutionResult,
  config: ArcReactorConfig
): Promise<QualityCheck> {
  const testFiles = result.results
    .flatMap(r => r.outputs)
    .filter(f => f.path.includes('.test.') || f.path.includes('.spec.'));

  if (testFiles.length === 0) {
    return { name: 'tests-pass', passed: true, details: 'No test files (skipped)' };
  }

  try {
    execFileSync('npm', ['test'], {
      cwd: config.outputDir,
      encoding: 'utf-8',
      timeout: 60_000,
      stdio: 'pipe',
    });

    return { name: 'tests-pass', passed: true, details: `${testFiles.length} test file(s) passed` };
  } catch (err) {
    const output = err instanceof Error ? (err as any).stdout || err.message : String(err);
    return { name: 'tests-pass', passed: false, details: `Tests failed: ${String(output).slice(0, 300)}` };
  }
}
