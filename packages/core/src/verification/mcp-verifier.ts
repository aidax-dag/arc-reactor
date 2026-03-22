import type { ExecutionTrace, ToolCall } from './execution-trace.js';

/**
 * MCP Call Verifier — MCP 도구가 실제로 호출되었는지 검증
 *
 * 문제: AI가 MCP를 호출했다고 말하면서 실제로는 자체적으로 처리
 * 해결: MCP 호출 기록을 확인하여 실제 호출 여부를 검증
 */

export interface MCPExpectation {
  serverName: string;              // 'vibranium', 'playwright', etc.
  toolName: string;                // 'vibranium_search', 'vibranium_create', etc.
  required: boolean;               // true = 반드시 호출해야 함
  description: string;             // 왜 이 호출이 필요한지
}

export interface MCPVerificationResult {
  serverName: string;
  toolName: string;
  expected: boolean;
  actualCalled: boolean;
  callCount: number;
  status: 'verified' | 'missing' | 'unexpected';
  description: string;
}

/**
 * Define MCP expectations based on task context.
 */
export function buildMCPExpectations(taskContext: {
  hasVibraniumConfig: boolean;
  isNewFeature: boolean;
  isExistingFeature: boolean;
  hasGithubRepo: boolean;
}): MCPExpectation[] {
  const expectations: MCPExpectation[] = [];

  if (taskContext.hasVibraniumConfig) {
    expectations.push({
      serverName: 'vibranium',
      toolName: 'vibranium_search',
      required: true,
      description: 'Must search Vibranium for existing features before creating new ones',
    });

    if (taskContext.isNewFeature) {
      expectations.push({
        serverName: 'vibranium',
        toolName: 'vibranium_create',
        required: true,
        description: 'Must register new feature in Vibranium',
      });
    }

    if (taskContext.isExistingFeature) {
      expectations.push({
        serverName: 'vibranium',
        toolName: 'vibranium_get',
        required: true,
        description: 'Must fetch existing feature spec from Vibranium',
      });
    }
  }

  return expectations;
}

/**
 * Verify MCP calls against expectations.
 */
export function verifyMCPCalls(
  trace: ExecutionTrace,
  expectations: MCPExpectation[],
): MCPVerificationResult[] {
  const results: MCPVerificationResult[] = [];

  // Get all MCP-related tool calls (tools with server prefix like vibranium_search)
  const mcpCalls = trace.toolCalls.filter(c =>
    c.toolName.includes('_') || c.toolName.startsWith('mcp__')
  );

  for (const exp of expectations) {
    const matching = mcpCalls.filter(c =>
      c.toolName === exp.toolName ||
      c.toolName === `mcp__${exp.serverName}__${exp.toolName}` ||
      c.toolName.includes(exp.toolName)
    );

    results.push({
      serverName: exp.serverName,
      toolName: exp.toolName,
      expected: exp.required,
      actualCalled: matching.length > 0,
      callCount: matching.length,
      status: matching.length > 0 ? 'verified' : (exp.required ? 'missing' : 'unexpected'),
      description: exp.description,
    });
  }

  return results;
}

/**
 * Format MCP verification results.
 */
export function formatMCPVerification(results: MCPVerificationResult[]): string {
  if (results.length === 0) return '';

  const verified = results.filter(r => r.status === 'verified').length;
  const missing = results.filter(r => r.status === 'missing').length;

  const lines = ['', `🔌 MCP Verification: ${verified} verified, ${missing} missing`];

  for (const r of results) {
    const icon = r.status === 'verified' ? '✅' : r.status === 'missing' ? '❌' : '⚠️';
    lines.push(`   ${icon} ${r.serverName}/${r.toolName} — ${r.status} (${r.callCount} calls)`);
    if (r.status === 'missing') {
      lines.push(`      └─ ${r.description}`);
    }
  }

  return lines.join('\n');
}
