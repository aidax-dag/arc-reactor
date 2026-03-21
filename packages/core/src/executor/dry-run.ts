import Anthropic from '@anthropic-ai/sdk';
import { execFileSync } from 'node:child_process';
import type { Task, Wave } from '../types/task.js';
import type { Team } from '../types/team.js';
import type { ArcReactorConfig } from '../types/config.js';

/**
 * Dry Run: Before executing tasks in parallel, ask each team to declare
 * which files they plan to create/modify. Then check for conflicts and
 * re-order tasks to prevent simultaneous modification of the same file.
 */

export interface DryRunResult {
  taskId: string;
  plannedFiles: string[];
}

const DRY_RUN_TOOL: Anthropic.Tool = {
  name: 'declare_files',
  description: 'Declare the files you plan to create or modify for this task',
  input_schema: {
    type: 'object' as const,
    properties: {
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of file paths you will create or modify',
      },
    },
    required: ['files'],
  },
};

/**
 * Run dry-run for a single task via API.
 */
async function dryRunTaskAPI(task: Task, team: Team, config: ArcReactorConfig): Promise<DryRunResult> {
  const client = config.apiKey ? new Anthropic({ apiKey: config.apiKey }) : new Anthropic();

  const prompt = `You are about to implement this task. Do NOT implement it yet.
Instead, list ALL file paths you plan to create or modify.

Task: ${task.title}
${task.description}

Call the declare_files tool with the list of file paths.`;

  try {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 1024,
      system: team.systemPrompt,
      tools: [DRY_RUN_TOOL],
      tool_choice: { type: 'tool', name: 'declare_files' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    const files = (toolUse?.input as { files?: string[] })?.files || [];
    return { taskId: task.id, plannedFiles: files };
  } catch {
    return { taskId: task.id, plannedFiles: [] };
  }
}

/**
 * Run dry-run for a single task via Claude CLI subagent.
 */
async function dryRunTaskSubagent(task: Task, team: Team, cwd: string): Promise<DryRunResult> {
  const prompt = `List ONLY the file paths you would create or modify for this task. Output one path per line, nothing else.

Task: ${task.title}
${task.description}`;

  try {
    const stdout = execFileSync('claude', [
      '--print',
      '--system-prompt', `${team.systemPrompt}\n\nIMPORTANT: Do NOT create any files. Only list file paths, one per line.`,
      prompt,
    ], {
      cwd,
      encoding: 'utf-8',
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });

    const files = stdout.trim().split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.includes('/') || line.includes('.')))
      .map(line => line.replace(/^[-*•]\s*/, '').replace(/`/g, ''));

    return { taskId: task.id, plannedFiles: files };
  } catch {
    return { taskId: task.id, plannedFiles: [] };
  }
}

/**
 * Run dry-run for all tasks in a wave, detect file conflicts,
 * and split conflicting tasks into separate sequential waves.
 */
export async function dryRunWave(
  waveTasks: Task[],
  teams: Map<string, Team>,
  config: ArcReactorConfig,
  mode: 'api' | 'subagent',
): Promise<Wave[]> {
  if (waveTasks.length <= 1) {
    return [{ order: 1, taskIds: waveTasks.map(t => t.id) }];
  }

  // Run dry-run for all tasks in parallel
  const dryResults = await Promise.all(
    waveTasks.map(task => {
      const team = teams.get(task.team)!;
      if (mode === 'subagent') {
        return dryRunTaskSubagent(task, team, config.outputDir);
      }
      return dryRunTaskAPI(task, team, config);
    })
  );

  // Build file → task mapping
  const fileToTasks = new Map<string, string[]>();
  for (const result of dryResults) {
    for (const file of result.plannedFiles) {
      const normalized = file.toLowerCase();
      const existing = fileToTasks.get(normalized) || [];
      existing.push(result.taskId);
      fileToTasks.set(normalized, existing);
    }
  }

  // Find conflicts
  const conflicts = new Map<string, string[]>();
  for (const [file, taskIds] of fileToTasks) {
    if (taskIds.length > 1) {
      conflicts.set(file, taskIds);
    }
  }

  if (conflicts.size === 0) {
    // No conflicts — all tasks can run in parallel
    return [{ order: 1, taskIds: waveTasks.map(t => t.id) }];
  }

  // Split into non-conflicting groups using greedy coloring
  const taskConflicts = new Map<string, Set<string>>();
  for (const [, taskIds] of conflicts) {
    for (const a of taskIds) {
      for (const b of taskIds) {
        if (a === b) continue;
        if (!taskConflicts.has(a)) taskConflicts.set(a, new Set());
        if (!taskConflicts.has(b)) taskConflicts.set(b, new Set());
        taskConflicts.get(a)!.add(b);
        taskConflicts.get(b)!.add(a);
      }
    }
  }

  const groups: string[][] = [];
  const assigned = new Set<string>();

  for (const task of waveTasks) {
    if (assigned.has(task.id)) continue;

    // Find a group where this task has no conflicts
    let placed = false;
    for (const group of groups) {
      const hasConflict = group.some(
        gTaskId => taskConflicts.get(task.id)?.has(gTaskId)
      );
      if (!hasConflict) {
        group.push(task.id);
        assigned.add(task.id);
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push([task.id]);
      assigned.add(task.id);
    }
  }

  return groups.map((taskIds, i) => ({
    order: i + 1,
    taskIds,
  }));
}
