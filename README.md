# Mighty Powers

Unified Claude Code plugin for full-lifecycle software development. Combines the best of [Superpowers](https://github.com/obra/superpowers), [Ultraship](https://github.com/Houseofmvps/ultraship), and [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) into a single coherent plugin.

## Quick Start

```bash
claude plugin install --path /path/to/mighty-powers
```

## What's Included

- **42 skills** covering analysis, planning, solutioning, implementation, auditing, and deployment
- **19 Node.js tools** for security scanning, code profiling, architecture mapping, and more
- **6 specialized agents** for code review, security, architecture, PM, QA, and incident response
- **22 slash commands** for quick access to common workflows
- **Safety guardrails** that block destructive commands (rm -rf, git push --force, DROP TABLE)

## Skill Catalog

### Phase 1: Analysis

| Skill | Command | Description |
|-------|---------|-------------|
| `research` | — | Domain, market, or technical research |
| `product-brief` | — | Product brief creation |
| `document-project` | — | Analyze and document existing project |

### Phase 2: Planning

| Skill | Command | Description |
|-------|---------|-------------|
| `brainstorming` | `/brainstorm` | Socratic design exploration before implementation |
| `create-prd` | — | Create a Product Requirements Document (12-step workflow) |
| `validate-prd` | — | Validate PRD completeness and quality |
| `create-ux-design` | — | UX design with journeys, design system, accessibility |

### Phase 3: Solutioning

| Skill | Command | Description |
|-------|---------|-------------|
| `create-architecture` | `/architecture` | Technical architecture with ADRs |
| `create-epics` | — | Break requirements into epics and stories |
| `generate-project-context` | — | Generate project "constitution" for consistent implementation |
| `check-readiness` | — | Gate check: ready for implementation? |

### Phase 4: Implementation

| Skill | Command | Description |
|-------|---------|-------------|
| `writing-plans` | `/write-plan` | Detailed implementation plans with bite-sized tasks |
| `executing-plans` | `/execute-plan` | Execute plans step by step |
| `subagent-driven-development` | — | Parallel task execution with two-stage review |
| `test-driven-development` | — | TDD: no production code without a failing test first |
| `systematic-debugging` | `/investigate` | 4-phase root cause process |
| `quick-dev` | `/quick-dev` | Fast flow for small, well-understood changes |
| `dev-story` | — | Execute a prepared story with code + tests |
| `create-story` | — | Prepare next story for implementation |

### Git & Branch Workflow

| Skill | Description |
|-------|-------------|
| `git-worktrees` | Isolated workspaces for feature branches |
| `finishing-branch` | Merge, PR, or cleanup a development branch |
| `dispatching-parallel-agents` | Run multiple subagents concurrently |

### Safety & Security

| Skill | Command | Description |
|-------|---------|-------------|
| `guard` | `/guard` | Block destructive commands, freeze directories |
| `security-audit` | `/secure` | Secrets, OWASP, auth, crypto audit |
| `pentest` | `/pentest` | XSS, SQLi, SSTI, CORS, JWT testing |

### Auditing & Quality

| Skill | Command | Description |
|-------|---------|-------------|
| `ship` | `/ship` | Pre-deploy scorecard across security, quality, bundle |
| `architecture-map` | `/architecture` | Generate Mermaid architecture diagrams |
| `verification` | — | Verify work is complete before declaring success |

### Sprint & Project Management

| Skill | Command | Description |
|-------|---------|-------------|
| `sprint` | `/sprint` | Full pipeline: plan → build → test → review → ship → verify |
| `retrospective` | `/retro` | Data-driven sprint retrospective |
| `correct-course` | — | Handle mid-sprint changes or pivots |
| `code-review` | `/review` | Two-stage review with confidence scoring |

### Knowledge & Learning

| Skill | Command | Description |
|-------|---------|-------------|
| `learnings` | `/learn` | Save/search/prune project learnings |
| `onboard` | `/onboard` | Generate developer onboarding guide |
| `revise-claude-md` | `/revise-claude-md` | Keep CLAUDE.md current |

### Advanced

| Skill | Command | Description |
|-------|---------|-------------|
| `party-mode` | `/party` | Multi-agent roundtable discussion |
| `advanced-elicitation` | — | Push LLM output quality with iterative refinement |
| `adversarial-review` | — | Cynical review to find gaps and flaws |
| `writing-skills` | — | Meta: how to write new skills |
| `rescue` | `/rescue` | Incident response and rollback |
| `help` | `/help` | Phase-aware help and recommendations |

## Scale-Adaptive Routing

Not every task needs the full lifecycle:

| Task Size | Route |
|-----------|-------|
| Quick fix | `/quick-dev` |
| Single feature | `/write-plan` → `/execute-plan` |
| Multi-story feature | `create-prd` → `create-architecture` → `create-epics` → `dev-story` |
| Large initiative | Full 4-phase: Analysis → Planning → Solutioning → Implementation |

## Tools

19 Node.js tools in `tools/` for automated analysis:

| Tool | Purpose |
|------|---------|
| `secret-scanner` | Detect leaked secrets |
| `code-profiler` | N+1 queries, sync I/O, memory leaks |
| `dep-doctor` | Unused/outdated dependencies |
| `pentest-scanner` | XSS, SQLi, SSTI, CORS, JWT vulnerabilities |
| `architecture-mapper` | Generate Mermaid diagrams |
| `learnings-manager` | Project learnings CRUD |
| `bundle-tracker` | Build size tracking |
| `canary-monitor` | Post-deploy health verification |
| `health-check` | HTTP status, SSL, response time |
| `env-validator` | .env vs .env.example comparison |
| `migration-checker` | Pending database migrations |
| `api-smoke-test` | API endpoint smoke tests |
| `incident-commander` | Incident diagnosis and rollback |
| `retro-analyzer` | Git velocity and sprint analysis |
| `onboard-generator` | Developer onboarding guide |
| `demo-prep` | Find console.logs, TODOs, broken links |
| `audit-history` | Track audit scores over time |
| `cost-tracker` | AI token usage tracking |
| `pattern-analyzer` | Codebase pattern analysis |

## Configuration

Optional `.mighty-powers/config.yaml` for BMAD lifecycle skills:

```yaml
project_name: "My Project"
user_name: "Developer"
communication_language: "English"
document_output_language: "English"
planning_artifacts: "docs/planning"
implementation_artifacts: "docs/implementation"
```

## Safety Guardrails

The plugin includes PreToolUse hooks that automatically block destructive commands:
- `rm -rf` (recursive removal)
- `DROP TABLE` / `TRUNCATE` (SQL destruction)
- `git push --force` to main/master
- `git reset --hard`, `git checkout .`, `git clean -f`
- `kubectl delete`, `docker system prune`
- Remote scripts piped to shell

Use `/guard` to manage guardrails and directory freezing.

## Credits

Built on the shoulders of:
- [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent — TDD, debugging, subagent development, brainstorming
- [Ultraship](https://github.com/Houseofmvps/ultraship) by Kaileskkhumar — Safety guardrails, audit tools, pre-deploy scorecard
- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) by bmad-code-org — Lifecycle methodology, PRD/architecture workflows, agent personas

## License

MIT
