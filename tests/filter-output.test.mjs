import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.join(__dirname, '..', 'tools', 'filter-output.mjs');

function run(subcommand, stdin) {
  return execFileSync('node', [TOOL, subcommand], {
    input: stdin,
    encoding: 'utf8',
  });
}

// ─── vitest ──────────────────────────────────────────────────────────────────

describe('filter-output vitest', () => {
  it('emits PASS when no failures in JSON', () => {
    const json = JSON.stringify({
      numTotalTests: 10,
      numPassedTests: 10,
      numFailedTests: 0,
      numPendingTests: 0,
      testResults: [],
    });
    const out = run('vitest', json);
    assert.ok(out.includes('PASS'), `Expected PASS, got: ${out}`);
    assert.ok(out.includes('10/10'), `Expected 10/10, got: ${out}`);
    assert.ok(!out.includes('FAIL'), 'Should not contain FAIL');
  });

  it('shows failure count and test name in JSON mode', () => {
    const json = JSON.stringify({
      numTotalTests: 5,
      numPassedTests: 3,
      numFailedTests: 2,
      numPendingTests: 0,
      testResults: [
        {
          testFilePath: '/project/src/foo.test.ts',
          status: 'failed',
          assertionResults: [
            {
              status: 'failed',
              ancestorTitles: ['MyComponent'],
              title: 'renders correctly',
              failureMessages: ['Expected true to be false\n  at foo.test.ts:10:5'],
            },
          ],
        },
      ],
    });
    const out = run('vitest', json);
    assert.ok(out.includes('2 FAILED'), `Expected "2 FAILED", got: ${out}`);
    assert.ok(out.includes('renders correctly'), `Expected test name, got: ${out}`);
    assert.ok(out.includes('Expected true to be false'), `Expected error message, got: ${out}`);
  });

  it('truncates large stack traces to 20 lines', () => {
    const longStack = Array.from({ length: 100 }, (_, i) => `  at frame${i}:${i}:0`).join('\n');
    const json = JSON.stringify({
      numTotalTests: 1,
      numPassedTests: 0,
      numFailedTests: 1,
      numPendingTests: 0,
      testResults: [
        {
          testFilePath: '/project/src/big.test.ts',
          status: 'failed',
          assertionResults: [
            {
              status: 'failed',
              ancestorTitles: [],
              title: 'big test',
              failureMessages: [longStack],
            },
          ],
        },
      ],
    });
    const out = run('vitest', json);
    const frameCount = (out.match(/at frame/g) ?? []).length;
    assert.ok(frameCount <= 20, `Expected ≤20 stack frames, got ${frameCount}`);
  });

  it('falls back gracefully on non-JSON input', () => {
    const text = 'vitest v1.0.0\n\n Tests  1 failed | 2 passed\n\n × fails\n   Error: boom\n\n Duration  500ms\n';
    const out = run('vitest', text);
    // Should not throw, should produce some output
    assert.ok(out.length > 0);
  });

  it('passthrough on empty input', () => {
    const out = run('vitest', '');
    assert.ok(out.length >= 0); // no crash
  });
});

// ─── tsc ─────────────────────────────────────────────────────────────────────

describe('filter-output tsc', () => {
  it('emits "No errors" on empty input', () => {
    const out = run('tsc', '');
    assert.ok(out.includes('No errors'), `Expected "No errors", got: ${out}`);
  });

  it('emits "No errors" on "Found 0 errors" line', () => {
    const out = run('tsc', 'Found 0 errors in 0 files.\n');
    assert.ok(out.includes('No errors'), `Expected "No errors", got: ${out}`);
  });

  it('groups errors by file', () => {
    const input = [
      'src/foo.ts(10,5): error TS2345: Argument of type string is not assignable.',
      'src/foo.ts(20,1): error TS2304: Cannot find name x.',
      'src/bar.ts(5,3): error TS2322: Type number is not assignable.',
    ].join('\n');
    const out = run('tsc', input);
    assert.ok(out.includes('foo.ts'), `Expected foo.ts, got: ${out}`);
    assert.ok(out.includes('bar.ts'), `Expected bar.ts, got: ${out}`);
    assert.ok(out.includes('3 error'), `Expected error count, got: ${out}`);
    // foo.ts should appear before bar.ts (more errors)
    assert.ok(out.indexOf('foo.ts') < out.indexOf('bar.ts'), 'Files should be sorted by error count');
  });

  it('includes error code and message', () => {
    const out = run('tsc', 'src/x.ts(1,1): error TS2345: Some error message here.\n');
    assert.ok(out.includes('TS2345'), `Expected error code, got: ${out}`);
    assert.ok(out.includes('Some error message'), `Expected message, got: ${out}`);
  });

  it('is shorter than input on multiple errors', () => {
    const lines = Array.from({ length: 20 }, (_, i) =>
      `src/file${i % 3}.ts(${i + 1},1): error TS2345: Error message ${i}.\n`
    ).join('');
    const out = run('tsc', lines);
    assert.ok(out.length < lines.length, 'Filtered output should be shorter than raw');
  });
});

