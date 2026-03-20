import type { Team } from '../types/team.js';
import type { TeamType } from '../types/task.js';

export function createTeam(
  type: TeamType,
  name: string,
  systemPrompt: string,
  capabilities: string[]
): Team {
  return { type, name, systemPrompt, capabilities };
}
