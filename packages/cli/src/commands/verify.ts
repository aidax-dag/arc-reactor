import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const AUDIT_FILE = join(homedir(), '.arc-reactor', 'tool-audit.jsonl');
const TRACE_DIR = join(homedir(), '.arc-reactor', 'traces');

interface AuditEntry {
  timestamp: string;
  sessionId: string;
  toolName: string;
  inputKeys: string[];
  success: boolean;
  inputSummary: string;
}

export function verifyExecution(options: { run?: string; session?: string }) {
  console.log('🔍 Execution Verification');
  console.log('━'.repeat(40));

  // Read audit log
  if (!existsSync(AUDIT_FILE)) {
    console.log('No tool audit data. Run arc-reactor with the plugin enabled to collect data.');
    return;
  }

  const entries: AuditEntry[] = readFileSync(AUDIT_FILE, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean) as AuditEntry[];

  // Filter by session if specified
  let filtered = entries;
  if (options.session) {
    filtered = entries.filter(e => e.sessionId === options.session);
  }

  // Summary
  const toolCounts = new Map<string, number>();
  for (const e of filtered) {
    toolCounts.set(e.toolName, (toolCounts.get(e.toolName) || 0) + 1);
  }

  console.log(`Total tool calls: ${filtered.length}`);
  console.log();
  console.log('Tool Call Distribution:');

  const sorted = [...toolCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [tool, count] of sorted) {
    const bar = '█'.repeat(Math.min(count, 30));
    console.log(`  ${tool.padEnd(25)} ${String(count).padStart(4)} ${bar}`);
  }

  // MCP specific checks
  console.log();
  console.log('MCP Tool Calls:');
  const mcpCalls = filtered.filter(e =>
    e.toolName.includes('vibranium') ||
    e.toolName.includes('mcp__') ||
    e.toolName.includes('_search') ||
    e.toolName.includes('_create') ||
    e.toolName.includes('_get')
  );

  if (mcpCalls.length === 0) {
    console.log('  ⚠️  NO MCP calls detected in this session');
    console.log('  This means AI agents may have worked without using external tools');
  } else {
    for (const call of mcpCalls) {
      const icon = call.success ? '✅' : '❌';
      console.log(`  ${icon} ${call.toolName} — ${call.inputSummary}`);
    }
  }

  // Suspicious patterns
  console.log();
  console.log('Anomaly Detection:');

  const writeCount = toolCounts.get('Write') || 0;
  const editCount = toolCounts.get('Edit') || 0;
  const readCount = toolCounts.get('Read') || 0;
  const bashCount = toolCounts.get('Bash') || 0;

  if (writeCount + editCount === 0 && filtered.length > 0) {
    console.log('  🔴 No Write/Edit calls — agent may not have created any files');
  }
  if (readCount === 0 && filtered.length > 5) {
    console.log('  ⚠️  No Read calls — agent may not have examined existing code');
  }
  if (bashCount === 0 && writeCount > 3) {
    console.log('  ⚠️  No Bash calls — agent may not have tested anything');
  }
  if (filtered.length < 3) {
    console.log('  ⚠️  Very few tool calls — agent may have hallucinated most actions');
  }

  const failedCalls = filtered.filter(e => !e.success);
  if (failedCalls.length > filtered.length * 0.3) {
    console.log(`  🔴 High failure rate: ${failedCalls.length}/${filtered.length} calls failed`);
  }

  if (filtered.length >= 3 && failedCalls.length <= filtered.length * 0.1) {
    console.log('  ✅ Tool call patterns look normal');
  }

  console.log();
  console.log(`Audit log: ${AUDIT_FILE}`);
}