// ─── eslint ──────────────────────────────────────────────────────────────────

describe('filter-output eslint', () => {
  it('emits "No issues" on empty array', () => {
    const out = run('eslint', '[]');
    assert.ok(out.includes('No issues'), `Expected "No issues", got: ${out}`);
  });

  it('emits "No issues" on all-passing files', () => {
    const json = JSON.stringify([
      { filePath: '/project/src/clean.ts', messages: [], errorCount: 0, warningCount: 0 },
    ]);
    const out = run('eslint', json);
    assert.ok(out.includes('No issues'), `Expected "No issues", got: ${out}`);
  });

  it('shows errors grouped by file', () => {
    const json = JSON.stringify([
      {
        filePath: '/project/src/problem.ts',
        messages: [
          { ruleId: 'no-unused-vars', severity: 2, message: 'foo is defined but never used.', line: 5, column: 3 },
          { ruleId: 'prefer-const', severity: 1, message: 'Use const instead of let.', line: 10, column: 1 },
        ],
        errorCount: 1,
        warningCount: 1,
      },
    ]);
    const out = run('eslint', json);
    assert.ok(out.includes('problem.ts'), `Expected file name, got: ${out}`);
    assert.ok(out.includes('no-unused-vars'), `Expected rule ID, got: ${out}`);
    assert.ok(out.includes('prefer-const'), `Expected rule ID, got: ${out}`);
    assert.ok(out.includes('1 error'), `Expected error count, got: ${out}`);
  });

  it('shows top rules summary', () => {
    const json = JSON.stringify([
      {
        filePath: '/project/src/a.ts',
        messages: [
          { ruleId: 'no-unused-vars', severity: 2, message: 'x unused', line: 1, column: 1 },
          { ruleId: 'no-unused-vars', severity: 2, message: 'y unused', line: 2, column: 1 },
        ],
        errorCount: 2,
        warningCount: 0,
      },
    ]);
    const out = run('eslint', json);
    assert.ok(out.includes('Top rules'), `Expected "Top rules", got: ${out}`);
    assert.ok(out.includes('no-unused-vars'), `Expected rule in top rules, got: ${out}`);
  });

  it('falls back gracefully on non-JSON input', () => {
    const out = run('eslint', '/src/foo.ts\n  5:3  error  no-unused-vars\n\n✖ 1 problem\n');
    assert.ok(out.length > 0);
  });
});

// ─── npm-install ──────────────────────────────────────────────────────────────

describe('filter-output npm-install', () => {
  it('strips ANSI escape sequences', () => {
    const out = run('npm-install', '\x1b[32madded 234 packages\x1b[0m\n');
    assert.ok(!out.includes('\x1b'), 'Should strip ANSI codes');
    assert.ok(out.includes('added 234 packages'), 'Should keep meaningful content');
  });

  it('strips npm warn lines', () => {
    const out = run('npm-install', 'npm warn deprecated pkg@1.0.0\nadded 5 packages\n');
    assert.ok(!out.includes('npm warn'), `Should strip npm warn, got: ${out}`);
    assert.ok(out.includes('added 5 packages'), 'Should keep summary line');
  });

  it('strips progress bar lines with percent', () => {
    const out = run('npm-install', 'Downloading 45%\nadded 10 packages in 2s\n');
    assert.ok(!out.includes('45%'), `Should strip progress lines, got: ${out}`);
  });

  it('preserves npm ERR! lines', () => {
    const out = run('npm-install', 'npm ERR! code ENOENT\nnpm ERR! path /foo\n');
    assert.ok(out.includes('npm ERR!'), `Should keep error lines, got: ${out}`);
  });

  it('outputs placeholder when all lines stripped', () => {
    const noiseOnly = 'npm warn notice\nnpm warn deprecated\n\n\n';
    const out = run('npm-install', noiseOnly);
    assert.ok(out.includes('npm') || out.includes('completed') || out.length > 0);
  });
});

// ─── git-status ───────────────────────────────────────────────────────────────

