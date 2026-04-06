#!/usr/bin/env node
// filter-output.mjs — RTK-inspired CLI output filter for token compression
// Usage: <command> 2>&1 | node tools/filter-output.mjs <tool>
// Tools: vitest, tsc, eslint, npm-install, git-status, git-log
// Unknown tool: passthrough (stdin → stdout unchanged)

import { relative, basename } from 'path';

const tool = process.argv[2] || 'passthrough';

// Read all stdin
const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  const raw = Buffer.concat(chunks).toString('utf8');
  const out = filter(tool, raw);
  process.stdout.write(out.endsWith('\n') ? out : out + '\n');
});

function filter(name, raw) {
  switch (name) {
    case 'vitest': return filterVitest(raw);
    case 'tsc':    return filterTsc(raw);
    case 'eslint': return filterEslint(raw);
    case 'npm-install':
    case 'npx':    return filterNpmInstall(raw);
    case 'git-status': return filterGitStatus(raw);
    case 'git-log':    return filterGitLog(raw);
    default:       return raw;
  }
}

// ─── STRIP ANSI ──────────────────────────────────────────────────────────────

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

// ─── VITEST ──────────────────────────────────────────────────────────────────
// Expects: vitest run --reporter=json 2>&1 | node filter-output.mjs vitest
// Falls back to regex if JSON not found (e.g. reporter not set to json)

function filterVitest(raw) {
  const clean = stripAnsi(raw);

  // Try JSON parse — vitest JSON reporter emits a JSON object to stdout
  const jsonObj = extractJsonObject(clean, '"numTotalTests"');
  if (jsonObj) {
    try {
      const data = JSON.parse(jsonObj);
      return formatVitestJson(data);
    } catch {
      // fall through to regex
    }
  }

  // Regex fallback — parse human-readable vitest output
  return formatVitestText(clean);
}

function formatVitestJson(data) {
  const total   = data.numTotalTests   ?? 0;
  const passed  = data.numPassedTests  ?? 0;
  const failed  = data.numFailedTests  ?? 0;
  const skipped = data.numPendingTests ?? 0;

  if (failed === 0) {
    return `PASS  ${passed}/${total} tests passed${skipped ? ` (${skipped} skipped)` : ''}`;
  }

  const failures = [];
  for (const fileResult of (data.testResults ?? [])) {
    if (fileResult.status !== 'failed') continue;
    const relFile = safeRelative(fileResult.testFilePath ?? fileResult.name ?? '');
    for (const t of (fileResult.assertionResults ?? fileResult.testResults ?? [])) {
      if (t.status !== 'failed') continue;
      const testName = [...(t.ancestorTitles ?? []), t.title ?? t.fullName ?? ''].join(' › ');
      const msgs = (t.failureMessages ?? []).slice(0, 3).map(m =>
        m.split('\n').slice(0, 20).join('\n')
      );
      failures.push({ file: relFile, test: testName, msgs });
    }
  }

  const lines = [
    `${failed} FAILED / ${total} total (${passed} passed${skipped ? `, ${skipped} skipped` : ''})`,
    '',
  ];

  const shown = failures.slice(0, 10);
  for (let i = 0; i < shown.length; i++) {
    const f = shown[i];
    lines.push(`FAIL  ${f.file}`);
    lines.push(`      ${f.test}`);
    for (const msg of f.msgs) {
      for (const line of msg.split('\n')) {
        lines.push(`      ${line}`);
      }
    }
    lines.push('');
  }
  if (failures.length > 10) {
    lines.push(`... +${failures.length - 10} more failures`);
    lines.push('');
  }

  lines.push(`Summary: ${failed} failed, ${passed} passed${skipped ? `, ${skipped} skipped` : ''}`);
  return lines.join('\n');
}

