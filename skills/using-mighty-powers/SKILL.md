---
name: using-mighty-powers
description: Use when starting any conversation — establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

## Instruction Priority

Mighty Powers skills override default system prompt behavior, but **user instructions always take precedence**:

1. **User's explicit instructions** (CLAUDE.md, direct requests) — highest priority
2. **Mighty Powers skills** — override default system behavior where they conflict
3. **Default system prompt** — lowest priority

## How to Access Skills

**In Claude Code:** Use the `Skill` tool. When you invoke a skill, its content is loaded and presented to you—follow it directly. Never use the Read tool on skill files.

---

# ROUTING: The Most Important Section

<EXTREMELY-IMPORTANT>
Mighty Powers has 3 tracks. You MUST pick the right track based on the task. Getting this wrong means either wasting the user's time with overkill process OR shipping sloppy work without enough discipline.

**Default to the Quick Track.** Only escalate to Lifecycle Track when the user explicitly asks for it or the task genuinely requires multi-epic planning.
</EXTREMELY-IMPORTANT>

## Track 1: Quick Track (use 80% of the time)

**For:** Bug fixes, single features, refactors, small-to-medium changes, anything with clear scope.

**How to recognize:** The user says "add X", "fix Y", "change Z", "implement this feature", or describes a single clear task.

Quick Track has 4 size tiers. **Pick the smallest tier that fits the task.**

### Tier 1: Trivial (fix a typo, change a config value, rename something)

No planning, no spec. Just do it with discipline.

```
test-driven-development → verification
```

1. Use `mighty-powers:test-driven-development` — write a test if applicable, make the change
2. Use `mighty-powers:verification` — run tests, confirm everything passes

That's it. No brainstorming, no plans, no review subagents.

### Tier 2: Small (clear scope, < 100 lines, one file or a few files)

Light planning, no design exploration needed.

```
writing-plans → executing-plans → verification
```

1. Use `mighty-powers:writing-plans` — break into 2-5 minute tasks with exact file paths
2. Use `mighty-powers:executing-plans` — execute with TDD during each task
3. Use `mighty-powers:verification` — run tests, confirm complete

### Tier 3: Medium (single feature, clear scope, multiple files)

Full Quick Track with optional design exploration.

```
brainstorming → writing-plans → executing-plans → code-review → verification
     ↑
  (skip if
  scope is
  obvious)
```

1. `mighty-powers:brainstorming` — only if the approach isn't obvious. **Skip if you know what to build.**
2. `mighty-powers:writing-plans` — detailed plan with bite-sized tasks
3. `mighty-powers:executing-plans` — execute with TDD. Use `mighty-powers:subagent-driven-development` if tasks are independent.
4. `mighty-powers:code-review` — two-stage review before merge
5. `mighty-powers:verification` — final check

### Tier 4: Structured Small (needs spec tracking across sessions)

For when the change is small but you need a formal spec document — e.g., the work will span multiple sessions, or you want adversarial review of the approach before coding.

```
quick-dev (5-step workflow with spec file)
```

1. Use `mighty-powers:quick-dev` — clarify intent → plan → implement → adversarial review → present
2. This creates a spec file in `docs/implementation/` that tracks progress

**Use Tier 4 only when Tier 2-3 isn't enough** — when you need the spec as a persistent artifact.

### Bug fixes at any size

Always start with `mighty-powers:systematic-debugging` — 4-phase root cause process. Then apply the appropriate tier above for the fix.

### Supporting skills (available in all tiers)

| Skill | When |
|-------|------|
| `mighty-powers:test-driven-development` | During ANY code writing — write test first, then code |
| `mighty-powers:systematic-debugging` | ANY bug or unexpected behavior — root cause first |
| `mighty-powers:git-worktrees` | When you need an isolated workspace |
| `mighty-powers:finishing-branch` | When branch is ready to merge/PR |
| `mighty-powers:dispatching-parallel-agents` | When plan has independent parallelizable tasks |

## Track 2: Lifecycle Track (use only when needed)

**For:** New projects from scratch, multi-epic features, unclear/complex scope, team handoff artifacts.

**How to recognize:** The user says "build a new app", "design the architecture for X", "create a PRD", "plan out this large initiative", or explicitly asks for structured planning artifacts. The work will span multiple sessions or involve multiple developers.

<HARD-GATE>
DO NOT use Lifecycle Track skills unless:
- The user explicitly requests them (e.g., "create a PRD", "design the architecture")
- OR the task genuinely requires multi-epic planning (3+ distinct features that must be coordinated)
- OR the user asks to "start from scratch" on a new project

