#!/bin/bash
# Mighty Powers Filter Output Hook — PreToolUse hook for Bash commands
# Rewrites tool commands to pipe output through filter-output.mjs
# This compresses CLI output before it enters the context window (RTK-inspired)
#
# Rewrites (when not already filtered):
#   vitest / npm test       → add --reporter=json, pipe to filter vitest
#   tsc --noEmit            → pipe to filter tsc
#   eslint                  → add --format json, pipe to filter eslint
#   npm install / npm ci    → pipe to filter npm-install
#   npx (non-test)          → pipe to filter npx
#   git status              → pipe to filter git-status
#   git log                 → pipe to filter git-log

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | tr -d '\n' | sed 's/.*"command"[[:space:]]*:[[:space:]]*"//;s/"[[:space:]]*[,}].*//' | sed 's/\\"/"/g')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Already filtered — never double-pipe
if echo "$COMMAND" | grep -q 'filter-output.mjs'; then
  exit 0
fi

# Watch mode commands should never be rewritten (they run indefinitely)
if echo "$COMMAND" | grep -qE '\s--watch\b|\s-w\b'; then
  exit 0
fi

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
FILTER="node \"${PLUGIN_ROOT}/tools/filter-output.mjs\""
NEW_CMD=""

# ── vitest ────────────────────────────────────────────────────────────────────
# Rewrite "vitest run" or "npm test" / "npm run test" to use JSON reporter + filter
if echo "$COMMAND" | grep -qE '\bvitest\b'; then
  # Inject --reporter=json if not already set
  if echo "$COMMAND" | grep -qE '--reporter'; then
    NEW_CMD="${COMMAND} 2>&1 | ${FILTER} vitest"
  else
    NEW_CMD=$(echo "$COMMAND" | sed 's/\bvitest\b/vitest --reporter=json/')
    NEW_CMD="${NEW_CMD} 2>&1 | ${FILTER} vitest"
  fi
elif echo "$COMMAND" | grep -qE '\bnpm\s+(run\s+)?test\b'; then
  # npm test uses vitest under the hood in most projects — filter the output
  NEW_CMD="${COMMAND} 2>&1 | ${FILTER} vitest"
fi

# ── tsc ───────────────────────────────────────────────────────────────────────
if [ -z "$NEW_CMD" ] && echo "$COMMAND" | grep -qE '\btsc(\s|$)'; then
  NEW_CMD="${COMMAND} 2>&1 | ${FILTER} tsc"
fi

# ── eslint ────────────────────────────────────────────────────────────────────
if [ -z "$NEW_CMD" ] && echo "$COMMAND" | grep -qE '\beslint\b'; then
  if echo "$COMMAND" | grep -qE '\s--format\s'; then
    # User already set a format — only filter if it's json
    if echo "$COMMAND" | grep -qE '\s--format\s+json\b|\s--format=json\b'; then
      NEW_CMD="${COMMAND} 2>&1 | ${FILTER} eslint"
    fi
  else
    # No format set — inject json and filter
    NEW_CMD=$(echo "$COMMAND" | sed 's/\beslint\b/eslint --format json/')
    NEW_CMD="${NEW_CMD} 2>&1 | ${FILTER} eslint"
  fi
fi

# ── npm install / npm ci / npm i ──────────────────────────────────────────────
if [ -z "$NEW_CMD" ] && echo "$COMMAND" | grep -qE '\bnpm\s+(install|ci|i)\b'; then
  NEW_CMD="${COMMAND} 2>&1 | ${FILTER} npm-install"
fi

# ── npx (non-test, non-tsc, non-eslint) ──────────────────────────────────────
if [ -z "$NEW_CMD" ] && echo "$COMMAND" | grep -qE '^\s*npx\s'; then
  # Don't double-filter — tsc/eslint cases handled above via their own hooks
  if ! echo "$COMMAND" | grep -qE '\btsc\b|\beslint\b|\bvitest\b'; then
    NEW_CMD="${COMMAND} 2>&1 | ${FILTER} npx"
  fi
fi

# ── git status ────────────────────────────────────────────────────────────────
if [ -z "$NEW_CMD" ] && echo "$COMMAND" | grep -qE '\bgit\s+status\b'; then
  # Skip if already using porcelain/short (already compact)
  if ! echo "$COMMAND" | grep -qE '\s(--short|-s|--porcelain)\b'; then
    NEW_CMD="${COMMAND} 2>&1 | ${FILTER} git-status"
  fi
fi

# ── git log ───────────────────────────────────────────────────────────────────
if [ -z "$NEW_CMD" ] && echo "$COMMAND" | grep -qE '\bgit\s+log\b'; then
  # Skip if --oneline or custom --format already set (already compact)
  if ! echo "$COMMAND" | grep -qE '\s(--oneline|--format|--pretty)\b'; then
    NEW_CMD="${COMMAND} 2>&1 | ${FILTER} git-log"
  fi
fi

# ── Emit rewrite or passthrough ───────────────────────────────────────────────
if [ -n "$NEW_CMD" ]; then
  # Escape for JSON: backslash, then double-quote
  ESCAPED=$(printf '%s' "$NEW_CMD" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"approve","toolInput":{"command":"%s"}}}\n' "$ESCAPED"
fi

exit 0
