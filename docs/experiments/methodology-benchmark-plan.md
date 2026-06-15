# Methodology Benchmark: AI Writing Assistant × 4 Runs

> **For agentic workers:** REQUIRED SUB-SKILL: Use `mp:executing-plans` or `mp:subagent-driven-development` to run this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the same AI writing assistant SaaS four times — once per methodology — then score each output on a fixed rubric to surface real differences in code quality, discipline, security, and speed.

**Architecture:** Each run produces an independent Next.js app (App Router) in its own Git repo with a shared spec. A scoring subagent runs `/ship` + coverage + pentest on each finished app and writes results into this repo's `docs/experiments/results/`.

**Tech Stack:** Next.js 16, Vercel AI Gateway, Clerk auth, Neon Postgres, Tailwind + shadcn/ui, Vitest, Vercel deploy.

**Methodologies under test:**
| ID | Methodology | Plugin/Source |
|----|-------------|---------------|
| A | **mighty-powers** | this repo (user scope) |
| B | **Ultraship** | `ultraship@ultraship` v2.5.1 |
| C | **Superpowers** | `superpowers@superpowers-marketplace` v5.0.6 |
| D | **BMAD Method** | raw BMAD agent prompts (no plugin) |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Different model versions across runs | Medium | High | Pin `claude-sonnet-4-6` in every subagent prompt |
| Scoring subagent sees previous results and is biased | Medium | High | Score each run in isolation; scorer reads no other results |
| BMAD has no Claude Code plugin — session setup is manual | High | Medium | Provide BMAD a bootstrap CLAUDE.md that mirrors its methodology |
| `/ship` scorecard varies by network latency (Lighthouse) | Low | Medium | Run 3 Lighthouse passes, take median |
| Subagent goes off-spec (adds features not in spec) | Medium | Medium | Spec is locked in `spec.md`; subagent instructed to implement only what's listed |

---

## Shared Spec (locked — same for all 4 runs)

Saved to: `docs/experiments/spec.md`

The spec defines exactly:
- App name: **WriteFlow**
- 6 features (no more, no less)
- Exact DB schema
- Exact API surface
- Exact acceptance criteria per feature

**Task 1 creates this file. All subsequent tasks depend on it being frozen.**

---

## Task Dependencies

```
Task 1 (spec) → Task 2 (repo setup) → Tasks 3–6 (runs, independent) → Task 7 (scoring) → Task 8 (report)
Tasks 3, 4, 5, 6 are fully independent — can run in parallel.
Task 7 depends on all of 3–6 completing.
```

---

## Task 1: Write and Lock the Shared Spec

**Files:**
- Create: `docs/experiments/spec.md`

- [ ] **Step 1.1: Write the WriteFlow product spec**

Create `docs/experiments/spec.md` with exactly this content:

```markdown
# WriteFlow — Benchmark Spec (FROZEN)

> This spec is identical for all 4 methodology runs. Do not add, remove, or change features.
> Last modified: 2026-04-04. Any agent modifying this file is out of spec.

## What to Build

WriteFlow is a minimal AI writing assistant SaaS. Users sign in, create documents, get AI completions, and have a usage cap.

## Features (exactly these 6, nothing more)

### F1: Authentication
- Sign up / sign in via Clerk
- Protected routes: /dashboard and all /doc/* routes redirect to /sign-in if unauthenticated
- Public routes: / (landing), /sign-in, /sign-up

### F2: Document Management
- Create a new blank document (title + empty body)
- List all documents belonging to the current user
- Open a document for editing
- Delete a document (with confirmation dialog)
- Documents stored in Postgres: `id, user_id, title, content, created_at, updated_at`

### F3: AI Completion
- In the document editor, pressing Ctrl+Enter triggers AI completion
- Completion appends to the current document content
- Uses Vercel AI Gateway: model `anthropic/claude-haiku-4-5-20251001`
- Streaming response displayed inline as it arrives

### F4: Usage Limits
- Each user has a monthly completion budget: 20 completions/month
- Budget tracked in Postgres: `usage_logs(id, user_id, created_at, tokens_used)`
- When budget exhausted: show inline error "Monthly limit reached"
- Usage counter visible in dashboard header: "X / 20 completions used"

### F5: Dashboard
- Lists all user documents with title, last updated date, word count
- "New Document" button
- Usage counter in header

### F6: Landing Page
- Simple marketing page at /
- Hero section with app name + one-sentence description
- "Get Started" CTA that links to /sign-up
- No authentication required

## Database Schema (exact)

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tokens_used INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX ON documents(user_id);
CREATE INDEX ON usage_logs(user_id, created_at);
```

