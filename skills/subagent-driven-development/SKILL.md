---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute plan by dispatching fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.

**Why subagents:** You delegate tasks to specialized agents with isolated context. By precisely crafting their instructions and context, you ensure they stay focused and succeed at their task. They should never inherit your session's context or history — you construct exactly what they need. This also preserves your own context for coordination work.

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration

## When to Use

Use when: you have an implementation plan + tasks are mostly independent + staying in this session.
Otherwise: use `mighty-powers:executing-plans` (parallel session) or brainstorm first (no plan).

## The Process — Wave-Based Parallel Execution

Plans are organized into **waves**. Each wave groups tasks at the same dependency level. Tasks within a wave may be independent (parallelizable) or sequential — the plan annotates which. Between waves, there is a synchronization checkpoint.

```
For each wave:
  1. Update status.yaml: wave → in_progress (DO THIS FIRST)
  2. Check the wave's execution mode (parallel, sequential, mixed, or single task)
  3. Parallel tasks: dispatch as concurrent implementer subagents
     (all Agent tool calls in a single response)
     Sequential tasks: dispatch one at a time
  4. As each implementer completes → UPDATE status.yaml (task → completed) → dispatch its spec reviewer
  5. As each spec reviewer passes → dispatch its code quality reviewer
  6. When ALL tasks in the wave pass both reviews → run wave checkpoint
  7. Update status.yaml: wave → completed, checkpoint results → proceed to next wave
```

### Wave Execution Detail

**Step 1 — Parallel Implementation:**

For a wave with independent tasks 2.1, 2.2, 2.3, dispatch all three implementer subagents simultaneously:

```
Single message with 3 Agent tool calls:
  Agent 1: implementer for task 2.1 (./implementer-prompt.md + task context)
  Agent 2: implementer for task 2.2 (./implementer-prompt.md + task context)
  Agent 3: implementer for task 2.3 (./implementer-prompt.md + task context)
All three run concurrently.
```

