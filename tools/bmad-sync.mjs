#!/usr/bin/env node
/**
 * Port BMAD bmm-skills into Mighty Powers with path and reference adaptations.
 *
 * Usage:
 *   node tools/bmad-sync.mjs [--bmad PATH] [--skill NAME] [--all] [--phase1] [--phase2] [--phase3]
 *
 * Pinned upstream: see docs/bmad-sync.md
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DEFAULT_BMAD = '/tmp/BMAD-METHOD';
const BMM_SKILLS = 'src/bmm-skills';
const CORE_SKILLS = 'src/core-skills';

const RESOLVE_SCRIPT = '${CLAUDE_PLUGIN_ROOT}/tools/lib/resolve-customization.py';
const MEMLOG_SCRIPT = '${CLAUDE_PLUGIN_ROOT}/tools/lib/memlog.py';
const RESOLVE_CONFIG_SCRIPT = '${CLAUDE_PLUGIN_ROOT}/tools/lib/resolve-config.py';

/** Phase 1 — structural rewrites (unified PRD, spine architecture, sprint split) */
export const PHASE1_SKILL_MAP = {
  '2-plan-workflows/bmad-prd': 'prd',
  '3-solutioning/bmad-architecture': 'architecture',
  '4-implementation/bmad-sprint-planning': 'sprint-planning',
  '4-implementation/bmad-sprint-status': 'sprint-status',
  '1-analysis/bmad-prfaq': 'prfaq',
  '4-implementation/bmad-checkpoint-preview': 'checkpoint-preview',
  '4-implementation/bmad-qa-generate-e2e-tests': 'qa-generate-e2e-tests',
};

/** Phase 2 — incremental diff-merge skills */
export const PHASE2_SKILL_MAP = {
  '1-analysis/bmad-document-project': 'document-project',
  '1-analysis/bmad-product-brief': 'product-brief',
  '2-plan-workflows/bmad-ux': 'create-ux-design',
  '3-solutioning/bmad-create-epics-and-stories': 'create-epics',
  '3-solutioning/bmad-generate-project-context': 'generate-project-context',
  '3-solutioning/bmad-check-implementation-readiness': 'check-readiness',
  '4-implementation/bmad-create-story': 'create-story',
  '4-implementation/bmad-dev-story': 'dev-story',
  '4-implementation/bmad-correct-course': 'correct-course',
  '4-implementation/bmad-retrospective': 'retrospective',
  '4-implementation/bmad-quick-dev': 'quick-dev',
};

/** Phase 3 — core skills (src/core-skills). brainstorm-session is Lifecycle; brainstorming stays Quick Track. */
export const PHASE3_SKILL_MAP = {
  'bmad-advanced-elicitation': 'advanced-elicitation',
  'bmad-party-mode': 'party-mode',
  'bmad-help': 'help',
  'bmad-brainstorming': 'brainstorm-session',
  'bmad-review-adversarial-general': 'adversarial-review',
};

/** Map BMAD skill ids in module-help.csv → Mighty Powers skill directory names */
export const BMAD_TO_MP_SKILL = {
  'bmad-document-project': 'document-project',
  'bmad-generate-project-context': 'generate-project-context',
  'bmad-quick-dev': 'quick-dev',
  'bmad-correct-course': 'correct-course',
  'bmad-brainstorming': 'brainstorm-session',
  'bmad-market-research': 'research',
  'bmad-domain-research': 'research',
  'bmad-technical-research': 'research',
  'bmad-product-brief': 'product-brief',
  'bmad-prfaq': 'prfaq',
  'bmad-prd': 'prd',
  'bmad-ux': 'create-ux-design',
  'bmad-architecture': 'architecture',
  'bmad-create-epics-and-stories': 'create-epics',
  'bmad-check-implementation-readiness': 'check-readiness',
  'bmad-sprint-planning': 'sprint-planning',
  'bmad-sprint-status': 'sprint-status',
  'bmad-create-story': 'create-story',
  'bmad-dev-story': 'dev-story',
  'bmad-code-review': 'code-review',
  'bmad-checkpoint-preview': 'checkpoint-preview',
  'bmad-qa-generate-e2e-tests': 'qa-generate-e2e-tests',
  'bmad-retrospective': 'retrospective',
  'bmad-investigate': 'investigate',
};

