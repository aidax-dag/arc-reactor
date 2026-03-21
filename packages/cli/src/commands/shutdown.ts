import { getActiveExecution, requestShutdown } from '@arc-reactor/core';

export function shutdownExecution() {
  const progress = getActiveExecution();

  if (!progress) {
    console.log('No active execution to shutdown.');
    return;
  }

  if (progress.status === 'completed') {
    console.log('✅ Execution already completed.');
    return;
  }

  if (progress.shutdownRequested) {
    console.log('🛑 Shutdown already requested. Waiting for current phase to complete.');
    return;
  }

  requestShutdown();
  console.log('🛑 Shutdown requested');
  console.log(`   Current: Phase ${progress.currentPhase}/${progress.totalPhases}`);
  console.log('   Will stop after current phase completes.');
  console.log('   Progress will be saved for resume.');
}