"Add a login page" is Quick Track, not Lifecycle. "Build a complete authentication system with OAuth, MFA, session management, and admin panel" MIGHT be Lifecycle if the user wants formal planning.

When in doubt, start with Quick Track. You can always escalate later.
</HARD-GATE>

**Flow:**
```
Analysis → Planning → Solutioning → Implementation
   ↓           ↓           ↓              ↓
research    create-prd   create-arch    dev-story
product-    create-ux    create-epics   (uses Quick
brief       design       check-ready    Track skills
                         gen-context    during execution)
```

**Skills in this track:**

| Phase | Skill | When |
|-------|-------|------|
| Analysis | `mighty-powers:research` | Validate assumptions with domain/market/technical research |
| Analysis | `mighty-powers:product-brief` | Capture strategic vision |
| Analysis | `mighty-powers:document-project` | Document an existing project |
| Planning | `mighty-powers:create-prd` | Create a Product Requirements Document |
| Planning | `mighty-powers:validate-prd` | Validate an existing PRD |
| Planning | `mighty-powers:create-ux-design` | Design user experience and journeys |
| Solutioning | `mighty-powers:create-architecture` | Technical architecture decisions |
| Solutioning | `mighty-powers:create-epics` | Break requirements into epics and stories |
| Solutioning | `mighty-powers:generate-project-context` | Generate project "constitution" |
| Solutioning | `mighty-powers:check-readiness` | Gate check before implementation |
| Implementation | `mighty-powers:create-story` | Prepare next story |
| Implementation | `mighty-powers:dev-story` | Execute a story (uses TDD internally) |
| Management | `mighty-powers:sprint` | Sprint pipeline: plan → build → test → review → ship → verify |
| Management | `mighty-powers:retrospective` | Sprint retrospective |
| Management | `mighty-powers:correct-course` | Mid-sprint pivots |

**You don't need ALL phases.** If the user already has a PRD, skip to Solutioning. If they already have architecture + epics, skip to Implementation.

## Track 3: Audit Track (on-demand)

**For:** Quality gates, security checks, pre-deploy verification, incidents. These are invoked explicitly or at natural checkpoints, not as part of a development flow.

| Skill | When |
|-------|------|
| `mighty-powers:guard` | Manage safety guardrails, freeze directories |
| `mighty-powers:security-audit` | User asks to audit security, or before shipping sensitive changes |
| `mighty-powers:pentest` | User asks for penetration testing |
| `mighty-powers:ship` | Pre-deploy scorecard — user asks "are we ready to ship?" |
| `mighty-powers:architecture-map` | User asks for architecture diagrams |
| `mighty-powers:rescue` | Production incident — diagnostics, rollback, post-mortem |

## Track 4: Knowledge & Advanced (on-demand)

| Skill | When |
|-------|------|
| `mighty-powers:learnings` | User wants to save/search project learnings |
| `mighty-powers:onboard` | User asks for an onboarding guide |
| `mighty-powers:revise-claude-md` | User asks to update CLAUDE.md |
| `mighty-powers:party-mode` | User asks for a multi-agent discussion |
| `mighty-powers:advanced-elicitation` | User wants to push output quality |
| `mighty-powers:adversarial-review` | User wants a cynical review of a plan/document |
| `mighty-powers:writing-skills` | User wants to create new skills |
| `mighty-powers:help` | User asks for help or "what should I do next?" |

---

# Routing Decision Tree

When a user gives you a task, follow this decision tree:

```
User gives a task
    │
    ├─ Is it a bug fix or unexpected behavior?
    │   └─ YES → mighty-powers:systematic-debugging → then fix using appropriate tier
    │
    ├─ Is it a question, research, or exploration?
    │   └─ YES → Answer directly (no skill needed) unless user asks for formal research
    │
    ├─ Does the user explicitly ask for a PRD, architecture, epics, or lifecycle planning?
    │   └─ YES → Lifecycle Track (Track 2)
    │
    ├─ Is it a new project from scratch with unclear scope?
    │   └─ YES → Ask the user: "Do you want structured planning (PRD, architecture, epics)
    │   │         or jump straight to implementation?"
    │   │   ├─ Structured → Lifecycle Track
    │   │   └─ Jump in → Quick Track Tier 3 (brainstorming first)
    │
    ├─ Is it trivial? (typo, config change, rename, < 20 lines)
    │   └─ YES → Quick Track Tier 1: TDD → verification
    │
    ├─ Is it small? (clear scope, < 100 lines, few files)
    │   └─ YES → Quick Track Tier 2: writing-plans → executing-plans → verification
    │
    ├─ Is it a single feature? (clear scope, multiple files)
    │   └─ YES → Quick Track Tier 3: brainstorming? → writing-plans → executing-plans
    │             → code-review → verification
    │
    ├─ Does it need a persistent spec artifact? (multi-session, needs adversarial review)
    │   └─ YES → Quick Track Tier 4: mighty-powers:quick-dev
    │
    └─ Default → Quick Track Tier 2 or 3 based on scope
```

