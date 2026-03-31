---
name: using-mighty-powers
description: Use when starting any conversation — establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## Instruction Priority

Mighty Powers skills override default system prompt behavior, but **user instructions always take precedence**:

1. **User's explicit instructions** (CLAUDE.md, direct requests) — highest priority
2. **Mighty Powers skills** — override default system behavior where they conflict
3. **Default system prompt** — lowest priority

If CLAUDE.md says "don't use TDD" and a skill says "always use TDD," follow the user's instructions.

## How to Access Skills

**In Claude Code:** Use the `Skill` tool. When you invoke a skill, its content is loaded and presented to you—follow it directly. Never use the Read tool on skill files.

## Skill Catalog

### Phase 1: Analysis (exploring the problem space)

| Skill | When to Use |
|-------|-------------|
| `mighty-powers:research` | Market, domain, or technical research to validate assumptions |
| `mighty-powers:product-brief` | Capture strategic vision when concept is clear |
| `mighty-powers:document-project` | Analyze and document an existing project |

### Phase 2: Planning (defining WHAT to build)

| Skill | When to Use |
|-------|-------------|
| `mighty-powers:brainstorming` | Any new feature, design decision, or problem requiring creative exploration |
| `mighty-powers:create-prd` | Create a Product Requirements Document |
| `mighty-powers:validate-prd` | Validate an existing PRD for completeness and quality |
| `mighty-powers:create-ux-design` | Design user experience, journeys, and design system |

### Phase 3: Solutioning (deciding HOW to build it)

| Skill | When to Use |
|-------|-------------|
| `mighty-powers:create-architecture` | Technical architecture decisions, patterns, and structure |
| `mighty-powers:create-epics` | Break requirements into epics and stories |
| `mighty-powers:generate-project-context` | Generate project context "constitution" for consistent implementation |
| `mighty-powers:check-readiness` | Gate check: is everything ready for implementation? |

### Phase 4: Implementation (building it)

| Skill | When to Use |
|-------|-------------|
| `mighty-powers:writing-plans` | Create detailed implementation plans with bite-sized tasks |
| `mighty-powers:executing-plans` | Execute an implementation plan step by step |
| `mighty-powers:subagent-driven-development` | Dispatch subagents for parallel task execution with two-stage review |
| `mighty-powers:test-driven-development` | ANY code writing — enforces RED-GREEN-REFACTOR cycle |
| `mighty-powers:systematic-debugging` | ANY bug or unexpected behavior — 4-phase root cause process |
| `mighty-powers:quick-dev` | Small, well-understood changes that don't need full planning |
| `mighty-powers:dev-story` | Execute a prepared story with code + tests |
| `mighty-powers:create-story` | Prepare the next story for implementation |

### Git & Branch Workflow

| Skill | When to Use |
|-------|-------------|
| `mighty-powers:git-worktrees` | Create isolated workspaces for feature branches |
| `mighty-powers:finishing-branch` | Complete a development branch (merge, PR, cleanup) |
| `mighty-powers:dispatching-parallel-agents` | Run multiple subagents concurrently |

### Code Review

| Skill | When to Use |
|-------|-------------|
| `mighty-powers:code-review` | Review code for quality, security, and spec compliance |

### Safety & Security

| Skill | When to Use |
|-------|-------------|
| `mighty-powers:guard` | Safety guardrails — block destructive commands, freeze directories |
| `mighty-powers:security-audit` | Comprehensive security audit (secrets, OWASP, auth, crypto) |
| `mighty-powers:pentest` | Penetration testing (XSS, SQLi, SSTI, CORS, JWT) |

### Auditing & Quality

| Skill | When to Use |
|-------|-------------|
| `mighty-powers:ship` | Pre-deploy scorecard — run all auditors, get a ship/no-ship score |
| `mighty-powers:architecture-map` | Generate Mermaid diagrams of system architecture |
| `mighty-powers:verification` | Verify work is actually complete before declaring success |

### Sprint & Project Management

| Skill | When to Use |
|-------|-------------|
| `mighty-powers:sprint` | Sprint pipeline: plan → build → test → review → ship → verify |
| `mighty-powers:retrospective` | Sprint retrospective analysis |
| `mighty-powers:correct-course` | Handle mid-sprint changes or pivots |

### Knowledge & Learning

| Skill | When to Use |
|-------|-------------|
| `mighty-powers:learnings` | Save/search/prune project learnings across sessions |
| `mighty-powers:onboard` | Generate developer onboarding guide |
| `mighty-powers:revise-claude-md` | Keep CLAUDE.md current with project state |

### Advanced

| Skill | When to Use |
|-------|-------------|
| `mighty-powers:party-mode` | Multi-agent roundtable discussion with diverse perspectives |
| `mighty-powers:advanced-elicitation` | Iterative refinement to push LLM output quality |
| `mighty-powers:adversarial-review` | Cynical review to find gaps and flaws |
| `mighty-powers:writing-skills` | Meta: how to write new skills for this plugin |
| `mighty-powers:rescue` | Incident response: diagnostics, rollback, post-mortem |
| `mighty-powers:help` | Phase-aware help — recommends what to do next |

# Using Skills

## The Rule

**Invoke relevant or requested skills BEFORE any response or action.** Even a 1% chance a skill might apply means you should invoke the skill to check. If an invoked skill turns out to be wrong for the situation, you don't need to use it.

## Red Flags

These thoughts mean STOP—you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |
| "I know what that means" | Knowing the concept ≠ using the skill. Invoke it. |

## Skill Priority

When multiple skills could apply, use this order:

1. **Process skills first** (brainstorming, debugging) — these determine HOW to approach the task
2. **Implementation skills second** — these guide execution

"Let's build X" → brainstorming first, then implementation skills.
"Fix this bug" → debugging first, then domain-specific skills.

## Scale-Adaptive Routing

Not every task needs the full 4-phase lifecycle:

| Task Size | Route |
|-----------|-------|
| Quick fix, small tweak | `mighty-powers:quick-dev` |
| Single feature, clear scope | `writing-plans` → `executing-plans` or `test-driven-development` |
| Multi-story feature | `create-prd` → `create-architecture` → `create-epics` → `dev-story` |
| Large initiative | Full lifecycle: Analysis → Planning → Solutioning → Implementation |

## Skill Types

**Rigid** (TDD, debugging, guard): Follow exactly. Don't adapt away discipline.

**Flexible** (patterns, brainstorming): Adapt principles to context.

The skill itself tells you which.

## User Instructions

Instructions say WHAT, not HOW. "Add X" or "Fix Y" doesn't mean skip workflows.
