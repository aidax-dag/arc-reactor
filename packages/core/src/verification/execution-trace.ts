import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const TRACE_DIR = join(homedir(), '.arc-reactor', 'traces');

/**
 * Execution Trace — 에이전트가 실제로 호출한 도구를 기록하고 검증
 *
 * 문제: AI가 "MCP를 호출했다"고 말하면서 실제로는 호출하지 않는 경우
 * 해결: 실제 도구 호출을 Hook(PostToolUse)으로 캡처 → 기대치와 대조
 */

export interface ToolCall {
  toolName: string;
  timestamp: string;
  taskId?: string;
  input?: Record<string, unknown>;
  output?: string;
  success: boolean;
}

export interface ExecutionTrace {
  runId: string;
  taskId: string;
  team: string;
  toolCalls: ToolCall[];
  startedAt: string;
  completedAt?: string;
}

export interface ToolAssertion {
  taskId: string;
  requiredTools: string[];        // 반드시 호출해야 하는 도구
  forbiddenTools?: string[];      // 호출하면 안 되는 도구
  minCallCount?: number;          // 최소 호출 횟수
}

export interface AssertionResult {
  taskId: string;
  passed: boolean;
  details: string[];
  missingTools: string[];
  forbiddenCalls: string[];
  actualCallCount: number;
}

// --- Trace Recording ---

const activeTraces = new Map<string, ExecutionTrace>();

export function startTrace(runId: string, taskId: string, team: string): void {
  activeTraces.set(taskId, {
    runId,
    taskId,
    team,
    toolCalls: [],
    startedAt: new Date().toISOString(),
  });
}

export function recordToolCall(
  taskId: string,
  toolName: string,
  input?: Record<string, unknown>,
  output?: string,
  success = true,
): void {
  const trace = activeTraces.get(taskId);
  if (!trace) return;

  trace.toolCalls.push({
    toolName,
    timestamp: new Date().toISOString(),
    taskId,
    input,
    output: output?.slice(0, 500),
    success,
  });
}

export function completeTrace(taskId: string): ExecutionTrace | null {
  const trace = activeTraces.get(taskId);
  if (!trace) return null;

  trace.completedAt = new Date().toISOString();
  activeTraces.delete(taskId);

  // Save to disk
  if (!existsSync(TRACE_DIR)) mkdirSync(TRACE_DIR, { recursive: true });
  const fileName = `${trace.runId}-${taskId}.json`;
  writeFileSync(join(TRACE_DIR, fileName), JSON.stringify(trace, null, 2));

  return trace;
}

// --- Tool Assertions ---

/**
 * Define required tools for each team type.
 * Based on Phase DAG — each team has tools it MUST use.
 */
export const DEFAULT_TEAM_ASSERTIONS: Record<string, { required: string[]; forbidden?: string[] }> = {
  frontend: {
    required: ['Write', 'Edit'],
    forbidden: [],
  },
  backend: {
    required: ['Write', 'Edit'],
    forbidden: [],
  },
  qa: {
    required: ['Write', 'Bash'],  // Must write tests AND run them
    forbidden: [],
  },
  design: {
    required: ['Write'],
    forbidden: [],
  },
  security: {
    required: ['Read', 'Grep'],  // Must read code to review it
    forbidden: ['Write'],        // Security shouldn't modify code
  },
};

/**
 * Verify that a task's execution trace matches assertions.
 */
export function verifyTrace(
  trace: ExecutionTrace,
  assertion?: ToolAssertion,
): AssertionResult {
  const details: string[] = [];
  const missingTools: string[] = [];
  const forbiddenCalls: string[] = [];

  // Get assertions — explicit or default by team
  const required = assertion?.requiredTools
    || DEFAULT_TEAM_ASSERTIONS[trace.team]?.required
    || [];
  const forbidden = assertion?.forbiddenTools
    || DEFAULT_TEAM_ASSERTIONS[trace.team]?.forbidden
    || [];
  const minCalls = assertion?.minCallCount ?? 1;

  const calledTools = new Set(trace.toolCalls.map(c => c.toolName));

  // Check required tools
  for (const tool of required) {
    if (!calledTools.has(tool)) {
      missingTools.push(tool);
      details.push(`❌ Required tool "${tool}" was NOT called`);
    } else {
      details.push(`✅ Required tool "${tool}" was called`);
    }
  }

  // Check forbidden tools
  for (const tool of forbidden) {
    if (calledTools.has(tool)) {
      forbiddenCalls.push(tool);
      details.push(`🚫 Forbidden tool "${tool}" was called`);
    }
  }

  // Check minimum call count
  if (trace.toolCalls.length < minCalls) {
    details.push(`⚠️ Only ${trace.toolCalls.length} tool calls (minimum: ${minCalls})`);
  }

  // Check for zero tool calls (highly suspicious)
  if (trace.toolCalls.length === 0) {
    details.push(`🔴 ZERO tool calls — agent may have hallucinated all actions`);
  }

  const passed = missingTools.length === 0 && forbiddenCalls.length === 0 && trace.toolCalls.length >= minCalls;

  return {
    taskId: trace.taskId,
    passed,
    details,
    missingTools,
    forbiddenCalls,
    actualCallCount: trace.toolCalls.length,
  };
}

/**
 * Verify all traces for a run and produce a summary.
 */
export function verifyAllTraces(runId: string, traces: ExecutionTrace[]): {
  passed: boolean;
  results: AssertionResult[];
  summary: string;
} {
  const results = traces.map(trace => verifyTrace(trace));
  const allPassed = results.every(r => r.passed);

  const passCount = results.filter(r => r.passed).length;
  const failCount = results.filter(r => !r.passed).length;
  const zeroCallTasks = results.filter(r => r.actualCallCount === 0);

  let summary = `Tool Verification: ${passCount} pass, ${failCount} fail`;
  if (zeroCallTasks.length > 0) {
    summary += ` ⚠️ ${zeroCallTasks.length} task(s) made ZERO tool calls`;
  }

  return { passed: allPassed, results, summary };
}

/**
 * Format verification results for display.
 */
export function formatVerificationResults(results: AssertionResult[]): string {
  if (results.length === 0) return '';

  const lines = ['', '🔍 Tool Call Verification:'];

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    lines.push(`   ${icon} [${r.taskId}] ${r.actualCallCount} tool calls`);

    if (!r.passed) {
      for (const d of r.details.filter(d => d.startsWith('❌') || d.startsWith('🚫') || d.startsWith('🔴'))) {
        lines.push(`      ${d}`);
      }
    }
  }

  return lines.join('\n');
}

// --- Read saved traces ---

export function loadTrace(runId: string, taskId: string): ExecutionTrace | null {
  const path = join(TRACE_DIR, `${runId}-${taskId}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}
