---
name: guard
description: Safety guardrails — blocks destructive commands (rm -rf, DROP TABLE, force-push, git reset --hard) and optionally restricts file edits to a specific directory. Use when working on critical systems or when you want extra protection.
---

# Guard — Safety Guardrails

Guard protects you from accidental destructive actions by intercepting dangerous commands before they execute. It uses Claude Code's PreToolUse hooks to catch risky patterns in real-time.

**Announce at start:** "I'm activating Guard — destructive commands will be blocked until you explicitly approve them."

## What Guard Blocks

Destructive bash commands (`rm -rf`, `DROP TABLE`, `git push --force`, `git reset --hard`, `git clean -f`, `kubectl delete`, file truncation, etc.) and optionally file edits outside a frozen directory. The hook scripts in this skill's configuration handle pattern matching and blocking automatically.

## Usage

### Activate full protection
Just invoke `/guard` — destructive command blocking is immediate.

### Set a directory freeze
Tell Claude which directory to restrict edits to:
```
"Only edit files in packages/api/"
"Freeze edits to src/components/"
```

Guard will write the freeze path to `.mighty-powers/guard-freeze.txt` and enforce it on all Edit/Write operations.

### Remove freeze
```
"Unfreeze" or "Remove edit restrictions"
```

### Override a blocked command
If Guard blocks something you actually need to run, explicitly confirm:
```
"Yes, I want to force-push to main"
"Confirmed: drop the users table"
```

Guard will allow explicitly confirmed destructive actions.

## Key Principle

Block by default, allow on explicit confirmation. Always explain what was blocked and why.
