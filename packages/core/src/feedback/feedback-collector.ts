import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const FEEDBACK_DIR = join(homedir(), '.arc-reactor', 'feedback');

export interface UserFeedback {
  id: string;
  runId: string;
  type: 'bug' | 'suggestion' | 'praise' | 'quality';
  message: string;
  context?: {
    taskId?: string;
    team?: string;
    filePath?: string;
  };
  timestamp: string;
  resolved: boolean;
}

function ensureDir(): void {
  if (!existsSync(FEEDBACK_DIR)) mkdirSync(FEEDBACK_DIR, { recursive: true });
}

export function submitFeedback(
  runId: string,
  type: UserFeedback['type'],
  message: string,
  context?: UserFeedback['context']
): UserFeedback {
  ensureDir();

  const feedback: UserFeedback = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    runId,
    type,
    message,
    context,
    timestamp: new Date().toISOString(),
    resolved: false,
  };

  const file = join(FEEDBACK_DIR, `${feedback.id}.json`);
  writeFileSync(file, JSON.stringify(feedback, null, 2));

  return feedback;
}

export function listFeedback(runId?: string): UserFeedback[] {
  ensureDir();
  const { readdirSync } = require('node:fs');
  const files = readdirSync(FEEDBACK_DIR).filter((f: string) => f.endsWith('.json'));

  return files
    .map((f: string) => JSON.parse(readFileSync(join(FEEDBACK_DIR, f), 'utf-8')) as UserFeedback)
    .filter((fb: UserFeedback) => !runId || fb.runId === runId)
    .sort((a: UserFeedback, b: UserFeedback) => b.timestamp.localeCompare(a.timestamp));
}

export function resolveFeedback(id: string): void {
  const file = join(FEEDBACK_DIR, `${id}.json`);
  if (!existsSync(file)) return;
  const fb = JSON.parse(readFileSync(file, 'utf-8'));
  fb.resolved = true;
  writeFileSync(file, JSON.stringify(fb, null, 2));
}

/**
 * Build feedback summary for Director context.
 * Includes unresolved feedback from past runs so the agent can learn.
 */
export function buildFeedbackContext(): string {
  const unresolved = listFeedback().filter(fb => !fb.resolved).slice(0, 10);
  if (unresolved.length === 0) return '';

  const lines = ['## User Feedback (unresolved)'];
  for (const fb of unresolved) {
    lines.push(`- [${fb.type}] ${fb.message}${fb.context?.team ? ` (team: ${fb.context.team})` : ''}`);
  }
  return lines.join('\n');
}
