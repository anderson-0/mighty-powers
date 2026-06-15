---
name: token-health
description: Audit Claude Code setup for token waste — bloated CLAUDE.md, excess hooks, missing codex, oversized memory — and report fixes ranked by impact.
allowed-tools: Bash, Read
---

# Token Health Audit

Audit this Claude Code setup for context window waste. Measure, rank by impact, suggest fixes.

## Step 1 — Measure everything

Run all checks in parallel:

```bash
# Global CLAUDE.md
wc -c ~/.claude/CLAUDE.md 2>/dev/null || echo "none"
wc -l ~/.claude/CLAUDE.md 2>/dev/null || echo "none"

# Project CLAUDE.md
wc -c CLAUDE.md 2>/dev/null || echo "none"
wc -l CLAUDE.md 2>/dev/null || echo "none"
```

```bash
# Memory files — size and count
find ~/.claude/projects -name "MEMORY.md" -exec wc -l {} + 2>/dev/null | sort -rn | head -10
find ~/.claude/projects -name "*.md" -path "*/memory/*" 2>/dev/null | wc -l
```

```bash
# Skills — count loaded skills (frontmatter overhead per skill)
ls ~/.claude/skills/ 2>/dev/null | wc -l
ls ~/.claude/plugins/ 2>/dev/null 2>&1 | head -5
```

```bash
# Hooks — count hook entries across settings files
node -e '
const fs = require("fs");
const files = [
  process.env.HOME + "/.claude/settings.json",
  ".claude/settings.json",
  ".claude/settings.local.json"
];
let total = 0, slow = [];
for (const f of files) {
  try {
    const s = JSON.parse(fs.readFileSync(f, "utf8"));
    const hooks = s.hooks || {};
    Object.entries(hooks).forEach(([event, groups]) => {
      (groups || []).forEach(g => {
        (g.hooks || []).forEach(h => {
          total++;
          const t = h.timeout;
          if (t && t > 3000) slow.push({ event, cmd: (h.command || "").slice(0, 60), timeout: t });
        });
      });
    });
  } catch {}
}
console.log(JSON.stringify({ total_hook_entries: total, slow_hooks: slow }));
' 2>/dev/null
```

```bash
# Codex — is a codebase index already generated?
ls -la .mighty-powers/codex.md 2>/dev/null || echo "no codex"

# Check codex size if it exists
wc -l .mighty-powers/codex.md 2>/dev/null || true
```

```bash
# Large files that Claude might be reading repeatedly
find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" \
  -exec wc -c {} + 2>/dev/null | sort -rn | head -10
```

```bash
# @imports in CLAUDE.md that load extra files automatically
grep -n '^@' ~/.claude/CLAUDE.md 2>/dev/null | head -20
grep -n '^@' CLAUDE.md 2>/dev/null | head -20
```

## Step 2 — Score each finding

For each check, classify the finding:

| Finding | Threshold | Impact |
|---------|-----------|--------|
| Global CLAUDE.md | >8KB = high, >4KB = medium | Loaded every session |
| Project CLAUDE.md | >6KB = high, >3KB = medium | Loaded every session |
| MEMORY.md total lines | >150 = high, >80 = medium | Loaded every session |
| Hook entries | >20 = high, >10 = medium | Latency per turn |
| Slow hooks (timeout >3s) | any = high | Blocks every turn |
| Skills count (global) | >40 = high, >20 = medium | Frontmatter overhead |
| No codex | in a codebase with >20 files = medium | Claude re-explores every task |
| @imports loading unused files | any = medium | Always-on overhead |

## Step 3 — Report

Present findings as a prioritized table:

```
TOKEN HEALTH REPORT
===================

CRITICAL (fix now)
  [ ] <finding> — <size/count> — saves ~X% context/turn

HIGH
  [ ] <finding> — <detail> — <suggested fix>

MEDIUM
  [ ] <finding> — <detail> — <suggested fix>

CLEAN
  ✓ <item> looks fine

ESTIMATED SAVINGS: X–Y% context per session
```

## Step 4 — Suggest fixes

For each HIGH/CRITICAL finding, give a specific action:

| Problem | Fix |
|---------|-----|
| Bloated CLAUDE.md | Remove duplication, move reference content to @import files that are only loaded when needed |
| Oversized MEMORY.md | Run `mighty-powers:learnings` prune to remove stale entries |
| Too many hooks | Audit hooks.json — remove duplicate matchers, consolidate where possible |
| Slow hook | Check the command — add `--quiet` flag or increase parallelism |
| No codex in large project | Run `/codex` to generate `.mighty-powers/codex.md` |
| Too many skills | Review skills catalog — skills only load when invoked, but global skill index still adds overhead if >50 skills |
| @imports of large files | Make @imports conditional or move content inline if small |

## Notes

- Context savings are approximate — exact numbers depend on model, session length, and codebase
- Fixes to CLAUDE.md and MEMORY.md have the highest ROI (loaded every turn)
- Hooks add latency per turn; token cost is usually small but latency is real
- Run `/codex` first if the project has >20 source files and no codex exists
