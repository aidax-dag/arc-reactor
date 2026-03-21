import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { ExecutionResult } from './types/task.js';

const STORE_DIR = join(homedir(), '.arc-reactor', 'runs');

export interface StoredRun {
  id: string;
  goal: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  completedAt?: string;
  result?: ExecutionResult;
}

function ensureStoreDir(): void {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
}

export function createRun(goal: string): StoredRun {
  ensureStoreDir();
  const id = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const run: StoredRun = {
    id,
    goal,
    status: 'running',
    startedAt: new Date().toISOString(),
  };
  writeFileSync(join(STORE_DIR, `${id}.json`), JSON.stringify(run, null, 2));
  return run;
}

export function updateRun(id: string, updates: Partial<StoredRun>): void {
  const path = join(STORE_DIR, `${id}.json`);
  if (!existsSync(path)) return;
  const run = JSON.parse(readFileSync(path, 'utf-8'));
  Object.assign(run, updates);
  writeFileSync(path, JSON.stringify(run, null, 2));
}

export function completeRun(id: string, result: ExecutionResult, passed: boolean): void {
  updateRun(id, {
    status: passed ? 'success' : 'failed',
    completedAt: new Date().toISOString(),
    result,
  });
}

export function getRun(id: string): StoredRun | null {
  const path = join(STORE_DIR, `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function listRuns(limit = 50): StoredRun[] {
  ensureStoreDir();
  const files = readdirSync(STORE_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, limit);

  return files.map(f => {
    const data = JSON.parse(readFileSync(join(STORE_DIR, f), 'utf-8'));
    // Return without full result to keep listing lightweight
    return { ...data, result: undefined };
  });
}

export function getRunDetail(id: string): StoredRun | null {
  return getRun(id);
}
