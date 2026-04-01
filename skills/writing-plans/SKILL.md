---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree (created by brainstorming skill).

**Save plans to:** `docs/plans/<feature-slug>/` (see Output Structure below)
- (User preferences for plan location override this default)

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the wave decomposition. Tasks that touch the same files CANNOT be in the same wave.

## Wave-Based Plan Structure

<EXTREMELY-IMPORTANT>
ALL plans MUST be organized into waves (sprints). Within each wave, tasks are independent and can be executed in parallel by separate subagents. Between waves, there is a synchronization point where all tasks from the previous wave must complete before the next wave begins.

This is NOT optional. Every plan must have waves, even if there's only one wave.
</EXTREMELY-IMPORTANT>

### How to Decompose into Waves

1. **Identify all tasks** from the spec/requirements
2. **Build a dependency graph**: which tasks depend on which? A task depends on another if it needs the other's output (file created, API defined, interface established)
3. **Group into waves by dependency level**:
   - **Wave 1**: Tasks with NO dependencies (foundations, interfaces, schemas, types)
   - **Wave 2**: Tasks that depend only on Wave 1 outputs
   - **Wave 3**: Tasks that depend on Wave 2 outputs
   - Continue until all tasks are placed
4. **Within each wave**: Tasks MUST be independent — they cannot touch the same files or depend on each other's output. If two tasks in the same wave would touch the same file, move one to the next wave.
5. **Maximize parallelism**: The goal is to have as many tasks per wave as possible. If Wave 2 has 5 tasks and only 1 depends on a specific Wave 1 task, the other 4 might belong in Wave 1.

### Wave Rules

- Tasks within a wave touch **different files** — no conflicts
- Tasks within a wave have **no data dependencies** on each other
- Each wave is a **synchronization point** — all tasks must pass before next wave
- After each wave: **run full test suite** to catch integration issues
- Commit after each wave (not after each task)

## Output Structure

Choose the output format based on plan complexity:

### Medium+ plans (3+ waves, or multi-session work)

Create a folder with separate files for waves and tasks:

```
docs/plans/<feature-slug>/
├── plan.md                 # Overview: goal, architecture, wave summary, dependency graph
├── status.yaml             # Execution state — THE resume file (see mighty-powers:resume)
├── wave-1/
│   ├── wave.md             # Wave overview, entry criteria, checkpoint criteria
│   ├── task-1.1.md         # Self-contained task with ALL context for a subagent
│   ├── task-1.2.md
│   └── task-1.3.md
├── wave-2/
│   ├── wave.md
│   ├── task-2.1.md
│   └── task-2.2.md
└── wave-3/
    ├── wave.md
    └── task-3.1.md
```

**Each task file is self-contained** — a subagent reading ONLY that file has everything it needs:
- Project context (goal, architecture, tech stack)
- What was built in previous waves that this task depends on
- Exact file paths, code, test code, verification commands
- Which files to read for additional context

**Task file format:**
````markdown
---
task: "2.2"
wave: 2
status: pending
depends_on: ["1.1", "1.3"]
files_to_create:
  - src/services/retry-queue.ts
  - tests/retry-queue.test.ts
files_to_read:
  - src/services/webhook.ts
  - src/types/webhook.ts
---

# Task 2.2: Implement Retry Queue

## Context
Goal: [from plan.md]
Architecture: [from plan.md]
This task implements the retry queue that uses the webhook types (Wave 1, Task 1.1)
and the config schema (Wave 1, Task 1.3).

## Steps
[Full task steps with code, file paths, verification commands]
````

**Wave file format:**
```markdown
# Wave 2: Core Logic

**Depends on:** Wave 1 (all tasks must be completed)
**Tasks:** 2.1, 2.2 (independent, execute in parallel)

**Entry criteria:** Wave 1 checkpoint passed (all tests green)
**Checkpoint criteria:** Run `npm test` — all tests must pass
```

### Small plans (1-2 waves, single session)

Everything in one plan file + a status.yaml:

```
docs/plans/<feature-slug>/
├── plan.md                 # Full plan with waves as sections, tasks inline
└── status.yaml             # Execution state
```

### Status File (always created)

The `status.yaml` is created when the plan is saved and updated during execution. It enables `/resume` to pick up exactly where things stopped. See `mighty-powers:resume` for the full format.

**Initial status.yaml (created by writing-plans):**
```yaml
feature: <feature-slug>
created: <ISO timestamp>
last_updated: <ISO timestamp>
plan_file: docs/plans/<feature-slug>/plan.md
plan_type: small | medium  # small = single plan.md, medium = wave folders
current_wave: 0
status: pending

waves:
  1:
    status: pending
    tasks:
      1.1: { status: pending }
      1.2: { status: pending }
      1.3: { status: pending }
  2:
    status: pending
    tasks:
      2.1: { status: pending }
      2.2: { status: pending }
```