function formatVitestText(text) {
  const lines = text.split('\n');

  // Extract summary counts from vitest human-readable output
  let total = 0, passed = 0, failed = 0;
  const failLines = [];
  let inFail = false;

  for (const line of lines) {
    const testMatch = line.match(/Tests\s+(?:(\d+)\s+failed\s+\|\s+)?(\d+)\s+passed(?:\s+\|\s+(\d+)\s+skipped)?/);
    if (testMatch) {
      failed = parseInt(testMatch[1] ?? '0', 10);
      passed = parseInt(testMatch[2] ?? '0', 10);
      const skipped = parseInt(testMatch[3] ?? '0', 10);
      total = failed + passed + skipped;
    }

    // Collect failure blocks (lines with FAIL marker or × symbol)
    if (/^\s*×\s|FAIL\s/.test(line)) {
      inFail = true;
      failLines.push(line.trim());
    } else if (inFail && /^\s{2,}/.test(line) && line.trim()) {
      failLines.push(line.trim());
    } else if (inFail && !line.trim()) {
      failLines.push('');
      inFail = false;
    }
  }

  if (failed === 0 && total > 0) {
    return `PASS  ${passed}/${total} tests passed`;
  }
  if (total === 0) {
    // Can't parse — passthrough truncated
    return text.split('\n').slice(-30).join('\n') + '\n[filter-output: could not parse vitest output]';
  }

  const out = [`${failed} FAILED / ${total} total`, ''];
  out.push(...failLines.slice(0, 80));
  if (failLines.length > 80) out.push(`... (truncated, ${failLines.length - 80} more lines)`);
  out.push('', `Summary: ${failed} failed, ${passed} passed`);
  return out.join('\n');
}

// ─── TSC ─────────────────────────────────────────────────────────────────────
// Expects: npx tsc --noEmit 2>&1 | node filter-output.mjs tsc

function filterTsc(raw) {
  const clean = stripAnsi(raw);
  const lines = clean.split('\n');

  const errorRegex = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/;
  const fileErrors = new Map(); // filePath → [{line, col, code, severity, message}]
  let errorCount = 0;
  let warningCount = 0;

  for (const line of lines) {
    const m = line.match(errorRegex);
    if (!m) continue;
    const [, filePath, lineNum, , severity, code, message] = m;
    if (!fileErrors.has(filePath)) fileErrors.set(filePath, []);
    fileErrors.get(filePath).push({
      line: parseInt(lineNum, 10),
      code,
      severity,
      message: message.slice(0, 120),
    });
    if (severity === 'error') errorCount++;
    else warningCount++;
  }

  // Check for "Found 0 errors" or empty output
  if (errorCount === 0 && warningCount === 0) {
    if (clean.includes('Found 0 errors') || clean.trim() === '') {
      return 'tsc: No errors';
    }
    // Something printed but no parseable errors — passthrough last 10 lines
    const tail = lines.filter(l => l.trim()).slice(-10).join('\n');
    return tail || 'tsc: No errors';
  }

  const out = [`TypeScript: ${errorCount} error(s), ${warningCount} warning(s) in ${fileErrors.size} file(s)`, ''];

  // Sort files by error count desc
  const sorted = [...fileErrors.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [file, diags] of sorted) {
    out.push(`${safeRelative(file)} (${diags.length})`);
    for (const d of diags.sort((a, b) => a.line - b.line)) {
      out.push(`  ${d.line}  ${d.severity}  ${d.code}  ${d.message}`);
    }
    out.push('');
  }

  return out.join('\n');
}

// ─── ESLINT ──────────────────────────────────────────────────────────────────
// Expects: npx eslint . --format json 2>&1 | node filter-output.mjs eslint
// Falls back to text if JSON fails

function filterEslint(raw) {
  const clean = stripAnsi(raw);

  // Try JSON parse — eslint --format json outputs a top-level array
  const jsonArr = extractJsonArray(clean);
  if (jsonArr) {
    try {
      const data = JSON.parse(jsonArr);
      return formatEslintJson(data);
    } catch {
      // fall through
    }
  }

  // Text fallback — just tail last 40 lines
  const lines = clean.split('\n').filter(l => l.trim());
  if (lines.length === 0) return 'eslint: No issues';
  const tail = lines.slice(-40).join('\n');
  return tail + '\n[filter-output: could not parse eslint JSON output]';
}

