import { appendFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const LOG_DIR = join(homedir(), '.arc-reactor', 'logs');

// --- Types ---

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory =
  | 'ceo'           // CEO Agent analysis
  | 'team'          // Team execution
  | 'wave'          // Wave orchestration
  | 'quality'       // Quality gate
  | 'memory'        // Memory system
  | 'vibranium'     // Vibranium integration
  | 'git'           // Git operations
  | 'executor'      // Executor (API/subagent)
  | 'system';       // System-level events

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  runId: string;
  event: string;
  data?: Record<string, unknown>;
  durationMs?: number;
  tokensUsed?: number;
}

export interface LogMetrics {
  totalDurationMs: number;
  totalTokensUsed: number;
  teamMetrics: Record<string, {
    durationMs: number;
    tokensUsed: number;
    taskCount: number;
    successCount: number;
    failureCount: number;
  }>;
  waveMetrics: {
    waveNumber: number;
    parallelism: number;
    durationMs: number;
  }[];
  qualityMetrics: {
    checksRun: number;
    checksPassed: number;
    checksWarned: number;
    checksFailed: number;
  };
  memoryMetrics: {
    patternsLoaded: number;
    projectContextLoaded: boolean;
    learningsSaved: number;
  };
  errorCount: number;
  retryCount: number;
}

// --- Logger Class ---

export class ArcLogger {
  private runId: string;
  private logFile: string;
  private entries: LogEntry[] = [];
  private verbose: boolean;

  constructor(runId: string, verbose = false) {
    this.runId = runId;
    this.verbose = verbose;

    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

    const date = new Date().toISOString().slice(0, 10);
    this.logFile = join(LOG_DIR, `${date}.jsonl`);
  }

  log(level: LogLevel, category: LogCategory, event: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      runId: this.runId,
      event,
      data,
      durationMs: data?.durationMs as number | undefined,
      tokensUsed: data?.tokensUsed as number | undefined,
    };

    this.entries.push(entry);
    appendFileSync(this.logFile, JSON.stringify(entry) + '\n');

    if (this.verbose) {
      const icon = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'debug' ? '🔍' : 'ℹ️';
      console.error(`${icon} [${category}] ${event}`);
    }
  }

  // Convenience methods
  debug(category: LogCategory, event: string, data?: Record<string, unknown>): void {
    this.log('debug', category, event, data);
  }

  info(category: LogCategory, event: string, data?: Record<string, unknown>): void {
    this.log('info', category, event, data);
  }

  warn(category: LogCategory, event: string, data?: Record<string, unknown>): void {
    this.log('warn', category, event, data);
  }

  error(category: LogCategory, event: string, data?: Record<string, unknown>): void {
    this.log('error', category, event, data);
  }

  // Timer helper
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  // Get all entries for this run
  getEntries(): LogEntry[] {
    return this.entries;
  }

  // Compute metrics from entries
  computeMetrics(): LogMetrics {
    const teamMetrics: LogMetrics['teamMetrics'] = {};
    const waveMetrics: LogMetrics['waveMetrics'] = [];
    let totalDurationMs = 0;
    let totalTokensUsed = 0;
    let errorCount = 0;
    let retryCount = 0;
    let checksRun = 0, checksPassed = 0, checksWarned = 0, checksFailed = 0;
    let patternsLoaded = 0, projectContextLoaded = false, learningsSaved = 0;

    for (const entry of this.entries) {
      if (entry.durationMs) totalDurationMs += entry.durationMs;
      if (entry.tokensUsed) totalTokensUsed += entry.tokensUsed;
      if (entry.level === 'error') errorCount++;

      switch (entry.category) {
        case 'team': {
          const team = String(entry.data?.team || 'unknown');
          if (!teamMetrics[team]) {
            teamMetrics[team] = { durationMs: 0, tokensUsed: 0, taskCount: 0, successCount: 0, failureCount: 0 };
          }
          if (entry.event === 'task_complete') {
            teamMetrics[team].taskCount++;
            teamMetrics[team].durationMs += entry.durationMs || 0;
            teamMetrics[team].tokensUsed += entry.tokensUsed || 0;
            if (entry.data?.status === 'success') teamMetrics[team].successCount++;
            else teamMetrics[team].failureCount++;
          }
          break;
        }
        case 'wave': {
          if (entry.event === 'wave_complete') {
            waveMetrics.push({
              waveNumber: entry.data?.wave as number || 0,
              parallelism: entry.data?.taskCount as number || 0,
              durationMs: entry.durationMs || 0,
            });
          }
          break;
        }
        case 'quality': {
          if (entry.event === 'check_result') {
            checksRun++;
            if (entry.data?.passed) checksPassed++;
            else if (entry.data?.severity === 'warning') checksWarned++;
            else checksFailed++;
          }
          break;
        }
        case 'executor': {
          if (entry.event === 'retry') retryCount++;
          break;
        }
        case 'memory': {
          if (entry.data?.patternsLoaded) patternsLoaded = entry.data.patternsLoaded as number;
          if (entry.data?.projectContextLoaded) projectContextLoaded = true;
          if (entry.data?.learningsSaved) learningsSaved = entry.data.learningsSaved as number;
          break;
        }
      }
    }

    return {
      totalDurationMs,
      totalTokensUsed,
      teamMetrics,
      waveMetrics,
      qualityMetrics: { checksRun, checksPassed, checksWarned, checksFailed },
      memoryMetrics: { patternsLoaded, projectContextLoaded, learningsSaved },
      errorCount,
      retryCount,
    };
  }
}

// --- Log Reader (for dashboard/analytics) ---

export function readLogs(date?: string, limit = 500): LogEntry[] {
  if (!existsSync(LOG_DIR)) return [];

  if (date) {
    const file = join(LOG_DIR, `${date}.jsonl`);
    if (!existsSync(file)) return [];
    return readFileSync(file, 'utf-8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
      .slice(-limit);
  }

  // Read all log files, most recent first
  const files = readdirSync(LOG_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .sort()
    .reverse();

  const entries: LogEntry[] = [];
  for (const file of files) {
    if (entries.length >= limit) break;
    const lines = readFileSync(join(LOG_DIR, file), 'utf-8')
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const line of lines.reverse()) {
      if (entries.length >= limit) break;
      entries.push(JSON.parse(line));
    }
  }

  return entries;
}

export function readRunLogs(runId: string): LogEntry[] {
  const allLogs = readLogs(undefined, 10000);
  return allLogs.filter(e => e.runId === runId);
}

export function getLogMetricsForRun(runId: string): LogMetrics | null {
  const entries = readRunLogs(runId);
  if (entries.length === 0) return null;

  const logger = new ArcLogger(runId);
  (logger as any).entries = entries;
  return logger.computeMetrics();
}