## API Surface (exact)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/documents | List user's documents |
| POST | /api/documents | Create document |
| GET | /api/documents/[id] | Get single document |
| PUT | /api/documents/[id] | Update document content/title |
| DELETE | /api/documents/[id] | Delete document |
| POST | /api/complete | AI completion (streaming) |
| GET | /api/usage | Get current user's usage stats |

## Acceptance Criteria

All 6 features must work end-to-end:
- [ ] User can sign up, sign in, sign out
- [ ] User can create, view, edit, delete documents
- [ ] Ctrl+Enter triggers streaming AI completion
- [ ] Usage counter increments after each completion
- [ ] Usage limit blocks completions at 20/month
- [ ] Landing page loads without authentication

## Out of Scope (do not implement)
- Rich text / WYSIWYG editor (plain textarea only)
- Document sharing or collaboration
- Billing / Stripe
- Email notifications
- Dark mode
- Mobile-specific layouts
- Search or filtering
- Document versioning / history
```

- [ ] **Step 1.2: Commit the frozen spec**

```bash
cd /Users/anderson/Documents/anderson-0/mighty-powers
git add docs/experiments/spec.md
git commit -m "experiment: add frozen WriteFlow benchmark spec"
```

---

## Task 2: Set Up the Experiment Repo

**Files:**
- Create: `/Users/anderson/Documents/anderson-0/writeflow-benchmark/` (new git repo)
- Create: `results/` directory structure inside it

- [ ] **Step 2.1: Create the benchmark repo**

```bash
mkdir -p /Users/anderson/Documents/anderson-0/writeflow-benchmark
cd /Users/anderson/Documents/anderson-0/writeflow-benchmark
git init
mkdir -p results/{mighty-powers,ultraship,superpowers,bmad}
mkdir -p runs/{mighty-powers,ultraship,superpowers,bmad}
```

- [ ] **Step 2.2: Write the repo README**

Create `/Users/anderson/Documents/anderson-0/writeflow-benchmark/README.md`:

```markdown
# WriteFlow Methodology Benchmark

Builds the same AI writing assistant SaaS 4 times — one per methodology — then scores each on a fixed rubric.

## Methodologies
- **A: mighty-powers** — combined plugin (this is the subject under test)
- **B: Ultraship** — audit + safety focused
- **C: Superpowers** — dev workflow discipline
- **D: BMAD Method** — lifecycle methodology (PRD → Architecture → Stories)

## Spec
The product spec is frozen: see `spec.md`. All runs implement exactly the same 6 features.

## Scoring Rubric
Each run is scored on:
| Dimension | Tool | Weight |
|-----------|------|--------|
| Ship scorecard (perf + SEO + security + bundle) | `/ship` skill | 40% |
| Test coverage % | Vitest coverage | 25% |
| Security issues found | pentest + secret-scanner | 20% |
| Turns to working deploy | Turn count log | 15% |

## Structure
- `runs/<methodology>/` — the built app (git submodule or copy)
- `results/<methodology>/scorecard.md` — scored output
- `results/comparison.md` — final side-by-side comparison

## Running a Build
See `docs/run-instructions/<methodology>.md` for session setup instructions per methodology.
```

- [ ] **Step 2.3: Copy the frozen spec into the benchmark repo**

```bash
cp /Users/anderson/Documents/anderson-0/mighty-powers/docs/experiments/spec.md \
   /Users/anderson/Documents/anderson-0/writeflow-benchmark/spec.md
```

- [ ] **Step 2.4: Create the results templates**

Create `results/mighty-powers/scorecard.md`, `results/ultraship/scorecard.md`, `results/superpowers/scorecard.md`, `results/bmad/scorecard.md` — all identical:

```markdown
# [METHODOLOGY] — WriteFlow Scorecard

