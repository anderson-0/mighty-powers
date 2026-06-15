---
name: learnings
description: Manage project learnings across sessions. Save, search, prune, and export learnings that compound over time. Use when user wants to record, recall, or share project knowledge.
---

# Project Learnings Manager

Learnings are structured knowledge that compounds across sessions. They capture what worked, what didn't, decisions made, and patterns discovered — things that can't be derived from code alone.

**Announce at start:** "I'm using the learn skill to manage project learnings."

## Commands

### Save a learning

When the user discovers something worth remembering — a debugging insight, an architecture decision, a deployment gotcha, a tool preference:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/learnings-manager.mjs save --title "Title here" --body "Detailed learning content" --tags "tag1,tag2"
```

**What to save:**
- Debugging insights ("Redis connection pool exhausts at 50 concurrent requests")
- Architecture decisions and their rationale ("Chose BullMQ over pg-boss because...")
- Deployment gotchas ("Railway needs `NODE_ENV=production` explicitly set")
- Performance findings ("Drizzle `select()` is 3x faster than `query()` for simple lookups")
- Integration quirks ("Polar.sh webhooks retry 3x with exponential backoff")

**What NOT to save:**
- Code patterns (read the code instead)
- Git history (use `git log`)
- Temporary debugging state (that's for the current session)

### Search learnings

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/learnings-manager.mjs search --query "keyword"
```

Search by title, body content, or tags. Use this BEFORE starting work on a topic — past learnings prevent repeated mistakes.

### List all learnings

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/learnings-manager.mjs list [--limit N]
```

### Prune old learnings

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/learnings-manager.mjs prune --older-than 90
```

Removes learnings older than N days. Default: 90 days. Run periodically to keep the knowledge base fresh.

### Digest learnings

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/learnings-manager.mjs digest [--top N]
```

Returns a grouped snapshot: learnings organized by tag, with counts and the N most recent titles per group (default N=3). Grouping uses the **first tag only** — multi-tag learnings appear under their primary tag. Use at the start of a long session to quickly orient to accumulated project knowledge without reading every learning in full.

### Recall relevant learnings

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/learnings-manager.mjs recall --query "keyword or phrase" [--top N]
```

Returns the top-N most relevant learnings for a topic, ranked by keyword match density (default N=5). Different from `search` — search returns all matches; recall returns the highest-signal ones first. Use before starting work on a specific area to surface the most applicable past learnings.

### Export learnings

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/learnings-manager.mjs export --format markdown
node ${CLAUDE_PLUGIN_ROOT}/tools/learnings-manager.mjs export --format json
```

Export for sharing with team members or backing up before a major refactor.

## Workflow Integration

**At session start:** If the user mentions a topic, search learnings for relevant context before proceeding.

**After debugging:** Save the root cause and fix as a learning — it will save hours next time.

**After deployment issues:** Save the gotcha — deployment problems recur.

**Before major changes:** Search for past learnings about the affected area.

**During retrospectives:** Use with `/retro` to cross-reference velocity data with learnings.

## Storage

Learnings are stored in `.mighty-powers/learnings/` in the project directory as JSON files. Each learning has:
- `id` — unique identifier
- `title` — short, searchable title
- `body` — detailed content
- `tags` — categorization for filtering
- `created_at` / `updated_at` — timestamps

Add `.mighty-powers/` to `.gitignore` if you don't want learnings in version control, or commit them to share with your team.