function formatEslintJson(data) {
  if (!Array.isArray(data)) return 'eslint: No issues';

  let totalErrors = 0;
  let totalWarnings = 0;
  const ruleCounts = new Map();
  const filesWithIssues = [];

  for (const file of data) {
    totalErrors   += file.errorCount   ?? 0;
    totalWarnings += file.warningCount ?? 0;
    if ((file.errorCount ?? 0) + (file.warningCount ?? 0) === 0) continue;

    filesWithIssues.push(file);
    for (const msg of (file.messages ?? [])) {
      const rule = msg.ruleId ?? 'no-rule';
      if (!ruleCounts.has(rule)) ruleCounts.set(rule, { errors: 0, warnings: 0 });
      const rc = ruleCounts.get(rule);
      if (msg.severity === 2) rc.errors++;
      else rc.warnings++;
    }
  }

  if (totalErrors === 0 && totalWarnings === 0) return 'eslint: No issues';

  const out = [`ESLint: ${totalErrors} error(s), ${totalWarnings} warning(s) in ${filesWithIssues.length} file(s)`, ''];

  // Top 5 rules
  const topRules = [...ruleCounts.entries()]
    .sort((a, b) => (b[1].errors + b[1].warnings) - (a[1].errors + a[1].warnings))
    .slice(0, 5);

  if (topRules.length) {
    out.push('Top rules:');
    for (const [rule, counts] of topRules) {
      const parts = [];
      if (counts.errors)   parts.push(`${counts.errors} error(s)`);
      if (counts.warnings) parts.push(`${counts.warnings} warning(s)`);
      out.push(`  ${rule}: ${parts.join(', ')}`);
    }
    out.push('');
  }

  // Per-file breakdown (top 10 files)
  const sortedFiles = filesWithIssues
    .sort((a, b) => (b.errorCount + b.warningCount) - (a.errorCount + a.warningCount))
    .slice(0, 10);

  for (const file of sortedFiles) {
    const rel = safeRelative(file.filePath ?? '');
    out.push(`${rel} (${file.errorCount} errors, ${file.warningCount} warnings)`);
    for (const msg of (file.messages ?? []).slice(0, 10)) {
      const sev  = msg.severity === 2 ? 'error' : 'warn';
      const rule = msg.ruleId ?? 'no-rule';
      const text = (msg.message ?? '').slice(0, 100);
      out.push(`  ${msg.line}:${msg.column}  ${sev}  ${rule}  ${text}`);
    }
  }

  if (filesWithIssues.length > 10) {
    out.push(`... +${filesWithIssues.length - 10} more files`);
  }

  return out.join('\n');
}

// ─── NPM INSTALL / NPX ───────────────────────────────────────────────────────
// Strips progress bars, spinners, lifecycle noise

function filterNpmInstall(raw) {
  const clean = stripAnsi(raw);
  const lines = clean.split('\n');
  const kept = [];

  // Spinner frame chars
  const SPINNERS = new Set([...'\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F-\\|/']);

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // Strip spinner lines (single spinner char or short lines starting with one)
    if (t.length <= 3 && SPINNERS.has(t[0])) continue;

    // Strip npm warn / npm notice (keep npm ERR!)
    if (/^npm (warn|notice)\s/i.test(t)) continue;

    // Strip progress bar patterns: contains % or ⠋ etc.
    if (t.includes('%') && /\d+%/.test(t) && t.length < 80) continue;

    // Strip npx "Need to install" prompts
    if (/^Need to install the following packages/i.test(t)) continue;
    if (/^Ok to proceed\?/i.test(t)) continue;

    // Strip "Run `npm audit`" suggestions
    if (/^Run `npm audit`/.test(t)) continue;

    // Strip lifecycle script headers: "> package@version script"
    if (/^> .+@\d+\.\d+/.test(t)) continue;

    // Strip pnpm progress lines
    if (/^(Progress|Packages|Resolving|Fetching|Extracting)\s/.test(t)) continue;

    // Strip lines that are pure decoration (repeated chars)
    if (/^[─═\-=]{5,}$/.test(t)) continue;

    kept.push(t);
  }

  if (kept.length === 0) return '[npm: completed]';
  return kept.join('\n');
}

// ─── GIT STATUS ──────────────────────────────────────────────────────────────
// Parses long-form "git status" output into a compact summary

