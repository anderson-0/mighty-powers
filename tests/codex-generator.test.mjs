// tests/codex-generator.test.mjs
// Unit tests for codex-generator.mjs

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOL = resolve(__dirname, '..', 'tools', 'codex-generator.mjs');
const TEST_DIR = resolve(__dirname, '..', '.test-codex-tmp');

function runTool(projectDir = TEST_DIR) {
  try {
    const stdout = execFileSync('node', [TOOL, projectDir], {
      encoding: 'utf-8',
      timeout: 15000,
      env: { ...process.env, NODE_OPTIONS: '' },
    });
    return JSON.parse(stdout);
  } catch (err) {
    if (err.stdout) {
      try { return JSON.parse(err.stdout); } catch {}
    }
    throw err;
  }
}

describe('codex-generator', () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });

    // Create a minimal JS project with routes and components
    writeFileSync(resolve(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test-project',
      dependencies: { express: '^4.18.0' },
    }));

    // Express routes
    mkdirSync(resolve(TEST_DIR, 'src'), { recursive: true });
    writeFileSync(resolve(TEST_DIR, 'src', 'routes.js'), `
const express = require('express');
const router = express.Router();
router.get('/users', (req, res) => res.json([]));
router.post('/users', (req, res) => res.json({}));
router.delete('/users/:id', (req, res) => res.json({}));
module.exports = router;
`);

    // Lib exports
    mkdirSync(resolve(TEST_DIR, 'lib'), { recursive: true });
    writeFileSync(resolve(TEST_DIR, 'lib', 'utils.js'), `
export function formatDate(date) { return date.toISOString(); }
export function parseId(str) { return parseInt(str, 10); }
export const VERSION = '1.0.0';
`);
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('runs without error on a minimal project', () => {
    const result = runTool();
    assert.equal(result.success, true);
  });

  it('returns stats object', () => {
    const result = runTool();
    assert.ok(result.stats);
    assert.ok(typeof result.stats.routes === 'number');
    assert.ok(typeof result.stats.tables === 'number');
    assert.ok(typeof result.stats.components === 'number');
    assert.ok(typeof result.stats.libs === 'number');
    assert.ok(typeof result.stats.lines === 'number');
  });

  it('extracts express routes', () => {
    const result = runTool();
    // GET+POST to /users merge into one route entry; DELETE /users/:id is separate = 2 routes
    assert.ok(result.stats.routes >= 2, `expected >= 2 routes, got ${result.stats.routes}`);
  });

  it('extracts lib exports', () => {
    const result = runTool();
    assert.ok(result.stats.libs >= 1, `expected >= 1 lib file, got ${result.stats.libs}`);
  });

  it('writes codex.md to .mighty-powers/', () => {
    runTool();
    const codexPath = resolve(TEST_DIR, '.mighty-powers', 'codex.md');
    assert.ok(existsSync(codexPath), '.mighty-powers/codex.md should exist');
    const content = readFileSync(codexPath, 'utf-8');
    assert.ok(content.includes('# Codebase Index'));
  });

  it('markdown includes Routes section when routes found', () => {
    runTool();
    const codexPath = resolve(TEST_DIR, '.mighty-powers', 'codex.md');
    const content = readFileSync(codexPath, 'utf-8');
    assert.ok(content.includes('## Routes'));
    assert.ok(content.includes('/users'));
  });

  it('markdown includes Lib section when lib files found', () => {
    runTool();
    const codexPath = resolve(TEST_DIR, '.mighty-powers', 'codex.md');
    const content = readFileSync(codexPath, 'utf-8');
    assert.ok(content.includes('## Lib'));
  });

  it('does not emit false routes from comment examples in tool source', () => {
    const pluginRoot = resolve(__dirname, '..');
    const result = runTool(pluginRoot);
    assert.equal(result.success, true);
    assert.equal(result.stats.routes, 0, 'should not match route examples in comments');
  });

  it('does not crash on empty directory', () => {
    const emptyDir = resolve(__dirname, '..', '.test-codex-empty');
    mkdirSync(emptyDir, { recursive: true });
    try {
      const result = runTool(emptyDir);
      assert.equal(result.success, true);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
