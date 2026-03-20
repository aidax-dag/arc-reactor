---
description: "Start Arc-Reactor orchestration — decomposes a goal into team tasks and executes in parallel"
---

# Arc-Reactor Orchestration

Execute a goal by decomposing it into team-specific tasks and running them in parallel.

## Usage

/arc-reactor <goal description>

## Process

1. **CEO Agent** analyzes the goal and identifies Features
2. **Task Decomposer** breaks Features into team-specific tasks
3. **Dependency Analyzer** determines execution waves
4. **Wave Executor** runs tasks in parallel (Wave → Checkpoint → Wave)
5. **Quality Gate** validates results (code generated, tests pass, no conflicts)

## Example

/arc-reactor "Build a login page with email/password authentication"
