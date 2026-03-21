import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { TaskResult } from '../types/task.js';

/**
 * Contract Testing — API 계약 기반 통합 검증
 *
 * Frontend가 호출하는 API가 Backend가 실제로 제공하는 API와 일치하는지 검증.
 * Mock API 응답 vs 실제 API 응답 비교.
 */

export interface ContractCheckResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'skip';
  expected?: string;
  actual?: string;
  diff?: string;
}

/**
 * Extract API contracts from generated code.
 * Looks for fetch/axios calls in frontend code and API route definitions in backend code.
 */
export function extractContracts(results: TaskResult[]): {
  frontendCalls: { endpoint: string; method: string }[];
  backendRoutes: { endpoint: string; method: string }[];
} {
  const frontendCalls: { endpoint: string; method: string }[] = [];
  const backendRoutes: { endpoint: string; method: string }[] = [];

  for (const result of results) {
    for (const output of result.outputs) {
      if (!output.content) continue;

      // Extract frontend API calls
      const fetchPattern = /fetch\s*\(\s*['"`](\/api\/[^'"`]+)['"`]/g;
      const fetchMatches = output.content.matchAll(fetchPattern);
      for (const match of fetchMatches) {
        frontendCalls.push({ endpoint: match[1], method: 'GET' });
      }

      // Extract backend route definitions (Express/Hono style)
      const routeMatches = output.content.matchAll(/\.(get|post|put|patch|delete)\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/gi);
      for (const match of routeMatches) {
        backendRoutes.push({ endpoint: match[2], method: match[1].toUpperCase() });
      }
    }
  }

  return { frontendCalls, backendRoutes };
}

/**
 * Check if frontend API calls match backend route definitions.
 */
export function checkContracts(results: TaskResult[]): ContractCheckResult[] {
  const { frontendCalls, backendRoutes } = extractContracts(results);
  const checks: ContractCheckResult[] = [];

  for (const call of frontendCalls) {
    // Normalize endpoint (remove path params like :id)
    const normalizedEndpoint = call.endpoint.replace(/\/:[^/]+/g, '/:param');

    const matchingRoute = backendRoutes.find(r => {
      const normalizedRoute = r.endpoint.replace(/\/:[^/]+/g, '/:param');
      return normalizedRoute === normalizedEndpoint && r.method === call.method;
    });

    checks.push({
      endpoint: call.endpoint,
      method: call.method,
      status: matchingRoute ? 'pass' : 'fail',
      expected: `${call.method} ${call.endpoint}`,
      actual: matchingRoute ? `${matchingRoute.method} ${matchingRoute.endpoint}` : 'Not found in backend routes',
    });
  }

  // Check for unused backend routes (defined but not called by frontend)
  for (const route of backendRoutes) {
    const isCalled = frontendCalls.some(c =>
      c.endpoint.replace(/\/:[^/]+/g, '/:param') === route.endpoint.replace(/\/:[^/]+/g, '/:param')
      && c.method === route.method
    );
    if (!isCalled) {
      checks.push({
        endpoint: route.endpoint,
        method: route.method,
        status: 'skip',
        expected: 'Called by frontend',
        actual: 'Backend route defined but not called by frontend',
      });
    }
  }

  return checks;
}

/**
 * Format contract check results for display.
 */
export function formatContractResults(results: ContractCheckResult[]): string {
  if (results.length === 0) return '';

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  const lines = [
    ``,
    `🔗 Contract Test: ${passed} pass, ${failed} fail, ${skipped} unused`,
  ];

  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️';
    lines.push(`   ${icon} ${r.method} ${r.endpoint}${r.status === 'fail' ? ` — ${r.actual}` : ''}`);
  }

  return lines.join('\n');
}
