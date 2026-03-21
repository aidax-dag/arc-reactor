import type { ExecutionResult } from './types/task.js';
import type { ArcReactorConfig } from './types/config.js';

export type WebhookEvent = 'run_complete' | 'run_failed' | 'quality_gate_failed';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  runId: string;
  goal: string;
  projectId?: string;
  status: 'success' | 'failed';
  durationMs: number;
  totalTokensUsed: number;
  teamCount: number;
  fileCount: number;
  qualityGatePassed: boolean;
  summary: string;
}

function buildPayload(
  event: WebhookEvent,
  runId: string,
  result: ExecutionResult,
  config: ArcReactorConfig
): WebhookPayload {
  const files = result.results.flatMap(r => r.outputs);
  const teams = [...new Set(result.plan.tasks.map(t => t.team))];

  return {
    event,
    timestamp: new Date().toISOString(),
    runId,
    goal: result.plan.goal,
    projectId: config.projectId,
    status: result.qualityReport.passed ? 'success' : 'failed',
    durationMs: result.durationMs,
    totalTokensUsed: result.totalTokensUsed,
    teamCount: teams.length,
    fileCount: files.length,
    qualityGatePassed: result.qualityReport.passed,
    summary: result.qualityReport.summary,
  };
}

function formatSlackMessage(payload: WebhookPayload): object {
  const icon = payload.status === 'success' ? ':white_check_mark:' : ':x:';
  return {
    text: `${icon} Arc-Reactor: ${payload.goal}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${icon} *${payload.event}*\n*Goal:* ${payload.goal}\n*Status:* ${payload.status}\n*Duration:* ${Math.round(payload.durationMs / 1000)}s | *Tokens:* ${payload.totalTokensUsed.toLocaleString()} | *Files:* ${payload.fileCount}`,
        },
      },
    ],
  };
}

export async function sendNotification(
  event: WebhookEvent,
  runId: string,
  result: ExecutionResult,
  config: ArcReactorConfig
): Promise<void> {
  if (!config.webhookUrl) return;

  // Check if this event type is enabled
  const enabledEvents = config.webhookEvents || ['run_complete', 'run_failed'];
  if (!enabledEvents.includes(event)) return;

  const payload = buildPayload(event, runId, result, config);

  try {
    // Detect webhook type by URL
    const isSlack = config.webhookUrl.includes('hooks.slack.com');
    const isDiscord = config.webhookUrl.includes('discord.com/api/webhooks');

    let body: string;
    if (isSlack) {
      body = JSON.stringify(formatSlackMessage(payload));
    } else if (isDiscord) {
      const icon = payload.status === 'success' ? '✅' : '❌';
      body = JSON.stringify({
        content: `${icon} **Arc-Reactor ${payload.event}**\nGoal: ${payload.goal}\nStatus: ${payload.status} | ${Math.round(payload.durationMs / 1000)}s | ${payload.totalTokensUsed.toLocaleString()} tokens`,
      });
    } else {
      // Generic webhook — send full payload
      body = JSON.stringify(payload);
    }

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Notification failure should not block execution
  }
}
