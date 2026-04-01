---
name: ship
description: Use before deploying to run a pre-deploy scorecard across security, code quality, and bundle size
---

# /ship — Pre-Deploy Quality Gate

Run all Mighty Powers auditors in parallel and produce a screenshot-shareable scorecard.

## What It Runs

4 scored categories from 5 tools, all in parallel:

| Category | Tools | What it checks |
|---|---|---|
| **SEO/GEO/AEO** | seo-scanner | Meta tags, headings, structured data, OG tags, llms.txt, AI crawler access, canonical URLs, cross-page analysis |
| **Security** | secret-scanner | AWS keys, Stripe keys, GitHub tokens, private keys, DB URLs, JWT secrets in source files |
| **Code Quality** | code-profiler + dep-doctor | N+1 queries, sync I/O in handlers, memory leaks, unbounded queries, unused/outdated dependencies |
| **Bundle Size** | bundle-tracker | Build output size, heavy dependency detection (moment→dayjs, lodash→native, axios→fetch) |

## How to Run

**In Claude Code:**
```
/ship
```

**Standalone CLI:**
```bash
npx mighty-powers ship .
npx mighty-powers ship /path/to/project
```

## Scoring

- Each category starts at 100, deducts per finding based on severity
- SEO deduplicates by rule (same issue on N pages = one deduction)
- Failed tools show as `FAIL` and are excluded from the overall average
- Overall = average of categories that successfully ran

**Status thresholds:**
- >= 80: READY TO SHIP
- 60-79: NEEDS WORK
- < 60: NOT READY

## After the Scorecard

The scorecard tells you what's wrong. To fix issues:

1. Run individual audit commands for detailed findings:
   - `mighty-powers seo .` — full SEO findings with file:line locations
   - `mighty-powers security .` — all detected secrets
   - `mighty-powers profile .` — N+1 queries, sync I/O, memory leaks
   - `mighty-powers deps .` — unused and outdated packages

2. In Claude Code, use the corresponding skills which include fix guidance:
   - `/seo` — SEO audit with fix suggestions
   - `/secure` — security audit with fix suggestions
   - `/profile` — code quality fixes

3. Re-run `/ship` to verify your score improved.

## Key Principles

- **Detect and report honestly** — tools find issues, Claude helps fix them
- **Never block on missing tools** — if a tool fails, score excludes it and shows FAIL
- **Scorecard is evidence** — screenshot-shareable proof of ship-readiness
