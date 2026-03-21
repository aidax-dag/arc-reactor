import { getActiveExecution, getRemainingPhases } from '@arc-reactor/core';

export function showResumeInfo() {
  const progress = getActiveExecution();

  if (!progress) {
    console.log('No paused execution found. Run arc-reactor ignite to start.');
    return;
  }

  if (progress.status === 'completed') {
    console.log('✅ Last execution already completed. Run arc-reactor ignite for a new goal.');
    return;
  }

  const remaining = getRemainingPhases();
  console.log('⏸️ Paused Execution Found');
  console.log('━'.repeat(30));
  console.log(`Goal: ${progress.goal}`);
  console.log(`Progress: Phase ${progress.currentPhase}/${progress.totalPhases}`);
  console.log(`Remaining: ${remaining.length} phases`);
  console.log();

  for (const phase of remaining) {
    console.log(`  ⬜ Phase ${phase.phase}: ${phase.name}`);
    console.log(`     Tasks: ${phase.taskIds.join(', ')}`);
  }

  console.log();
  console.log('To resume, run:');
  console.log('  arc-reactor ignite --resume');
}
