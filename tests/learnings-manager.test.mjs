// tests/learnings-manager.test.mjs
// Unit tests for learnings-manager.mjs

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, rmSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOL = resolve(__dirname, '..', 'tools', 'learnings-manager.mjs');
const TEST_DIR = resolve(__dirname, '..', '.test-learnings-tmp');

function runTool(args = [], cwd = TEST_DIR) {
  try {
    const stdout = execFileSync('node', [TOOL, ...args], {
      encoding: 'utf-8',
      timeout: 10000,
      cwd,
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

describe('learnings-manager CLI', () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('shows usage when no args provided', () => {
    const result = runTool([]);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('Usage'));
  });

  it('rejects unknown action', () => {
    const result = runTool(['foobar']);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('Unknown action'));
  });

  it('save requires --title and --body', () => {
    const result = runTool(['save']);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('--title'));
  });

  it('saves a learning successfully', () => {
    const result = runTool(['save', '--title', 'Test Learning', '--body', 'Some content', '--tags', 'test,unit']);
    assert.equal(result.success, true);
    assert.equal(result.action, 'save');
    assert.equal(result.learning.title, 'Test Learning');
    assert.equal(result.learning.body, 'Some content');
    assert.deepEqual(result.learning.tags, ['test', 'unit']);
    assert.ok(result.learning.id);
    assert.ok(result.learning.created_at);
  });

  it('lists saved learnings', () => {
    const result = runTool(['list']);
    assert.equal(result.success, true);
    assert.ok(result.count >= 1);
    assert.ok(result.learnings.length >= 1);
  });

  it('list respects --limit', () => {
    // Save another
    runTool(['save', '--title', 'Second', '--body', 'Another learning', '--tags', 'test']);
    const result = runTool(['list', '--limit', '1']);
    assert.equal(result.success, true);
    assert.equal(result.learnings.length, 1);
  });

  it('searches by title', () => {
    const result = runTool(['search', '--query', 'Test Learning']);
    assert.equal(result.success, true);
    assert.ok(result.count >= 1);
  });

  it('searches by tag', () => {
    const result = runTool(['search', '--query', 'unit']);
    assert.equal(result.success, true);
    assert.ok(result.count >= 1);
  });

  it('search returns empty for non-matching query', () => {
    const result = runTool(['search', '--query', 'zzz-nonexistent-zzz']);
    assert.equal(result.success, true);
    assert.equal(result.count, 0);
  });

  it('search requires --query', () => {
    const result = runTool(['search']);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('--query'));
  });

  it('exports as JSON', () => {
    const result = runTool(['export']);
    assert.equal(result.success, true);
    assert.equal(result.format, 'json');
    assert.ok(result.count >= 1);
  });

  it('exports as markdown', () => {
    const result = runTool(['export', '--format', 'markdown']);
    assert.equal(result.success, true);
    assert.equal(result.format, 'markdown');
    assert.ok(result.content.includes('# Project Learnings'));
  });

  it('prune removes nothing when all learnings are recent', () => {
    const result = runTool(['prune', '--older-than', '1']);
    assert.equal(result.success, true);
    assert.equal(result.pruned_count, 0);
  });

  it('digest groups learnings by tag', () => {
    // Ensure at least one learning with a known tag exists
    runTool(['save', '--title', 'Digest Test', '--body', 'Body', '--tags', 'performance']);
    const result = runTool(['digest']);
    assert.equal(result.success, true);
    assert.equal(result.action, 'digest');
    assert.ok(typeof result.total === 'number');
    assert.ok(Array.isArray(result.groups));
    assert.ok(result.groups.length >= 1);
    const group = result.groups[0];
    assert.ok(group.tag);
    assert.ok(typeof group.count === 'number');
    assert.ok(Array.isArray(group.recent));
  });

  it('digest respects --top N', () => {
    const result = runTool(['digest', '--top', '1']);
    assert.equal(result.success, true);
    for (const g of result.groups) {
      assert.ok(g.recent.length <= 1);
    }
  });

  it('recall requires --query', () => {
    const result = runTool(['recall']);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('--query'));
  });

  it('recall returns ranked results', () => {
    runTool(['save', '--title', 'Redis cache tip', '--body', 'Use Redis for caching sessions', '--tags', 'cache,redis']);
    const result = runTool(['recall', '--query', 'redis cache']);
    assert.equal(result.success, true);
    assert.equal(result.action, 'recall');
    assert.ok(Array.isArray(result.results));
    assert.ok(result.count >= 1);
    // The redis learning should be top result
    assert.ok(result.results[0].title.toLowerCase().includes('redis') || result.results[0].body.toLowerCase().includes('redis'));
  });

  it('recall returns empty for non-matching query', () => {
    const result = runTool(['recall', '--query', 'zzz-nomatch-zzz']);
    assert.equal(result.success, true);
    assert.equal(result.count, 0);
  });

  it('recall respects --top N', () => {
    // Add more learnings to ensure we have enough to truncate
    runTool(['save', '--title', 'A test item', '--body', 'test content here']);
    runTool(['save', '--title', 'B test item', '--body', 'test content here']);
    runTool(['save', '--title', 'C test item', '--body', 'test content here']);
    runTool(['save', '--title', 'D test item', '--body', 'test content here']);
    runTool(['save', '--title', 'E test item', '--body', 'test content here']);
    runTool(['save', '--title', 'F test item', '--body', 'test content here']);
    const result = runTool(['recall', '--query', 'test', '--top', '3']);
    assert.equal(result.success, true);
    assert.ok(result.results.length <= 3);
  });
});