function filterGitStatus(raw) {
  const clean = stripAnsi(raw);

  // Check for clean state
  if (/nothing to commit, working tree clean/.test(clean) ||
      /nothing added to commit/.test(clean)) {
    return 'git status: clean';
  }

  const lines = clean.split('\n');
  const staged = [];
  const unstaged = [];
  const untracked = [];

  let section = null;

  for (const line of lines) {
    const t = line.trim();

    if (/^Changes to be committed/.test(t))           { section = 'staged';    continue; }
    if (/^Changes not staged for commit/.test(t))     { section = 'unstaged';  continue; }
    if (/^Untracked files/.test(t))                   { section = 'untracked'; continue; }
    if (/^\(use "git/.test(t) || !t)                  { continue; }

    if (section === 'staged') {
      const m = t.match(/^(new file|modified|deleted|renamed|copied):\s+(.+)$/);
      if (m) staged.push(`${m[1][0].toUpperCase()}  ${m[2]}`);
    } else if (section === 'unstaged') {
      const m = t.match(/^(modified|deleted):\s+(.+)$/);
      if (m) unstaged.push(`${m[1][0].toUpperCase()}  ${m[2]}`);
    } else if (section === 'untracked') {
      if (t && !t.startsWith('(')) untracked.push(t);
    }
  }

  const out = [];

  if (staged.length) {
    out.push(`Staged (${staged.length}):`);
    staged.slice(0, 20).forEach(f => out.push(`  ${f}`));
    if (staged.length > 20) out.push(`  ... +${staged.length - 20} more`);
  }
  if (unstaged.length) {
    out.push(`Unstaged (${unstaged.length}):`);
    unstaged.slice(0, 20).forEach(f => out.push(`  ${f}`));
    if (unstaged.length > 20) out.push(`  ... +${unstaged.length - 20} more`);
  }
  if (untracked.length) {
    out.push(`Untracked (${untracked.length}):`);
    untracked.slice(0, 5).forEach(f => out.push(`  ${f}`));
    if (untracked.length > 5) out.push(`  ... +${untracked.length - 5} more`);
  }

  if (out.length === 0) return 'git status: nothing detected';
  out.push(`\n${staged.length} staged, ${unstaged.length} unstaged, ${untracked.length} untracked`);
  return out.join('\n');
}

// ─── GIT LOG ─────────────────────────────────────────────────────────────────
// Parses default "git log" format into one line per commit

function filterGitLog(raw) {
  const clean = stripAnsi(raw);
  if (!clean.trim()) return 'git log: no commits';

  const lines = clean.split('\n');
  const commits = [];
  let current = null;
  let state = 'seek'; // 'seek' | 'header' | 'body'

  for (const line of lines) {
    if (/^commit [0-9a-f]{7,40}/.test(line)) {
      if (current) commits.push(current);
      current = { sha: line.split(' ')[1].slice(0, 7), author: '', date: '', subject: '' };
      state = 'header';
      continue;
    }
    if (!current) continue;

    if (state === 'header') {
      const authorM = line.match(/^Author:\s+(.+?)\s+<.+>/);
      if (authorM) { current.author = authorM[1].split(' ')[0]; continue; }
      const dateM = line.match(/^Date:\s+\S+\s+(\S+)\s+(\d+)\s+[\d:]+\s+(\d{4})/);
      if (dateM) {
        const months = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                         Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
        current.date = `${dateM[3]}-${months[dateM[1]] ?? '??'}-${dateM[2].padStart(2,'0')}`;
        continue;
      }
      if (!line.trim()) { state = 'body'; continue; }
      continue;
    }

    if (state === 'body') {
      const t = line.trim();
      if (t && !current.subject) {
        current.subject = t.slice(0, 72);
        // Stay in body state; next commit line will reset via the check at top of loop
      }
    }
  }
  if (current) commits.push(current);

  if (commits.length === 0) {
    // Fallback: might already be --oneline format
    return clean.split('\n')
      .filter(l => l.trim())
      .map(l => l.slice(0, 100))
      .join('\n');
  }

  return commits
    .map(c => `${c.sha}  ${c.date}  ${c.author.padEnd(12).slice(0,12)}  ${c.subject}`)
    .join('\n');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function safeRelative(filePath) {
  try {
    const rel = relative(process.cwd(), filePath);
    return rel.startsWith('..') ? basename(filePath) : rel;
  } catch {
    return basename(filePath) || filePath;
  }
}

// Find and extract a JSON object that contains the given marker string
function extractJsonObject(text, marker) {
  const idx = text.indexOf(marker);
  if (idx === -1) return null;
  // Walk backward to find opening {
  let start = idx;
  while (start >= 0 && text[start] !== '{') start--;
  if (start < 0) return null;
  // Brace-balance forward
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

// Find and extract a top-level JSON array
function extractJsonArray(text) {
  const idx = text.indexOf('[');
  if (idx === -1) return null;
  let depth = 0;
  for (let i = idx; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) return text.slice(idx, i + 1);
    }
  }
  return null;
}