Each implementer subagent:
- Gets the task content (from a separate task file if > 5 tasks in the wave, or from the wave's `wave.md` if ≤ 5 tasks)
- Implements using TDD
- Commits its changes
- Self-reviews
- Reports status: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED

**Step 2 — Parallel Review:**

As implementers complete, dispatch their reviewers. You can batch reviews:

```
Single message with review agents:
  Agent 1: spec-reviewer for task 2.1 (./spec-reviewer-prompt.md + task diff)
  Agent 2: spec-reviewer for task 2.2 (./spec-reviewer-prompt.md + task diff)
  Agent 3: spec-reviewer for task 2.3 (./spec-reviewer-prompt.md + task diff)
```

If a spec reviewer rejects → re-dispatch implementer for that task only.
Once spec passes → dispatch code quality reviewer for that task.

**Step 3 — Wave Checkpoint:**

When ALL tasks in the wave pass both reviews:
1. Run the full test suite
2. Update `status.yaml`: wave status → completed, checkpoint results
3. If tests fail: diagnose, fix, re-run (don't proceed to next wave)
4. If tests pass: proceed to next wave

**Step 4 — Final Review:**

After ALL waves complete:
1. Dispatch `agents/code-reviewer.md` for the entire implementation (full diff from plan start)
2. Use `mighty-powers:finishing-branch` to merge/PR

### Status Tracking

<EXTREMELY-IMPORTANT>
MANDATORY: You MUST update `status.yaml` IMMEDIATELY after every state change. This is not optional. Do NOT proceed to the next action until the status file is written. If you skip this, session crashes lose all progress and `/resume` cannot recover.

**Update status.yaml at EACH of these moments — no exceptions:**

1. **Before dispatching a wave** → wave status: `in_progress`, `started_at`
2. **When a task is dispatched** → task status: `in_progress`, `started_at`, `assigned_model`
3. **When a task completes** → task status: `completed`, `completed_at`
4. **When a task fails** → task status: `failed`, error summary
5. **After wave checkpoint** → `checkpoint.tests_passed`, wave status: `completed` or `failed`
6. **When all waves done** → top-level status: `completed`

**Enforcement rule:** After every subagent returns, your NEXT action MUST be updating status.yaml. Not reviewing the output. Not dispatching the next task. Update status.yaml FIRST, then proceed.
</EXTREMELY-IMPORTANT>

### Fallback: Sequential Execution

If parallel dispatch isn't possible (e.g., tasks within a wave have unexpected coupling):
- Execute tasks one at a time within the wave
- Still do two-stage review (spec then quality) per task
- Still run wave checkpoint after all tasks complete
- Still update status.yaml after each state change

## Model Selection

Use the least powerful model that can handle each role to conserve cost and increase speed.

**Mechanical implementation tasks** (isolated functions, clear specs, 1-2 files): use a fast, cheap model. Most implementation tasks are mechanical when the plan is well-specified.

**Integration and judgment tasks** (multi-file coordination, pattern matching, debugging): use a standard model.

**Architecture, design, and review tasks**: use the most capable available model.

**Task complexity signals:**
- Touches 1-2 files with a complete spec → cheap model
- Touches multiple files with integration concerns → standard model
- Requires design judgment or broad codebase understanding → most capable model

**Claude Code model parameter:** Pass the model via the Agent tool's `model` parameter:
- `haiku` for mechanical implementation tasks
- `sonnet` for standard tasks and spec review
- `opus` for architecture-level code quality review

## Handling Implementer Status

Implementer subagents report one of four statuses. Handle each appropriately:

**DONE:** Proceed to spec compliance review.

**DONE_WITH_CONCERNS:** The implementer completed the work but flagged doubts. Read the concerns before proceeding. If the concerns are about correctness or scope, address them before review. If they're observations (e.g., "this file is getting large"), note them and proceed to review.

**NEEDS_CONTEXT:** The implementer needs information that wasn't provided. Provide the missing context and re-dispatch.

**BLOCKED:** The implementer cannot complete the task. Assess the blocker:
1. If it's a context problem, provide more context and re-dispatch with the same model
2. If the task requires more reasoning, re-dispatch with a more capable model
3. If the task is too large, break it into smaller pieces
4. If the plan itself is wrong, escalate to the human

**Never** ignore an escalation or force the same model to retry without changes. If the implementer said it's stuck, something needs to change.

## Prompt Templates

- `./implementer-prompt.md` - Dispatch implementer subagent
- `./spec-reviewer-prompt.md` - Dispatch spec compliance reviewer subagent
- `./code-quality-reviewer-prompt.md` - Dispatch code quality reviewer subagent

## Example Workflow

```
You: I'm using Subagent-Driven Development to execute this plan.

[Read plan file, extract all tasks with full text and context]

Task 1: Hook installation script
  [Dispatch implementer subagent with task text + context]
  Implementer: Implemented, 5/5 tests passing, committed.
  [Dispatch spec reviewer] → Spec compliant
  [Dispatch code quality reviewer] → Approved
  [Update status.yaml → task 1 complete]

Task 2: Recovery modes
  [Dispatch implementer subagent]
  Implementer: Added verify/repair modes, 8/8 tests passing, committed.
  [Dispatch spec reviewer] → Issues: missing progress reporting, extra --json flag
  [Re-dispatch implementer to fix] → Fixed
  [Spec reviewer re-reviews] → Compliant
  [Dispatch code quality reviewer] → Issue: magic number
  [Re-dispatch implementer to fix] → Extracted constant
  [Code quality re-reviews] → Approved
  [Update status.yaml → task 2 complete]

[After all tasks → final code-reviewer → finishing-branch]
```

## Advantages

- **Fresh context per task** — no accumulated confusion or context pollution
- **Two-stage review** — spec compliance then code quality catches issues early (cheaper than debugging later)
- **Controller curates context** — subagents get exactly what they need upfront, questions surface before work begins
- **Cost tradeoff** — more subagent invocations (implementer + 2 reviewers per task) but catches issues earlier

## Red Flags

**Never:**
- **Proceed to the next task or wave without updating status.yaml first** — this is the #1 cause of lost progress
- Start implementation on main/master branch without explicit user consent
- Skip reviews (spec compliance OR code quality)
- Proceed with unfixed issues
- Dispatch multiple implementation subagents in parallel (conflicts)
- Make subagent read plan file (provide full text instead)
- Skip scene-setting context (subagent needs to understand where task fits)
- Ignore subagent questions (answer before letting them proceed)
- Accept "close enough" on spec compliance (spec reviewer found issues = not done)
- Skip review loops (reviewer found issues = implementer fixes = review again)
- Let implementer self-review replace actual review (both are needed)
- **Start code quality review before spec compliance is done** (wrong order)
- Move to next task while either review has open issues

**If subagent asks questions:**
- Answer clearly and completely
- Provide additional context if needed
- Don't rush them into implementation

**If reviewer finds issues:**
- Implementer (same subagent) fixes them
- Reviewer reviews again
- Repeat until approved
- Don't skip the re-review

**If subagent fails task:**
- Dispatch fix subagent with specific instructions
- Don't try to fix manually (context pollution)

## Integration

**Required workflow skills:**
- **mighty-powers:git-worktrees** - REQUIRED: Set up isolated workspace before starting
- **mighty-powers:writing-plans** - Creates the plan this skill executes
- **mighty-powers:code-review** - Code review for reviewer subagents
- **mighty-powers:finishing-branch** - Complete development after all tasks

**Subagents should use:**
- **mighty-powers:test-driven-development** - Subagents follow TDD for each task

**Alternative workflow:**
- **mighty-powers:executing-plans** - Use for parallel session instead of same-session execution