const SKILLS_OMITTED_FROM_CATALOG = new Set(['bmad-agent-tech-writer', 'bmad-agent-analyst', 'bmad-agent-pm', 'bmad-agent-ux-designer', 'bmad-agent-architect', 'bmad-agent-dev']);

/** @deprecated use ALL_SKILL_MAP */
export const SKILL_MAP = { ...PHASE1_SKILL_MAP, ...PHASE2_SKILL_MAP };

export const ALL_SKILL_MAP = { ...PHASE1_SKILL_MAP, ...PHASE2_SKILL_MAP };

/** Composite skills — not a 1:1 directory copy */
export const COMPOSITE_SKILLS = new Set(['research']);

const RESEARCH_MODES = [
  {
    source: '1-analysis/research/bmad-domain-research',
    workflowFile: 'domain-workflow.md',
    stepSource: 'domain-steps',
    stepDest: 'domain-steps',
    pathRewrites: {},
  },
  {
    source: '1-analysis/research/bmad-market-research',
    workflowFile: 'market-workflow.md',
    stepSource: 'steps',
    stepDest: 'market-steps',
    pathRewrites: { './steps/': './market-steps/', '`steps/': '`market-steps/' },
  },
  {
    source: '1-analysis/research/bmad-technical-research',
    workflowFile: 'technical-workflow.md',
    stepSource: 'technical-steps',
    stepDest: 'technical-steps',
    pathRewrites: {},
  },
];

const RESEARCH_ROUTER_SKILL = `---
name: research
description: 'Use when you need to research a domain, market, or technical area before planning'
---

# Research Skill

This skill supports three research modes. Pick the one that matches your needs:

## Modes

### 1. Domain Research
Conduct domain and industry research. Use when you want to research a topic, industry, or sector.

**Start here:** Follow the instructions in [./domain-workflow.md](./domain-workflow.md).

### 2. Market Research
Conduct market research on competition and customers. Use when you need market research, customer insights, or competitive analysis.

**Start here:** Follow the instructions in [./market-workflow.md](./market-workflow.md).

### 3. Technical Research
Conduct technical research on technologies and architecture. Use when you want to produce a technical research report.

**Start here:** Follow the instructions in [./technical-workflow.md](./technical-workflow.md).

---

Ask the user which mode they want, then load the corresponding workflow file.
`;

const CREATE_EPICS_APPEND = `

## After Epics Are Created — Transition to Implementation

When epics and stories are complete, guide the user to implementation:

> "Epics and stories are ready. For implementation, you have two paths:"
>
> **Story-by-story (recommended for most projects):**
> Use \`mp:create-story\` to prepare each story, then \`mp:dev-story\` to implement.
>
> **Lifecycle sprint tracking:**
> Run \`mp:sprint-planning\` then the story cycle (\`create-story\` → \`dev-story\` → \`code-review\`).
> For Quick Track shipping, use \`mp:sprint\`.
`;

const SKILL_REFS = [
  ['bmad-party-mode', 'mp:party-mode'],
  ['bmad-advanced-elicitation', 'mp:advanced-elicitation'],
  ['bmad-product-brief', 'mp:product-brief'],
  ['bmad-prfaq', 'mp:prfaq'],
  ['bmad-quick-dev', 'mp:quick-dev'],
  ['bmad-ux', 'mp:create-ux-design'],
  ['bmad-architecture', 'mp:architecture'],
  ['bmad-create-architecture', 'mp:architecture'],
  ['bmad-create-epics-and-stories', 'mp:create-epics'],
  ['bmad-generate-project-context', 'mp:generate-project-context'],
  ['bmad-document-project', 'mp:document-project'],
  ['bmad-domain-research', 'mp:research'],
  ['bmad-market-research', 'mp:research'],
  ['bmad-technical-research', 'mp:research'],
  ['perform-research', 'mp:research'],
  ['bmad-prd', 'mp:prd'],
  ['bmad-create-prd', 'mp:prd'],
  ['bmad-validate-prd', 'mp:prd'],
  ['bmad-edit-prd', 'mp:prd'],
  ['bmad-create-story', 'mp:create-story'],
  ['bmad-dev-story', 'mp:dev-story'],
  ['bmad-code-review', 'mp:code-review'],
  ['bmad-help', 'mp:help'],
  ['bmad-sprint-planning', 'mp:sprint-planning'],
  ['bmad-sprint-status', 'mp:sprint-status'],
  ['bmad-retrospective', 'mp:retrospective'],
  ['bmad-investigate', 'mp:investigate'],
  ['bmad-brainstorming', 'mp:brainstorm-session'],
  ['bmad-check-implementation-readiness', 'mp:check-readiness'],
  ['bmad-correct-course', 'mp:correct-course'],
  ['bmad-spec', 'mp:generate-project-context'],
];

