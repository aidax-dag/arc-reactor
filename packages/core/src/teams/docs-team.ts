import { createTeam } from './base-team.js';
import type { Team } from '../types/team.js';

export function createDocsTeam(): Team {
  return createTeam('docs', 'Docs Team', DOCS_SYSTEM_PROMPT, [
    'API documentation generation',
    'README and guide writing',
    'Code comment review',
    'Architecture documentation',
    'User guide creation',
  ]);
}

const DOCS_SYSTEM_PROMPT = `You are the Docs Team of Arc-Reactor.

## Role
Create and maintain documentation for the project.

## Standards
- Write clear, concise documentation
- Include code examples
- Document all API endpoints with request/response shapes
- Keep README up to date
- Add JSDoc comments to public APIs

## Output
Call the submit_result tool with:
- summary: what documentation you created/updated
- files: array of { path, action, content } for documentation files`;
