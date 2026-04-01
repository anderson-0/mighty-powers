---
name: code-review
description: Review code changes using a two-stage process (spec compliance + code quality) with multi-facet analysis and confidence scoring. Use after completing features, before merging, or when stuck.
---

# Code Review

Dispatch a code-reviewer subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing a major feature
- Before merge to main
- At the end of each sprint phase (BUILD → TEST transition)

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing a complex bug

## How to Dispatch

**1. Gather context:**
```bash
BASE_SHA=$(git merge-base HEAD main)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
DIFF=$(git diff $BASE_SHA..$HEAD_SHA)
```

**2. Dispatch code-reviewer via Agent tool:**

```
Agent tool:
  description: "Code review"
  model: sonnet (or opus for architecture-heavy changes)
  prompt: |
    [Include full content of agents/code-reviewer.md]

    ## Your Task

    Review the changes between {BASE_SHA} and {HEAD_SHA}.

    The implementation plan is at: {PLAN_PATH}
    What was implemented: {DESCRIPTION}

    Focus areas: {FOCUS_AREAS — e.g., "new auth middleware, touches 5 files"}

    Run `git diff {BASE_SHA}..{HEAD_SHA}` to see the changes.
    Read the plan file for spec compliance checking.
```

**3. Read the agent's response** and present findings to the user organized by severity.

**For parallel review** (e.g., at sprint REVIEW gate), dispatch code-reviewer + security-auditor in a single response:

```
Single message with 2 Agent tool calls:
  Agent 1: code-reviewer — reviews code quality and spec compliance
  Agent 2: security-auditor — scans for security issues
Both run concurrently. Combine findings when both complete.
```

## Two-Stage Review Process

### Stage 1: Spec Compliance

Does the implementation match the plan/requirements?
- Compare implementation against planning document
- Identify deviations — are they justified improvements or problematic departures?
- Verify all planned functionality is implemented
- Check acceptance criteria are met

### Stage 2: Code Quality

Is the code clean, tested, and maintainable?

Review across these dimensions:

| Dimension | What to Check |
|-----------|---------------|
| **Architecture** | SOLID principles, separation of concerns, integration with existing systems |
| **Security** | Input validation, auth checks, injection risks, secrets exposure |
| **Performance** | N+1 queries, unnecessary allocations, blocking operations |
| **Testing** | Coverage of new code, test quality, edge cases tested |
| **Documentation** | Comments where logic isn't self-evident, updated docs |

## Confidence Scoring

Every finding gets a confidence score (0-100):
- **90-100**: Certain — clear violation or bug
- **70-89**: Likely — strong evidence but some ambiguity
- **50-69**: Possible — worth investigating
- **Below 50**: Speculative — don't report

**Only present findings with confidence ≥ 80** to reduce noise. Group findings below 80 into a "lower-confidence" appendix if needed.

## Finding Severity

Categorize each finding:
- **Critical**: Must fix before merge — bugs, security vulnerabilities, data loss risks
- **Important**: Should fix before merge — design issues, missing error handling, test gaps
- **Suggestion**: Nice to have — style improvements, minor optimizations

## Acting on Feedback

1. Fix **Critical** issues immediately
2. Fix **Important** issues before proceeding
3. Note **Suggestions** for later
4. Push back if reviewer is wrong (with reasoning)

## Integration with Workflows

**Subagent-Driven Development:** Review after EACH task. Catch issues before they compound.

**Executing Plans:** Review after each batch (3-5 tasks). Get feedback, apply, continue.

**Sprint Pipeline:** Review at the REVIEW phase gate. Must pass before SHIP.

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback without evidence