const WORKFLOW_SLASH = {
  'sprint-planning': 'sprint-planning',
  'sprint-status': 'sprint-status',
  'create-story': 'create-story',
  'create-story:validate': 'create-story',
  'dev-story': 'dev-story',
  'code-review': 'code-review',
  'retrospective': 'retrospective',
};

const TEXT_EXTENSIONS = new Set(['md', 'toml', 'yaml', 'yml', 'html', 'csv', 'py', 'txt', 'json']);

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function applyPathRewrites(text, rewrites) {
  let s = text;
  for (const [from, to] of Object.entries(rewrites)) {
    s = s.replaceAll(from, to);
  }
  return s;
}

export function adaptContent(text, destSkillName) {
  let s = text;

  s = s.replaceAll('{project-root}/_bmad/bmm/config.yaml', '{project-root}/.mighty-powers/config.yaml');
  s = s.replaceAll('_bmad/bmm/config.yaml', '.mighty-powers/config.yaml');
  s = s.replaceAll('{project-root}/_bmad/custom/', '{project-root}/.mighty-powers/custom/');
  s = s.replaceAll('_bmad/custom/', '.mighty-powers/custom/');
  s = s.replaceAll('research.template.md', 'research-template.md');

  s = s.replaceAll(
    'python3 {project-root}/_bmad/scripts/resolve_customization.py',
    `python3 ${RESOLVE_SCRIPT}`,
  );
  s = s.replaceAll(
    '{project-root}/_bmad/scripts/resolve_customization.py',
    RESOLVE_SCRIPT,
  );
  s = s.replaceAll(
    'python3 {project-root}/_bmad/scripts/memlog.py',
    `python3 ${MEMLOG_SCRIPT}`,
  );
  s = s.replaceAll('{project-root}/_bmad/core/config.yaml', '{project-root}/.mighty-powers/config.yaml');
  s = s.replaceAll('_bmad/core/config.yaml', '.mighty-powers/config.yaml');
  s = s.replaceAll(
    'python3 {project-root}/_bmad/scripts/resolve_config.py',
    `python3 ${RESOLVE_CONFIG_SCRIPT}`,
  );
  s = s.replaceAll('{project-root}/_bmad/scripts/resolve_config.py', RESOLVE_CONFIG_SCRIPT);
  s = s.replaceAll('python3 {skill-root}/scripts/memlog.py', `python3 ${MEMLOG_SCRIPT}`);
  s = s.replaceAll('{skill-root}/scripts/memlog.py', MEMLOG_SCRIPT);
  s = s.replaceAll(
    '{project-root}/_bmad/_config/bmad-help.csv',
    '{skill-root}/module-help.csv',
  );

  for (const [from, to] of SKILL_REFS) {
    s = s.replaceAll(`\`${from}\``, `\`${to}\``);
    s = s.replaceAll(`invoke the \`${from}\` skill`, `invoke \`${to}\``);
    s = s.replaceAll(`invoke \`${from}\``, `invoke \`${to}\``);
    s = s.replaceAll(`skill:${from}`, to.startsWith('mp:') ? to : `skill:${to}`);
  }

  s = s.replace(/\/bmad:bmm:workflows:([\w-]+(?::[\w-]+)?)/g, (_, wf) => {
    const mapped = WORKFLOW_SLASH[wf] ?? wf.split(':')[0];
    return `\`mp:${mapped}\``;
  });

  s = s.replaceAll(
    'skill:bmad-editorial-review-structure',
    'Apply structural polish: tighten sections, cut redundancy, improve flow.',
  );
  s = s.replaceAll(
    'skill:bmad-editorial-review-prose',
    'Apply prose polish: grammar, clarity, consistent voice.',
  );

  s = s.replace(/^name: bmad-[\w-]+/m, `name: ${destSkillName}`);
  s = s.replace(/^# BMad PRD$/m, '# PRD');
  s = s.replace(/^# BMad Architecture$/m, '# Architecture');
  s = s.replace(/^# BMad UX$/m, '# UX Design');
  s = s.replace(/^# BMad /gm, '# Mighty Powers ');

  s = s.replace(
    /Load bmad-prd is invoked headless/g,
    'Load when mp:prd is invoked headless',
  );
  s = s.replace(/when bmad-prd is invoked headless/g, 'when mp:prd is invoked headless');

  s = s.replaceAll('bmad-workflow-builder', 'mp:writing-skills');
  s = s.replaceAll('BMad GDS', 'a game-design workflow (not bundled in Mighty Powers)');
  s = s.replaceAll('per BMad merge rules', 'per Mighty Powers merge rules');
  s = s.replaceAll('per BMad rules', 'per Mighty Powers rules');
  s = s.replaceAll('bmad-customize', '`.mighty-powers/custom/` overrides');
  s = s.replaceAll('BMad ecosystem', 'Mighty Powers lifecycle');
  s = s.replaceAll('outlined from bmad-help', 'outlined from mp:help');
  s = s.replaceAll('bmad-spec', 'mp:generate-project-context');
  s = s.replaceAll('when bmad-brainstorming is invoked headless', 'when mp:brainstorm-session is invoked headless');
  s = s.replaceAll('ONLY when bmad-brainstorming is invoked headless', 'ONLY when mp:brainstorm-session is invoked headless');

  for (const [from] of SKILL_REFS) {
    s = s.replaceAll(`.mighty-powers/custom/${from}.`, `.mighty-powers/custom/${destSkillName}.`);
    s = s.replaceAll(`custom/${from}.toml`, `custom/${destSkillName}.toml`);
  }

  return s;
}

function patchSkillFrontmatter(content, destSkillName, bmadName) {
  let s = adaptContent(content, destSkillName);
  s = s.replace(new RegExp(`^name: ${bmadName.replace(/-/g, '\\-')}`, 'm'), `name: ${destSkillName}`);
  return s;
}

function writeAdaptedFile(srcFile, destFile, destSkillName, { patchSkill = false, bmadName, pathRewrites = {} } = {}) {
  mkdirSync(dirname(destFile), { recursive: true });
  const ext = destFile.split('.').pop()?.toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext ?? '')) {
    cpSync(srcFile, destFile);
    return;
  }
  let raw = readFileSync(srcFile, 'utf8');
  if (patchSkill) {
    raw = patchSkillFrontmatter(raw, destSkillName, bmadName);
  } else {
    raw = adaptContent(raw, destSkillName);
  }
  raw = applyPathRewrites(raw, pathRewrites);
  writeFileSync(destFile, raw, 'utf8');
}

function buildResearchWorkflow(skillMd, destSkillName, pathRewrites) {
  const body = skillMd.replace(/^---[\s\S]*?---\n/, '').trimStart();
  return applyPathRewrites(adaptContent(body, destSkillName), pathRewrites);
}

export function syncResearchSkill(bmadRoot) {
  const destDir = join(REPO_ROOT, 'skills', 'research');
  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true, force: true });
  }
  mkdirSync(destDir, { recursive: true });

  let count = 0;

  for (const mode of RESEARCH_MODES) {
    const sourceDir = join(bmadRoot, BMM_SKILLS, mode.source);
    if (!existsSync(sourceDir)) {
      throw new Error(`BMAD research skill not found: ${sourceDir}`);
    }

    const skillMd = readFileSync(join(sourceDir, 'SKILL.md'), 'utf8');
    writeFileSync(
      join(destDir, mode.workflowFile),
      `${buildResearchWorkflow(skillMd, 'research', mode.pathRewrites)}\n`,
      'utf8',
    );
    count += 1;

    const stepSrc = join(sourceDir, mode.stepSource);
    if (existsSync(stepSrc)) {
      for (const srcFile of walkFiles(stepSrc)) {
        const rel = relative(stepSrc, srcFile);
        writeAdaptedFile(
          srcFile,
          join(destDir, mode.stepDest, rel),
          'research',
          { pathRewrites: mode.pathRewrites },
        );
        count += 1;
      }
    }

    const templateSrc = join(sourceDir, 'research.template.md');
    if (existsSync(templateSrc)) {
      writeAdaptedFile(templateSrc, join(destDir, 'research-template.md'), 'research');
      count += 1;
    }

    const customizeSrc = join(sourceDir, 'customize.toml');
    if (existsSync(customizeSrc) && mode.workflowFile === 'domain-workflow.md') {
      writeAdaptedFile(customizeSrc, join(destDir, 'customize.toml'), 'research');
      count += 1;
    }
  }

  writeFileSync(join(destDir, 'SKILL.md'), RESEARCH_ROUTER_SKILL, 'utf8');
  count += 1;

  return { destName: 'research', files: count, destDir };
}

