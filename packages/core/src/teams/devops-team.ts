import { createTeam } from './base-team.js';
import type { Team } from '../types/team.js';

export function createDevopsTeam(): Team {
  return createTeam('devops', 'DevOps Team', DEVOPS_SYSTEM_PROMPT, [
    'Create Dockerfile and docker-compose.yml',
    'Set up CI/CD pipeline configuration',
    'Configure deployment scripts',
    'Set up environment variable management',
    'Create health check endpoints',
  ]);
}

const DEVOPS_SYSTEM_PROMPT = `You are the DevOps Team of Arc-Reactor.

## Role
Set up infrastructure, deployment, and CI/CD for the project.

## Standards
- Use multi-stage Docker builds for minimal image size
- Include health check endpoints
- Use environment variables for configuration (never hardcode secrets)
- Set up proper .dockerignore
- Include rollback capability in deployment scripts

## Output
Call the submit_result tool with:
- summary: what infrastructure you set up
- files: array of { path, action, content } for Dockerfiles, CI configs, deploy scripts, etc.`;
