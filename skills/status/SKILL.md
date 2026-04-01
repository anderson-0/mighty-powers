---
name: status
description: Check the progress of an in-progress implementation plan without triggering resume. Reads status.yaml and shows where you are.
---

# Plan Status

Quick read-only check on plan progress. Does NOT resume or modify anything.

## How to Trigger

```
/status                           # auto-detect in docs/plans/*/
/status docs/plans/webhook-retry  # specific plan
```

## Process

### Step 1: Find Plans

**If a path was provided:** Read `status.yaml` from that directory.

**If no path provided:** Scan for all plans (any status):

```bash
find docs/plans -name "status.yaml" -maxdepth 2
```

### Step 2: Display Status

For each plan found, display a compact status card:

```
┌─────────────────────────────────────────────┐
│ webhook-retry-logic                         │
│ Status: IN PROGRESS   Wave: 2/3             │
│ Last updated: 2026-04-01 10:45              │
├─────────────────────────────────────────────┤
│ Wave 1  ✓ completed   3/3 tasks  checkpoint ✓│
│ Wave 2  ◐ in progress 1/3 tasks              │
│   2.1 ✓  2.2 ◑  2.3 ○                       │
│ Wave 3  ○ pending     2 tasks                │
├─────────────────────────────────────────────┤
│ Tip: Run /resume to continue                │
└─────────────────────────────────────────────┘
```

**Status icons:**
- ✓ completed
- ◑ in progress
- ○ pending
- ✗ failed
- ⊘ abandoned

### Step 3: Summary (if multiple plans)

If multiple plans exist, show a summary table:

```
Plans in docs/plans/:
  webhook-retry    IN PROGRESS  Wave 2/3   last updated 2h ago
  auth-refactor    COMPLETED    Wave 3/3   completed yesterday
  api-v2           ABANDONED    Wave 1/4   abandoned 3 days ago
  new-dashboard    PENDING      Wave 0/2   not started
```

## What This Does NOT Do

- Does not modify any files
- Does not start or resume execution
- Does not dispatch any subagents
- For resuming, use `/resume`
