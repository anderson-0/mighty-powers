---
name: init
description: First-time project setup for Mighty Powers. Creates config file, offers to generate CLAUDE.md, and explains available workflows.
---

# Initialize Mighty Powers

Set up a project to use Mighty Powers effectively. Run this once when you first install the plugin in a project.

## How to Trigger

```
/init
```

## Process

### Step 1: Check Current State

Check what already exists:
- `.mighty-powers/config.yaml` — project config
- `CLAUDE.md` — project instructions for Claude
- `docs/plans/` — plan directory
- `package.json` or equivalent — project metadata

Report what was found and what's missing.

### Step 2: Create Config

If `.mighty-powers/config.yaml` doesn't exist, create it:

```yaml
# Mighty Powers project configuration
# See: https://github.com/anderson-0/mighty-powers

project_name: "<detected from package.json or directory name>"
user_name: "Developer"
communication_language: "English"
document_output_language: "English"

# Where planning artifacts are saved (PRDs, specs, research)
planning_artifacts: "docs/planning"

# Where implementation artifacts are saved (plans, stories, specs)
implementation_artifacts: "docs/implementation"

# Additional project knowledge files (read by lifecycle skills)
project_knowledge: "docs"
```

Ask the user to customize:
- **project_name**: auto-detect from package.json, Cargo.toml, go.mod, etc.
- **communication_language**: default English, ask if they prefer another
- **planning/implementation paths**: suggest defaults, let them override

### Step 3: Create CLAUDE.md (if missing)

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

### Step 4: Create Plan Directory

If `docs/plans/` doesn't exist:
```bash
mkdir -p docs/plans
```

### Step 5: Add to .gitignore

Check `.gitignore` for `.mighty-powers/` entry. If missing, add it:
```
# Mighty Powers local state (learnings, audit history, etc.)
.mighty-powers/
```

Note: `.mighty-powers/config.yaml` SHOULD be committed (project config), but other files in `.mighty-powers/` are local state. Suggest:
```gitignore
.mighty-powers/*
!.mighty-powers/config.yaml
```

### Step 6: Welcome Summary

Present a welcome message:

```
Mighty Powers initialized for <project_name>!

Created:
  .mighty-powers/config.yaml  — project configuration
  CLAUDE.md                    — project instructions (if generated)
  docs/plans/                  — plan storage directory

Quick start:
  /brainstorm    — explore a new feature idea
  /write-plan    — create an implementation plan
  /quick-dev     — fast flow for small changes
  /investigate   — debug a problem
  /secure        — run security audit
  /help          — see all available skills

Your workflow:
  Tiny changes:  just ask, I'll confirm before skipping planning
  Small-medium:  /write-plan → /execute-plan (wave-based, parallel)
  Large/new:     /brainstorm → /write-plan → /execute-plan
  Lifecycle:     ask for "PRD", "architecture", or "epics" explicitly
```
