#!/usr/bin/env bash
# Mighty Powers — SessionStart hook
# Merges: Superpowers bootstrap (meta-skill injection) + Ultraship memory/CLAUDE.md checks

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# --- Read meta-skill content ---
meta_skill_content=$(cat "${PLUGIN_ROOT}/skills/using-mighty-powers/SKILL.md" 2>&1 || echo "Error reading using-mighty-powers skill")

# --- Memory check ---
MEMORY_LOCATIONS=(
  "$HOME/.claude/projects/$(echo "$PWD" | tr '/' '-')/memory/MEMORY.md"
  "$PWD/.claude/memory/MEMORY.md"
  "$HOME/.claude/MEMORY.md"
)

memory_notice=""
MEMORY_FOUND=false
for loc in "${MEMORY_LOCATIONS[@]}"; do
  if [ -f "$loc" ]; then
    MEMORY_FOUND=true
    break
  fi
done

if [ "$MEMORY_FOUND" = true ]; then
  memory_notice="Read MEMORY.md and relevant memory files BEFORE performing any task."
else
  memory_notice="No memory files found. Consider setting up auto-memory for persistent context."
fi

# --- CLAUDE.md freshness check ---
claudemd_notice=""
CLAUDE_MD="$PWD/CLAUDE.md"
if [ -f "$CLAUDE_MD" ]; then
  if [ "$(uname)" = "Darwin" ]; then
    mod_epoch=$(stat -f %m "$CLAUDE_MD")
  else
    mod_epoch=$(stat -c %Y "$CLAUDE_MD")
  fi
  now_epoch=$(date +%s)
  age_days=$(( (now_epoch - mod_epoch) / 86400 ))
  if [ "$age_days" -ge 7 ]; then
    claudemd_notice="CLAUDE.md is ${age_days} days old. Consider running /revise-claude-md to keep it current."
  fi
fi

# --- Escape for JSON ---
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

meta_escaped=$(escape_for_json "$meta_skill_content")
memory_escaped=$(escape_for_json "$memory_notice")
claudemd_escaped=$(escape_for_json "$claudemd_notice")

session_context="<EXTREMELY_IMPORTANT>\nYou have mighty-powers.\n\n${memory_escaped}\n${claudemd_escaped}\n\n**Below is the full content of your 'mighty-powers:using-mighty-powers' skill — your guide to using skills. For all other skills, use the 'Skill' tool:**\n\n${meta_escaped}\n</EXTREMELY_IMPORTANT>"

# --- Output platform-appropriate JSON ---
if [ -n "${CURSOR_PLUGIN_ROOT:-}" ]; then
  printf '{\n  "additional_context": "%s"\n}\n' "$session_context"
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -z "${COPILOT_CLI:-}" ]; then
  printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$session_context"
else
  printf '{\n  "additionalContext": "%s"\n}\n' "$session_context"
fi

exit 0
