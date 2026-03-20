# Arc-Reactor

> AI Company OS — one core system that powers all agent teams simultaneously.

Arc-Reactor is a multi-team AI orchestration engine that decomposes high-level goals into team-specific tasks, executes them in parallel, and validates results through quality gates.

Inspired by Iron Man's Arc Reactor — a single power source that runs everything.

## How It Works

```
You: "Build a login page with email/password auth"
         │
         ▼
    CEO Agent
    ├── Analyzes goal
    ├── Identifies components
    └── Creates execution plan
         │
         ▼
    Wave 1 (parallel)
    ├── [Frontend] Login form component
    └── [Backend]  Auth API endpoint
         │
         ▼
    Wave 2
    └── [QA] E2E tests for login flow
         │
         ▼
    Quality Gate
    ├── Code generated?  ✅
    ├── Tests passing?   ✅
    └── No conflicts?    ✅
         │
         ▼
    ✅ Done — files created, tests passing
```

## Quick Start

```bash
# From your project directory
cd my-project

# Run with Claude Code subscription (default)
node /path/to/arc-reactor/packages/cli/dist/index.js ignite "Build a todo app"

# Or with API key
ANTHROPIC_API_KEY=sk-... node /path/to/arc-reactor/packages/cli/dist/index.js ignite "Build a todo app" --mode api
```

## CLI Commands

### `arc-reactor ignite <goal>`

Start orchestration for a goal.

```bash
arc-reactor ignite "Build a login page with email/password auth"
arc-reactor ignite "Create a REST API for user management" --mode api
arc-reactor ignite "Build a dashboard" --teams frontend,backend
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--mode <mode>` | `subagent` (Claude CLI), `api` (API key), `auto` | `subagent` |
| `--teams <list>` | Comma-separated team list | `frontend,backend,qa` |
| `--verbose` | Enable verbose output | `false` |

### `arc-reactor config`

Show or edit configuration.

```bash
arc-reactor config                          # Show current config
arc-reactor config --set model=claude-sonnet-4-6  # Set a value
```

## Architecture

```
arc-reactor/
├── packages/
│   ├── core/           # Standalone orchestration engine
│   │   ├── orchestrator/   # CEO Agent, task decomposition, wave scheduling
│   │   ├── teams/          # Frontend, Backend, QA team definitions
│   │   ├── executor/       # API executor + Claude CLI subagent executor
│   │   └── quality-gate/   # Code check, test runner, conflict detection
│   └── cli/            # CLI wrapper (commander)
└── plugin/             # Claude Code plugin (agents, commands, skills)
```

### Execution Modes

| Mode | How | Cost | Requires |
|------|-----|------|----------|
| **subagent** (default) | Spawns `claude` CLI per task | Subscription included | Claude Code installed |
| **api** | Direct Anthropic SDK calls | API billing | `ANTHROPIC_API_KEY` |
| **auto** | Prefers subagent, falls back to API | — | Either |

### Teams (v0.1)

| Team | Specialization |
|------|---------------|
| **Frontend** | React/Next.js components, responsive UI, accessibility |
| **Backend** | REST APIs, auth, database, business logic |
| **QA** | Unit tests, E2E tests, edge cases |

### Quality Gate

After execution, three checks run automatically:

1. **Code Generated** — Did each team produce files?
2. **Tests Pass** — Auto-detects Playwright/Vitest/Jest and runs tests
3. **No Conflicts** — Did multiple teams modify the same file?

## Configuration

Config is loaded with priority: CLI flags > `.arc-reactor.json` > `~/.arc-reactor/config.json` > defaults.

```json
{
  "mode": "subagent",
  "model": "claude-sonnet-4-6",
  "ceoModel": "claude-opus-4-6",
  "enabledTeams": ["frontend", "backend", "qa"],
  "maxTaskRetries": 1,
  "maxApiRetries": 3,
  "runTests": true,
  "maxTokensPerTask": 50000,
  "maxTotalTokens": 200000,
  "maxParallelTasks": 3,
  "verbose": false
}
```

## Claude Code Plugin

Arc-Reactor includes a Claude Code plugin for use within Claude Code sessions.

```bash
# Install as Claude Code plugin
claude plugin add /path/to/arc-reactor/plugin

# Use via slash command
/arc-reactor "Build a user profile page"
```

**Agents available:**
- `arc-reactor-ceo` — Goal analysis and task decomposition (Opus)
- `arc-reactor-frontend` — UI implementation (Sonnet)
- `arc-reactor-backend` — API implementation (Sonnet)
- `arc-reactor-qa` — Test writing and validation (Sonnet)

## Evolution Path

| Version | Teams | Key Features |
|---------|-------|-------------|
| **v0.1** ← current | Frontend, Backend, QA | Core orchestrator, dual executor, quality gate |
| **v0.2** | + Design, DevOps | Design tokens, deployment, git integration |
| **v0.3** | + Security, Docs, Product | Security scanning, docs, requirements analysis |
| **v0.5** | All 8 teams | Feature Hub integration, feature search/reuse |
| **v1.0** | All 8 teams | Web dashboard, long-term memory, feedback loops |

## Related

- [Design Spec](../docs/superpowers/specs/2026-03-20-arc-reactor-v0.1-design.md)
- [Feature Hub SaaS Spec](../docs/superpowers/specs/2026-03-20-feature-hub-design.md)
- [Roadmap](../docs/superpowers/plans/2026-03-21-arc-reactor-roadmap.md)

## License

MIT
