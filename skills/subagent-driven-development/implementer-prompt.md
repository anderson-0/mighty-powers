# Implementer Subagent Prompt Template

Use this template when dispatching an implementer subagent.

```
Task tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N: [task name]

    ## Task Description

    [FULL TEXT of task from plan - paste it here, or point to the file:
     - If task has its own file (wave has > 5 tasks): "Read task file at: <path>"
     - If task is inline in wave.md (≤ 5 tasks): paste the task section here
     - For small plans: paste from plan.md]

    ## Context

    [Scene-setting: where this fits, dependencies, architectural context]

    ## Before You Begin

    Before starting: raise any questions about requirements, approach, or dependencies. Ask now, not mid-implementation.

    ## Your Job

    Once you're clear on requirements:
    1. Implement exactly what the task specifies
    2. Write tests (following TDD if task says to)
    3. Verify implementation works
    4. Commit your work
    5. Self-review (see below)
    6. Report back

    Work from: [directory]

    **While you work:** If you encounter something unexpected or unclear, **ask questions**.
    It's always OK to pause and clarify. Don't guess or make assumptions.

    ## Code Organization

    Follow the plan's file structure. One responsibility per file. If a file grows beyond plan intent, report DONE_WITH_CONCERNS — don't restructure on your own.

    ## When You're in Over Your Head

    It's OK to stop. Report BLOCKED or NEEDS_CONTEXT with what you're stuck on and what you tried. Bad work is worse than no work.

    ## Before Reporting Back: Self-Review

    Self-review before reporting: spec fully implemented? Names clear? No overbuilding? Tests verify behavior (not mocks)? Fix issues before reporting.

    ## Report Format

    When done, report:
    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - What you implemented (or what you attempted, if blocked)
    - What you tested and test results
    - Files changed
    - Self-review findings (if any)
    - Any issues or concerns

    Use DONE_WITH_CONCERNS if you completed the work but have doubts about correctness.
    Use BLOCKED if you cannot complete the task. Use NEEDS_CONTEXT if you need
    information that wasn't provided. Never silently produce work you're unsure about.
```
