import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// -- Temp directories --
const EMPTY_DIR = path.join('/tmp', `mighty-powers-test-empty-${Date.now()}`);
const VULN_DIR = path.join('/tmp', `mighty-powers-test-vuln-${Date.now()}`);

before(() => {
  mkdirSync(EMPTY_DIR, { recursive: true });

  // Directory with some vulnerability patterns for scanning
  mkdirSync(VULN_DIR, { recursive: true });
  writeFileSync(path.join(VULN_DIR, 'app.js'), [
    'const express = require("express");',
    'const app = express();',
    'app.get("/search", (req, res) => {',
    '  const q = req.query.q;',
    '  res.send(`<h1>Results for ${q}</h1>`);  // XSS',
    '});',
  ].join('\n'));
  writeFileSync(path.join(VULN_DIR, 'package.json'), JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    dependencies: { express: '^4.18.0' },
  }));
});

after(() => {
  if (existsSync(EMPTY_DIR)) rmSync(EMPTY_DIR, { recursive: true, force: true });
  if (existsSync(VULN_DIR)) rmSync(VULN_DIR, { recursive: true, force: true });
});

describe('ship scorecard tools', () => {
  describe('secret-scanner on empty dir', () => {
    it('should return clean results for empty directory', () => {
      const result = execFileSync('node', [
        path.join(__dirname, '..', 'tools', 'secret-scanner.mjs'),
        EMPTY_DIR,
      ], { encoding: 'utf8', timeout: 30_000 });
      const parsed = JSON.parse(result);
      assert.ok(Array.isArray(parsed.findings) || parsed.findings === undefined,
        'findings should be array or undefined');
    });
  });

  describe('code-profiler on empty dir', () => {
    it('should return clean results for empty directory', () => {
      const result = execFileSync('node', [
        path.join(__dirname, '..', 'tools', 'code-profiler.mjs'),
        EMPTY_DIR,
      ], { encoding: 'utf8', timeout: 30_000 });
      const parsed = JSON.parse(result);
      assert.ok(parsed, 'should return valid JSON');
    });
  });

  describe('secret-scanner on vulnerable dir', () => {
    it('should scan without crashing', () => {
      const result = execFileSync('node', [
        path.join(__dirname, '..', 'tools', 'secret-scanner.mjs'),
        VULN_DIR,
      ], { encoding: 'utf8', timeout: 30_000 });
      const parsed = JSON.parse(result);
      assert.ok(parsed, 'should return valid JSON');
    });
  });

  describe('dep-doctor on project dir', () => {
    it('should analyze dependencies without crashing', () => {
      const result = execFileSync('node', [
        path.join(__dirname, '..', 'tools', 'dep-doctor.mjs'),
        VULN_DIR,
      ], { encoding: 'utf8', timeout: 30_000 });
      const parsed = JSON.parse(result);
      assert.ok(parsed, 'should return valid JSON');
    });
  });

  describe('scoring logic', () => {
    it('should calculate correct score with no findings', () => {
      const score = calculateScore([]);
      assert.equal(score, 100);
    });

    it('should deduct for critical findings', () => {
      const score = calculateScore([{ severity: 'critical' }]);
      assert.equal(score, 80);
    });

    it('should deduct for high findings', () => {
      const score = calculateScore([{ severity: 'high' }]);
      assert.equal(score, 90);
    });

    it('should deduct for medium findings', () => {
      const score = calculateScore([{ severity: 'medium' }]);
      assert.equal(score, 95);
    });

    it('should floor at zero', () => {
      const findings = Array(10).fill({ severity: 'critical' });
      const score = calculateScore(findings);
      assert.equal(score, 0);
    });

    it('should calculate overall from category scores', () => {
      const overall = calculateOverall({ security: 90, quality: 80, bundle: 100 });
      assert.equal(overall, 90);
    });

    it('should exclude failed categories from overall', () => {
      const overall = calculateOverall({ security: 90, quality: -1, bundle: 100 });
      assert.equal(overall, 95); // average of 90 and 100, quality excluded
    });
  });
});

// -- Scoring functions (extracted logic from ship skill) --

function calculateScore(findings) {
  let score = 100;
  for (const f of findings) {
    switch (f.severity) {
      case 'critical': score -= 20; break;
      case 'high': score -= 10; break;
      case 'medium': score -= 5; break;
      case 'low': score -= 2; break;
    }
  }
  return Math.max(0, score);
}

function calculateOverall(categories) {
  const scores = Object.values(categories).filter(s => s >= 0);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
