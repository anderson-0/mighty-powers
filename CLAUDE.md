# Mighty Powers — Contributor Guide

## Project Overview

Unified Claude Code plugin combining Superpowers (dev workflow discipline), Ultraship (safety + audit tools), and BMAD Method (lifecycle methodology). 56 skills, 22 tools, 6 agents, 36 commands.

## Project Structure

```
skills/          — Skill definitions (SKILL.md + supporting files per skill)
commands/        — Slash command wrappers (thin files invoking skills)
agents/          — Subagent role definitions (system prompts)
hooks/           — Session start bootstrap + safety guard hooks
tools/           — Node.js ESM tools (zero deps except htmlparser2 for SEO)
tools/lib/       — Shared libraries (security.mjs, monorepo.mjs, codebase-walk.mjs, codebase-stack.mjs, codebase-routes.mjs, codebase-schema.mjs, codebase-ui.mjs)
tests/           — Tool tests using node:test
docs/plan/       — Implementation plan (9 phase files)
```

## Skill Format

Each skill lives in `skills/<name>/SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: When to use this skill
---
```

Complex workflows (PRD, architecture, UX design) use step-file architecture:
- `SKILL.md` — entry point
- `workflow.md` — orchestration logic
- `steps/step-NN-*.md` — individual step files
- `templates/*.md` — output templates

## Cross-Reference Convention

All skill cross-references use `mp:<skill-name>` format. Never reference skills by file path.

## Storage Convention

Tools that persist data use `.mighty-powers/` in the project root:
- `learnings.json`, `audit-history.json`, `bundle-history.json`
- `canary-baselines.json`, `cost-log.json`, `guard-freeze.txt`
- `config.yaml`

## Running Tests

```bash
npm test
```

## Modifying Skills

- Rigid skills (TDD, debugging, guard) should not have their discipline weakened
- Flexible skills (brainstorming, patterns) can be adapted
- After modifying a skill, update the catalog in `skills/using-mighty-powers/SKILL.md` if the name or description changed
- Add a command wrapper in `commands/` if the skill should be a slash command

## Adding New Skills

1. Create `skills/<name>/SKILL.md` with frontmatter
2. Add entry to the skill catalog in `skills/using-mighty-powers/SKILL.md`
3. Optionally create `commands/<name>.md` for slash command access
4. Update README.md skill tables
