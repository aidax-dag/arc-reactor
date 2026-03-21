import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { Team } from '../types/team.js';
import type { TeamType } from '../types/task.js';

const CUSTOM_DIR = join(homedir(), '.arc-reactor', 'teams');

/**
 * Load custom team overrides from ~/.arc-reactor/teams/{team-type}.json
 *
 * File format:
 * {
 *   "systemPrompt": "Custom system prompt...",
 *   "capabilities": ["custom capability 1", "custom capability 2"]
 * }
 */
export function loadCustomTeam(type: TeamType): Partial<Team> | null {
  const filePath = join(CUSTOM_DIR, `${type}.json`);
  if (!existsSync(filePath)) return null;

  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Apply custom overrides to a team definition.
 * Custom fields override defaults, but type and name are preserved.
 */
export function applyCustomOverrides(team: Team): Team {
  const custom = loadCustomTeam(team.type);
  if (!custom) return team;

  return {
    ...team,
    systemPrompt: custom.systemPrompt || team.systemPrompt,
    capabilities: custom.capabilities || team.capabilities,
  };
}

/**
 * Save a custom team override.
 */
export function saveCustomTeam(type: TeamType, overrides: { systemPrompt?: string; capabilities?: string[] }): void {
  if (!existsSync(CUSTOM_DIR)) mkdirSync(CUSTOM_DIR, { recursive: true });
  const filePath = join(CUSTOM_DIR, `${type}.json`);

  const existing = loadCustomTeam(type) || {};
  const merged = { ...existing, ...overrides };
  writeFileSync(filePath, JSON.stringify(merged, null, 2));
}

/**
 * List all customized teams.
 */
export function listCustomTeams(): { type: string; hasCustomPrompt: boolean; hasCustomCapabilities: boolean }[] {
  if (!existsSync(CUSTOM_DIR)) return [];

  return readdirSync(CUSTOM_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const type = f.replace('.json', '');
      const custom = loadCustomTeam(type as TeamType);
      return {
        type,
        hasCustomPrompt: !!custom?.systemPrompt,
        hasCustomCapabilities: !!custom?.capabilities,
      };
    });
}

/**
 * Reset a team to defaults by removing the custom file.
 */
export function resetCustomTeam(type: TeamType): void {
  const filePath = join(CUSTOM_DIR, `${type}.json`);
  if (existsSync(filePath)) {
    const { unlinkSync } = require('node:fs');
    unlinkSync(filePath);
  }
}
