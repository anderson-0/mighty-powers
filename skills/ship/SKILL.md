---
name: ship
description: Use before deploying to run a pre-deploy scorecard across security, code quality, and bundle size
---

# /ship — Pre-Deploy Quality Gate

Run parallel audit agents and produce a scorecard.

## How to Run

Dispatch **3 audit agents in parallel** using the Agent tool (all in a single response so they run concurrently):

### Agent 1 — Security Audit

```
Agent tool:
  description: "Security audit"
  model: sonnet
  prompt: |
    You are a security auditor. Scan this project for vulnerabilities.

    Run this tool:
    node ${CLAUDE_PLUGIN_ROOT}/tools/secret-scanner.mjs <project-dir>

    Then manually check for:
    - OWASP Top 10 patterns (eval, innerHTML, SQL concatenation)
    - Hardcoded CORS wildcards
    - Missing rate limiting on auth endpoints
    - JWT without expiry or weak signing

    Report each finding with:
    - Severity: critical | high | medium | low
    - File and line
    - Description
    - Score deduction: critical=-20, high=-10, medium=-5, low=-2

    Return: JSON with { score: <number>, findings: [...] }
```

### Agent 2 — Code Quality

```
Agent tool:
  description: "Code quality audit"
  model: sonnet
  prompt: |
    You are a code quality auditor. Analyze this project.

    Run these tools:
    node ${CLAUDE_PLUGIN_ROOT}/tools/code-profiler.mjs <project-dir>
    node ${CLAUDE_PLUGIN_ROOT}/tools/dep-doctor.mjs <project-dir>

    Report findings from both tools with:
    - Severity: critical | high | medium | low
    - File and line
    - Description
    - Score deduction: critical=-20, high=-10, medium=-5, low=-2

    Return: JSON with { score: <number>, findings: [...] }
```

### Agent 3 — Bundle Size

```
Agent tool:
  description: "Bundle size audit"
  model: haiku
  prompt: |
    You are a bundle size auditor.

    Run this tool:
    node ${CLAUDE_PLUGIN_ROOT}/tools/bundle-tracker.mjs <project-dir>

    Check for heavy dependencies (moment→dayjs, lodash→native, axios→fetch).
    Score deduction per heavy dep: -10.

    Return: JSON with { score: <number>, findings: [...] }
```

## After All Agents Return

Aggregate the results into a scorecard:

```
+===========================================+
|    M I G H T Y   P O W E R S   S C O R E |
+===========================================+
|  Security        XX/100  ############-    |
|  Code Quality    XX/100  ############-    |
|  Bundle Size     XX/100  ############-    |
+===========================================+
|   OVERALL         XX/100                  |
|   STATUS          READY TO SHIP           |
+===========================================+
```

## Scoring

- Each category starts at 100, deducts per finding based on severity
- Failed agents show as `FAIL` and are excluded from the overall average
- Overall = average of categories that successfully ran

**Status thresholds:**
- >= 80: READY TO SHIP
- 60-79: NEEDS WORK
- < 60: NOT READY

## After the Scorecard

Fix issues with `/secure` (security), `/investigate` (code quality), then re-run `/ship`. If an agent fails, its category shows FAIL and is excluded from the overall average.
