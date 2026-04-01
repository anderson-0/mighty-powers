---
name: create-epics
description: 'Break requirements into epics and user stories. Use when the user says "create the epics and stories list"'
---

Follow the instructions in ./workflow.md.

## After Epics Are Created — Transition to Implementation

When epics and stories are complete, guide the user to implementation:

> "Epics and stories are ready. For implementation, you have two paths:"
>
> **Story-by-story (recommended for most projects):**
> Use `mighty-powers:create-story` to prepare each story, then `mighty-powers:dev-story` to implement.
> Stories with 4+ independent tasks will offer parallel wave-based execution.
>
> **Full sprint pipeline:**
> Use `mighty-powers:sprint` to run the complete plan → build → test → review → ship → verify cycle.
> Each story becomes a wave-based plan with parallel subagent execution and status tracking.
> Session-resilient via `status.yaml` — if the IDE crashes, `/resume` picks up where you stopped.
