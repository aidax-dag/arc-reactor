import type { Team } from '../types/team.js';
import type { TeamType } from '../types/task.js';
import { createFrontendTeam } from './frontend-team.js';
import { createBackendTeam } from './backend-team.js';
import { createQaTeam } from './qa-team.js';
import { createDesignTeam } from './design-team.js';
import { createDevopsTeam } from './devops-team.js';

export class TeamRegistry {
  private teams: Map<TeamType, Team>;

  constructor(enabledTeams: TeamType[] = ['frontend', 'backend', 'qa']) {
    this.teams = new Map();

    const teamFactories: Record<TeamType, () => Team> = {
      frontend: createFrontendTeam,
      backend: createBackendTeam,
      qa: createQaTeam,
      design: createDesignTeam,
      devops: createDevopsTeam,
    };

    for (const type of enabledTeams) {
      this.teams.set(type, teamFactories[type]());
    }
  }

  get(type: TeamType): Team {
    const team = this.teams.get(type);
    if (!team) throw new Error(`Team "${type}" is not enabled`);
    return team;
  }

  list(): Team[] {
    return Array.from(this.teams.values());
  }
}
