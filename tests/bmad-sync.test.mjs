import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptContent, ALL_SKILL_MAP, PHASE2_SKILL_MAP, PHASE3_SKILL_MAP, generateModuleHelpCsv, syncSkill } from '../tools/bmad-sync.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

describe('bmad-sync', () => {
  it('maps expected upstream skills', () => {
    assert.ok(ALL_SKILL_MAP['2-plan-workflows/bmad-prd'] === 'prd');
    assert.ok(ALL_SKILL_MAP['3-solutioning/bmad-architecture'] === 'architecture');
    assert.ok(PHASE2_SKILL_MAP['2-plan-workflows/bmad-ux'] === 'create-ux-design');
  });

  it('maps phase 3 core skills', () => {
    assert.ok(PHASE3_SKILL_MAP['bmad-brainstorming'] === 'brainstorm-session');
    assert.ok(PHASE3_SKILL_MAP['bmad-party-mode'] === 'party-mode');
    assert.ok(PHASE3_SKILL_MAP['bmad-help'] === 'help');
  });

  it('adaptContent rewrites core config and brainstorm references', () => {
    const input = [
      '{project-root}/_bmad/core/config.yaml',
      'python3 {project-root}/_bmad/scripts/resolve_config.py --key agents',
      'when bmad-brainstorming is invoked headless',
      'outlined from bmad-help',
    ].join('\n');

    const out = adaptContent(input, 'brainstorm-session');
    assert.match(out, /\.mighty-powers\/config\.yaml/);
    assert.match(out, /resolve-config\.py/);
    assert.match(out, /mp:brainstorm-session is invoked headless/);
    assert.match(out, /outlined from mp:help/);
  });

  it('synced brainstorm-session is separate from Quick Track brainstorming', () => {
    const sessionPath = join(REPO_ROOT, 'skills/brainstorm-session/SKILL.md');
    const quickPath = join(REPO_ROOT, 'skills/brainstorming/SKILL.md');
    assert.ok(existsSync(sessionPath));
    assert.ok(existsSync(quickPath));
    const session = readFileSync(sessionPath, 'utf8');
    assert.match(session, /^name: brainstorm-session/m);
    assert.match(session, /mp:brainstorming/);
    assert.ok(existsSync(join(REPO_ROOT, 'skills/brainstorm-session/scripts/brain.py')));
  });

  it('synced help skill points at bundled module-help.csv', () => {
    const skillPath = join(REPO_ROOT, 'skills/help/SKILL.md');
    const csvPath = join(REPO_ROOT, 'skills/help/module-help.csv');
    assert.ok(existsSync(skillPath));
    assert.ok(existsSync(csvPath));
    const content = readFileSync(skillPath, 'utf8');
    assert.match(content, /\{skill-root\}\/module-help\.csv/);
    assert.match(content, /\.mighty-powers\/config\.yaml/);
    const csv = readFileSync(csvPath, 'utf8');
    assert.match(csv, /brainstorm-session/);
    assert.doesNotMatch(csv, /bmad-brainstorming/);
  });

  it('synced party-mode uses resolve-config roster', () => {
    const skillPath = join(REPO_ROOT, 'skills/party-mode/SKILL.md');
    const content = readFileSync(skillPath, 'utf8');
    assert.match(content, /resolve-config\.py/);
    assert.match(content, /\.mighty-powers\/config\.yaml/);
  });

  it('generateModuleHelpCsv requires BMAD bmm-skills tree', () => {
    assert.throws(
      () => generateModuleHelpCsv('/nonexistent'),
      /ENOENT|not found/i,
    );
  });

  it('adaptContent rewrites config and skill references', () => {
    const input = [
      'Load {project-root}/_bmad/bmm/config.yaml',
      'invoke `bmad-prd` then `bmad-architecture`',
      'python3 {project-root}/_bmad/scripts/resolve_customization.py --skill x',
      'skill:bmad-editorial-review-prose',
    ].join('\n');

    const out = adaptContent(input, 'prd');
    assert.match(out, /\.mighty-powers\/config\.yaml/);
    assert.match(out, /mp:prd/);
    assert.match(out, /mp:architecture/);
    assert.match(out, /resolve-customization\.py/);
    assert.match(out, /Apply prose polish/);
    assert.doesNotMatch(out, /_bmad\/bmm/);
  });

  it('synced prd skill exists with adapted activation', () => {
    const skillPath = join(REPO_ROOT, 'skills/prd/SKILL.md');
    assert.ok(existsSync(skillPath));
    const content = readFileSync(skillPath, 'utf8');
    assert.match(content, /^name: prd/m);
    assert.match(content, /\.mighty-powers\/config\.yaml/);
    assert.match(content, /mp:party-mode/);
  });

  it('syncSkill requires BMAD source tree', () => {
    assert.throws(
      () => syncSkill('/nonexistent', '2-plan-workflows/bmad-prd', 'prd'),
      /BMAD skill not found/,
    );
  });

  it('synced research composite has three workflow modes', () => {
    const researchDir = join(REPO_ROOT, 'skills/research');
    assert.ok(existsSync(join(researchDir, 'domain-workflow.md')));
    assert.ok(existsSync(join(researchDir, 'market-workflow.md')));
    assert.ok(existsSync(join(researchDir, 'technical-workflow.md')));
    const market = readFileSync(join(researchDir, 'market-workflow.md'), 'utf8');
    assert.match(market, /\.\/market-steps\/step-01-init\.md/);
    assert.doesNotMatch(market, /market-market-steps/);
  });

  it('synced create-ux-design uses upstream DESIGN.md model', () => {
    const skillPath = join(REPO_ROOT, 'skills/create-ux-design/SKILL.md');
    const content = readFileSync(skillPath, 'utf8');
    assert.match(content, /DESIGN\.md/);
    assert.match(content, /EXPERIENCE\.md/);
    assert.match(content, /mp:prd/);
  });
});