function postSyncPatch(destName) {
  if (destName === 'create-epics') {
    const skillPath = join(REPO_ROOT, 'skills', destName, 'SKILL.md');
    let content = readFileSync(skillPath, 'utf8');
    if (!content.includes('After Epics Are Created')) {
      content += CREATE_EPICS_APPEND;
      writeFileSync(skillPath, content, 'utf8');
    }
  }

  if (destName === 'help') {
    const skillPath = join(REPO_ROOT, 'skills', 'help', 'SKILL.md');
    let content = readFileSync(skillPath, 'utf8');
    content = content.replace(
      /- \*\*Catalog\*\*:.*$/m,
      '- **Catalog**: `{skill-root}/module-help.csv` (bundled default; project override at `{project-root}/.mighty-powers/module-help.csv`)',
    );
    content = content.replace(/# BMad Help/g, '# Mighty Powers Help');
    content = content.replace(/BMad workflow/g, 'Mighty Powers lifecycle workflow');
    content = content.replace(/BMad questions/g, 'Mighty Powers / lifecycle questions');
    content = content.replace(
      /- \*\*Config\*\*:.*$/m,
      '- **Config**: `{project-root}/.mighty-powers/config.yaml` (and `config.user.yaml` if present) — resolve `output-location` variables, provide `communication_language` and `project_knowledge`',
    );
    content = content.replace(
      /Skill name in backticks — e\.g\., `mp:prd`/,
      'Skill name in backticks — e.g., `mp:prd` (always use `mp:` prefix)',
    );
    writeFileSync(skillPath, content, 'utf8');
  }

  if (destName === 'brainstorm-session') {
    const skillPath = join(REPO_ROOT, 'skills', 'brainstorm-session', 'SKILL.md');
    let content = readFileSync(skillPath, 'utf8');
    if (!content.includes('Quick Track')) {
      const note = `\n> **Quick Track:** For pre-implementation design with approval gates, use \`mp:brainstorming\` instead. This skill is the Lifecycle ideation session (creative techniques + memlog).\n\n`;
      content = content.replace(/^(---\n[\s\S]*?---\n\n# .+\n\n)/, `$1${note}`);
      writeFileSync(skillPath, content, 'utf8');
    }
  }
}

export function syncSkill(bmadRoot, sourceRel, destName) {
  const sourceDir = join(bmadRoot, BMM_SKILLS, sourceRel);
  const destDir = join(REPO_ROOT, 'skills', destName);
  const bmadName = basename(sourceDir);

  if (!existsSync(sourceDir)) {
    throw new Error(`BMAD skill not found: ${sourceDir}`);
  }

  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true, force: true });
  }
  mkdirSync(destDir, { recursive: true });

  const files = walkFiles(sourceDir);
  let count = 0;

  for (const srcFile of files) {
    const rel = relative(sourceDir, srcFile);
    const destFile = join(destDir, rel);
    writeAdaptedFile(srcFile, destFile, destName, {
      patchSkill: rel === 'SKILL.md',
      bmadName,
    });
    count += 1;
  }

  postSyncPatch(destName);

  return { destName, files: count, destDir };
}

