# Mighty Powers

[![GitHub stars](https://img.shields.io/github/stars/anderson-0/mighty-powers?style=social)](https://github.com/anderson-0/mighty-powers)

Unified Claude Code plugin for full-lifecycle software development. Combines the best of [Superpowers](https://github.com/obra/superpowers), [Ultraship](https://github.com/Houseofmvps/ultraship), and [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) into a single coherent plugin.

## Quick Start

```bash
claude plugin marketplace add anderson-0/mighty-powers
claude plugin install mighty-powers
```

For local development from a clone, use `claude plugin marketplace add ./mighty-powers` instead of the GitHub slug above.

Then in your project:

```
/mp:init  # first-time setup: config, CLAUDE.md, directory structure
```

## What's Included

- **54 skills** covering analysis, planning, solutioning, implementation, auditing, and deployment
- **22 Node.js tools** for security scanning, code profiling, architecture mapping, and more
- **6 named agents** (Reese, Sasha, Winston, Jordan, Quinn, Morgan) for reviews, audits, and multi-agent discussions
- **34 slash commands** for quick access to common workflows
- **Safety guardrails** that block destructive commands automatically
- **Session resilience** — if your IDE crashes, `/resume` picks up exactly where you stopped
- **Wave-based execution** — plans organized into waves with checkpoints; independent tasks within a wave run in parallel

---

## How Routing Works

When you give Claude a task, it follows a decision tree to pick the right level of process. **It defaults to the lightest approach that fits.** It will never use heavyweight BMAD lifecycle planning for a simple feature unless you explicitly ask for it.

```
You give a task
  │
  ├─ Bug fix? → /investigate (4-phase root cause) → fix with appropriate tier
  │
  ├─ You explicitly ask for PRD, architecture, or epics?
  │   → Lifecycle Track (formal planning)
  │
  ├─ New project with unclear scope?
  │   → Claude asks: "Structured planning or jump straight in?"
  │
  ├─ Trivial? (typo, config, < 20 lines)
  │   → Claude asks: "Jump in or plan first?"
  │     ├─ Jump in → TDD → verification
  │     └─ Plan first → treated as Small tier
  │
  ├─ Small? (clear scope, < 100 lines)
  │   → /write-plan → /execute-plan → verification
  │
  ├─ Medium? (single feature, multiple files)
  │   → /brainstorm → /write-plan → /execute-plan → /review
  │
  └─ Needs spec tracking across sessions?
      → /quick-dev (5-step with adversarial review + spec file)
```

The key principle: **pick the smallest tier that fits.** You can always escalate mid-task if the work turns out to be bigger than expected.

---

## How Planning Works

Every implementation plan — regardless of size — is organized into **waves**. This is the core execution model.

### What is a wave?

A wave groups tasks at the same **dependency level** — they all depend on the same set of prior tasks being done. Tasks within a wave MAY be independent (different files, no shared state → run in parallel) or they may need sequential execution (shared files, ordering requirements). Between waves, there is a **checkpoint** where all tests must pass before proceeding.

Not every wave has parallelism. A wave with a single task is perfectly normal. A fully sequential plan (one task per wave) is also fine — waves still provide checkpoints and clear dependency ordering.

### How plans get decomposed into waves

1. All tasks are identified from the spec/requirements
2. A dependency graph is built: which tasks depend on which?
3. Tasks are grouped by dependency level:
   - **Wave 1**: Tasks with no dependencies (foundations, types, interfaces, schemas)
   - **Wave 2**: Tasks that depend only on Wave 1 outputs
   - **Wave 3**: Tasks that depend on Wave 2 outputs
4. Within each wave, tasks are checked for independence (different files, no shared state = parallel; shared files = sequential)
5. Parallelism is maximized: if a task can move to an earlier wave, it does

### Example plan structure

```
Feature: Add webhook retry logic

Wave 1: Foundation (3 independent tasks → parallel)
  Task 1.1: Define retry config schema and types
  Task 1.2: Create retry queue interface
  Task 1.3: Add retry-related database migrations
  → Checkpoint: run full test suite

Wave 2: Core Logic (2 independent tasks → parallel)
  Task 2.1: Implement exponential backoff retry strategy
  Task 2.2: Implement dead letter queue for failed webhooks
  → Checkpoint: run full test suite

Wave 3: Integration (1 task)
  Task 3.1: Wire retry logic into existing webhook dispatcher
  → Checkpoint: run full test suite
```

### What each task contains

Every task is self-contained — a subagent reading only that task has everything it needs:

- Project context (goal, architecture, tech stack)
- What was built in previous waves that this task depends on
- Exact file paths to create/modify
- Complete code (not pseudocode)
- Test code (TDD: write test first)
- Verification commands with expected output

### Plan output on disk

For medium+ plans, a full folder structure is created:

```
docs/plans/webhook-retry/
├── plan.md                 # Overview, wave summary, dependency graph
├── status.yaml             # Execution state (enables /resume)
├── wave-1/
│   ├── wave.md             # Wave overview, entry/checkpoint criteria
│   ├── task-1.1.md         # Self-contained task for subagent
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

For small plans, everything fits in one `plan.md` + `status.yaml`.

### Cost estimation

Before execution starts, you see a cost breakdown:

```
Execution Cost Estimate:
  Wave 1: 3 tasks × haiku     ≈ $0.02
  Wave 2: 2 tasks × sonnet    ≈ $0.08
  Wave 3: 1 task × sonnet     ≈ $0.04
  Reviews: 6 tasks × sonnet   ≈ $0.12
  ─────────────────────────────
  Estimated total:             ≈ $0.26
```

---

## How Execution Works

### Parallel subagent dispatch

For each wave, the plan annotates the execution mode:

- **Parallel tasks** (independent — different files): dispatched as concurrent subagents via Agent tool
- **Sequential tasks** (shared files or ordering): executed one at a time
- **Single task**: just run it

```
Wave 2 execution (2 independent tasks → parallel):
  ┌─ Agent 1: Task 2.1 (sonnet) ──→ implements + self-reviews
  │
  ├─ Agent 2: Task 2.2 (sonnet) ──→ implements + self-reviews
  │
  └─ Both complete ──→ spec review ──→ code quality review ──→ checkpoint
```

### Two-stage review per task

Every task goes through:
1. **Spec compliance review** — Does the code match the plan? Missing features? Extra features?
2. **Code quality review** — Architecture, security, performance, testing, documentation

Each finding gets a confidence score (0-100). Only findings with confidence >= 80 are reported.

### Wave checkpoints

After all tasks in a wave pass both reviews, the full test suite runs. If tests fail, the issue is diagnosed and fixed before moving to the next wave. If tests pass, the next wave begins.

### Model selection

Subagents use the least powerful model that can handle the task:

| Task Type | Model | When |
|-----------|-------|------|
| Mechanical (1-2 files, clear spec) | `haiku` | Most implementation tasks |
| Standard (multi-file, judgment needed) | `sonnet` | Reviews, integration tasks |
| Complex (architecture, design decisions) | `opus` | Architecture review, complex debugging |

---

## How Session Resilience Works

This is the killer feature. If your IDE crashes mid-execution, you lose nothing.

### How state is tracked

Every plan has a `status.yaml` file that is updated after **every state change**:

```yaml
feature: webhook-retry
created: 2026-04-01T10:00:00
last_updated: 2026-04-01T10:45:00
plan_file: docs/plans/webhook-retry/plan.md
current_wave: 2
status: in_progress

waves:
  1:
    status: completed
    completed_at: 2026-04-01T10:30:00
    checkpoint:
      tests_passed: true
    tasks:
      1.1: { status: completed, completed_at: "2026-04-01T10:15:00" }
      1.2: { status: completed, completed_at: "2026-04-01T10:20:00" }
      1.3: { status: completed, completed_at: "2026-04-01T10:25:00" }

  2:
    status: in_progress
    tasks:
      2.1: { status: completed, completed_at: "2026-04-01T10:40:00" }
      2.2: { status: in_progress, started_at: "2026-04-01T10:35:00" }
```

### What happens after a crash

```
1. You restart the IDE
2. Session-start hook scans docs/plans/*/status.yaml
3. Finds status: in_progress → tells you:

   "Found in-progress plan: webhook-retry (wave 2).
    Want to resume?"

4. You say yes → /resume reads status.yaml
5. Shows you the state:

   Wave 1: ✓ completed (3/3 tasks)
   Wave 2: ◐ in progress
     2.1 ✓ completed
     2.2 ◑ was in progress
   Wave 3: ○ pending

6. Asks: "Resume from task 2.2?"
7. Reads task-2.2.md (self-contained context)
8. Checks git diff to see what was already done
9. Continues from the first incomplete step
```

### If you don't want to resume

If you decline, Claude asks: "Want me to mark this plan as abandoned so I don't ask again?" If yes, `status.yaml` is set to `status: abandoned` and it's never detected again. The files stay on disk for reference.

### Check progress without resuming

```
/status                           # shows all plans
/status docs/plans/webhook-retry  # shows specific plan
```

Read-only — doesn't modify files or trigger execution.

---

## How the Sprint Pipeline Works

`/sprint` chains the full lifecycle into a 6-phase pipeline with automatic agent dispatch at phase gates:

```
PLAN → BUILD → TEST → REVIEW → SHIP → VERIFY
```

### Phase gates with agent orchestration

| Gate | What happens | Agents dispatched |
|------|-------------|-------------------|
| PLAN → BUILD | Plan approved by user | None |
| BUILD → TEST | Implementation complete | None (TDD is built into BUILD) |
| TEST → REVIEW | All tests pass | None |
| REVIEW → SHIP | **Auto-dispatch 2 parallel agents**: Reese (code review) + Sasha (security audit). Both must pass. | code-reviewer + security-auditor |
| SHIP → VERIFY | **`/ship` scorecard**: 3 parallel audit agents. Score must be >= 80. | security + code quality + bundle |
| VERIFY → DONE | Production health verified | Morgan (incident-responder) if issues detected |

### Scorecard

```
+===========================================+
|    M I G H T Y   P O W E R S   S C O R E |
+===========================================+
|  Security        92/100  ############-    |
|  Code Quality    88/100  ###########--    |
|  Bundle Size     97/100  ############-    |
+===========================================+
|   OVERALL         92/100                  |
|   STATUS          READY TO SHIP           |
+===========================================+
```

- **>= 80**: READY TO SHIP
- **60-79**: NEEDS WORK
- **< 60**: NOT READY

---

## How Security Works

Security is layered across three levels:

### Level 1: Guardrails (always active)

PreToolUse hooks automatically block dangerous commands before they execute:

- `rm -rf`, `DROP TABLE`, `TRUNCATE`
- `git push --force` to main/master
- `git reset --hard`, `git checkout .`, `git clean -f`, `git restore .`
- `kubectl delete`, `docker system prune`
- Remote scripts piped to shell (`curl | bash`)
- base64-encoded payloads piped to shell
- Python/Perl destructive one-liners

No configuration needed — always on. Use `/guard` to manage directory freezing (restrict edits to a specific path).

### Level 2: Security audit (on-demand)

`/secure` runs a two-pronged analysis:

**Automated tools** (fast, pattern-matching):
- `secret-scanner` — AWS keys, JWT, DB URLs, private keys, GitHub tokens
- `dep-doctor` — unused/outdated dependencies with known CVEs

**Sasha the security agent** (reasoning-based, dispatched in parallel):
- 8-category audit: dependencies, secrets, OWASP patterns, auth weaknesses, input validation, cryptography, supply chain, data exposure
- Each finding has severity + proof-of-concept
- Checks for: CORS misconfig, missing rate limiting, JWT without expiry, session fixation, CSRF, IDOR, path traversal, command injection, SSRF, prototype pollution

### Level 3: Penetration testing (on-demand)

`/pentest` runs static analysis for exploitable vulnerabilities:
- XSS (innerHTML, dangerouslySetInnerHTML)
- SQLi (string concatenation in queries)
- SSTI (server-side template injection)
- Command injection (exec/execSync)
- CORS misconfiguration
- JWT flaws
- GraphQL introspection
- Prototype pollution
- Race conditions

Every finding requires a proof-of-concept — zero false positives.

### Level 4: Sprint gate (automatic)

At the REVIEW → SHIP gate in `/sprint`, Sasha is automatically dispatched alongside Reese. Security issues block shipping.

---

## Multi-Agent Orchestration

Skills dispatch specialized agents via Claude Code's Agent tool. Each agent is a real subagent with independent thinking — not roleplay.

| Agent | Persona | Expertise | Dispatched by |
|-------|---------|-----------|---------------|
| **Reese** | Direct, spots what others miss | Code quality, spec compliance, design patterns | `/review`, `/sprint` gate, subagent-driven-dev |
| **Sasha** | Thinks like an attacker | Security, vulnerabilities, attack vectors | `/secure`, `/ship`, `/sprint` gate |
| **Winston** | Vision meets pragmatism | Architecture, scalability, trade-offs | `/party`, architecture reviews |
| **Jordan** | Challenges assumptions | Requirements, user needs, prioritization | `/party`, PRD reviews |
| **Quinn** | Methodical edge-case finder | Testing strategy, quality gates, coverage | `/party`, test strategy |
| **Morgan** | Calm under pressure | Operations, reliability, incident response | `/rescue` |

### How agents are dispatched

**Single dispatch** (e.g., `/review`): One agent runs, returns findings.

**Parallel dispatch** (e.g., `/ship`): Multiple agents dispatched in a single message — all run concurrently:
```
/ship dispatches simultaneously:
  Agent 1 (Sasha): security scan
  Agent 2 (Reese): code quality scan
  Agent 3 (haiku): bundle size scan
→ All complete → aggregate into scorecard
```

**Party mode** (`/party`): 2-4 agents participate in a roundtable discussion. Each agent is spawned independently and responds with genuine disagreement — not polite consensus. You can also request ad-hoc personas ("a skeptical CTO", "a junior engineer new to the codebase").

---

## Commands

| Command | Description |
|---------|-------------|
| `/mp:init` | First-time project setup |
| `/brainstorm` | Design exploration before implementation |
| `/write-plan` | Create wave-based implementation plan |
| `/execute-plan` | Execute plan wave-by-wave (parallel where possible) |
| `/quick-dev` | Fast flow for small changes |
| `/investigate` | Systematic debugging (4-phase root cause) |
| `/review` | Two-stage code review with confidence scoring |
| `/secure` | Comprehensive security audit (tool + agent) |
| `/pentest` | Penetration testing |
| `/ship` | Pre-deploy scorecard (3 parallel audit agents) |
| `/sprint` | Full pipeline: plan → build → test → review → ship → verify |
| `/guard` | Manage safety guardrails, freeze directories |
| `/rescue` | Incident response — diagnose, rollback, post-mortem |
| `/party` | Multi-agent roundtable discussion |
| `/status` | Check plan progress (read-only) |
| `/resume` | Resume interrupted plan after session crash |
| `/learn` | Save/search/digest/recall project learnings |
| `/codex` | Generate compact codebase index (routes, schema, components) |
| `/staying-current` | Verify version-sensitive facts against current sources |
| `/retro` | Sprint retrospective |
| `/onboard` | Generate developer onboarding guide |
| `/architecture` | Generate Mermaid architecture diagrams |
| `/deploy` | Pre-deploy checks |
| `/canary` | Post-deploy health check |
| `/health` | Quick health check |
| `/help` | Phase-aware help and recommendations |
| `/revise-claude-md` | Update CLAUDE.md |

## Configuration

Run `/mp:init` for guided setup, or manually create `.mighty-powers/config.yaml`:

```yaml
project_name: "My Project"
user_name: "Developer"
communication_language: "English"
document_output_language: "English"
planning_artifacts: "docs/planning"
implementation_artifacts: "docs/implementation"
output_folder: "docs/planning"
project_knowledge: "docs"
```

`/mp:init` also creates `docs/plans/`, lifecycle artifact directories, and `.mighty-powers/custom/` for skill overrides. Use `/help` when you are unsure which lifecycle step to run next.

## Credits

Built on the shoulders of:
- [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent — TDD, debugging, subagent development, brainstorming
- [Ultraship](https://github.com/Houseofmvps/ultraship) by Kaileskkhumar — Safety guardrails, audit tools, pre-deploy scorecard
- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) by bmad-code-org — Lifecycle methodology, PRD/architecture workflows, agent personas

## License

MIT
