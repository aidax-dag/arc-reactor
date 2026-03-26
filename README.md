# Arc-Reactor

> AI Company OS — one core system that powers all agent teams simultaneously.

Arc-Reactor is a multi-team AI orchestration engine that decomposes high-level goals into team-specific tasks, executes them in parallel, and validates results through quality gates.

Inspired by Iron Man's Arc Reactor — a single power source that runs everything.

## How It Works

```
You: "Build a login page with email/password auth"
         │
         ▼
    Director (Opus)
    ├── Analyzes goal
    ├── Identifies features (planning → dev-level)
    └── Creates execution plan with waves
         │
         ▼
    Architect Agent
    └── Reviews plan for cross-cutting concerns
         │
         ▼
    Wave 1 (parallel)
    ├── [Frontend] Login form component
    ├── [Backend]  Auth API endpoint
    └── [Design]   Login page design tokens
         │
         ▼
    Wave 2 (parallel)
    ├── [QA]       E2E tests for login flow
    ├── [Security] Auth vulnerability review
    └── [Docs]     API documentation
         │
         ▼
    Quality Gate
    ├── Code generated?  ✅
    ├── Tests passing?   ✅
    └── No conflicts?    ✅
         │
         ▼
    Git Workflow (optional)
    ├── Create feature branch
    ├── Auto-commit results
    └── Push & create PR
         │
         ▼
    ✅ Done — files created, tests passing
```

## Quick Start

```bash
# From your project directory
cd my-project

# Run with Claude Code subscription (default — subagent mode)
node /path/to/arc-reactor/packages/cli/dist/index.js ignite "Build a todo app"

# Or with API key
ANTHROPIC_API_KEY=sk-... node /path/to/arc-reactor/packages/cli/dist/index.js ignite "Build a todo app" --mode api

# With git workflow
arc-reactor ignite "Build user profile" \
  --feature-id user-profile \
  --auto-branch \
  --auto-commit \
  --create-pr
```

## CLI Commands

### `arc-reactor ignite <goal>`

Start orchestration for a goal.

```bash
arc-reactor ignite "Build a login page with email/password auth"
arc-reactor ignite "Create a REST API for user management" --mode api
arc-reactor ignite "Build a dashboard" --teams frontend,backend,security
arc-reactor ignite "Add OAuth2" --feature-id oauth2 --auto-branch --auto-commit --create-pr
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--mode <mode>` | `subagent` (Claude CLI), `api` (API key), `auto` | `subagent` |
| `--teams <list>` | Comma-separated team list | `frontend,backend,qa` |
| `--verbose` | Enable verbose output | `false` |
| `--auto-branch` | Create a feature branch (`feature/{id}`) | `false` |
| `--auto-commit` | Auto-commit generated files after success | `false` |
| `--create-pr` | Push branch and create PR after commit | `false` |
| `--feature-id <id>` | Feature ID for branch naming and Vibranium tracking | — |

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
│   ├── core/               # Standalone orchestration engine
│   │   ├── orchestrator/   # Director, Architect, task decomposition, wave scheduling
│   │   ├── teams/          # 8 team definitions (Frontend, Backend, QA, Design, DevOps, Security, Docs, Product)
│   │   ├── executor/       # Dual executor: subagent (default) + API
│   │   ├── quality-gate/   # Code check, test runner, conflict detection
│   │   └── git-ops.ts      # Git workflow (branch, commit, push, PR)
│   └── cli/                # CLI wrapper (commander)
├── plugins/arc-reactor/    # Claude Code plugin (marketplace structure)
│   ├── agents/             # 10 agent definitions (Director, Architect, 8 teams)
│   └── hooks/              # Vibranium hook integration (6 hooks)
└── .mcp.json               # Vibranium MCP server config
```

### Execution Modes

| Mode | How | Cost | Requires |
|------|-----|------|----------|
| **subagent** (default) | Spawns `claude` CLI per task | Subscription included | Claude Code installed |
| **api** | Direct Anthropic SDK calls | API billing | `ANTHROPIC_API_KEY` |
| **auto** | Prefers subagent, falls back to API | — | Either |

### Teams (v0.5)

| Team | Specialization |
|------|---------------|
| **Frontend** | React/Next.js components, responsive UI, accessibility |
| **Backend** | REST APIs, auth, database, business logic |
| **QA** | Unit tests, E2E tests, edge cases |
| **Design** | Design tokens, component styling, responsive layouts |
| **DevOps** | CI/CD pipelines, Docker, deployment configs |
| **Security** | Vulnerability assessment, OWASP review, auth audit |
| **Docs** | API documentation, guides, architecture docs |
| **Product** | Requirements analysis, user stories, feature specs |

### Architect Agent

The Architect agent reviews the Director's execution plan before task dispatch:
- Cross-cutting concern identification
- Architecture consistency checks
- Dependency validation

### Git Workflow

Arc-Reactor can manage the full git lifecycle for generated code:

```bash
arc-reactor ignite "Add payment integration" \
  --feature-id payment \
  --auto-branch \     # Creates feature/payment branch
  --auto-commit \     # Commits all generated files
  --create-pr         # Pushes and opens a PR
```

Feature tracking with `--feature-id` flows through the entire pipeline — from Director planning to Vibranium hook sync.

### Vibranium Hook Integration

Arc-Reactor integrates with [Vibranium](../vibranium) through 5 Claude Code hooks:

| Hook | Trigger | Action |
|------|---------|--------|
| **SessionStart** | Session begins | Initialize Vibranium context |
| **UserPromptSubmit** | User sends prompt | Search Vibranium for related features |
| **PostToolUse** (Write/Edit) | File created/modified | Register feature in Vibranium |
| **PostToolUse** (Bash) | Bash command runs | Capture PR creation events |
| **Stop** | Session ends | Sync final state to Vibranium |

The `.mcp.json` at project root configures the Vibranium MCP server for direct tool access.

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
  "directorModel": "claude-opus-4-6",
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
- `arc-reactor-director` — Goal analysis and task decomposition (Opus)
- `arc-reactor-architect` — Architecture review and cross-cutting concerns (Opus)
- `arc-reactor-frontend` — UI implementation (Sonnet)
- `arc-reactor-backend` — API implementation (Sonnet)
- `arc-reactor-qa` — Test writing and validation (Sonnet)
- `arc-reactor-design` — Design tokens and styling (Sonnet)
- `arc-reactor-devops` — CI/CD and deployment (Sonnet)
- `arc-reactor-security` — Vulnerability assessment and auth audit (Opus)
- `arc-reactor-docs` — Documentation generation (Sonnet)
- `arc-reactor-product` — Requirements and feature specs (Opus)

## Evolution Path

| Version | Teams | Key Features |
|---------|-------|-------------|
| **v0.1** | Frontend, Backend, QA | Core orchestrator, dual executor, quality gate |
| **v0.2** | + Design, DevOps | Design tokens, deployment |
| **v0.3** | + Architect | Architect subagent, git workflow |
| **v0.5** ← current | + Security, Docs, Product | All 8 teams, Vibranium hooks, feature tracking |
| **v1.0** | All 8 teams | Web dashboard, long-term memory, feedback loops |

## Related

- [Design Spec](../docs/superpowers/specs/2026-03-20-arc-reactor-v0.1-design.md)
- [Feature Hub SaaS Spec](../docs/superpowers/specs/2026-03-20-feature-hub-design.md)
- [Roadmap](../docs/superpowers/plans/2026-03-21-arc-reactor-roadmap.md)

## License

MIT