**Run date:** YYYY-MM-DD
**Model:** claude-sonnet-4-6
**Total turns:** TBD
**Deployed URL:** TBD

## Ship Scorecard
<!-- Paste /ship output here -->

## Test Coverage
<!-- Paste `vitest run --coverage` summary here -->
Total: TBD%

## Security Findings
<!-- Paste pentest + secret-scanner output here -->
Critical: 0  High: 0  Medium: 0  Low: 0

## Turn Count Log
<!-- One entry per turn: "Turn N: [brief description]" -->

## Observations
<!-- Qualitative notes: what did this methodology do well? where did it struggle? -->
```

- [ ] **Step 2.5: Write per-methodology run instructions**

Create `docs/run-instructions/` with 4 files — see Task 2.5 details below. These are the session bootstrap instructions the build subagents will use.

- [ ] **Step 2.6: Initial commit**

```bash
cd /Users/anderson/Documents/anderson-0/writeflow-benchmark
git add .
git commit -m "chore: scaffold benchmark repo with spec, rubric, and result templates"
```

---

### Task 2.5 Detail: Run Instruction Files

**`docs/run-instructions/mighty-powers.md`:**
```markdown
# Session Setup: mighty-powers Run

1. Create app repo: `mkdir writeflow-mighty-powers && cd writeflow-mighty-powers && git init`
2. Open Claude Code in that directory (mighty-powers is installed at user scope — it will auto-activate)
3. Verify hook fires: session should show mighty-powers context
4. Use `/init` to initialize the project with mighty-powers
5. Provide the spec: paste contents of `spec.md` when prompted
6. Let mighty-powers guide the full workflow: brainstorm → write-plan → execute
7. Log every turn in results/mighty-powers/scorecard.md
8. When done: run scoring subagent (see Task 7)
```

**`docs/run-instructions/ultraship.md`:**
```markdown
# Session Setup: Ultraship Run

1. Create app repo: `mkdir writeflow-ultraship && cd writeflow-ultraship && git init`
2. Open Claude Code in that directory
3. Install ultraship locally: `claude plugin install ultraship@ultraship` (or confirm user-scope install is active)
4. Disable mighty-powers for this session by temporarily removing it from user scope
5. Verify: session should show ultraship context only
6. Use `/brainstorm` then `/write-plan` then `/execute-plan`
7. Log every turn in results/ultraship/scorecard.md
8. When done: run scoring subagent (see Task 7)
```

**`docs/run-instructions/superpowers.md`:**
```markdown
# Session Setup: Superpowers Run

1. Create app repo: `mkdir writeflow-superpowers && cd writeflow-superpowers && git init`
2. Open Claude Code in that directory
3. Superpowers is installed at user scope — verify it activates
4. Disable mighty-powers for this session
5. Use superpowers workflow: brainstorm → plan → execute
6. Log every turn in results/superpowers/scorecard.md
7. When done: run scoring subagent (see Task 7)
```

**`docs/run-instructions/bmad.md`:`**
```markdown
# Session Setup: BMAD Run

1. Create app repo: `mkdir writeflow-bmad && cd writeflow-bmad && git init`
2. Copy the BMAD CLAUDE.md bootstrap into the repo root (see bmad-bootstrap.md)
3. Open Claude Code — BMAD methodology will be injected via CLAUDE.md
4. No plugin — BMAD runs purely through CLAUDE.md agent instructions
5. Follow BMAD lifecycle: Analyst → PM → Architect → Developer stories
6. Log every turn in results/bmad/scorecard.md
7. When done: run scoring subagent (see Task 7)
```

---

## Task 3: Build Run A — mighty-powers

**Depends on:** Task 2 complete
**Independent of:** Tasks 4, 5, 6

- [ ] **Step 3.1: Dispatch the mighty-powers build subagent**

Launch a subagent with this exact prompt:

