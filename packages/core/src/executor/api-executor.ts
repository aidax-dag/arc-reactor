import Anthropic from '@anthropic-ai/sdk';
import type { Executor } from './executor.js';
import type { Task, TaskResult, ExecutionContext, FileChange } from '../types/task.js';
import type { Team } from '../types/team.js';
import type { ArcReactorConfig } from '../types/config.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SUBMIT_RESULT_TOOL: Anthropic.Tool = {
  name: 'submit_result',
  description: 'Submit the completed task result with all file changes',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: { type: 'string' },
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            action: { type: 'string', enum: ['create', 'modify', 'delete'] },
            content: { type: 'string' },
          },
          required: ['path', 'action'],
        },
      },
    },
    required: ['summary', 'files'],
  },
};

export class APIExecutor implements Executor {
  private client: Anthropic;
  private config: ArcReactorConfig;

  constructor(config: ArcReactorConfig) {
    this.config = config;
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async execute(task: Task, team: Team, context: ExecutionContext): Promise<TaskResult> {
    const userMessage = this.buildTaskPrompt(task, context);

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 8192,
      system: team.systemPrompt,
      tools: [SUBMIT_RESULT_TOOL],
      tool_choice: { type: 'tool', name: 'submit_result' },
      messages: [{ role: 'user', content: userMessage }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUse) {
      return {
        taskId: task.id,
        status: 'failure',
        outputs: [],
        summary: 'Agent did not return structured output',
        errors: ['No submit_result tool call in response'],
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      };
    }

    const result = toolUse.input as { summary: string; files: FileChange[] };

    for (const file of result.files) {
      if (file.action === 'delete' || !file.content) continue;
      const fullPath = join(context.projectRoot, file.path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, file.content, 'utf-8');
    }

    return {
      taskId: task.id,
      status: 'success',
      outputs: result.files,
      summary: result.summary,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  private buildTaskPrompt(task: Task, context: ExecutionContext): string {
    let prompt = `## Task: ${task.title}\n\n${task.description}\n\n`;
    prompt += `## Acceptance Criteria\n`;
    task.acceptanceCriteria.forEach(c => { prompt += `- ${c}\n`; });

    if (context.priorFilePaths.length > 0) {
      prompt += `\n## Prior Work (files from previous teams)\n`;
      context.priorFilePaths.forEach(p => { prompt += `- ${p}\n`; });
    }

    return prompt;
  }
}