## Plan Document Format

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** Execute this plan wave-by-wave using mighty-powers:subagent-driven-development.
> Tasks within each wave are independent and should be dispatched as parallel subagents.
> Wait for all tasks in a wave to complete before starting the next wave.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Wave Summary:**
| Wave | Tasks | Focus | Parallel? |
|------|-------|-------|-----------|
| 1    | 1.1, 1.2, 1.3 | Foundation: types, schemas, interfaces | Yes — all independent |
| 2    | 2.1, 2.2 | Core logic: implement interfaces | Yes — different modules |
| 3    | 3.1 | Integration: wire everything together | Sequential |

---

## Wave 1: Foundation
_All tasks in this wave are independent. Execute in parallel._

### Task 1.1: [Component Name]
...

### Task 1.2: [Component Name]
...

### Task 1.3: [Component Name]
...

**Wave 1 checkpoint:** Run full test suite. All Wave 1 tests must pass.

---

## Wave 2: Core Logic
_Depends on Wave 1. All tasks in this wave are independent. Execute in parallel._

### Task 2.1: [Component Name]
...

### Task 2.2: [Component Name]
...

**Wave 2 checkpoint:** Run full test suite. All tests must pass.

---

## Wave 3: Integration
_Depends on Wave 2._

### Task 3.1: [Integration Component]
...

**Wave 3 checkpoint:** Run full test suite. All tests must pass.
```

## Bite-Sized Task Granularity

**Each step within a task is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Task Structure

````markdown
### Task N.M: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS
````

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Remember
- Exact file paths always
- Complete code in every step — if a step changes code, show the code
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits
- **Wave numbering**: Task 1.1, 1.2 (wave 1), Task 2.1, 2.2 (wave 2), etc.
- **Dependency annotations**: Each wave header states what it depends on

## Self-Review

After writing the complete plan, check:

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 1.2 but `clearFullLayers()` in Task 2.1 is a bug.

**4. Wave integrity:** For each wave, verify that tasks within it are truly independent — no shared files, no data dependencies between tasks in the same wave. If two tasks touch the same file, they must be in different waves.

**5. Parallelism maximization:** Could any task in Wave N+1 actually run in Wave N? If a task only depends on one specific Wave N task (not all of them), check if it could be restructured to be independent.

If you find issues, fix them inline. If you find a spec requirement with no task, add the task.

**Plan Review Agent:**

After self-review, dispatch a review subagent for a second opinion:

```
Agent tool:
  description: "Plan review"
  model: sonnet
  prompt: |
    [Include content of ./plan-document-reviewer-prompt.md]

    Review the implementation plan at: {PLAN_PATH}
    The original spec/design is at: {SPEC_PATH}

    Check for: spec coverage gaps, placeholder/vague tasks, wave integrity
    (no shared files within a wave), dependency ordering, missing verification
    steps, parallelism opportunities missed.
```

If the reviewer finds issues, fix them before presenting execution options.

## Cost Estimation

Before presenting execution options, estimate the subagent cost:

**Per task, estimate tokens based on complexity:**

| Task Complexity | Est. Input Tokens | Est. Output Tokens | Recommended Model |
|----------------|-------------------|--------------------|--------------------|
| Simple (1-2 files, clear spec) | ~2K | ~1K | haiku |
| Standard (multi-file, some judgment) | ~5K | ~3K | sonnet |
| Complex (architecture, integration) | ~10K | ~5K | opus |

**Per task, add review overhead:**
- Spec reviewer: ~2K input + ~1K output (sonnet)
- Code quality reviewer: ~3K input + ~1K output (sonnet)

**Present to user:**

```
Execution Cost Estimate:
  Wave 1: 3 tasks × haiku     ≈ $0.02
  Wave 2: 2 tasks × sonnet    ≈ $0.08
  Wave 3: 1 task × sonnet     ≈ $0.04
  Reviews: 6 tasks × sonnet   ≈ $0.12
  ─────────────────────────────
  Estimated total:             ≈ $0.26

  Note: Estimates assume standard task sizes. Actual costs depend on
  code complexity and review iterations.
```

This is an estimate, not a gate — the user decides whether to proceed. The purpose is transparency so there are no surprises.

## Execution Handoff

After saving the plan, offer execution choice with cost estimate:

**"Plan complete and saved to `docs/plans/<filename>.md`. It has N waves with M total tasks.**

**Estimated cost: ~$X.XX (based on task complexity and model selection)**

**Execution options:**

**1. Subagent-Driven (recommended)** — I dispatch parallel subagents per wave. Each wave's tasks run concurrently. Two-stage review after each task. Fastest option.

**2. Inline Execution** — Execute tasks sequentially in this session using executing-plans, with batch checkpoints per wave.

**Which approach?"**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use mighty-powers:subagent-driven-development
- For each wave: dispatch all tasks as parallel subagents
- Wait for all tasks + reviews in the wave to complete
- Run full test suite at wave checkpoint
- Proceed to next wave only when all tests pass

**If Inline Execution chosen:**
- **REQUIRED SUB-SKILL:** Use mighty-powers:executing-plans
- Execute tasks within each wave sequentially (still respects wave boundaries)
- Run full test suite at each wave checkpoint
