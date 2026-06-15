import { extname, basename } from 'path';
import { readSafe, makeRelPath, isTestFile, UI_PRIMITIVES } from './codebase-walk.mjs';


export function extractComponents(files, projectDir) {
  const relPath = makeRelPath(projectDir);
  const components = [];

  for (const file of files) {
    const ext = extname(file);
    const rel = relPath(file);
    if (isTestFile(rel)) continue;

    // React/Vue/Svelte/Astro/Angular
    if (!['.tsx', '.jsx', '.vue', '.svelte', '.astro'].includes(ext)) continue;

    const content = readSafe(file);
    if (!content) continue;

    // Vue SFC
    if (ext === '.vue') {
      const name = basename(file, '.vue');
      if (UI_PRIMITIVES.has(name)) continue;
      const propsMatch = content.match(/defineProps<\{([^}]+)\}>/s) ||
                         content.match(/props\s*:\s*\{([^}]+)\}/s);
      const props = propsMatch ? extractPropsFromBlock(propsMatch[1]) : [];
      components.push({ name, file: rel, props, client: false });
      continue;
    }

    // Svelte
    if (ext === '.svelte') {
      const compName = basename(file, '.svelte');
      if (UI_PRIMITIVES.has(compName)) continue;
      // Svelte 5 runes: let { prop1, prop2 } = $props()
      const propsMatch = content.match(/let\s*\{([^}]+)\}\s*=\s*\$props\(/);
      const props = [];
      if (propsMatch) {
        for (const p of propsMatch[1].split(',')) {
          const propName = p.trim().split(/[=:]/)[0].trim();
          if (propName) props.push({ name: propName, optional: p.includes('='), type: 'any' });
        }
      }
      // Svelte 4: export let prop
      const exportPattern = /export\s+let\s+(\w+)/g;
      let match;
      while ((match = exportPattern.exec(content)) !== null) {
        if (!props.find(p => p.name === match[1])) {
          props.push({ name: match[1], optional: false, type: 'any' });
        }
      }
      components.push({ name: compName, file: rel, props, client: false });
      continue;
    }

    // Astro
    if (ext === '.astro') {
      const name = basename(file, '.astro');
      if (UI_PRIMITIVES.has(name)) continue;
      const propsMatch = content.match(/interface\s+Props\s*\{([^}]+)\}/);
      const props = propsMatch ? extractPropsFromBlock(propsMatch[1]) : [];
      components.push({ name, file: rel, props, client: false });
      continue;
    }

    // React (.tsx/.jsx)
    const nameMatch = content.match(/export\s+(?:default\s+)?function\s+(\w+)/) ||
                      content.match(/export\s+default\s+(\w+)/) ||
                      content.match(/const\s+(\w+)\s*[:=]\s*(?:React\.)?(?:FC|memo|forwardRef)/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (UI_PRIMITIVES.has(name)) continue;

    const propsMatch = content.match(/(?:interface|type)\s+\w*Props\w*\s*(?:=\s*)?\{([^}]+)\}/);
    const props = propsMatch ? extractPropsFromBlock(propsMatch[1]) : [];
    const isClient = content.includes("'use client'") || content.includes('"use client"');

    components.push({ name, file: rel, props, client: isClient });
  }

  // Angular components
  for (const file of files) {
    if (!file.endsWith('.component.ts')) continue;
    const content = readSafe(file);
    const nameMatch = content.match(/@Component[\s\S]*?class\s+(\w+)/);
    if (!nameMatch) continue;

    const props = [];
    const inputPattern = /@Input\(\)\s+(\w+)/g;
    let match;
    while ((match = inputPattern.exec(content)) !== null) {
      props.push({ name: match[1], optional: false, type: 'input' });
    }
    components.push({ name: nameMatch[1], file: relPath(file), props, client: false });
  }

  return components;
}

function extractPropsFromBlock(block) {
  const props = [];
  for (const line of block.split('\n')) {
    const propMatch = line.trim().match(/^(\w+)(\?)?\s*:\s*(.+?)(?:;|,|$)/);
    if (propMatch) {
      props.push({ name: propMatch[1], optional: !!propMatch[2], type: propMatch[3].trim() });
    }
  }
  return props;
}

// ── Library Export Extraction ──

export function extractLibExports(files, projectDir) {
  const relPath = makeRelPath(projectDir);
  const libs = [];
  const libDirs = ['lib', 'utils', 'helpers', 'shared', 'common', 'packages', 'core', 'services', 'modules'];

  for (const file of files) {
    const ext = extname(file);
    const rel = relPath(file);
    if (isTestFile(rel)) continue;

    const isLib = libDirs.some(d => rel.startsWith(d + '/') || rel.includes('/' + d + '/'));
    if (!isLib) continue;

    const content = readSafe(file);
    if (!content) continue;

    const exports = [];

    // JS/TS exports
    if (['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(ext)) {
      const fnPattern = /export\s+(?:async\s+)?function\s+(\w+)/g;
      let m;
      while ((m = fnPattern.exec(content)) !== null) exports.push({ name: m[1], kind: 'fn' });

      const constPattern = /export\s+const\s+(\w+)\s*[:=]/g;
      while ((m = constPattern.exec(content)) !== null) exports.push({ name: m[1], kind: 'const' });

      const typePattern = /export\s+(?:type|interface)\s+(\w+)/g;
      while ((m = typePattern.exec(content)) !== null) exports.push({ name: m[1], kind: 'type' });

      const classPattern = /export\s+(?:default\s+)?class\s+(\w+)/g;
      while ((m = classPattern.exec(content)) !== null) exports.push({ name: m[1], kind: 'class' });
    }

    // Python exports
    if (ext === '.py') {
      const defPattern = /^def\s+(\w+)\s*\(/gm;
      let m;
      while ((m = defPattern.exec(content)) !== null) {
        if (!m[1].startsWith('_')) exports.push({ name: m[1], kind: 'fn' });
      }

      const classPattern = /^class\s+(\w+)/gm;
      while ((m = classPattern.exec(content)) !== null) {
        if (!m[1].startsWith('_')) exports.push({ name: m[1], kind: 'class' });
      }
    }

    // Go exports (capitalized functions/types)
    if (ext === '.go') {
      const funcPattern = /^func\s+(\p{Lu}\w*)\s*\(/gmu;
      let m;
      while ((m = funcPattern.exec(content)) !== null) exports.push({ name: m[1], kind: 'fn' });

      const typePattern = /^type\s+(\p{Lu}\w*)\s+/gmu;
      while ((m = typePattern.exec(content)) !== null) exports.push({ name: m[1], kind: 'type' });
    }

    // Ruby (public methods, classes)
    if (ext === '.rb') {
      const defPattern = /def\s+(\w+)/g;
      let m;
      while ((m = defPattern.exec(content)) !== null) {
        if (!m[1].startsWith('_')) exports.push({ name: m[1], kind: 'fn' });
      }
    }

    if (exports.length > 0) {
      libs.push({ file: rel, exports: exports.slice(0, 10) });
    }
  }

  return libs;
}

