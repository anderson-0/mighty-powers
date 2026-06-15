---
name: init
description: First-time project setup for Mighty Powers. Creates config file, artifact directories, offers to generate CLAUDE.md, and explains available workflows.
---

# Initialize Mighty Powers

Set up a project to use Mighty Powers effectively. Run this once when you first install the plugin in a project.

BMAD no longer ships a separate init skill — orientation is handled by help. Mighty Powers combines both: `/mp:init` scaffolds project config and directories; `/help` guides what to do next in the lifecycle.

## How to Trigger

```
/mp:init
```

## Process

### Step 1: Check Current State

Check what already exists:
- `.mighty-powers/config.yaml` — project config (shared, commit this)
- `.mighty-powers/config.user.yaml` — optional personal overrides (gitignore)
- `.mighty-powers/custom/` — optional skill customization TOML files
- `CLAUDE.md` — project instructions for Claude
- `docs/plans/` — Quick Track plan directory
- `docs/planning/` and `docs/implementation/` — Lifecycle artifact directories (or paths from config)
- `package.json` or equivalent — project metadata

Report what was found and what's missing.

### Step 2: Create Config

If `.mighty-powers/config.yaml` doesn't exist, create `.mighty-powers/` first, then write:

```yaml
# Mighty Powers project configuration
# See: https://github.com/anderson-0/mighty-powers

project_name: "<detected from package.json or directory name>"
user_name: "Developer"
communication_language: "English"
document_output_language: "English"

# Where planning artifacts are saved (PRDs, research, UX, architecture)
planning_artifacts: "docs/planning"

# Where implementation artifacts are saved (stories, sprint status, specs)
implementation_artifacts: "docs/implementation"

# Default output root for skills that reference {output_folder} (brainstorm-session, project-context, etc.)
# Usually matches planning_artifacts; override if you want a separate tree
output_folder: "docs/planning"

# Additional project knowledge files (read by lifecycle skills)
project_knowledge: "docs"
```

Ask the user to customize:
- **project_name**: auto-detect from package.json, Cargo.toml, go.mod, etc.
- **user_name**: who the agent should address
- **communication_language**: default English, ask if they prefer another
- **planning/implementation/output paths**: suggest defaults above, let them override

If config already exists but is missing `output_folder`, offer to add it (default to the same value as `planning_artifacts`).

Mention optional personal overrides: `.mighty-powers/config.user.yaml` for machine-local settings (gitignored).

### Step 3: Create Directories

After config exists (created or already present), read path values from it and ensure directories exist. Use defaults from Step 2 when keys are missing.

Create each path that does not exist yet:

```bash
mkdir -p .mighty-powers/custom
mkdir -p docs/plans
mkdir -p docs/planning
mkdir -p docs/implementation
```

Also `mkdir -p` for the resolved `planning_artifacts`, `implementation_artifacts`, and `output_folder` values when they differ from the defaults above.

Do not overwrite existing files — only create missing directories.

### Step 4: Create CLAUDE.md (if missing)

If no `CLAUDE.md` exists, offer to generate one:

> "No CLAUDE.md found. Want me to analyze this project and create one?"

If yes, analyze the project:
1. Read `package.json` / `Cargo.toml` / `go.mod` / `pyproject.toml` for tech stack
2. Scan directory structure for patterns
3. Read existing README if present
4. Generate a CLAUDE.md with:
   - Project overview (from README or package.json)
   - Tech stack and key dependencies
   - Directory structure conventions
   - Build and test commands
   - Coding conventions (detected from existing code)
   - Reference to mighty-powers plugin

If CLAUDE.md already exists, offer to add a mighty-powers section if it doesn't reference the plugin.

### Step 5: Add to .gitignore

Check `.gitignore` for `.mighty-powers/` handling. If missing or too broad, suggest:

```gitignore
# Mighty Powers local state (learnings, audit history, personal overrides)
.mighty-powers/*
!.mighty-powers/config.yaml
!.mighty-powers/custom/
```

Note: `.mighty-powers/config.yaml` SHOULD be committed (team project config). `config.user.yaml`, learnings, audit history, and other local state should stay gitignored.

### Step 6: Welcome Summary

Present a welcome message:

```
Mighty Powers initialized for <project_name>!

Created or verified:
  .mighty-powers/config.yaml   — project configuration
  .mighty-powers/custom/       — optional skill overrides (team TOML)
  docs/plans/                  — Quick Track plans
  docs/planning/               — lifecycle planning artifacts
  docs/implementation/       — stories, sprint status, specs
  CLAUDE.md                    — project instructions (if generated)

Not sure where to start?
  /help          — phase-aware guidance (BMAD-style "what should I do next?")
  /mp:init       — re-run setup if paths or config change

Quick Track (build features in this repo):
  /brainstorm    — design exploration with approval gates (mp:brainstorming)
  /write-plan    — wave-based implementation plan
  /execute-plan  — execute plan wave-by-wave
  /quick-dev     — fast flow for small changes
  /investigate   — systematic debugging

Lifecycle Track (formal planning from scratch):
  /brainstorm-session — creative ideation session (techniques + memlog)
  /prd           — create, update, or validate a PRD
  /architecture-spine — architecture spine
  /help          — recommends next lifecycle step from your artifacts

Audit / ship:
  /secure        — security audit
  /ship          — pre-deploy scorecard

Your workflow:
  Tiny changes:  just ask, I'll confirm before skipping planning
  Small-medium:  /write-plan → /execute-plan (wave-based, parallel)
  Large/new:     /brainstorm → /write-plan → /execute-plan
  Lifecycle:     /help → /brainstorm-session or /prd → /architecture-spine → /sprint-planning
```
