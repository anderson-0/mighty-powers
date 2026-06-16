# Distribution & Marketplace Listings

How Mighty Powers reaches users, and the exact steps to list it in every relevant catalog. The submissions below require accounts/web forms, so they're **owner actions** (run them yourself) — everything in the repo is marketplace-ready.

Verified against the Claude Code docs (June 2026). Commands and URLs were checked, not assumed.

---

## 1. Install today (self-hosted marketplace — already live)

mighty-powers ships its own marketplace (`.claude-plugin/marketplace.json`, `source: "./"`), so anyone can install straight from GitHub right now:

```shell
claude plugin marketplace add anderson-0/mighty-powers
claude plugin install mighty-powers
```

This is the canonical install path and needs no third-party approval. The README leads with it.

For local development from a clone:

```shell
claude plugin marketplace add ./mighty-powers
claude plugin install mighty-powers
```

---

## 2. Pre-submission checklist (do once)

Run these before submitting to `@claude-community` or third-party directories:

```shell
claude plugin validate .
npm test
git status   # working tree clean; catalogs pin a commit SHA
```

| Check | Status |
|---|---|
| `claude plugin validate .` passes | ✅ (run before each submission) |
| `version` set in `plugin.json` | ✅ `1.0.0` |
| Repo public with README install + usage | ✅ https://github.com/anderson-0/mighty-powers |
| `homepage`, `repository`, `license`, `author` in manifests | ✅ |
| `npm test` green | ✅ run before submit |
| Working tree committed and pushed | ⬜ owner action |

---

## 3. Anthropic community marketplace (`claude-community`)

Third-party submissions land here after automated validation + safety screening. Approved plugins are pinned to a commit SHA in [`anthropics/claude-plugins-community`](https://github.com/anthropics/claude-plugins-community); CI bumps the pin as you push new commits, and the public catalog syncs nightly.

**Submit via one of the in-app forms:**

- **Console (individual authors):** https://platform.claude.com/plugins/submit
- **claude.ai (Team/Enterprise orgs with directory-management access):** https://claude.ai/admin-settings/directory/submissions/plugins/new

Run `claude plugin validate .` locally first — it's the same gate. After approval, confirm it's installable by searching for `mighty-powers` in the [community catalog `marketplace.json`](https://github.com/anthropics/claude-plugins-community/blob/main/.claude-plugin/marketplace.json).

Users then install with:

```shell
/plugin marketplace add anthropics/claude-plugins-community
/plugin install mighty-powers@claude-community
```

> **Official marketplace (`claude-plugins-official`):** curated by Anthropic at their discretion. There is no application process and the submission form does **not** add to it. If Anthropic includes mighty-powers, our CLI can prompt users to install it (see "Recommend your plugin from your CLI" / plugin-hints).

### Copy-paste submission details

Use these values in the Console or claude.ai submission form:

| Field | Value |
|---|---|
| **Plugin name** | `mighty-powers` |
| **Repository URL** | `https://github.com/anderson-0/mighty-powers` |
| **Homepage** | `https://github.com/anderson-0/mighty-powers` |
| **License** | MIT |
| **Author** | anderson-0 |
| **Marketplace file** | `.claude-plugin/marketplace.json` (repo root) |
| **Plugin manifest** | `.claude-plugin/plugin.json` |

**Short description** (for the form):

> Unified Claude Code plugin for full-lifecycle software development — combining Superpowers (TDD, debugging, subagent discipline), Ultraship (safety guardrails, audit tools), and BMAD Method (lifecycle planning). 54 skills, 22 tools, 6 agents, 34 slash commands.

**Long description** (optional / extended field):

> Mighty Powers is a single plugin that routes tasks to the right level of process — from quick bug fixes to full PRD → architecture → sprint workflows. Includes safety guardrails, session resilience, wave-based plan execution, security auditing, and pre-deploy scorecards. Install with `/mp:init` for first-time project setup.

**Keywords:** `tdd`, `debugging`, `code-review`, `security`, `planning`, `architecture`, `agile`, `brainstorming`, `sprint`, `full-lifecycle`

**Install command** (for reviewers):

```shell
claude plugin marketplace add anderson-0/mighty-powers
claude plugin install mighty-powers
```

**Post-submit verification:**

1. Search the [community catalog](https://github.com/anthropics/claude-plugins-community/blob/main/.claude-plugin/marketplace.json) for `mighty-powers`.
2. Install: `/plugin install mighty-powers@claude-community`
3. In a project, run `/mp:init` and confirm config scaffolding works.

---

## 4. ClaudePluginHub (largest third-party directory)

Auto-discovers valid public plugins from GitHub Code Search, but indexing can lag days for new/low-activity repos, so submit directly:

- **Submit:** https://www.claudepluginhub.com/tools/submit-plugin (paste `https://github.com/anderson-0/mighty-powers`)
- **Then claim ownership** to get the verified badge, analytics, and listing edits.

---

## 5. claudemarketplaces.com

Another public directory that indexes Claude Code plugins/marketplaces. Submit the GitHub URL via its directory submission, or rely on auto-indexing once the repo is public and validates.

- **URL to submit:** `https://github.com/anderson-0/mighty-powers`

---

## 6. Optional growth levers (not blocking)

- **CLI install hint (plugin-hints):** `bin/mighty-powers.mjs` could print a one-line "install the Claude Code plugin" hint when run standalone, nudging npx users toward the full plugin. See the Claude Code `plugin-hints` docs.
- **Keep the listing fresh:** catalogs surface "Last updated" and a context-cost estimate. Shipping regularly and keeping the plugin lean (zero deps, deferred MCP) both help ranking and the install decision.
- **README social proof:** GitHub stars badge and the `claude plugin marketplace add anderson-0/mighty-powers` command above the fold (already present).

---

## Where each path sends users

| Catalog | Add command / URL | Approval |
|---|---|---|
| Self-hosted (ours) | `claude plugin marketplace add anderson-0/mighty-powers` | none — live now |
| Anthropic community | `/plugin marketplace add anthropics/claude-plugins-community` → `@claude-community` | automated validation + safety screen |
| Anthropic official | auto-available; `@claude-plugins-official` | Anthropic's discretion, no application |
| ClaudePluginHub | https://www.claudepluginhub.com/tools/submit-plugin | auto-discovery + optional claim |
| claudemarketplaces.com | directory submission / auto-index | auto-index |
