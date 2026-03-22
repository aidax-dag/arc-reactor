import Anthropic from '@anthropic-ai/sdk';
import { execFileSync } from 'node:child_process';
import type { ExecutionPlan } from '../types/task.js';
import type { ArcReactorConfig } from '../types/config.js';
import { parseExecutionPlan } from './task-decomposer.js';

const DIRECTOR_SYSTEM_PROMPT = `You are the Director of Arc-Reactor, an AI orchestration engine.

Given a goal, analyze it and produce a structured execution plan.

## Workflow
1. Break the goal into atomic planning-level Features (e.g., "Social Login", "User Profile")
2. For each Feature, identify if it can be decomposed into implementation-level Features
   (e.g., "Social Login" → "sign-up-by-google", "sign-up-by-apple", etc.)
3. Create team-specific tasks for each implementation Feature
4. Determine dependencies and execution waves

## Feature Identification
Each feature should have:
- A unique featureId (kebab-case, e.g., "sign-up-by-google")
- A type: "planning" (high-level) or "dev" (implementation-level)
- Background: why this feature exists
- Purpose: what it achieves

## Rules
- Decompose into tasks assignable to: frontend, backend, qa, design, devops, security, docs, or product
- Frontend and backend tasks can often run in parallel
- QA tasks should depend on the tasks they test
- Each task description must be detailed enough to implement without clarification
- Include acceptance criteria for every task
- Include featureId in each task for Vibranium tracking

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
            team: { type: 'string', enum: ['frontend', 'backend', 'qa', 'design', 'devops', 'security', 'docs', 'product'] },
            featureId: { type: 'string', description: 'Kebab-case feature ID for tracking' },
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

const DIRECTOR_SUBAGENT_PROMPT = `${DIRECTOR_SYSTEM_PROMPT}

You MUST respond with ONLY a valid JSON object (no markdown, no explanation, no code fences).
The JSON must have these fields:
- summary (string)
- components (string array)
- concerns (string array)
- constraints (string array)
- estimatedComplexity ("simple" | "medium" | "complex")
- tasks (array of objects with: id, title, description, team, dependencies, priority, acceptanceCriteria)`;

export class Director {
  private config: ArcReactorConfig;
  private client?: Anthropic;

  constructor(config: ArcReactorConfig) {
    this.config = config;
    if (config.mode === 'api' || config.mode === 'auto') {
      this.client = config.apiKey ? new Anthropic({ apiKey: config.apiKey }) : new Anthropic();
    }
  }

  async analyze(goal: string): Promise<ExecutionPlan> {
    if (this.config.mode === 'subagent') {
      return this.analyzeViaSubagent(goal);
    }
    return this.analyzeViaAPI(goal);
  }

  private async analyzeViaAPI(goal: string): Promise<ExecutionPlan> {
    if (!this.client) {
      this.client = this.config.apiKey ? new Anthropic({ apiKey: this.config.apiKey }) : new Anthropic();
    }

    const response = await this.client.messages.create({
      model: this.config.directorModel,
      max_tokens: 4096,
      system: DIRECTOR_SYSTEM_PROMPT,
      tools: [SUBMIT_PLAN_TOOL],
      tool_choice: { type: 'tool', name: 'submit_plan' },
      messages: [{ role: 'user', content: `Goal: ${goal}` }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUse) {
      throw new Error('Director did not return a plan. Try rephrasing your goal.');
    }

    return parseExecutionPlan(goal, toolUse.input as Record<string, unknown>);
  }

  private async analyzeViaSubagent(goal: string): Promise<ExecutionPlan> {
    const prompt = `Goal: ${goal}\n\nRespond with ONLY the JSON execution plan.`;

    const stdout = execFileSync('claude', [
      '--print',
      '--system-prompt', DIRECTOR_SUBAGENT_PROMPT,
      prompt,
    ], {
      encoding: 'utf-8',
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    // Extract JSON from response (handle possible markdown fences)
    let jsonStr = stdout.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Director returned invalid JSON. Output:\n${stdout.slice(0, 500)}`);
    }

    return parseExecutionPlan(goal, raw);
  }
}
