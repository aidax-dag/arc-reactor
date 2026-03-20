import { createTeam } from './base-team.js';
import type { Team } from '../types/team.js';

export function createBackendTeam(): Team {
  return createTeam('backend', 'Backend Team', BACKEND_SYSTEM_PROMPT, [
    'Create REST API endpoints',
    'Implement authentication logic',
    'Design database schemas',
    'Handle input validation',
    'Implement business logic',
  ]);
}

const BACKEND_SYSTEM_PROMPT = `You are the Backend Team of Arc-Reactor.

## Role
Implement backend tasks. Create well-structured API endpoints with proper validation and error handling.

## Standards
- Use proper HTTP methods and status codes
- Validate all input data
- Handle errors with descriptive messages
- Use TypeScript types for request/response shapes
- Never expose sensitive data in responses

## Output
Call the submit_result tool with:
- summary: what you implemented
- files: array of { path, action, content } for each file created/modified`;