**Key principle: pick the smallest tier that fits.** You can always escalate mid-task if the work turns out to be bigger than expected.

---

# Using Skills

## The Rule

**Invoke the skill for the CORRECT TRACK before any response or action.** The routing decision tree above determines which skill to invoke. Do not invoke Lifecycle Track skills for Quick Track tasks.

## Red Flags

These thoughts mean STOP—you're making a routing error:

| Thought | Reality |
|---------|---------|
| "Let me create a PRD for this bug fix" | Bug fix = Quick Track. Use `systematic-debugging`. |
| "I should create architecture docs for this feature" | Single feature = Quick Track unless user asks for it. |
| "Let me break this into epics" | Epics are Lifecycle Track. Single feature just needs `writing-plans`. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "This is just a simple question" | Questions are tasks. Check for applicable skills. |
| "I remember this skill" | Skills evolve. Read current version. |
| "The skill is overkill" | Use the RIGHT track, not the BIGGEST track. Quick Track is not overkill. |
| "I'll just do this one thing first" | Check routing BEFORE doing anything. |

## Skill Types

**Rigid** (TDD, debugging, guard): Follow exactly. Don't adapt away discipline.

**Flexible** (brainstorming, patterns): Adapt principles to context.

## User Instructions

Instructions say WHAT, not HOW. "Add X" or "Fix Y" doesn't mean skip workflows — but it also doesn't mean escalate to Lifecycle Track.

---

# Agent Orchestration

Many skills dispatch specialized subagents for review, audit, or parallel work. This is a core strength of the plugin — use it whenever possible to improve quality and speed.

## Standard Dispatch Pattern

Use Claude Code's built-in **Agent tool** to dispatch subagents:

```
Agent tool call:
  prompt: [Agent role instructions from agents/<name>.md] + [Task-specific context]
  description: Short label (e.g., "security audit", "code review")
  model: Choose based on task complexity (see below)
```

## Parallel Dispatch

When multiple agents are independent, **dispatch them all in a single response** so they run concurrently:

```
Single message with multiple Agent tool calls:
  Agent 1: security-auditor → scans for vulnerabilities
  Agent 2: code-reviewer → reviews code quality
  Agent 3: bundle audit → checks build size
All three run in parallel. Collect results when all complete.
```

## Model Selection

Use the least powerful model that can handle the role:

| Task Type | Model | Examples |
|-----------|-------|----------|
| Fast/mechanical | `haiku` | Bundle size check, secret scanning, pattern matching |
| Standard reasoning | `sonnet` | Code review, security audit, test generation |
| Deep judgment | `opus` | Architecture review, design decisions, complex debugging |

Pass the model via the Agent tool's `model` parameter.

## Shared Agent Definitions

Reusable agent prompts live in `agents/`:

| Agent | Use For |
|-------|---------|
| `agents/code-reviewer.md` | Two-stage code review (spec + quality) with confidence scoring |
| `agents/security-auditor.md` | 8-category security audit |
| `agents/architect.md` | Architecture review and ADR recommendations |
| `agents/product-manager.md` | PRD review and requirements validation |
| `agents/qa-engineer.md` | Test coverage review and test strategy |
| `agents/incident-responder.md` | Incident diagnosis, rollback planning, post-mortem |

When a skill dispatches a subagent, it reads the agent definition and includes it in the prompt along with task-specific context. The subagent never inherits the parent session's history.

## Skills That Orchestrate Agents

| Skill | Agents Dispatched | Pattern |
|-------|-------------------|---------|
| `code-review` | code-reviewer | Single agent dispatch after implementation |
| `ship` | security-auditor + code-reviewer + bundle auditor | 3 parallel agents for scorecard |
| `sprint` | code-reviewer, security-auditor at phase gates | Automatic at BUILD→REVIEW, REVIEW→SHIP |
| `security-audit` | security-auditor + secret-scanner tool | Agent reasoning + automated scanning |
| `rescue` | incident-responder | Single agent for diagnosis |
| `party-mode` | Any combination of agents | 2-4 agents per round, parallel spawn |
| `subagent-driven-development` | implementer + spec-reviewer + quality-reviewer | Per-task cycle with two-stage review |
| `brainstorming` | spec-document-reviewer | Single agent after design spec |
| `writing-plans` | plan-document-reviewer | Single agent after plan written |
