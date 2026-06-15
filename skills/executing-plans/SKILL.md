---
name: executing-plans
description: Use when you have a written implementation plan to execute, with wave-by-wave parallel dispatch and persistent status tracking for session resilience
---

# Executing Plans

## Overview

Load plan, review critically, execute wave-by-wave (parallel where tasks are independent, sequential where they're not), maintain status.yaml for session resilience, report when complete.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

**Note:** Tell your human partner that Mighty Powers works much better with access to subagents. The quality of its work will be significantly higher if run on a platform with subagent support (such as Claude Code or Codex). If subagents are available, use mp:subagent-driven-development instead of this skill.

## The Process

### Step 1: Load and Review Plan

1. Read the plan folder — `plan.md` + `status.yaml` + wave/task files if they exist
2. If `status.yaml` shows `status: in_progress`, this is a **resume**. Use `mp:resume` instead.
3. Review critically — identify any questions or concerns about the plan
4. If concerns: Raise them with your human partner before starting
5. If no concerns: Update `status.yaml` to `status: in_progress` and proceed

### Step 2: Execute Wave by Wave

<EXTREMELY-IMPORTANT>
MANDATORY: You MUST update `status.yaml` IMMEDIATELY after every state change. This is not optional. Do NOT proceed to the next action until the status file is written.

**After every subagent returns or task completes, your NEXT action MUST be updating status.yaml. Not reviewing output. Not dispatching the next task. Update status.yaml FIRST, then proceed.**

If the IDE crashes mid-execution, `/resume` reads this file to pick up exactly where we stopped. If you skip updates, all progress is lost on crash.

Update at EACH of these moments — no exceptions:
1. Wave starts → wave status: `in_progress`, `started_at`
2. Task dispatched → task status: `in_progress`, `started_at`, `assigned_model`
3. Task completes → task status: `completed`, `completed_at`
4. Task fails → task status: `failed`, error summary
5. Wave checkpoint done → `checkpoint.tests_passed`, wave status
6. All waves done → top-level status: `completed`
</EXTREMELY-IMPORTANT>

**For each wave:**

1. Update `status.yaml`: wave status → `in_progress`, `started_at` → now
2. Read all tasks in the wave and check the execution mode (annotated in the plan):
   - **Parallel tasks** (independent — different files, no shared state): dispatch as concurrent subagents via Agent tool (all in a single response)
   - **Sequential tasks** (shared files or ordering requirements): execute one at a time in order
   - **Mixed**: dispatch parallel group first, then sequential tasks after
   - **Single task**: just run it
3. For each subagent dispatched:
   - For waves with separate task files (> 5 tasks): each subagent reads its own task file (self-contained context)
   - For waves with inline tasks (≤ 5 tasks): subagent reads the wave's `wave.md` which contains all task definitions; point it to the specific task heading
   - For small plans (no wave folders): provide the task section content in the Agent prompt
   - Use appropriate model per task complexity (haiku/sonnet/opus)
4. As each task completes:
   - Update `status.yaml`: task status → `completed`, `completed_at` → now
5. After ALL tasks in the wave complete:
   - **Run the full test suite** (wave checkpoint)
   - Update `status.yaml`: wave checkpoint results
6. If tests fail:
   - Update `status.yaml`: wave `checkpoint.tests_passed` → false
   - Diagnose and fix before proceeding
7. If tests pass:
   - Update `status.yaml`: wave status → `completed`, `completed_at` → now
   - Proceed to next wave

**If no subagents available:** Execute tasks sequentially within the wave. Still update `status.yaml` after each task.

### Wave Isolation via Git Worktrees (optional)

Optional: Use `mp:git-worktrees` for wave-level isolation when waves have 3+ parallel tasks or rollback safety is needed. Default: no isolation.

Update these fields in `status.yaml` after every state change: wave status, task status, `started_at`, `completed_at`, checkpoint results. See `mp:resume` for the full YAML structure.

### Step 3: Complete Development

After all waves complete and verified:
1. Update `status.yaml`: top-level `status` → `completed`
2. Announce: "I'm using the finishing-branch skill to complete this work."
3. **REQUIRED SUB-SKILL:** Use mp:finishing-branch
4. Follow that skill to verify tests, present options, execute choice

## Subagent Dispatch Pattern

When dispatching parallel tasks in a wave, each subagent gets:

**For waves with separate task files (> 5 tasks in the wave):**
```
Agent tool:
  description: "Task 2.1: <component name>"
  model: <haiku|sonnet|opus based on complexity>
  prompt: |
    You are implementing a task from an implementation plan.
    Read and follow the task file at: <path to task-2.1.md>

    The task file contains everything you need: context, file paths,
    code, tests, and verification commands.

    Use TDD: write the failing test first, then implement, then verify.

    When done, report: what you implemented, which files you changed,
    and whether all tests pass.
```

**For waves with inline tasks (≤ 5 tasks in the wave):**
```
Agent tool:
  description: "Task 1.2: <component name>"
  model: <haiku|sonnet|opus>
  prompt: |
    You are implementing a task from an implementation plan.
    Read the wave file at: <path to wave-N/wave.md>
    Find and implement Task N.M in that file.

    The wave file contains all context, file paths, code, tests,
    and verification commands for this task.

    Use TDD: write the failing test first, then implement, then verify.

    When done, report: what you implemented, which files you changed,
    and whether all tests pass.
```

**For small plans (no wave folders, everything in plan.md):**
```
Agent tool:
  description: "Task 1.2: <component name>"
  model: <haiku|sonnet|opus>
  prompt: |
    You are implementing a task from an implementation plan.

    ## Context
    <paste project context, goal, architecture from plan.md>

    ## Your Task
    <paste the full task section from plan.md>

    Use TDD: write the failing test first, then implement, then verify.

    When done, report: what you implemented, which files you changed,
    and whether all tests pass.
```

## Just-in-Time Skill Loading

Load skills just before the work they support, not all at session start. Include only task-relevant skills in subagent prompts.

---

## Mandatory Verification Checklist

Do not mark `status: completed` until all applicable items pass. If any item fails, stop and fix before proceeding.

- [ ] **(task)** Tests pass, no TS errors or lint violations in modified files
- [ ] **(wave)** Full test suite passes (not just task tests)
- [ ] **(wave)** Coverage has not regressed from pre-wave baseline
- [ ] **(wave)** All plan-referenced files created or modified as specified
- [ ] **(final)** No TS errors or lint violations across entire project
- [ ] **(final)** Feature works end-to-end (not just unit tests)

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly
- Wave checkpoint fails twice after fixes

**Before stopping:** Update `status.yaml` with current state so `/resume` can pick up later.

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- **Update status.yaml IMMEDIATELY after every state change** — your NEXT action after a task completes MUST be writing status.yaml before doing anything else. This is non-negotiable.
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

**Required workflow skills:**
- **mp:git-worktrees** - REQUIRED: Set up isolated workspace before starting
- **mp:writing-plans** - Creates the plan this skill executes
- **mp:finishing-branch** - Complete development after all tasks
- **mp:resume** - Resume interrupted execution after session crash
