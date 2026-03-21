import type { ExecutionResult } from '../types/task.js';
import {
  saveGlobalPattern,
  saveProjectLearning,
  updateProjectContext,
  updatePreferences,
} from './memory-store.js';

/**
 * Extract learnings from a completed execution and save to memory.
 * Called automatically after each arc-reactor ignite run.
 */
export function learnFromExecution(projectPath: string, result: ExecutionResult): void {
  const { plan, results, qualityReport } = result;

  // 1. Learn from team successes/failures
  for (const taskResult of results) {
    const task = plan.tasks.find(t => t.id === taskResult.taskId);
    if (!task) continue;

    if (taskResult.status === 'failure') {
      const errorMsg = taskResult.errors?.[0] || 'Unknown error';

      // Save as global pattern
      saveGlobalPattern({
        type: 'failure',
        team: task.team,
        pattern: `Task "${task.title}" failed`,
        lesson: `Error: ${errorMsg.slice(0, 200)}. Consider adjusting the task description or dependencies.`,
        context: plan.goal,
      });

      // Save as project learning
      saveProjectLearning(projectPath, {
        type: 'failure',
        team: task.team,
        pattern: `${task.title} failed in this project`,
        lesson: errorMsg.slice(0, 200),
        context: plan.goal,
      });
    }
  }

  // 2. Learn from quality gate
  for (const check of qualityReport.checks) {
    if (!check.passed && check.severity !== 'warning') {
      saveGlobalPattern({
        type: 'failure',
        team: 'quality-gate',
        pattern: `Quality check "${check.name}" failed`,
        lesson: check.details.slice(0, 200),
        context: plan.goal,
      });
    }
  }

  // 3. Detect project tech stack from generated files
  const allFiles = results.flatMap(r => r.outputs.map(o => o.path));
  const techStack = detectTechStack(allFiles);
  const testRunner = detectTestRunner(allFiles);
  const conventions = detectConventions(allFiles);

  if (techStack.length > 0 || conventions.length > 0) {
    updateProjectContext(projectPath, {
      projectPath,
      techStack,
      architecture: detectArchitecture(allFiles),
      conventions,
      decisions: [],
    });
  }

  if (testRunner) {
    updatePreferences({ testRunner });
  }

  // 4. Learn successful patterns
  if (qualityReport.passed) {
    const teamNames = [...new Set(plan.tasks.map(t => t.team))];
    saveGlobalPattern({
      type: 'success',
      team: teamNames.join('+'),
      pattern: `Successfully completed: ${plan.analysis.summary || plan.goal}`,
      lesson: `Complexity: ${plan.estimatedComplexity}, Waves: ${plan.waves.length}, Teams: ${teamNames.join(', ')}`,
      context: plan.goal,
    });
  }
}

function detectTechStack(files: string[]): string[] {
  const stack: string[] = [];
  const paths = files.join(' ');

  if (paths.includes('.tsx') || paths.includes('.jsx')) stack.push('react');
  if (paths.includes('next.config')) stack.push('next.js');
  if (paths.includes('.ts')) stack.push('typescript');
  if (paths.includes('tailwind')) stack.push('tailwind');
  if (paths.includes('.vue')) stack.push('vue');
  if (paths.includes('.svelte')) stack.push('svelte');
  if (paths.includes('express') || paths.includes('app.ts')) stack.push('express');
  if (paths.includes('hono')) stack.push('hono');
  if (paths.includes('prisma')) stack.push('prisma');
  if (paths.includes('drizzle')) stack.push('drizzle');
  if (paths.includes('playwright')) stack.push('playwright');
  if (paths.includes('vitest')) stack.push('vitest');
  if (paths.includes('jest')) stack.push('jest');

  return [...new Set(stack)];
}

function detectTestRunner(files: string[]): string | undefined {
  const paths = files.join(' ');
  if (paths.includes('vitest')) return 'vitest';
  if (paths.includes('jest')) return 'jest';
  if (paths.includes('playwright')) return 'playwright';
  if (paths.includes('.test.')) return 'vitest'; // default guess
  return undefined;
}

function detectArchitecture(files: string[]): string {
  const paths = files.join(' ');
  if (paths.includes('packages/') || paths.includes('apps/')) return 'monorepo';
  if (paths.includes('services/') || paths.includes('microservice')) return 'microservices';
  return 'single';
}

function detectConventions(files: string[]): string[] {
  const conventions: string[] = [];
  const paths = files.join(' ');

  if (paths.includes('src/')) conventions.push('src/ directory structure');
  if (paths.includes('components/')) conventions.push('components/ directory');
  if (paths.includes('.test.tsx') || paths.includes('.test.ts')) conventions.push('co-located test files');
  if (paths.includes('tests/') || paths.includes('__tests__/')) conventions.push('separate test directory');

  return conventions;
}
