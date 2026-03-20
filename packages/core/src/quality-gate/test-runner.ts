import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExecutionResult, QualityCheck, FileChange } from '../types/task.js';
import type { ArcReactorConfig } from '../types/config.js';

type TestRunner = { cmd: string; args: string[] };

function detectTestRunner(outputDir: string, testFiles: FileChange[]): TestRunner | null {
  // 1. Check if package.json has a valid test script (not the default "echo Error")
  const pkgPath = join(outputDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const testScript = pkg.scripts?.test;
      if (testScript && !testScript.includes('no test specified')) {
        return { cmd: 'npm', args: ['test'] };
      }
    } catch { /* ignore parse errors */ }
  }

  // 2. Detect by test file patterns and installed tools
  const hasPlaywright = testFiles.some(f => f.path.includes('.spec.'))
    || existsSync(join(outputDir, 'playwright.config.ts'))
    || existsSync(join(outputDir, 'playwright.config.js'));

  const hasVitest = existsSync(join(outputDir, 'vitest.config.ts'))
    || existsSync(join(outputDir, 'vitest.config.js'));

  const hasJest = existsSync(join(outputDir, 'jest.config.ts'))
    || existsSync(join(outputDir, 'jest.config.js'))
    || existsSync(join(outputDir, 'jest.config.json'));

  if (hasPlaywright) return { cmd: 'npx', args: ['playwright', 'test'] };
  if (hasVitest) return { cmd: 'npx', args: ['vitest', 'run'] };
  if (hasJest) return { cmd: 'npx', args: ['jest'] };

  // 3. Detect by test file extension
  if (testFiles.some(f => f.path.includes('.test.'))) {
    return { cmd: 'npx', args: ['vitest', 'run'] };
  }

  return null;
}

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

  const runner = detectTestRunner(config.outputDir, testFiles);
  if (!runner) {
    return { name: 'tests-pass', passed: true, details: `${testFiles.length} test file(s) found, no test runner detected (skipped)` };
  }

  try {
    execFileSync(runner.cmd, runner.args, {
      cwd: config.outputDir,
      encoding: 'utf-8',
      timeout: 120_000,
      stdio: 'pipe',
    });

    return { name: 'tests-pass', passed: true, details: `${testFiles.length} test file(s) — ${runner.cmd} ${runner.args.join(' ')} passed` };
  } catch (err) {
    const output = err instanceof Error ? (err as any).stdout || err.message : String(err);
    return { name: 'tests-pass', passed: false, details: `Tests failed (${runner.cmd} ${runner.args.join(' ')}): ${String(output).slice(0, 300)}` };
  }
}
