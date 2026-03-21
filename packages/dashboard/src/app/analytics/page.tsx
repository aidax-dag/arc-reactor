import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  runId: string;
  event: string;
  data?: Record<string, unknown>;
  durationMs?: number;
  tokensUsed?: number;
}

function loadAllLogs(): LogEntry[] {
  const dir = join(homedir(), '.arc-reactor', 'logs');
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter(f => f.endsWith('.jsonl')).sort().reverse();
  const entries: LogEntry[] = [];

  for (const file of files) {
    const lines = readFileSync(join(dir, file), 'utf-8').trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try { entries.push(JSON.parse(line)); } catch { /* skip */ }
    }
  }

  return entries;
}

function computeAnalytics(logs: LogEntry[]) {
  const runs = new Set(logs.map(l => l.runId));
  const totalRuns = runs.size;

  // Team performance
  const teamStats: Record<string, { tasks: number; successes: number; totalMs: number; totalTokens: number }> = {};
  for (const entry of logs) {
    if (entry.category === 'team' && entry.event === 'task_complete') {
      const team = String(entry.data?.team || 'unknown');
      if (!teamStats[team]) teamStats[team] = { tasks: 0, successes: 0, totalMs: 0, totalTokens: 0 };
      teamStats[team].tasks++;
      if (entry.data?.status === 'success') teamStats[team].successes++;
      teamStats[team].totalMs += entry.durationMs || 0;
      teamStats[team].totalTokens += entry.tokensUsed || 0;
    }
  }

  // Cost estimation (Claude API pricing approximation)
  const totalTokens = logs.reduce((sum, l) => sum + (l.tokensUsed || 0), 0);
  const estimatedCost = (totalTokens / 1_000_000) * 3; // ~$3/M tokens average

  // Success rate
  const completedRuns = logs.filter(l => l.event === 'run_complete');
  const successRuns = completedRuns.filter(l => l.data?.passed);
  const successRate = completedRuns.length > 0 ? (successRuns.length / completedRuns.length * 100) : 0;

  // Error breakdown
  const errors = logs.filter(l => l.level === 'error');
  const errorsByCategory: Record<string, number> = {};
  for (const e of errors) {
    errorsByCategory[e.category] = (errorsByCategory[e.category] || 0) + 1;
  }

  // Average execution time
  const runDurations = completedRuns.map(l => (l.data?.totalDurationMs as number) || 0).filter(d => d > 0);
  const avgDuration = runDurations.length > 0 ? runDurations.reduce((a, b) => a + b, 0) / runDurations.length : 0;

  return { totalRuns, teamStats, totalTokens, estimatedCost, successRate, errorsByCategory, avgDuration };
}

export default function AnalyticsPage() {
  const logs = loadAllLogs();
  const stats = computeAnalytics(logs);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Analytics</h1>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-gray-800 p-5">
          <p className="text-xs text-gray-500">Total Runs</p>
          <p className="mt-1 text-2xl font-bold text-blue-400">{stats.totalRuns}</p>
        </div>
        <div className="rounded-xl border border-gray-800 p-5">
          <p className="text-xs text-gray-500">Success Rate</p>
          <p className="mt-1 text-2xl font-bold text-green-400">{stats.successRate.toFixed(0)}%</p>
        </div>
        <div className="rounded-xl border border-gray-800 p-5">
          <p className="text-xs text-gray-500">Avg Duration</p>
          <p className="mt-1 text-2xl font-bold text-yellow-400">{Math.round(stats.avgDuration / 1000)}s</p>
        </div>
        <div className="rounded-xl border border-gray-800 p-5">
          <p className="text-xs text-gray-500">Total Tokens</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">{stats.totalTokens.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-800 p-5">
          <p className="text-xs text-gray-500">Est. Cost</p>
          <p className="mt-1 text-2xl font-bold text-red-400">${stats.estimatedCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Team Performance */}
      <h2 className="mb-4 text-xl font-semibold text-gray-200">Team Performance</h2>
      {Object.keys(stats.teamStats).length > 0 ? (
        <div className="mb-8 overflow-hidden rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800 bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-400">Team</th>
                <th className="px-4 py-3 text-right text-gray-400">Tasks</th>
                <th className="px-4 py-3 text-right text-gray-400">Success Rate</th>
                <th className="px-4 py-3 text-right text-gray-400">Avg Time</th>
                <th className="px-4 py-3 text-right text-gray-400">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.teamStats).map(([team, s]) => (
                <tr key={team} className="border-b border-gray-800/50">
                  <td className="px-4 py-3 font-medium text-white">{team}</td>
                  <td className="px-4 py-3 text-right">{s.tasks}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.successes / s.tasks > 0.8 ? 'text-green-400' : 'text-red-400'}>
                      {(s.successes / s.tasks * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{s.tasks > 0 ? Math.round(s.totalMs / s.tasks / 1000) : 0}s</td>
                  <td className="px-4 py-3 text-right text-gray-400">{s.totalTokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-8 text-gray-500">No team data yet. Run arc-reactor ignite to generate data.</p>
      )}

      {/* Error Breakdown */}
      {Object.keys(stats.errorsByCategory).length > 0 && (
        <>
          <h2 className="mb-4 text-xl font-semibold text-gray-200">Errors by Category</h2>
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(stats.errorsByCategory).map(([cat, count]) => (
              <div key={cat} className="rounded-xl border border-red-900/50 p-4">
                <p className="text-xs text-gray-500">{cat}</p>
                <p className="mt-1 text-xl font-bold text-red-400">{count}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Log count */}
      <p className="text-xs text-gray-600">Based on {logs.length} log entries from ~/.arc-reactor/logs/</p>
    </div>
  );
}
