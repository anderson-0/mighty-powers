---
name: sprint
description: Sprint workflow pipeline — chains plan → build → test → review → ship → verify skills into a structured sprint. Use when starting a new feature or project iteration to follow the full lifecycle.
---

# Sprint Workflow Pipeline

A sprint is the full lifecycle of shipping a feature — from planning through deployment. This skill chains skills into a structured pipeline where each phase produces artifacts that feed the next.

**Announce at start:** "I'm using the sprint workflow to guide this feature from plan to ship."

## The Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  PLAN    │───▶│  BUILD   │───▶│  TEST    │───▶│  REVIEW  │───▶│  SHIP    │───▶│  VERIFY  │
│          │    │          │    │          │    │          │    │          │    │          │
│ /write-  │    │ /execute-│    │ TDD      │    │ /review  │    │ /deploy  │    │ /canary  │
│  plan    │    │  plan    │    │          │    │          │    │ /ship    │    │ /retro   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │                │               │               │               │               │
     ▼                ▼               ▼               ▼               ▼               ▼
  Plan doc       Working code    Tests pass     Issues fixed    Deployed         Verified
```

## Sprint Initialization

At the start of a sprint, create a `sprint-status.yaml` tracking file:

```yaml
generated: YYYY-MM-DD HH:MM
last_updated: YYYY-MM-DD HH:MM
project: <project name>
tracking_system: file-system

development_status:
  phase: PLAN
  current_task: ""
  tasks_completed: 0
  tasks_total: 0
```

Update this file as you progress through phases.

## Phase 1: Plan

**Trigger:** User describes a feature, requirement, or bug to fix.

1. If the scope is large, use **`mighty-powers:brainstorming`** first to explore the idea space
2. For complex multi-epic work, use the full lifecycle: **`mighty-powers:create-prd`** → **`mighty-powers:create-architecture`** → **`mighty-powers:create-epics`**
3. For single features, use **`mighty-powers:writing-plans`** to create an implementation plan

**Artifacts produced:** Implementation plan with file map, task list, test strategy

**Gate:** Plan must be reviewed and approved by user before proceeding to Build.

## Phase 2: Build

**Trigger:** Plan is approved.

1. Use **`mighty-powers:executing-plans`** to implement the plan task by task
2. If tasks are independent, use **`mighty-powers:dispatching-parallel-agents`** for parallel execution
3. If working in isolation, use **`mighty-powers:git-worktrees`** for a clean workspace
4. For story-based work, use **`mighty-powers:dev-story`**

**Artifacts produced:** Working code, committed to a feature branch

**Gate:** All planned tasks are implemented. Code compiles/runs without errors.

## Phase 3: Test

**Trigger:** Implementation is complete.

1. Use **`mighty-powers:test-driven-development`** to write tests for new code
2. Run the full test suite to catch regressions
3. If bugs are found, use **`mighty-powers:systematic-debugging`** to diagnose (not guess-and-fix)

**Artifacts produced:** Passing test suite, test coverage for new code

**Gate:** All tests pass. No known bugs in new code.

## Phase 4: Review

**Trigger:** Tests pass.

1. Use **`mighty-powers:code-review`** for comprehensive review
2. Run `/secure` for security scanning
3. Fix any high-confidence issues found

**Artifacts produced:** Review report, security scan results, fixes committed

**Gate:** No critical or high-severity issues remaining.

## Phase 5: Ship

**Trigger:** Review is clean.

1. Use **`mighty-powers:verification`** for final verification
2. Run `/ship` for the full pre-deploy scorecard
3. Use **`mighty-powers:finishing-branch`** to merge/PR

**Artifacts produced:** PR/merge to main, deploy to production

**Gate:** `/ship` scorecard is READY TO SHIP.

## Phase 6: Verify

**Trigger:** Deploy completes.

1. Run `/canary` to verify production health
2. If canary detects issues, escalate to `/rescue`
3. Save any deployment learnings via `/learn`
4. Run `/retro` at the end of the sprint to review overall progress

**Artifacts produced:** Canary report, learnings, retrospective

## Workflow Rules

1. **Never skip phases.** Each phase exists because skipping it causes problems.
2. **Gates are mandatory.** Don't proceed to the next phase until gate criteria are met.
3. **Artifacts chain forward.** Each phase's output is the next phase's input.
4. **The user decides pace.** Some sprints complete in an hour. Some take a week.
5. **Small batches.** Prefer shipping small features frequently over large features infrequently.

## Quick Sprint (for small changes)

For bug fixes or small features (< 50 lines of code), compress the pipeline:

1. **Investigate** → Use `/investigate` to find root cause
2. **Fix + Test** → Fix the bug, write a test
3. **Verify** → Run `/review`, check tests pass
4. **Ship** → Push and run `/canary`

## Sprint Status

Track progress by updating `sprint-status.yaml`. At any point, the user can ask "where are we?" and get:

```
Sprint: Add webhook retry logic
Phase: 3/6 — TEST
Status: 2 tests written, 1 failing (timeout issue in retry delay)
Next: Fix failing test, then proceed to REVIEW
```
