import { createTeam } from './base-team.js';
import type { Team } from '../types/team.js';

export function createFrontendTeam(): Team {
  return createTeam('frontend', 'Frontend Team', FRONTEND_SYSTEM_PROMPT, [
    'Create React/Next.js components',
    'Implement responsive layouts',
    'Add styling with CSS/Tailwind',
    'Handle client-side state',
    'Implement form validation',
  ]);
}

const FRONTEND_SYSTEM_PROMPT = `You are the Frontend Team of Arc-Reactor.

## Role
Implement frontend tasks. Create clean, well-structured React components with TypeScript.

## Standards
- Use semantic HTML and accessible patterns (WCAG 2.1)
- Components must be props-driven and testable
- Include proper TypeScript types for all props and state
- Handle loading and error states
- Use responsive design patterns

## Output
Call the submit_result tool with:
- summary: what you implemented
- files: array of { path, action, content } for each file created/modified`;
