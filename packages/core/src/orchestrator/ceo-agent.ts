import Anthropic from '@anthropic-ai/sdk';
import type { ExecutionPlan } from '../types/task.js';
import type { ArcReactorConfig } from '../types/config.js';
import { parseExecutionPlan } from './task-decomposer.js';

const CEO_SYSTEM_PROMPT = `You are the CEO Agent of Arc-Reactor, an AI orchestration engine.

Given a goal, analyze it and produce a structured execution plan.

## Rules
- Decompose the goal into discrete tasks assignable to: frontend, backend, or qa
- Frontend and backend tasks can often run in parallel
- QA tasks should depend on the tasks they test
- Each task description must be detailed enough to implement without clarification
- Include acceptance criteria for every task

## Output
Call the submit_plan tool with the execution plan.`;

const SUBMIT_PLAN_TOOL: Anthropic.Tool = {
  name: 'submit_plan',
  description: 'Submit the execution plan with analyzed goal, tasks, and waves',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: { type: 'string', description: 'One-line summary of what needs to be built' },
      components: {
        type: 'array', items: { type: 'string' },
        description: 'Identified components to build',
      },
      concerns: {
        type: 'array', items: { type: 'string' },
        description: 'Cross-cutting concerns',
      },
      constraints: {
        type: 'array', items: { type: 'string' },
        description: 'Detected constraints',
      },
      estimatedComplexity: {
        type: 'string', enum: ['simple', 'medium', 'complex'],
      },
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            team: { type: 'string', enum: ['frontend', 'backend', 'qa'] },
            dependencies: { type: 'array', items: { type: 'string' } },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            acceptanceCriteria: { type: 'array', items: { type: 'string' } },
          },
          required: ['id', 'title', 'description', 'team', 'dependencies', 'priority', 'acceptanceCriteria'],
        },
      },
    },
    required: ['summary', 'components', 'estimatedComplexity', 'tasks'],
  },
};

export class CEOAgent {
  private client: Anthropic;
  private config: ArcReactorConfig;

  constructor(config: ArcReactorConfig) {
    this.config = config;
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async analyze(goal: string): Promise<ExecutionPlan> {
    const response = await this.client.messages.create({
      model: this.config.ceoModel,
      max_tokens: 4096,
      system: CEO_SYSTEM_PROMPT,
      tools: [SUBMIT_PLAN_TOOL],
      tool_choice: { type: 'tool', name: 'submit_plan' },
      messages: [{ role: 'user', content: `Goal: ${goal}` }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUse) {
      throw new Error('CEO Agent did not return a plan. Try rephrasing your goal.');
    }

    return parseExecutionPlan(goal, toolUse.input as Record<string, unknown>);
  }
}
