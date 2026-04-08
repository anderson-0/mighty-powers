---
main_config: '.mighty-powers/config.yaml'
---

# Quick Dev New Preview Workflow

**Goal:** Turn user intent into a hardened, reviewable artifact.

**CRITICAL:** If a step says "read fully and follow step-XX", you read and follow step-XX. No exceptions.


## READY FOR DEVELOPMENT STANDARD

A specification is "Ready for Development" when:

- **Actionable**: Every task has a file path and specific action.
- **Logical**: Tasks ordered by dependency.
- **Testable**: All ACs use Given/When/Then.
- **Complete**: No placeholders or TBDs.


## SCOPE STANDARD

A specification should target a **single user-facing goal** within **900-1600 tokens**:

- **Single goal**: One cohesive feature, even if it spans multiple layers/files. Multi-goal means >=2 **top-level independent shippable deliverables** -- each could be reviewed, tested, and merged as a separate PR without breaking the others. Never count surface verbs, "and" conjunctions, or noun phrases. Never split cross-layer implementation details inside one user goal.
  - Split: "add dark mode toggle AND refactor auth to JWT AND build admin dashboard"
  - Don't split: "add validation and display errors" / "support drag-and-drop AND paste AND retry"
- **900-1600 tokens**: Optimal range for LLM consumption. Below 900 risks ambiguity; above 1600 risks context-rot in implementation agents.
- **Neither limit is a gate.** Both are proposals with user override.


## WORKFLOW ARCHITECTURE

Step-file architecture: each step is self-contained. Read one step file at a time, follow it completely, halt at checkpoints for human input, then load the next. Never load multiple steps simultaneously or skip steps.


## INITIALIZATION SEQUENCE

### 1. Configuration Loading

Load and read full config from `{main_config}` and resolve:

- `project_name`, `planning_artifacts`, `implementation_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `date` as system-generated current datetime
- `project_context` = `**/project-context.md` (load if exists)
- CLAUDE.md / memory files (load if exist)

YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`.

### 2. Paths

- `wipFile` = `{implementation_artifacts}/spec-wip.md`

### 3. First Step Execution

Read fully and follow: `./steps/step-01-clarify-and-route.md` to begin the workflow.
