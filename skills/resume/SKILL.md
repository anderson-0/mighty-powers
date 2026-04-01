---
name: resume
description: Resume an interrupted implementation plan from where it stopped. Use when a session crashed, or when restarting work on an in-progress plan. Can auto-detect or be pointed to a specific plan folder.
---

# Resume Interrupted Plan

Reads an in-progress plan's `status.yaml` and task files to reconstruct full execution context, then resumes from the exact point of interruption — same wave, same task, same context each subagent needs.

## How to Trigger

```
/resume                           # auto-detect: scans docs/plans/*/ for in-progress plans
/resume docs/plans/webhook-retry  # point to specific plan folder
```

## Process

### Step 1: Find the Plan

**If a path was provided:** Read `status.yaml` from that directory.

**If no path provided:** Scan for in-progress plans:

```bash
find docs/plans -name "status.yaml" -maxdepth 2
```

For each found `status.yaml`, read and check `status: in_progress`. If multiple in-progress plans exist, list them and ask the user which one to resume.

If no in-progress plans found:
> "No in-progress plans found in `docs/plans/`. Nothing to resume."

### Step 2: Assess State

Read the `status.yaml` and build a status report:

```
Plan: <feature name>
Status: Wave <N> in progress
Last updated: <timestamp>

Wave Progress:
  Wave 1: ✓ completed (3/3 tasks, checkpoint passed)
  Wave 2: ◐ in progress
    Task 2.1: ✓ completed
    Task 2.2: ◑ in progress (was running when session ended)
    Task 2.3: ○ pending
  Wave 3: ○ pending (2 tasks)
```

Present this to the user and ask:

> "What would you like to do?"

Options:
- **Resume from task 2.2** — Read the task file, check what was already done (git diff since wave start), continue from where it left off
- **Restart wave 2** — Re-dispatch all wave 2 tasks from scratch (useful if the in-progress task left things in a bad state)
- **Restart entire plan** — Reset all statuses to pending (nuclear option)
- **Abandon this plan** — Mark `status.yaml` as `status: abandoned` so it won't be detected by session-start again. The plan files stay on disk for reference but won't trigger resume prompts.

### Step 3: Reconstruct Context

For the task being resumed, reconstruct full context by reading:

1. **The plan file** (`plan.md`) — for overall goal, architecture, tech stack
2. **The wave file** (`wave-N/wave.md`) — for wave dependencies and checkpoint criteria
3. **The task file** (`wave-N/task-N.M.md`) — for full task spec with steps, files, code
4. **Files listed in `context_files`** in status.yaml — source files the task touches
5. **Git state** — check what changes exist since the wave started:
   ```bash
   git log --oneline --since="<wave_started_at>"
   git diff --stat
   git status
   ```

### Step 4: Resume Execution

**For an in-progress task:**
1. Check which steps in the task file are already done (look for created/modified files, passing tests)
2. Mark completed steps as done in the task file
3. Continue from the first incomplete step
4. Use `mighty-powers:test-driven-development` during execution
5. When task completes, update `status.yaml`

**For remaining tasks in the wave:**
1. After the resumed task completes, check if other tasks in the wave are still pending
2. Dispatch pending tasks as parallel subagents (same as normal wave execution)
3. Run wave checkpoint when all tasks complete

**For remaining waves:**
1. Continue normal wave-by-wave execution per `mighty-powers:executing-plans`
2. Update `status.yaml` after each task and wave

### Step 5: Status Updates

After EVERY state change, update `status.yaml`:
- Task starts → status: in_progress, started_at: <now>
- Task completes → status: completed, completed_at: <now>
- Wave checkpoint passes → wave status: completed, checkpoint.tests_passed: true
- Wave checkpoint fails → wave status: failed, checkpoint.tests_passed: false
- All waves done → top-level status: completed

## Status File Format

```yaml
feature: <feature-name>
created: <ISO timestamp>
last_updated: <ISO timestamp>
plan_file: <path to plan.md>
plan_type: small | medium  # small = single plan.md, medium = wave folders
current_wave: <number>
status: pending | in_progress | completed | failed | abandoned

waves:
  1:
    status: pending | in_progress | completed | failed
    started_at: <ISO timestamp>
    completed_at: <ISO timestamp>
    checkpoint:
      tests_passed: true | false
      test_command: "<command>"
      test_output_summary: "<summary>"
    tasks:
      1.1:
        status: pending | in_progress | completed | failed
        started_at: <ISO timestamp>
        completed_at: <ISO timestamp>
        assigned_model: haiku | sonnet | opus
        context_files:
          - <path to files this task reads/writes>
      1.2:
        status: pending
      # ...

  2:
    status: pending
    tasks:
      2.1:
        status: pending
      # ...
```

## Small Plan Format (no wave folders)

For small plans where everything is in one `plan.md` file, the status.yaml still tracks waves and tasks — they just reference sections in the plan file instead of separate files:

```yaml
feature: fix-auth-bug
plan_file: docs/plans/fix-auth-bug/plan.md
plan_type: small
current_wave: 1
status: in_progress

waves:
  1:
    status: in_progress
    tasks:
      1.1:
        status: completed
        section: "## Wave 1 / ### Task 1.1"
      1.2:
        status: in_progress
        section: "## Wave 1 / ### Task 1.2"
```

## Edge Cases

**Dirty git state from crashed session:**
- Check `git status` for uncommitted changes
- If changes exist, ask user: "Found uncommitted changes from the interrupted session. Commit them, stash them, or discard?"
- Never discard without explicit confirmation

**Task left in broken state:**
- If tests fail for the in-progress task's existing changes, offer:
  - Fix the issues and continue
  - Revert the task's changes and restart it
  - Ask user for guidance

**Status file corrupted or missing:**
- If `status.yaml` is missing but plan files exist, reconstruct state from git history and file existence
- If `status.yaml` is corrupt, ask user how to proceed

## Integration

This skill is used by:
- `/resume` command — explicit trigger
- `session-start.sh` hook — auto-detection at session start (suggests `/resume` if in-progress plan found)
- `mighty-powers:executing-plans` — creates and maintains status.yaml during execution
- `mighty-powers:writing-plans` — creates initial status.yaml when plan is saved
