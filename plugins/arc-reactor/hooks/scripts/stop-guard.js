#!/usr/bin/env node

/**
 * Stop Hook — Phase 전체 완료 전까지 중단 방지
 *
 * 모든 Phase가 완료되지 않았으면 Claude에게 "계속 진행하라"고 지시합니다.
 * shutdown이 요청된 경우에는 현재 Phase 완료 후 중단을 허용합니다.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const TRACKER_FILE = path.join(os.homedir(), '.arc-reactor', 'active-execution.json');

function main() {
  if (!fs.existsSync(TRACKER_FILE)) {
    // No active execution — allow stop
    return;
  }

  let progress;
  try {
    progress = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf-8'));
  } catch {
    return;
  }

  // Already completed — allow stop
  if (progress.status === 'completed') return;

  // Shutdown requested — allow stop but mark as paused
  if (progress.shutdownRequested) {
    progress.status = 'shutdown';
    progress.updatedAt = new Date().toISOString();
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(progress, null, 2));
    console.log(JSON.stringify({
      systemMessage: `[Arc-Reactor] Shutdown requested. Progress saved. Use /arc-reactor:resume to continue from Phase ${progress.currentPhase + 1}.`,
    }));
    return;
  }

  // Check if phases remain
  const remaining = progress.phases.filter(p => p.status === 'pending' || p.status === 'running');

  if (remaining.length > 0) {
    const completed = progress.phases.filter(p => p.status === 'completed').length;
    const total = progress.phases.length;

    // Block stop — tell Claude to continue
    console.log(JSON.stringify({
      decision: 'block',
      reason: `Arc-Reactor: ${completed}/${total} phases complete. ${remaining.length} phases remaining. Continue execution.`,
    }));
  }
}

main();
