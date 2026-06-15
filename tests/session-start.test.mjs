import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const HOOK = join(REPO_ROOT, 'hooks', 'session-start.sh');

function runHook(cwd) {
  return execFileSync('bash', [HOOK], {
    cwd,
    env: {
      ...process.env,
      CURSOR_PLUGIN_ROOT: REPO_ROOT,
      PWD: cwd,
    },
    encoding: 'utf8',
  });
}

describe('session-start hook', () => {
  it('nudges /init when config is missing', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'mp-session-start-'));
    try {
      const out = runHook(tmp);
      assert.match(out, /config\.yaml missing/);
      assert.match(out, /\/init/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('does not nudge /init when config exists', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'mp-session-start-'));
    try {
      execFileSync('mkdir', ['-p', join(tmp, '.mighty-powers')]);
      execFileSync('touch', [join(tmp, '.mighty-powers', 'config.yaml')]);
      const out = runHook(tmp);
      assert.doesNotMatch(out, /config\.yaml missing/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