```
You are building WriteFlow, an AI writing assistant SaaS, using the mighty-powers methodology.

SPEC: Read /Users/anderson/Documents/anderson-0/writeflow-benchmark/spec.md — implement exactly those 6 features, nothing more.

SETUP:
1. Create the app at: /Users/anderson/Documents/anderson-0/writeflow-benchmark/runs/mighty-powers/writeflow/
2. Run: npx create-next-app@latest writeflow --typescript --tailwind --app --src-dir --import-alias "@/*"
3. Use mp: run /init, then paste the spec, then follow the full workflow

CONSTRAINTS:
- Model: claude-sonnet-4-6 only
- Do not add features not in the spec
- Log every significant turn to a file: /Users/anderson/Documents/anderson-0/writeflow-benchmark/results/mighty-powers/turn-log.md
  Format: "## Turn N\n**Action:** [what you did]\n**Output:** [brief result]\n"
- When you reach a working deploy OR hit turn 80, stop and write your final status to the scorecard

SCORING PREP:
After building, run these and save output to results/mighty-powers/:
- `vitest run --coverage` → save to coverage.txt
- Note the deployed Vercel URL in scorecard.md
```

- [ ] **Step 3.2: Monitor and verify the run completes**

Check `results/mighty-powers/turn-log.md` exists and has entries. Verify `coverage.txt` is written.

---

## Task 4: Build Run B — Ultraship

**Depends on:** Task 2 complete
**Independent of:** Tasks 3, 5, 6

- [ ] **Step 4.1: Dispatch the Ultraship build subagent**

Launch a subagent with this exact prompt:

```
You are building WriteFlow, an AI writing assistant SaaS, using the Ultraship methodology ONLY.

SPEC: Read /Users/anderson/Documents/anderson-0/writeflow-benchmark/spec.md — implement exactly those 6 features, nothing more.

SETUP:
1. Create the app at: /Users/anderson/Documents/anderson-0/writeflow-benchmark/runs/ultraship/writeflow/
2. Run: npx create-next-app@latest writeflow --typescript --tailwind --app --src-dir --import-alias "@/*"
3. Your methodology: Ultraship (installed at user scope). Use /brainstorm → /write-plan → /execute-plan
4. DO NOT use mighty-powers skills. Use only Ultraship skills.

CONSTRAINTS:
- Model: claude-sonnet-4-6 only
- Do not add features not in the spec
- Log every significant turn to: /Users/anderson/Documents/anderson-0/writeflow-benchmark/results/ultraship/turn-log.md
  Format: "## Turn N\n**Action:** [what you did]\n**Output:** [brief result]\n"
- Stop at working deploy OR turn 80

SCORING PREP:
After building, run:
- `vitest run --coverage` → save to results/ultraship/coverage.txt
- Note deployed URL in scorecard.md
```

- [ ] **Step 4.2: Monitor and verify the run completes**

---

## Task 5: Build Run C — Superpowers

**Depends on:** Task 2 complete
**Independent of:** Tasks 3, 4, 6

- [ ] **Step 5.1: Dispatch the Superpowers build subagent**

Launch a subagent with this exact prompt:

```
You are building WriteFlow, an AI writing assistant SaaS, using the Superpowers methodology ONLY.

SPEC: Read /Users/anderson/Documents/anderson-0/writeflow-benchmark/spec.md — implement exactly those 6 features, nothing more.

SETUP:
1. Create the app at: /Users/anderson/Documents/anderson-0/writeflow-benchmark/runs/superpowers/writeflow/
2. Run: npx create-next-app@latest writeflow --typescript --tailwind --app --src-dir --import-alias "@/*"
3. Your methodology: Superpowers (installed at user scope). Use the Superpowers workflow.
4. DO NOT use mighty-powers or Ultraship skills.

CONSTRAINTS:
- Model: claude-sonnet-4-6 only
- Do not add features not in the spec
- Log every significant turn to: /Users/anderson/Documents/anderson-0/writeflow-benchmark/results/superpowers/turn-log.md
  Format: "## Turn N\n**Action:** [what you did]\n**Output:** [brief result]\n"
- Stop at working deploy OR turn 80

SCORING PREP:
After building:
- `vitest run --coverage` → save to results/superpowers/coverage.txt
- Note deployed URL in scorecard.md
```

- [ ] **Step 5.2: Monitor and verify the run completes**

---

## Task 6: Build Run D — BMAD Method

**Depends on:** Task 2 complete
**Independent of:** Tasks 3, 4, 5

