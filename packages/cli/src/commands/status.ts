import { getActiveExecution } from '@arc-reactor/core';

export function showStatus() {
  const progress = getActiveExecution();

  if (!progress) {
    console.log('No active execution. Run arc-reactor ignite to start.');
    return;
  }

  const statusIcon = {
    running: '🔄',
    paused: '⏸️',
    completed: '✅',
    shutdown: '🛑',
  }[progress.status];

  console.log(`${statusIcon} Arc-Reactor Status`);
  console.log('━'.repeat(30));
  console.log(`Goal: ${progress.goal}`);
  console.log(`Status: ${progress.status}`);
  console.log(`Progress: ${progress.currentPhase}/${progress.totalPhases} phases`);
  console.log(`Started: ${new Date(progress.startedAt).toLocaleString()}`);
  console.log(`Updated: ${new Date(progress.updatedAt).toLocaleString()}`);
  console.log();

  for (const phase of progress.phases) {
    const icon = {
      pending: '⬜',
      running: '🔄',
      completed: '✅',
      failed: '❌',
      skipped: '⏭️',
    }[phase.status];

    const duration = phase.startedAt && phase.completedAt
      ? ` (${Math.round((new Date(phase.completedAt).getTime() - new Date(phase.startedAt).getTime()) / 1000)}s)`
      : '';

    console.log(`  ${icon} Phase ${phase.phase}: ${phase.name} — ${phase.status}${duration}`);
    console.log(`     Tasks: ${phase.taskIds.join(', ')}`);
  }

  if (progress.shutdownRequested) {
    console.log();
    console.log('🛑 Shutdown requested — will stop after current phase');
  }
}
