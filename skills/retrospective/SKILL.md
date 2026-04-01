---
name: retrospective
description: Sprint retrospective — analyzes git velocity, commit patterns, test health, and shipping cadence, then facilitates a structured review ceremony. Use after a sprint or at end of week.
---

# Sprint Retrospective

Retrospectives turn shipping data into actionable insights. This skill combines quantitative analysis (git data) with a structured ceremony (what went well, what didn't, what to improve).

**Announce at start:** "I'm running a sprint retrospective on this project."

## Process

### Step 1: Gather Data

Run the retro analyzer tool:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/retro-analyzer.mjs <project-directory> --days 7
```

For custom date ranges:
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/retro-analyzer.mjs <project-directory> --since YYYY-MM-DD
```

### Step 2: Present Velocity Report

Format the data as a clear report:

```
+===========================================+
|     S P R I N T   R E T R O              |
+===========================================+
|  Period        <date range>              |
|  Commits       <count>                    |
|  Lines Added   <count>                    |
|  Lines Removed <count>                    |
|  Net Change    <+/- count>                |
|  Authors       <count>                    |
+===========================================+
```

Include:
- **Commit breakdown**: features vs fixes vs refactors vs tests vs docs vs chores
- **Hot files**: most-changed files (excessive churn = likely needs splitting)
- **Test health**: test file count, pass/fail, test script existence
- **Shipping cadence**: peak day/hour, tags/releases in period

### Step 3: Facilitate Retrospective Ceremony

Guide the user through structured reflection:

**What went well:**
- High velocity periods
- Good deletion-to-addition ratio (code hygiene)
- Consistent shipping cadence
- Test coverage improvements

**What didn't go well:**
- Fix-heavy sprints (more fixes than features = quality debt)
- Hot files that churn excessively
- Missing or failing tests
- Uneven shipping cadence

**What to improve:**
- Concrete, specific action items with clear next steps
- Link to relevant skills (e.g., "Use `mighty-powers:test-driven-development` for the untested module")

### Step 4: Capture Action Items

For each action item:
1. State the action clearly
2. Assign an owner (or note it's unassigned)
3. Set a target (next sprint, specific date, etc.)

### Step 5: Save Learnings (Optional)

If anything from the retro is worth persisting across sessions, save it:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/learnings-manager.mjs save --category "retro" --content "<learning>"
```

Cross-reference with existing learnings:
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/learnings-manager.mjs search --query "sprint"
```

## Output

The retrospective should be concise and actionable — not a data dump. Lead with insights, support with data. The goal is to help the user ship better next week.