- [ ] **Step 6.1: Create the BMAD bootstrap CLAUDE.md**

BMAD has no Claude Code plugin — inject its methodology via CLAUDE.md. Create:
`/Users/anderson/Documents/anderson-0/writeflow-benchmark/docs/run-instructions/bmad-bootstrap.md`

This file contains BMAD's core agent instructions condensed into a CLAUDE.md format:

```markdown
# BMAD Method — WriteFlow Build

You are operating under the BMAD (Business & Market Aware Development) Method.

## Lifecycle

Follow this exact sequence:
1. **Analyst** — read the spec, ask clarifying questions, produce a brief
2. **PM** — write user stories from the spec (no new features)
3. **Architect** — design the technical architecture (stack, DB, API, components)
4. **Developer** — implement story by story, TDD, commit after each story

## Rules
- One role at a time. Complete each phase before moving to the next.
- No implementation until architecture is approved.
- Every feature must have a failing test written before implementation.
- Commit after every story with a conventional commit message.
- Do not add features not in the spec.
```

- [ ] **Step 6.2: Dispatch the BMAD build subagent**

```
You are building WriteFlow, an AI writing assistant SaaS, using the BMAD Method.

SPEC: Read /Users/anderson/Documents/anderson-0/writeflow-benchmark/spec.md — implement exactly those 6 features, nothing more.

METHODOLOGY: BMAD (no plugin). Follow this lifecycle strictly:
1. Analyst phase: read spec, produce a brief summary
2. PM phase: break spec into user stories (one per feature)
3. Architect phase: design stack, DB schema, component tree, API routes
4. Developer phase: implement each story with TDD — failing test first, then implementation

SETUP:
1. Create the app at: /Users/anderson/Documents/anderson-0/writeflow-benchmark/runs/bmad/writeflow/
2. Run: npx create-next-app@latest writeflow --typescript --tailwind --app --src-dir --import-alias "@/*"

CONSTRAINTS:
- Model: claude-sonnet-4-6 only
- Do not add features not in the spec
- Log every significant turn to: /Users/anderson/Documents/anderson-0/writeflow-benchmark/results/bmad/turn-log.md
  Format: "## Turn N\n**Action:** [what you did]\n**Output:** [brief result]\n"
- Stop at working deploy OR turn 80

SCORING PREP:
After building:
- `vitest run --coverage` → save to results/bmad/coverage.txt
- Note deployed URL in scorecard.md
```

- [ ] **Step 6.3: Monitor and verify the run completes**

---

## Task 7: Score All Four Runs

**Depends on:** Tasks 3, 4, 5, 6 all complete
**Note:** Score each run in isolation — scorer reads only that run's output, not the others.

For each methodology (run in sequence to avoid bias):

- [ ] **Step 7.1: Score mighty-powers**

Dispatch a scoring subagent:

```
You are scoring the WriteFlow app built with the mighty-powers methodology.

App location: /Users/anderson/Documents/anderson-0/writeflow-benchmark/runs/mighty-powers/writeflow/
Results file: /Users/anderson/Documents/anderson-0/writeflow-benchmark/results/mighty-powers/scorecard.md

Run these scoring steps in order:

1. COUNT TURNS: Count entries in results/mighty-powers/turn-log.md → write to scorecard

2. COVERAGE: Read results/mighty-powers/coverage.txt → extract total % → write to scorecard

3. SECURITY SCAN:
   - Run the secret-scanner tool on the app directory
   - Run pentest tool if available
   - Count Critical/High/Medium/Low findings → write to scorecard

4. SHIP SCORECARD:
   - If a deployed URL exists in scorecard.md, run the ship skill against it
   - If no URL, note "not deployed" and skip
   - Paste full ship output into scorecard

5. QUALITATIVE: Write 3-5 bullet observations about what the methodology did well and where it struggled. Read the turn log to understand how the build went.

DO NOT read the other methodologies' results. Score this run in isolation.
```

- [ ] **Step 7.2: Score ultraship** (same prompt, different paths)

- [ ] **Step 7.3: Score superpowers** (same prompt, different paths)

- [ ] **Step 7.4: Score bmad** (same prompt, different paths)

---

## Task 8: Write the Comparison Report

