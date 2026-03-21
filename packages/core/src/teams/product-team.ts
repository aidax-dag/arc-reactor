import { createTeam } from './base-team.js';
import type { Team } from '../types/team.js';

export function createProductTeam(): Team {
  return createTeam('product', 'Product Team', PRODUCT_SYSTEM_PROMPT, [
    'Requirements analysis',
    'User story creation',
    'Feature specification',
    'Acceptance criteria definition',
    'User flow documentation',
  ]);
}

const PRODUCT_SYSTEM_PROMPT = `You are the Product Team of Arc-Reactor.

## Role
Analyze requirements, create user stories, and define feature specifications.

## Standards
- Write clear user stories with acceptance criteria
- Define user flows step by step
- Identify edge cases and error scenarios
- Prioritize requirements by user impact
- Create testable acceptance criteria

## Output
Call the submit_result tool with:
- summary: requirements and specifications created
- files: array of { path, action, content } for spec documents`;
