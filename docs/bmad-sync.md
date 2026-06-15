# BMAD sync

Mighty Powers Lifecycle Track skills are ported from [BMAD-METHOD `src/bmm-skills`](https://github.com/bmad-code-org/BMAD-METHOD/tree/main/src/bmm-skills) with path and reference adaptations for this plugin.

## Pinned upstream

| Field | Value |
|-------|-------|
| Repository | `bmad-code-org/BMAD-METHOD` |
| Commit | `242dc6ef759ce252420c7393e2b9683cea9608e1` |
| Date | 2026-06-14 |
| Notes | Unified `bmad-prd`, spine-model `bmad-architecture`, split sprint skills |

Re-sync when upstream releases materially change lifecycle workflows.

## How to sync

```bash
git clone --depth 1 https://github.com/bmad-code-org/BMAD-METHOD.git /tmp/BMAD-METHOD
cd mighty-powers
node tools/bmad-sync.mjs --all          # phase 1 + phase 2 + phase 3 + research
node tools/bmad-sync.mjs --phase1     # structural rewrites only
node tools/bmad-sync.mjs --phase2     # incremental skills + research composite
node tools/bmad-sync.mjs --phase3     # core skills (brainstorm-session, party-mode, help, …)
node tools/bmad-sync.mjs --skill prd  # one skill
```

Update the pinned commit in this file after verifying the diff.

## Phase 1 — structural rewrites (synced)

| Mighty Powers | BMAD source | Status |
|---------------|-------------|--------|
| `prd` | `bmad-prd` | Synced |
| `architecture` | `bmad-architecture` | Synced |
| `sprint-planning` | `bmad-sprint-planning` | Synced |
| `sprint-status` | `bmad-sprint-status` | Synced |
| `prfaq` | `bmad-prfaq` | Synced |
| `checkpoint-preview` | `bmad-checkpoint-preview` | Synced |
| `qa-generate-e2e-tests` | `bmad-qa-generate-e2e-tests` | Synced |

## Phase 2 — incremental sync (synced)

| Mighty Powers | BMAD source | Status |
|---------------|-------------|--------|
| `document-project` | `bmad-document-project` | Synced |
| `product-brief` | `bmad-product-brief` | Synced |
| `create-ux-design` | `bmad-ux` | Synced (DESIGN.md + EXPERIENCE.md model) |
| `create-epics` | `bmad-create-epics-and-stories` | Synced (+ MP transition appendix) |
| `generate-project-context` | `bmad-generate-project-context` | Synced |
| `check-readiness` | `bmad-check-implementation-readiness` | Synced |
| `create-story` | `bmad-create-story` | Synced |
| `dev-story` | `bmad-dev-story` | Synced |
| `correct-course` | `bmad-correct-course` | Synced |
| `retrospective` | `bmad-retrospective` | Synced |
| `quick-dev` | `bmad-quick-dev` | Synced |
| `research` | `bmad-domain/market/technical-research` | Synced (composite — 3 upstream skills → 1 router) |

## Deprecated shims (manual — not overwritten by sync)

| Mighty Powers | Redirect |
|---------------|----------|
| `create-prd` | `mp:prd` (create) |
| `validate-prd` | `mp:prd` (validate) |
| `create-architecture` | `mp:architecture` |

## Adaptations applied on port

- Config: `_bmad/bmm/config.yaml` → `.mighty-powers/config.yaml`
- Overrides: `_bmad/custom/` → `.mighty-powers/custom/`
- Scripts: `${CLAUDE_PLUGIN_ROOT}/tools/lib/resolve-customization.py`, `memlog.py`
- Skill refs: `bmad-*` → `mp:*`
- Editorial review skills → inline polish directives (not bundled in MP)
- Research: `research.template.md` → `research-template.md`; market `steps/` → `market-steps/`

## Phase 3 — core skills (synced)

Source tree: [`src/core-skills/`](https://github.com/bmad-code-org/BMAD-METHOD/tree/main/src/core-skills). `module-help.csv` is generated into `skills/help/` when syncing phase 3 or `--all`.

| Mighty Powers | BMAD source | Status | Notes |
|---------------|-------------|--------|-------|
| `brainstorm-session` | `bmad-brainstorming` | Synced | Lifecycle ideation; Quick Track `brainstorming` unchanged |
| `advanced-elicitation` | `bmad-advanced-elicitation` | Synced | |
| `party-mode` | `bmad-party-mode` | Synced | Uses `resolve-config.py` + `default-agents.toml` |
| `help` | `bmad-help` | Synced | Catalog at `{skill-root}/module-help.csv` |
| `adversarial-review` | `bmad-review-adversarial-general` | Synced | |

Optional additions not yet ported: `bmad-investigate` (MP has separate `investigate` on Quick Track), `bmad-code-review` (MP has separate `code-review` skill)
