// tools/lib/monorepo.mjs
// Detects monorepo workspaces and finds all package directories.
// Supports: pnpm-workspace.yaml, package.json "workspaces", lerna.json

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

function expandPattern(root, pattern) {
  const dirs = [];
  const clean = pattern.replace(/\/?\*$/, '');
  const base = join(root, clean);

  if (!existsSync(base)) return dirs;

  try {
    const stat = statSync(base);
    if (stat.isDirectory()) {
      if (pattern.endsWith('*')) {
        for (const entry of readdirSync(base)) {
          const p = join(base, entry);
          try {
            if (statSync(p).isDirectory() && existsSync(join(p, 'package.json'))) {
              dirs.push(p);
            }
          } catch { /* skip */ }
        }
      } else {
        if (existsSync(join(base, 'package.json'))) {
          dirs.push(base);
        }
      }
    }
  } catch { /* skip */ }

  return dirs;
}

export function findWorkspacePackages(dir) {
  const root = resolve(dir);
  const packages = [];

  const pnpmWs = join(root, 'pnpm-workspace.yaml');
  if (existsSync(pnpmWs)) {
    try {
      const content = readFileSync(pnpmWs, 'utf8');
      const lines = content.split('\n');
      let inPackages = false;
      for (const line of lines) {
        if (/^packages:\s*$/.test(line.trim())) {
          inPackages = true;
          continue;
        }
        if (inPackages) {
          const match = line.match(/^\s*-\s*["']?([^"'\s]+)["']?\s*$/);
          if (match) {
            packages.push(...expandPattern(root, match[1]));
          } else if (/^\S/.test(line) && line.trim()) {
            inPackages = false;
          }
        }
      }
    } catch { /* skip */ }
  }

  if (packages.length === 0) {
    const pkgPath = join(root, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        const workspaces = Array.isArray(pkg.workspaces)
          ? pkg.workspaces
          : (pkg.workspaces?.packages || []);
        for (const pattern of workspaces) {
          packages.push(...expandPattern(root, pattern));
        }
      } catch { /* skip */ }
    }
  }

  if (packages.length === 0) {
    const lernaPath = join(root, 'lerna.json');
    if (existsSync(lernaPath)) {
      try {
        const lerna = JSON.parse(readFileSync(lernaPath, 'utf8'));
        for (const pattern of (lerna.packages || ['packages/*'])) {
          packages.push(...expandPattern(root, pattern));
        }
      } catch { /* skip */ }
    }
  }

  if (packages.length === 0) {
    return [root];
  }

  if (!packages.includes(root)) {
    packages.unshift(root);
  }

  return packages;
}

export function isMonorepo(dir) {
  const root = resolve(dir);
  return (
    existsSync(join(root, 'pnpm-workspace.yaml')) ||
    existsSync(join(root, 'lerna.json')) ||
    (() => {
      try {
        const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
        return !!(pkg.workspaces);
      } catch { return false; }
    })()
  );
}