describe('filter-output git-status', () => {
  it('reports clean on "nothing to commit" message', () => {
    const out = run('git-status', 'On branch main\nnothing to commit, working tree clean\n');
    assert.ok(out.includes('clean'), `Expected clean status, got: ${out}`);
  });

  it('groups staged and unstaged files', () => {
    const input = [
      'On branch main',
      '',
      'Changes to be committed:',
      '  (use "git restore --staged <file>..." to unstage)',
      '\tnew file:   src/foo.ts',
      '',
      'Changes not staged for commit:',
      '  (use "git add <file>..." to update what will be committed)',
      '\tmodified:   src/bar.ts',
      '',
    ].join('\n');
    const out = run('git-status', input);
    assert.ok(out.includes('Staged'), `Expected Staged section, got: ${out}`);
    assert.ok(out.includes('Unstaged'), `Expected Unstaged section, got: ${out}`);
    assert.ok(out.includes('foo.ts'), `Expected foo.ts, got: ${out}`);
    assert.ok(out.includes('bar.ts'), `Expected bar.ts, got: ${out}`);
  });

  it('is shorter than raw input', () => {
    const raw = [
      'On branch main',
      'Your branch is up to date with \'origin/main\'.',
      '',
      'Changes to be committed:',
      '  (use "git restore --staged <file>..." to unstage)',
      '\tmodified:   README.md',
      '',
      'Changes not staged for commit:',
      '  (use "git add <file>..." to update what will be committed)',
      '  (use "git restore <file>..." to discard changes in working directory)',
      '\tmodified:   package.json',
      '\tmodified:   src/index.ts',
      '',
      'Untracked files:',
      '  (use "git add <file>..." to include in what will be committed)',
      '\tdist/',
      '\tnode_modules/',
      '',
    ].join('\n');
    const out = run('git-status', raw);
    assert.ok(out.length < raw.length, 'Filtered output should be shorter');
    assert.ok(!out.includes('(use "git'), 'Should strip git hint lines');
  });
});

// ─── git-log ─────────────────────────────────────────────────────────────────

describe('filter-output git-log', () => {
  it('compacts multi-line commits to one line each', () => {
    const input = [
      'commit abc1234def567890abc1234def567890abc12345',
      'Author: Jane Doe <jane@example.com>',
      'Date:   Mon Apr 5 14:23:00 2026 -0500',
      '',
      '    feat: add flashcard generation',
      '',
      'commit deadbeef0123456789deadbeef0123456789dead',
      'Author: Bob Smith <bob@example.com>',
      'Date:   Sun Apr 4 10:00:00 2026 -0500',
      '',
      '    fix: resolve auth redirect loop',
      '',
    ].join('\n');
    const out = run('git-log', input);
    const lines = out.split('\n').filter(l => l.trim());
    assert.ok(lines.length === 2, `Expected 2 compact lines, got: ${lines.length}\n${out}`);
    assert.ok(out.includes('abc1234'), `Expected short SHA, got: ${out}`);
    assert.ok(out.includes('feat: add flashcard'), `Expected subject, got: ${out}`);
    assert.ok(out.includes('fix: resolve auth'), `Expected second subject, got: ${out}`);
    assert.ok(!out.includes('jane@example.com'), 'Should strip email');
  });

  it('truncates long subjects at 72 chars', () => {
    const longSubject = 'x'.repeat(100);
    const input = [
      'commit abc1234def567890abc1234def567890abc12345',
      'Author: Alice <alice@example.com>',
      'Date:   Fri Apr 3 09:00:00 2026 -0500',
      '',
      `    ${longSubject}`,
      '',
    ].join('\n');
    const out = run('git-log', input);
    const line = out.split('\n').find(l => l.includes('xxx'));
    assert.ok(line, 'Expected a line with x chars');
    assert.ok(line.length < 120, `Line too long: ${line.length}`);
  });

  it('handles empty input', () => {
    const out = run('git-log', '');
    assert.ok(out.length > 0); // no crash, some message
  });
});

// ─── passthrough ──────────────────────────────────────────────────────────────

describe('filter-output passthrough', () => {
  it('passes through on unknown tool', () => {
    const raw = 'some arbitrary output\nwith multiple lines\n';
    const out = run('unknown-tool', raw);
    assert.ok(out.includes('some arbitrary output'), `Expected passthrough, got: ${out}`);
  });

  it('passes through when no subcommand given', () => {
    const raw = 'raw output\n';
    // No subcommand → default is passthrough
    const out = execFileSync('node', [TOOL], { input: raw, encoding: 'utf8' });
    assert.ok(out.includes('raw output'), `Expected passthrough, got: ${out}`);
  });
});
