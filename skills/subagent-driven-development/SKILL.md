---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute plan by dispatching fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.

**Why subagents:** You delegate tasks to specialized agents with isolated context. By precisely crafting their instructions and context, you ensure they stay focused and succeed at their task. They should never inherit your session's context or history — you construct exactly what they need. This also preserves your own context for coordination work.

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration

## When to Use

```dot
digraph when_to_use {
    "Have implementation plan?" [shape=diamond];
    "Tasks mostly independent?" [shape=diamond];
    "Stay in this session?" [shape=diamond];
    "subagent-driven-development" [shape=box];
    "executing-plans" [shape=box];
    "Manual execution or brainstorm first" [shape=box];

    "Have implementation plan?" -> "Tasks mostly independent?" [label="yes"];
    "Have implementation plan?" -> "Manual execution or brainstorm first" [label="no"];
    "Tasks mostly independent?" -> "Stay in this session?" [label="yes"];
    "Tasks mostly independent?" -> "Manual execution or brainstorm first" [label="no - tightly coupled"];
    "Stay in this session?" -> "subagent-driven-development" [label="yes"];
    "Stay in this session?" -> "executing-plans" [label="no - parallel session"];
}
```

**vs. Executing Plans (parallel session):**
- Same session (no context switch)
- Fresh subagent per task (no context pollution)
- Two-stage review after each task: spec compliance first, then code quality
- Faster iteration (no human-in-loop between tasks)

## The Process — Wave-Based Parallel Execution

Plans are organized into **waves**. Within each wave, tasks are independent and dispatched as **parallel subagents**. Between waves, there is a synchronization checkpoint.

```
For each wave:
  1. Dispatch ALL tasks in the wave as parallel implementer subagents
     (all Agent tool calls in a single response → concurrent)
  2. As each implementer completes → dispatch its spec reviewer
  3. As each spec reviewer passes → dispatch its code quality reviewer
  4. When ALL tasks in the wave pass both reviews → run wave checkpoint
  5. Update status.yaml → proceed to next wave
```

### Wave Execution Detail

**Step 1 — Parallel Implementation:**

For a wave with tasks 2.1, 2.2, 2.3, dispatch all three implementer subagents simultaneously:

```
Single message with 3 Agent tool calls:
  Agent 1: implementer for task 2.1 (./implementer-prompt.md + task context)
  Agent 2: implementer for task 2.2 (./implementer-prompt.md + task context)
  Agent 3: implementer for task 2.3 (./implementer-prompt.md + task context)
All three run concurrently.
```

Each implementer subagent:
- Gets the task file content (self-contained context)
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

Update `status.yaml` after every state change:
- Wave starts → wave status: in_progress
- Task dispatched → task status: in_progress, started_at, assigned_model, context_files
- Task completes → task status: completed, completed_at
- Wave checkpoint → checkpoint.tests_passed, wave status: completed
- All done → top-level status: completed

This enables `/resume` to pick up exactly where things stopped if the session crashes.

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

[Read plan file once: docs/specs/feature-plan.md]
[Extract all 5 tasks with full text and context]
[Create TodoWrite with all tasks]

Task 1: Hook installation script

[Get Task 1 text and context (already extracted)]
[Dispatch implementation subagent with full task text + context]

Implementer: "Before I begin - should the hook be installed at user or system level?"

You: "User level (~/.config/mighty-powers/hooks/)"

Implementer: "Got it. Implementing now..."
[Later] Implementer:
  - Implemented install-hook command
  - Added tests, 5/5 passing
  - Self-review: Found I missed --force flag, added it
  - Committed

[Dispatch spec compliance reviewer]
Spec reviewer: Spec compliant - all requirements met, nothing extra

[Get git SHAs, dispatch code quality reviewer]
Code reviewer: Strengths: Good test coverage, clean. Issues: None. Approved.

[Mark Task 1 complete]

Task 2: Recovery modes

[Get Task 2 text and context (already extracted)]
[Dispatch implementation subagent with full task text + context]

Implementer: [No questions, proceeds]
Implementer:
  - Added verify/repair modes
  - 8/8 tests passing
  - Self-review: All good
  - Committed

[Dispatch spec compliance reviewer]
Spec reviewer: Issues:
  - Missing: Progress reporting (spec says "report every 100 items")
  - Extra: Added --json flag (not requested)

[Implementer fixes issues]
Implementer: Removed --json flag, added progress reporting

[Spec reviewer reviews again]
Spec reviewer: Spec compliant now

[Dispatch code quality reviewer]
Code reviewer: Strengths: Solid. Issues (Important): Magic number (100)

[Implementer fixes]
Implementer: Extracted PROGRESS_INTERVAL constant

[Code reviewer reviews again]
Code reviewer: Approved

[Mark Task 2 complete]

...

[After all tasks]
[Dispatch final code-reviewer]
Final reviewer: All requirements met, ready to merge

Done!
```

## Advantages

**vs. Manual execution:**
- Subagents follow TDD naturally
- Fresh context per task (no confusion)
- Parallel-safe (subagents don't interfere)
- Subagent can ask questions (before AND during work)

**vs. Executing Plans:**
- Same session (no handoff)
- Continuous progress (no waiting)
- Review checkpoints automatic

**Efficiency gains:**
- No file reading overhead (controller provides full text)
- Controller curates exactly what context is needed
- Subagent gets complete information upfront
- Questions surfaced before work begins (not after)

**Quality gates:**
- Self-review catches issues before handoff
- Two-stage review: spec compliance, then code quality
- Review loops ensure fixes actually work
- Spec compliance prevents over/under-building
- Code quality ensures implementation is well-built

**Cost:**
- More subagent invocations (implementer + 2 reviewers per task)
- Controller does more prep work (extracting all tasks upfront)
- Review loops add iterations
- But catches issues early (cheaper than debugging later)

## Red Flags

**Never:**
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
- **mighty-powers:requesting-code-review** - Code review template for reviewer subagents
- **mighty-powers:finishing-branch** - Complete development after all tasks

**Subagents should use:**
- **mighty-powers:test-driven-development** - Subagents follow TDD for each task

**Alternative workflow:**
- **mighty-powers:executing-plans** - Use for parallel session instead of same-session execution
