---
name: executing-plans
description: Use when you have a written implementation plan to execute, with wave-by-wave parallel dispatch and persistent status tracking for session resilience
---

# Executing Plans

## Overview

Load plan, review critically, execute wave-by-wave (parallel where tasks are independent, sequential where they're not), maintain status.yaml for session resilience, report when complete.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

**Note:** Tell your human partner that Mighty Powers works much better with access to subagents. The quality of its work will be significantly higher if run on a platform with subagent support (such as Claude Code or Codex). If subagents are available, use mighty-powers:subagent-driven-development instead of this skill.

## The Process

### Step 1: Load and Review Plan

1. Read the plan folder — `plan.md` + `status.yaml` + wave/task files if they exist
2. If `status.yaml` shows `status: in_progress`, this is a **resume**. Use `mighty-powers:resume` instead.
3. Review critically — identify any questions or concerns about the plan
4. If concerns: Raise them with your human partner before starting
5. If no concerns: Update `status.yaml` to `status: in_progress` and proceed

### Step 2: Execute Wave by Wave

<EXTREMELY-IMPORTANT>
After EVERY state change, update `status.yaml`. This is how we survive session crashes.
If the IDE crashes mid-execution, `/resume` reads this file to pick up exactly where we stopped.
</EXTREMELY-IMPORTANT>

**For each wave:**

1. Update `status.yaml`: wave status → `in_progress`, `started_at` → now
2. Read all tasks in the wave and check the execution mode (annotated in the plan):
   - **Parallel tasks** (independent — different files, no shared state): dispatch as concurrent subagents via Agent tool (all in a single response)
   - **Sequential tasks** (shared files or ordering requirements): execute one at a time in order
   - **Mixed**: dispatch parallel group first, then sequential tasks after
   - **Single task**: just run it
3. For each subagent dispatched:
   - For medium+ plans: each subagent reads its own task file (self-contained context)
   - For small plans: provide the task section content in the Agent prompt
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

For maximum safety, each wave can optionally execute in its own git worktree, providing true filesystem isolation between parallel subagents:

```
Main worktree:     wave-1 tasks run here (or in their own worktrees)
                        ↓ merge wave-1 results
Wave-2 worktree:   wave-2 tasks run in isolated copy
                        ↓ merge wave-2 results
Main worktree:     wave-3 tasks run on merged state
```

**When to use worktree isolation:**
- Wave has 3+ parallel tasks touching many files
- Tasks are complex enough that a bad implementation could corrupt the working tree
- You want rollback safety — discard a worktree to undo an entire wave

**How to use:**
1. Before dispatching a wave, create a worktree via `mighty-powers:git-worktrees`
2. Dispatch subagents to work in the worktree
3. After wave checkpoint passes, merge the worktree branch back
4. If checkpoint fails, you can discard the worktree and retry

**Default behavior:** No worktree isolation. Tasks run in the current working directory. Only enable if the user requests it or the wave is complex enough to warrant it.

**Status update pattern (run after every state change):**
```yaml
# Update the specific field in status.yaml
# Example: task 2.1 completed
waves:
  2:
    status: in_progress
    tasks:
      2.1:
        status: completed
        completed_at: "2026-04-01T10:40:00"
```

### Step 3: Complete Development

After all waves complete and verified:
1. Update `status.yaml`: top-level `status` → `completed`
2. Announce: "I'm using the finishing-branch skill to complete this work."
3. **REQUIRED SUB-SKILL:** Use mighty-powers:finishing-branch
4. Follow that skill to verify tests, present options, execute choice

## Subagent Dispatch Pattern

When dispatching parallel tasks in a wave, each subagent gets:

**For medium+ plans (separate task files):**
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

**For small plans (inline tasks):**
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

Load skills immediately before the work they inform — not all at once at session start.

**Why:** Bulk upfront skill loading adds overhead turns without proportional benefit. In benchmark runs, 2+ turns of skill loading at session start did not prevent regressions that targeted skill loading just before the relevant task did prevent.

**Pattern:**
```
Task: implement AI streaming route
→ Load vercel:ai-gateway NOW (just before writing this route)
→ Write the route
→ Move to next task

Task: implement auth middleware
→ Load vercel:auth NOW (just before writing middleware)
→ Write the middleware
```

**Not:**
```
❌ Session start: load all 4+ Vercel skills
→ implement everything from memory
```

When dispatching subagents for a task, include only the skills relevant to that task in the subagent prompt. A subagent implementing an AI route gets the AI gateway skill. A subagent implementing auth gets the auth skill. Neither gets both.

---

## Mandatory Verification Checklist

Before marking any task or wave as complete, run through this checklist. Do not mark `status: completed` until all applicable items are checked.

**Per task:**
- [ ] All tests for this task pass (`npm test` or equivalent)
- [ ] No TypeScript errors in modified files (`tsc --noEmit`)
- [ ] No ESLint violations in modified files
- [ ] Output is clean — no unexpected warnings or errors in test output

**Per wave checkpoint:**
- [ ] Full test suite passes (not just the task's tests)
- [ ] Coverage has not regressed from pre-wave baseline
- [ ] All task files referenced in the plan have been created or modified as specified

**Before final completion:**
- [ ] All waves completed
- [ ] Full test suite green
- [ ] No TypeScript errors across entire project
- [ ] No ESLint violations across entire project
- [ ] Feature works end-to-end (not just unit tests)

**If any item fails:** Stop. Fix it before proceeding. Do not skip a failing check and continue.

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
- **Update status.yaml after every state change** — this is non-negotiable
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

**Required workflow skills:**
- **mighty-powers:git-worktrees** - REQUIRED: Set up isolated workspace before starting
- **mighty-powers:writing-plans** - Creates the plan this skill executes
- **mighty-powers:finishing-branch** - Complete development after all tasks
- **mighty-powers:resume** - Resume interrupted execution after session crash
