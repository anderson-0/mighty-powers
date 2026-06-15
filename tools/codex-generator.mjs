#!/usr/bin/env node
// codex-generator.mjs — Generate compact codebase index to save AI tokens
// Usage: node tools/codex-generator.mjs [project-directory]

import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { walk, extractStructure } from './lib/codebase-walk.mjs';
import {
  detectStack,
  extractRoutes,
  extractSchema,
  extractComponents,
  extractLibExports,
} from './lib/codebase-extract.mjs';

const projectDir = process.argv[2] || process.cwd();

function output(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

function generateMarkdown(data, stack) {
  const lines = [];

  const stackParts = [];
  if (stack.frameworks.length) stackParts.push(stack.frameworks.join(', '));
  if (stack.orms.length) stackParts.push(stack.orms.join(', '));
  if (stack.ui.length) stackParts.push(stack.ui.join(', '));
  if (!stackParts.length && stack.language !== 'unknown') stackParts.push(stack.language);

  lines.push('# Codebase Index');
  lines.push(`Stack: ${stackParts.join(' + ') || 'unknown'}`);
  lines.push('');

  if (data.structure.length > 0) {
    lines.push('## Structure');
    for (const dir of data.structure) {
      lines.push(`  ${dir.name}`);
      for (const child of dir.children.slice(0, 5)) {
        lines.push(`    ${child}`);
      }
      if (dir.children.length > 5) lines.push(`    +${dir.children.length - 5} more`);
    }
    lines.push('');
  }

  if (data.routes.length > 0) {
    lines.push('## Routes');
    for (const r of data.routes) {
      const methods = r.methods.join(',');
      const tags = r.tags.length > 0 ? ` [${r.tags.join(',')}]` : '';
      lines.push(`  ${methods.padEnd(14)} ${r.path}${tags}`);
    }
    lines.push('');
  }

  if (data.schema.length > 0) {
    lines.push('## Schema');
    for (const t of data.schema) {
      lines.push(`  ${t.table} (${t.file})`);
      for (const c of t.columns) {
        const flags = c.flags.length > 0 ? ` ${c.flags.join(' ')}` : '';
        lines.push(`    ${c.name.padEnd(20)} ${c.type}${flags}`);
      }
    }
    lines.push('');
  }

  if (data.components.length > 0) {
    lines.push('## Components');
    for (const c of data.components) {
      const client = c.client ? ' (c)' : '';
      const props = c.props.length > 0
        ? ` — ${c.props.slice(0, 6).map(p => `${p.name}${p.optional ? '?' : ''}`).join(', ')}${c.props.length > 6 ? ` +${c.props.length - 6}` : ''}`
        : '';
      lines.push(`  ${c.name}${client}${props}`);
      lines.push(`    ${c.file}`);
    }
    lines.push('');
  }

  if (data.libs.length > 0) {
    lines.push('## Lib');
    for (const l of data.libs) {
      const exps = l.exports.map(e => `${e.kind === 'type' ? 'T:' : ''}${e.name}`).join(', ');
      lines.push(`  ${l.file}`);
      lines.push(`    ${exps}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

try {
  const stack = detectStack(projectDir);
  const files = walk(projectDir);
  const data = {
    structure: extractStructure(projectDir),
    routes: extractRoutes(files, projectDir),
    schema: extractSchema(files, stack, projectDir),
    components: extractComponents(files, projectDir),
    libs: extractLibExports(files, projectDir),
  };

  const markdown = generateMarkdown(data, stack);

  const outputDir = join(projectDir, '.mighty-powers');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { mode: 0o700, recursive: true });

  const outputPath = join(outputDir, 'codex.md');
  writeFileSync(outputPath, markdown, { mode: 0o600 });

  output({
    success: true,
    output: outputPath,
    stack,
    stats: {
      routes: data.routes.length,
      tables: data.schema.length,
      components: data.components.length,
      libs: data.libs.length,
      lines: markdown.split('\n').length,
    },
  });
} catch (err) {
  output({ success: false, error: err.message });
}
