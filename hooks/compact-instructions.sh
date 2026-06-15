#!/bin/bash
# Mighty Powers — PreCompact hook
# Injects context-aware instructions so Claude writes a compact summary
# that a fresh context can actually resume from.
# Opt-out: set `compact_instructions: false` in .mighty-powers/config.yaml

if [ -f "$PWD/.mighty-powers/config.yaml" ] && grep -qE 'compact_instructions:\s*false' "$PWD/.mighty-powers/config.yaml" 2>/dev/null; then
  exit 0
fi

# Detect in-progress plan to add to instructions
plan_context=""
if [ -d "$PWD/docs/plans" ]; then
  for status_file in "$PWD"/docs/plans/*/status.yaml; do
    if [ -f "$status_file" ] && grep -q "^status: in_progress" "$status_file" 2>/dev/null; then
      feature=$(grep "^feature:" "$status_file" 2>/dev/null | sed 's/feature: *//' | head -1)
      current_wave=$(grep "^current_wave:" "$status_file" 2>/dev/null | sed 's/current_wave: *//' | head -1)
      plan_context=" Active plan: \"${feature:-$(basename "$(dirname "$status_file")")}\" at wave ${current_wave:-?} — include which tasks in this wave are complete vs pending."
      break
    fi
  done
fi

msg="COMPACT INSTRUCTIONS (Mighty Powers): Write the compact summary so a fresh context can immediately resume without re-exploring the codebase. Explicitly preserve: (1) the current task or goal, (2) files actively being edited or reviewed, (3) decisions and approaches chosen this session, (4) blockers or open questions, (5) the most recent tool outputs still needed.${plan_context}"

msg_escaped=$(printf '%s' "$msg" | node -e '
let s = "";
process.stdin.on("data", c => { s += c; });
process.stdin.on("end", () => {
  process.stdout.write(JSON.stringify(s).slice(1, -1));
});
')

printf '{"hookSpecificOutput":{"hookEventName":"PreCompact","additionalContext":"%s"}}' "$msg_escaped"
exit 0
