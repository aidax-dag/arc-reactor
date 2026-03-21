import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { ExecutionPlan } from '../types/task.js';

const TRACKER_DIR = join(homedir(), '.arc-reactor');
const TRACKER_FILE = join(TRACKER_DIR, 'active-execution.json');

export interface PhaseProgress {
  runId: string;
  goal: string;
  projectPath: string;
  totalPhases: number;
  currentPhase: number;
  phases: PhaseStatus[];
  startedAt: string;
  updatedAt: string;
  status: 'running' | 'paused' | 'completed' | 'shutdown';
  shutdownRequested: boolean;
  plan?: ExecutionPlan;
}

export interface PhaseStatus {
  phase: number;
  name: string;
  taskIds: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
}

/**
 * Create a new phase tracker for an execution.
 */
export function createPhaseTracker(
  runId: string,
  goal: string,
  projectPath: string,
  plan: ExecutionPlan
): PhaseProgress {
  const progress: PhaseProgress = {
    runId,
    goal,
    projectPath,
    totalPhases: plan.waves.length,
    currentPhase: 0,
    phases: plan.waves.map((wave, i) => ({
      phase: i + 1,
      name: `Wave ${wave.order}`,
      taskIds: wave.taskIds,
      status: 'pending',
    })),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'running',
    shutdownRequested: false,
    plan,
  };

  writeFileSync(TRACKER_FILE, JSON.stringify(progress, null, 2));
  return progress;
}

/**
 * Update phase status.
 */
export function updatePhaseStatus(phase: number, status: PhaseStatus['status']): void {
  const progress = getActiveExecution();
  if (!progress) return;

  const p = progress.phases.find(p => p.phase === phase);
  if (p) {
    p.status = status;
    if (status === 'running') p.startedAt = new Date().toISOString();
    if (status === 'completed' || status === 'failed') p.completedAt = new Date().toISOString();
  }

  progress.currentPhase = phase;
  progress.updatedAt = new Date().toISOString();
  writeFileSync(TRACKER_FILE, JSON.stringify(progress, null, 2));
}

/**
 * Mark execution as complete.
 */
export function completeExecution(): void {
  const progress = getActiveExecution();
  if (!progress) return;

  progress.status = 'completed';
  progress.updatedAt = new Date().toISOString();
  writeFileSync(TRACKER_FILE, JSON.stringify(progress, null, 2));
}

/**
 * Mark execution as paused (for resume later).
 */
export function pauseExecution(): void {
  const progress = getActiveExecution();
  if (!progress) return;

  progress.status = 'paused';
  progress.updatedAt = new Date().toISOString();
  writeFileSync(TRACKER_FILE, JSON.stringify(progress, null, 2));
}

/**
 * Request graceful shutdown — finish current phase then stop.
 */
export function requestShutdown(): void {
  const progress = getActiveExecution();
  if (!progress) return;

  progress.shutdownRequested = true;
  progress.updatedAt = new Date().toISOString();
  writeFileSync(TRACKER_FILE, JSON.stringify(progress, null, 2));
}

/**
 * Check if shutdown was requested.
 */
export function isShutdownRequested(): boolean {
  const progress = getActiveExecution();
  return progress?.shutdownRequested ?? false;
}

/**
 * Get active execution progress.
 */
export function getActiveExecution(): PhaseProgress | null {
  if (!existsSync(TRACKER_FILE)) return null;
  try {
    return JSON.parse(readFileSync(TRACKER_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Check if all phases are complete.
 */
export function allPhasesComplete(): boolean {
  const progress = getActiveExecution();
  if (!progress) return true;
  return progress.phases.every(p => p.status === 'completed' || p.status === 'skipped');
}

/**
 * Get remaining phases.
 */
export function getRemainingPhases(): PhaseStatus[] {
  const progress = getActiveExecution();
  if (!progress) return [];
  return progress.phases.filter(p => p.status === 'pending' || p.status === 'running');
}

/**
 * Clear tracker file.
 */
export function clearTracker(): void {
  if (existsSync(TRACKER_FILE)) unlinkSync(TRACKER_FILE);
}
