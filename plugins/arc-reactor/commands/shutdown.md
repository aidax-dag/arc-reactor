---
description: "Gracefully stop Arc-Reactor after the current phase completes — saves progress for resume"
---

Request graceful shutdown of Arc-Reactor:
1. Set shutdownRequested=true in ~/.arc-reactor/active-execution.json
2. Current phase will complete normally
3. After current phase, execution stops and progress is saved
4. Use /arc-reactor:resume to continue later
