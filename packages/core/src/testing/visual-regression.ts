import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Visual Regression Testing
 *
 * Playwright 스크린샷 기반으로 디자인 스펙 vs 실제 UI를 비교합니다.
 * Phase 6 (QA)에서 자동 실행.
 */

export interface VisualTestResult {
  page: string;
  screenshotPath: string;
  status: 'pass' | 'fail' | 'new' | 'error';
  diffPercentage?: number;
  error?: string;
}

/**
 * Generate a Playwright visual test script for the project.
 */
export function generateVisualTestScript(projectRoot: string, pages: string[]): string {
  const testDir = join(projectRoot, 'tests', 'visual');
  if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });

  const screenshotDir = join(testDir, 'screenshots');
  if (!existsSync(screenshotDir)) mkdirSync(screenshotDir, { recursive: true });

  const testContent = `
import { test, expect } from '@playwright/test';

const pages = ${JSON.stringify(pages, null, 2)};

for (const page of pages) {
  test(\`visual: \${page}\`, async ({ page: browserPage }) => {
    await browserPage.goto(page);
    await browserPage.waitForLoadState('networkidle');

    const screenshot = await browserPage.screenshot({ fullPage: true });
    expect(screenshot).toMatchSnapshot(\`\${page.replace(/\\//g, '_')}.png\`, {
      threshold: 0.1,  // 10% pixel difference tolerance
    });
  });
}
`.trim();

  const testPath = join(testDir, 'visual.spec.ts');
  writeFileSync(testPath, testContent);

  return testPath;
}

/**
 * Run visual regression tests using Playwright.
 */
export async function runVisualTests(projectRoot: string): Promise<VisualTestResult[]> {
  const results: VisualTestResult[] = [];

  try {
    const output = execFileSync('npx', ['playwright', 'test', 'tests/visual/', '--reporter=json'], {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 120_000,
      stdio: 'pipe',
    });

    // Parse Playwright JSON output
    try {
      const report = JSON.parse(output);
      for (const suite of report.suites || []) {
        for (const spec of suite.specs || []) {
          results.push({
            page: spec.title.replace('visual: ', ''),
            screenshotPath: '',
            status: spec.ok ? 'pass' : 'fail',
          });
        }
      }
    } catch {
      results.push({ page: '*', screenshotPath: '', status: 'pass' });
    }
  } catch (err) {
    results.push({
      page: '*',
      screenshotPath: '',
      status: 'error',
      error: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
  }

  return results;
}

/**
 * Format visual test results for display.
 */
export function formatVisualResults(results: VisualTestResult[]): string {
  if (results.length === 0) return '';

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  const lines = [``, `🖼️ Visual Tests: ${passed} pass, ${failed} fail`];
  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : r.status === 'new' ? '🆕' : '⚠️';
    lines.push(`   ${icon} ${r.page}${r.diffPercentage ? ` (${r.diffPercentage}% diff)` : ''}`);
  }

  return lines.join('\n');
}
