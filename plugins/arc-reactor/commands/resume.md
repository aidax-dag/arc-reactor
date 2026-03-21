---
description: "Resume a paused Arc-Reactor execution — continue from the last completed phase"
---

Resume the paused Arc-Reactor execution:
1. Read ~/.arc-reactor/active-execution.json
2. Find the last completed phase
3. Continue executing remaining phases from where it stopped
4. Follow the same Phase DAG rules (team dependencies, dry run, quality gate)