**Depends on:** Task 7 complete (all 4 scorecards filled)

- [ ] **Step 8.1: Dispatch the comparison subagent**

```
You are writing the final comparison report for the WriteFlow methodology benchmark.

Read all 4 scorecards:
- /Users/anderson/Documents/anderson-0/writeflow-benchmark/results/mighty-powers/scorecard.md
- /Users/anderson/Documents/anderson-0/writeflow-benchmark/results/ultraship/scorecard.md
- /Users/anderson/Documents/anderson-0/writeflow-benchmark/results/superpowers/scorecard.md
- /Users/anderson/Documents/anderson-0/writeflow-benchmark/results/bmad/scorecard.md

Write a comparison report to:
/Users/anderson/Documents/anderson-0/writeflow-benchmark/results/comparison.md

The report must include:

1. SCORING TABLE — side-by-side on all 4 dimensions:
   | Dimension | mighty-powers | Ultraship | Superpowers | BMAD |

2. WEIGHTED SCORE — apply the rubric weights:
   - Ship scorecard: 40% (normalize each score 0-100)
   - Test coverage: 25%
   - Security (inverse of findings, normalized): 20%
   - Turn efficiency (fewer = better, normalized): 15%

3. WINNER PER DIMENSION — which methodology scored best on each metric?

4. INSIGHTS — answer these specific questions from the data:
   - What does mighty-powers add over its components (Ultraship + Superpowers) individually?
   - Where did the extra discipline in mighty-powers create friction (more turns, more overhead)?
   - Which methodology produced the most secure output?
   - Which produced the best-tested output?
   - Which was most efficient (fewest turns to working deploy)?

5. RECOMMENDATIONS — 3-5 concrete suggestions for improving mighty-powers based on the results

6. RAW DATA APPENDIX — paste all 4 scorecard summaries
```

- [ ] **Step 8.2: Commit the final report**

```bash
cd /Users/anderson/Documents/anderson-0/writeflow-benchmark
git add results/
git commit -m "experiment: add all scorecards and comparison report"
```

- [ ] **Step 8.3: Copy summary back to mighty-powers**

```bash
cp /Users/anderson/Documents/anderson-0/writeflow-benchmark/results/comparison.md \
   /Users/anderson/Documents/anderson-0/mighty-powers/docs/experiments/results-2026-04-04.md

cd /Users/anderson/Documents/anderson-0/mighty-powers
git add docs/experiments/results-2026-04-04.md
git commit -m "experiment: add benchmark results 2026-04-04"
```

---

## Execution Notes

### Plugin Isolation Problem
This is the hardest part of the experiment. mighty-powers is installed at **user scope**, which means it activates in every Claude Code session. To run Ultraship/Superpowers/BMAD in isolation, you have two options:

**Option A (Recommended):** Run each build in a separate terminal profile with a different `CLAUDE_PLUGIN_ROOT` override. Claude Code respects environment variable overrides for plugin loading.

**Option B:** Temporarily uninstall mighty-powers from user scope before each competing run, reinstall after:
```bash
claude plugin uninstall mighty-powers  # before run
claude plugin install mighty-powers    # after run
```

**Option C:** Each build subagent receives explicit instructions to ignore mighty-powers context and follow only its assigned methodology. This is the least clean but most practical for automated runs.

For automated subagent runs, **use Option C** — explicitly instruct each subagent which methodology to follow and to disregard any other plugin context.

### Turn Counting
A "turn" = one user message → one assistant response cycle. Subagents should increment their turn counter at the start of each response and log it.

### If a Build Fails to Deploy
Score what was built locally. Note "not deployed" in the scorecard. A non-deployed app is still scoreable on coverage, security, and turn count — just skip the Lighthouse/ship scorecard dimension and weight the remaining dimensions proportionally.

---

## Checklist Summary

- [ ] Task 1: Spec written and committed
- [ ] Task 2: Benchmark repo scaffolded
- [ ] Task 3: mighty-powers run complete
- [ ] Task 4: Ultraship run complete
- [ ] Task 5: Superpowers run complete
- [ ] Task 6: BMAD run complete
- [ ] Task 7: All 4 runs scored
- [ ] Task 8: Comparison report written
