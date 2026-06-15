#!/bin/bash
# Mighty Powers Currency Guard — UserPromptSubmit hook
#
# Models answer version-sensitive questions from training data that may be
# months or years stale. This hook fires on every prompt, detects when the
# prompt is about something whose correct answer changes over time (library
# APIs, versions, pricing, model IDs, "latest" anything), and injects a
# deterministic directive telling Claude to verify against current sources
# (context7 for library docs, WebSearch/WebFetch for everything else) instead
# of relying on training data.
#
# This is a reminder, not a block — it exits 0 and only adds context when a
# currency-sensitive trigger is present, so normal prompts are untouched.

# Opt-out: set `currency_guard: false` in .mighty-powers/config.yaml
if [ -f "$PWD/.mighty-powers/config.yaml" ] && grep -qE 'currency_guard:\s*false' "$PWD/.mighty-powers/config.yaml" 2>/dev/null; then
  exit 0
fi

payload=$(cat)

# Extract prompt text via node (always available in this plugin's runtime).
prompt=$(printf '%s' "$payload" | node -e '
let raw = "";
process.stdin.on("data", c => { raw += c; });
process.stdin.on("end", () => {
  try {
    const p = JSON.parse(raw).prompt;
    if (typeof p === "string") process.stdout.write(p);
  } catch { /* empty */ }
});
')

lc=$(printf '%s' "$prompt" | tr '[:upper:]' '[:lower:]')

if [ -z "$lc" ]; then
  exit 0
fi

# Currency-sensitive triggers — conservative to preserve signal.
generic_re='(^|[[:space:][:punct:]])(latest|newest|current version|up[ -]?to[ -]?date|breaking change|release notes|changelog)([[:space:][:punct:]]|$)'
versionish_re='(^|[[:space:][:punct:]])v?[0-9]+\.[0-9]+([x*][^[:space:][:punct:]]*)?([[:space:][:punct:]]|$)'
techterm_re='(^|[[:space:][:punct:]])(api|sdk|cli|library|framework|package|endpoint|model id|model name|pricing|rate limit|documentation|install|config|version)([[:space:][:punct:]]|$)'
named_re='(next\.?js|react|vue|svelte|astro|hono|express|fastify|nest|drizzle|prisma|tailwind|shadcn|vite|bun|deno|typescript|stripe|polar|supabase|vercel|railway|cloudflare|openai|anthropic|claude|gpt|gemini|llama|langchain|playwright|puppeteer)'

inject=false
reason=""

if printf '%s' "$lc" | grep -Eq "$generic_re"; then
  inject=true
  reason="recency/version language"
elif printf '%s' "$lc" | grep -Eq "$versionish_re"; then
  inject=true
  reason="a specific version number"
elif printf '%s' "$lc" | grep -Eq "$named_re" && printf '%s' "$lc" | grep -Eq "$techterm_re"; then
  inject=true
  reason="a fast-moving library/tool"
fi

if [ "$inject" != true ]; then
  exit 0
fi

msg="Mighty Powers Currency Guard: this prompt touches ${reason}, where training data is often stale. BEFORE answering, verify against current sources — use the context7 MCP (resolve-library-id then query-docs) for any library/framework/SDK API, and WebSearch/WebFetch for versions, pricing, model IDs, release notes, or anything time-sensitive. Do not state version-specific facts, API signatures, or prices from memory. If you cannot verify, say so explicitly rather than guessing."

esc=$(printf '%s' "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g')

printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}' "$esc"
exit 0
