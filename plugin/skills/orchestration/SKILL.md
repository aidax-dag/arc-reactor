---
name: arc-reactor-orchestration
description: Multi-team orchestration patterns for Arc-Reactor — use when coordinating parallel AI agent teams for product development
---

# Arc-Reactor Orchestration Patterns

## Wave Execution Pattern

Tasks are grouped into waves based on dependencies:

1. **Wave 1 (Parallel)**: Independent tasks run simultaneously (e.g., Frontend + Backend)
2. **Checkpoint**: Verify Wave 1 results, retry failures
3. **Wave 2 (Dependent)**: Tasks that need Wave 1 outputs (e.g., QA tests)

## Quality Gate

After all waves complete:
- Code Generation Check: did each team produce files?
- Test Execution: do tests pass?
- Conflict Check: did teams modify the same files?

## Feature Decomposition

Products are composed of atomic Features. Each Feature is a complete vertical slice:
- Planning: user scenarios, data requirements, constraints
- Frontend: UI components and interactions
- Backend: API endpoints and business logic
- Database: schema and queries
- Protocols: API contracts between layers
- Tests: validation strategy
