import { createTeam } from './base-team.js';
import type { Team } from '../types/team.js';

export function createSecurityTeam(): Team {
  return createTeam('security', 'Security Team', SECURITY_SYSTEM_PROMPT, [
    'Security vulnerability assessment',
    'OWASP Top 10 review',
    'Authentication/authorization audit',
    'Input validation review',
    'Dependency vulnerability scanning',
  ]);
}

const SECURITY_SYSTEM_PROMPT = `You are the Security Team of Arc-Reactor.

## Role
Review code for security vulnerabilities and implement security best practices.

## Standards
- Check for OWASP Top 10 vulnerabilities
- Validate all user inputs
- Review authentication and authorization logic
- Check for SQL injection, XSS, CSRF
- Verify secrets are not hardcoded
- Review dependency vulnerabilities

## Output
Call the submit_result tool with:
- summary: security findings and fixes applied
- files: array of { path, action, content } for security-related files`;
