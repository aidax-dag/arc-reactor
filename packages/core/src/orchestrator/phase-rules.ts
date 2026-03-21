/**
 * Phase execution rules for production-grade product development.
 *
 * These rules enforce the correct execution order between teams,
 * preventing conflicts and ensuring each team has the inputs it needs.
 *
 * See: docs/superpowers/specs/2026-03-21-arc-reactor-execution-phases.md
 */

import type { Task } from '../types/task.js';

/**
 * Phase definitions — each phase has a number and the team+role combinations it contains.
 * Tasks in earlier phases MUST complete before tasks in later phases start.
 */
export const PHASE_ORDER: Record<string, number> = {
  // Phase 1: Analysis & Design
  'product:analysis': 1,
  'architect:system': 1.1,
  'architect:module': 1.2,
  'design:ux': 1,

  // Phase 2: Data & Protocol Design
  'backend:db-design': 2,
  'backend:protocol': 2.1,
  'backend:mock-api': 2.2,
  'product:legal': 2,

  // Phase 3: Core Implementation
  'frontend:implement': 3,
  'backend:implement': 3,
  'devops:infra': 3,

  // Phase 3.5: Integration
  'qa:contract-test': 3.5,

  // Phase 4: Commercial Features
  'backend:payment': 4,
  'backend:email': 4,
  'backend:notification': 4,
  'frontend:analytics': 4,
  'frontend:seo': 4,
  'frontend:i18n': 4,

  // Phase 5: Operations Tools
  'backend:admin': 5,
  'backend:cs-tools': 5,
  'devops:backup': 5,

  // Phase 6: QA
  'qa:verify': 6,
  'qa:design-check': 6,
  'qa:payment-test': 6,
  'docs:api': 6,

  // Phase 7: Security
  'security:communication': 7,
  'security:auth': 7,
  'security:payment': 7,
  'security:data': 7,

  // Phase 8: Operations & Deploy
  'devops:monitoring': 8,
  'devops:cicd': 8,
  'devops:rollback': 8,
  'devops:ssl': 8,
  'devops:ratelimit': 8,
  'product:legal-deploy': 8,
  'docs:ops-guide': 8,
};

/**
 * Team-level dependency rules.
 * Maps team type to minimum required phase before it can execute.
 * This is a fallback when tasks don't have specific role tags.
 */
export const TEAM_MIN_PHASE: Record<string, number> = {
  product: 1,
  architect: 1,
  design: 1,
  backend: 2,     // Backend needs architecture done first
  frontend: 3,    // Frontend needs design + protocol done
  devops: 3,      // DevOps needs architecture done
  qa: 6,          // QA always after all implementation
  docs: 6,        // Docs after implementation
  security: 7,    // Security after QA
};

/**
 * Hard dependency rules between teams.
 * "teamA depends on teamB" means all teamB tasks must complete
 * before any teamA tasks start (unless overridden by task-level deps).
 */
export const TEAM_DEPENDENCIES: Record<string, string[]> = {
  architect: ['product'],
  design: ['product'],
  backend: ['architect'],
  frontend: ['design', 'backend'],   // Frontend needs design + backend protocol
  devops: ['architect'],
  qa: ['frontend', 'backend'],       // QA after all implementation
  docs: ['frontend', 'backend'],
  security: ['frontend', 'backend'], // Security after integration
};

/**
 * Assign a phase number to a task based on its team and context.
 */
export function getTaskPhase(task: Task): number {
  // Check if task has a specific phase tag in its description
  for (const [key, phase] of Object.entries(PHASE_ORDER)) {
    const [team, role] = key.split(':');
    if (task.team === team && task.description.toLowerCase().includes(role.replace('-', ' '))) {
      return phase;
    }
  }

  // Fallback to team-level phase
  return TEAM_MIN_PHASE[task.team] || 3;
}

/**
 * Enforce team dependencies on a task list.
 * Adds implicit dependencies so that team execution order is respected.
 */
export function enforceTeamDependencies(tasks: Task[]): Task[] {
  const tasksByTeam = new Map<string, string[]>();
  for (const task of tasks) {
    const existing = tasksByTeam.get(task.team) || [];
    existing.push(task.id);
    tasksByTeam.set(task.team, existing);
  }

  return tasks.map((task) => {
    const requiredTeams = TEAM_DEPENDENCIES[task.team] || [];
    const implicitDeps: string[] = [];

    for (const depTeam of requiredTeams) {
      const depTaskIds = tasksByTeam.get(depTeam) || [];
      for (const depId of depTaskIds) {
        if (!task.dependencies.includes(depId)) {
          implicitDeps.push(depId);
        }
      }
    }

    if (implicitDeps.length === 0) return task;

    return {
      ...task,
      dependencies: [...task.dependencies, ...implicitDeps],
    };
  });
}
