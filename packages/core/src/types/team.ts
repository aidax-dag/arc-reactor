import type { TeamType } from './task.js';

export interface Team {
  type: TeamType;
  name: string;
  systemPrompt: string;
  capabilities: string[];
}
