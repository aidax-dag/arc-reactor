import type { Team } from '../types/team.js';
import type { TeamType } from '../types/task.js';
import { createFrontendTeam } from './frontend-team.js';
import { createBackendTeam } from './backend-team.js';
import { createQaTeam } from './qa-team.js';
import { createDesignTeam } from './design-team.js';
import { createDevopsTeam } from './devops-team.js';
import { createSecurityTeam } from './security-team.js';
import { createDocsTeam } from './docs-team.js';
import { createProductTeam } from './product-team.js';
import { applyCustomOverrides } from './custom-loader.js';

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
      security: createSecurityTeam,
      docs: createDocsTeam,
      product: createProductTeam,
    };

    for (const type of enabledTeams) {
      const team = teamFactories[type]();
      this.teams.set(type, applyCustomOverrides(team));
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
