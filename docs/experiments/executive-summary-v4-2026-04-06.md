# mighty-powers v4 — Executive Summary (2026-04-06)

## What Changed

v4 replaced CLI subprocess spawning with the Agent tool's in-process subagents and wired in `filter-output.mjs` to compress test/lint output.

**Three changes from v3:**

1. **In-process subagents instead of `claude -p`** — The orchestration loop runs directly in the top-level Claude Code session and dispatches subagents via the Agent tool. Subagents run in-process and share the parent session's prompt cache.

2. **3 subagents instead of 7** — Foundation + Features A (F1/F2/F3) + Features B+Quality (F4/F5/F6 + quality pass). Fewer handoffs, same TDD discipline.

3. **filter-output.mjs wired in** — All `npm test`, `tsc`, and `eslint` runs pipe through the filter tool. Vitest JSON reporter output collapses to a one-line summary ("PASS 40/40"). tsc collapses to "No errors". ESLint collapses to a grouped-by-file summary. Keeps subagent context windows lean across multiple RED/GREEN cycles.

## Token Efficiency

The dominant result of this run is the token reduction.

| Version | Architecture | Total Tokens | vs v4 |
|---------|-------------|-------------|-------|
| v3 (7 sequential CLI subprocesses) | `claude -p` per feature | ~15,000,000 | +96% |
| v2 (7 parallel CLI subprocesses) | `claude -p` per feature | ~15,000,000 | +96% |
| v1 (1 inline session) | Single session, no subagents | ~12,540,000 | +64% |
| **v4 (3 in-process subagents)** | Agent tool | **7,646,431** | baseline |

**Why the gap is so large:** Each `claude -p` subprocess starts a fresh context window. At this task's scale — a 1,200-line CLAUDE.md, a spec doc, and an architecture doc — each session pays roughly 3-4M tokens just to reload context before doing any work. Seven subprocesses = 21-28M tokens in baseline overhead alone. In-process Agent tool subagents share the parent session's prompt cache; subsequent loads are cache hits, not full reloads. v4's three subagents cost a combined 7.6M tokens for the entire run.

## Quality

v4 matches v3's quality output exactly: 25/25 completeness, 40/40 tests, 93.28% coverage (up from 91.08% in the competition run), 0 TypeScript errors, 0 ESLint errors.

## What Didn't Work (Development Notes)

One dead end before the final architecture:

**Delegating the dispatch loop to an orchestrator subagent.** The natural pattern is to spawn an orchestrator agent that reads CLAUDE.md and dispatches the three subagents. This fails because Agent-tool-spawned subagents don't have the Agent tool in their own toolset. The orchestrator tried `ToolSearch select:Agent`, got no results, concluded it was unavailable, and fell back to spawning `claude -p` subprocesses — reproducing the exact problem we were trying to fix.

Fix: run the dispatch loop directly in the top-level Claude Code session (which always has the Agent tool), not in a delegated subagent.

## Recommendation for v5

Two directions worth exploring:

1. **Measure the filter-output.mjs contribution in isolation.** v4 changed two things at once (in-process subagents + filter-output). The token reduction is almost certainly dominated by cache sharing, but a controlled run with in-process subagents but without filter-output would confirm this.

2. **Optimize the Features A subagent** — it was the most expensive at 3.1M tokens vs ~2.25M for the other two. F2 (deck management) is the largest feature with 5 test files and the most component work; if further token reduction is a goal, splitting F2 out or tightening its instructions is the lever.
