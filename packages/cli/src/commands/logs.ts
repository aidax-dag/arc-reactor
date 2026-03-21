import { readLogs, readRunLogs, getLogMetricsForRun } from '@arc-reactor/core';

export function showLogs(options: { run?: string; category?: string; level?: string; limit?: string }) {
  if (options.run) {
    // Show logs for specific run
    const logs = readRunLogs(options.run);
    if (logs.length === 0) {
      console.log(`No logs found for run: ${options.run}`);
      return;
    }

    console.log(`📊 Logs for ${options.run} (${logs.length} entries)`);
    console.log('━'.repeat(50));

    for (const entry of logs) {
      const icon = entry.level === 'error' ? '❌' : entry.level === 'warn' ? '⚠️' : entry.level === 'debug' ? '🔍' : 'ℹ️';
      const tokens = entry.tokensUsed ? ` [${entry.tokensUsed} tokens]` : '';
      const duration = entry.durationMs ? ` (${Math.round(entry.durationMs / 1000)}s)` : '';
      console.log(`  ${icon} [${entry.category}] ${entry.event}${tokens}${duration}`);
    }

    // Show metrics summary
    const metrics = getLogMetricsForRun(options.run);
    if (metrics) {
      console.log();
      console.log('📈 Metrics Summary:');
      console.log(`  Total Duration: ${Math.round(metrics.totalDurationMs / 1000)}s`);
      console.log(`  Total Tokens: ${metrics.totalTokensUsed.toLocaleString()}`);
      console.log(`  Errors: ${metrics.errorCount} | Retries: ${metrics.retryCount}`);

      if (Object.keys(metrics.teamMetrics).length > 0) {
        console.log();
        console.log('  Team Breakdown:');
        for (const [team, m] of Object.entries(metrics.teamMetrics)) {
          console.log(`    [${team}] ${m.taskCount} tasks, ${m.successCount} ok, ${m.failureCount} fail, ${m.tokensUsed.toLocaleString()} tokens`);
        }
      }
    }
  } else {
    // Show recent logs
    const limit = Number(options.limit || 50);
    let logs = readLogs(undefined, limit);

    if (options.category) {
      logs = logs.filter(e => e.category === options.category);
    }
    if (options.level) {
      logs = logs.filter(e => e.level === options.level);
    }

    if (logs.length === 0) {
      console.log('No logs found. Run arc-reactor ignite to generate logs.');
      return;
    }

    console.log(`📊 Recent Logs (${logs.length} entries)`);
    console.log('━'.repeat(50));

    for (const entry of logs.slice(0, 30)) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const icon = entry.level === 'error' ? '❌' : entry.level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`  ${time} ${icon} [${entry.category}] ${entry.event}`);
    }

    console.log();
    console.log(`Location: ~/.arc-reactor/logs/`);
  }
}