export function syncCoreSkill(bmadRoot, bmadSkillName, destName) {
  const sourceDir = join(bmadRoot, CORE_SKILLS, bmadSkillName);
  const destDir = join(REPO_ROOT, 'skills', destName);

  if (!existsSync(sourceDir)) {
    throw new Error(`BMAD core skill not found: ${sourceDir}`);
  }

  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true, force: true });
  }
  mkdirSync(destDir, { recursive: true });

  let count = 0;
  for (const srcFile of walkFiles(sourceDir)) {
    const rel = relative(sourceDir, srcFile);
    writeAdaptedFile(srcFile, join(destDir, rel), destName, {
      patchSkill: rel === 'SKILL.md',
      bmadName: bmadSkillName,
    });
    count += 1;
  }

  postSyncPatch(destName);
  return { destName, files: count, destDir };
}

function mapCsvSkillRef(value) {
  if (!value) {
    return value;
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .map((part) => {
      const [skill, action] = part.split(':');
      const mapped = BMAD_TO_MP_SKILL[skill] ?? skill;
      return action ? `${mapped}:${action}` : mapped;
    })
    .join(',');
}

export function syncOne(bmadRoot, destName) {
  if (COMPOSITE_SKILLS.has(destName)) {
    if (destName === 'research') {
      return syncResearchSkill(bmadRoot);
    }
    throw new Error(`Unknown composite skill: ${destName}`);
  }

  const coreHit = Object.entries(PHASE3_SKILL_MAP).find(([, dest]) => dest === destName);
  if (coreHit) {
    return syncCoreSkill(bmadRoot, coreHit[0], destName);
  }

  const hit = Object.entries(ALL_SKILL_MAP).find(([, dest]) => dest === destName);
  if (!hit) {
    throw new Error(`Unknown skill "${destName}"`);
  }
  return syncSkill(bmadRoot, hit[0], destName);
}

export function generateModuleHelpCsv(bmadRoot) {
  const src = join(bmadRoot, BMM_SKILLS, 'module-help.csv');
  const dest = join(REPO_ROOT, 'skills', 'help', 'module-help.csv');
  let csv = readFileSync(src, 'utf8');

  csv = csv.replace(/^BMad Method/gm, 'Mighty Powers');
  csv = csv.replace(
    /^Mighty Powers,_meta,.*$/m,
    'Mighty Powers,_meta,,,,,,,,,false,https://github.com/anderson-0/mighty-powers,',
  );
  csv = csv.replace(/\boutput_folder\b/g, 'planning_artifacts');
  csv = csv.replace(/\bproject-knowledge\b/g, 'project_knowledge');

  for (const [from, to] of Object.entries(BMAD_TO_MP_SKILL)) {
    csv = csv.replaceAll(from, to);
  }

  csv = csv
    .split('\n')
    .filter((line) => !/\bbmad-agent-/.test(line))
    .filter((line) => !/\b_bmad\//.test(line))
    .join('\n');

  writeFileSync(dest, csv.endsWith('\n') ? csv : `${csv}\n`, 'utf8');
  return dest;
}

function resolveDestNames(opts) {
  if (opts.skills.length > 0) {
    return opts.skills;
  }

  const names = [];
  if (opts.all || opts.phase1) {
    names.push(...Object.values(PHASE1_SKILL_MAP));
  }
  if (opts.all || opts.phase2) {
    names.push(...Object.values(PHASE2_SKILL_MAP));
    names.push('research');
  }
  if (opts.all || opts.phase3) {
    names.push(...Object.values(PHASE3_SKILL_MAP));
  }
  return [...new Set(names)];
}

function parseArgs(argv) {
  const opts = { bmad: DEFAULT_BMAD, skills: [], all: false, phase1: false, phase2: false, phase3: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--bmad' && argv[i + 1]) {
      opts.bmad = argv[++i];
    } else if (argv[i] === '--skill' && argv[i + 1]) {
      opts.skills.push(argv[++i]);
    } else if (argv[i] === '--all') {
      opts.all = true;
    } else if (argv[i] === '--phase1') {
      opts.phase1 = true;
    } else if (argv[i] === '--phase2') {
      opts.phase2 = true;
    } else if (argv[i] === '--phase3') {
      opts.phase3 = true;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Usage: node tools/bmad-sync.mjs [--bmad PATH] [--skill NAME] [--all] [--phase1] [--phase2] [--phase3]`);
      process.exit(0);
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv);
  const destNames = resolveDestNames(opts);

  if (destNames.length === 0) {
    console.error('No skills selected. Use --all, --phase1, --phase2, --phase3, or --skill <name>');
    process.exit(1);
  }

  if (!existsSync(join(opts.bmad, BMM_SKILLS))) {
    console.error(`BMAD repo not found at ${opts.bmad}. Clone BMAD-METHOD first.`);
    process.exit(1);
  }

  const results = [];
  for (const destName of destNames) {
    results.push(syncOne(opts.bmad, destName));
  }

  if (opts.all || opts.phase3 || destNames.includes('help')) {
    const csvPath = generateModuleHelpCsv(opts.bmad);
    console.log(`Generated module-help.csv → ${relative(REPO_ROOT, csvPath)}`);
  }

  for (const r of results) {
    console.log(`Synced ${r.destName}: ${r.files} files → ${relative(REPO_ROOT, r.destDir)}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
