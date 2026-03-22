#!/usr/bin/env node

/**
 * PostToolUse Hook — 실제 도구 호출을 감사 로그에 기록
 *
 * 모든 도구 호출 시 실행되어, 에이전트가 실제로 어떤 도구를 호출했는지 기록합니다.
 * 이 데이터는 execution-trace와 대조하여 "말한 것 vs 한 것" 검증에 사용됩니다.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const AUDIT_FILE = path.join(os.homedir(), '.arc-reactor', 'tool-audit.jsonl');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    return;
  }

  const toolName = parsed.tool_name || '';
  const toolInput = parsed.tool_input || {};
  const toolResponse = parsed.tool_response || {};
  const sessionId = parsed.session_id || '';

  // Record the actual tool call
  const record = {
    timestamp: new Date().toISOString(),
    sessionId,
    toolName,
    inputKeys: Object.keys(toolInput),
    success: !toolResponse.error,
    // Don't log full content (too large), just metadata
    inputSummary: summarizeInput(toolName, toolInput),
  };

  // Ensure directory exists
  const dir = path.dirname(AUDIT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Append to audit log
  fs.appendFileSync(AUDIT_FILE, JSON.stringify(record) + '\n');
}

function summarizeInput(toolName, input) {
  switch (toolName) {
    case 'Write':
      return `file: ${input.file_path || '?'}`;
    case 'Edit':
      return `file: ${input.file_path || '?'}`;
    case 'Read':
      return `file: ${input.file_path || '?'}`;
    case 'Bash':
      return `cmd: ${(input.command || '').slice(0, 80)}`;
    case 'Grep':
      return `pattern: ${input.pattern || '?'}`;
    case 'Glob':
      return `pattern: ${input.pattern || '?'}`;
    default:
      // MCP tools
      if (toolName.includes('vibranium') || toolName.includes('mcp__')) {
        return JSON.stringify(input).slice(0, 100);
      }
      return `keys: ${Object.keys(input).join(',')}`;
  }
}

main();
