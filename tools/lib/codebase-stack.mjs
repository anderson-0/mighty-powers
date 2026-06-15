import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { findWorkspacePackages } from './monorepo.mjs';
import { readSafe } from './codebase-walk.mjs';

// ── Detect Stack ──

export function detectStack(projectDir) {
  const result = { frameworks: [], orms: [], ui: [], language: 'unknown' };

  // JS/TS ecosystem
  const allDeps = collectNodeDeps(projectDir);
  if (Object.keys(allDeps).length > 0) {
    result.language = allDeps.typescript ? 'typescript' : 'javascript';

    // Frameworks
    if (allDeps.hono) result.frameworks.push('hono');
    if (allDeps.next) result.frameworks.push('nextjs');
    if (allDeps.express) result.frameworks.push('express');
    if (allDeps.fastify) result.frameworks.push('fastify');
    if (allDeps['@nestjs/core']) result.frameworks.push('nestjs');
    if (allDeps['@sveltejs/kit']) result.frameworks.push('sveltekit');
    if (allDeps.nuxt) result.frameworks.push('nuxt');
    if (allDeps.astro) result.frameworks.push('astro');
    if (allDeps['@remix-run/node'] || allDeps['@remix-run/react']) result.frameworks.push('remix');
    if (allDeps.koa) result.frameworks.push('koa');
    if (allDeps['@hapi/hapi']) result.frameworks.push('hapi');
    if (allDeps.elysia) result.frameworks.push('elysia');

    // ORMs
    if (allDeps['drizzle-orm'] || allDeps.drizzle) result.orms.push('drizzle');
    if (allDeps['@prisma/client'] || allDeps.prisma) result.orms.push('prisma');
    if (allDeps.mongoose) result.orms.push('mongoose');
    if (allDeps.sequelize) result.orms.push('sequelize');
    if (allDeps.typeorm) result.orms.push('typeorm');
    if (allDeps.knex) result.orms.push('knex');
    if (allDeps.kysely) result.orms.push('kysely');
    if (allDeps['better-sqlite3'] || allDeps.sqlite3) result.orms.push('sqlite');

    // UI
    if (allDeps.react) result.ui.push('react');
    if (allDeps.vue) result.ui.push('vue');
    if (allDeps.svelte) result.ui.push('svelte');
    if (allDeps['@angular/core']) result.ui.push('angular');
    if (allDeps.solid) result.ui.push('solid');
  }

  // Python — check root and common subdirs (backend/, server/, api/, src/)
  const pyDepLocations = [
    projectDir,
    ...['backend', 'server', 'api', 'src', 'app'].map(d => join(projectDir, d)),
  ];
  const pyDepFiles = ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'];
  const hasPython = pyDepLocations.some(dir => pyDepFiles.some(f => existsSync(join(dir, f))));

  if (hasPython) {
    result.language = result.language === 'unknown' ? 'python' : result.language;
    const pyDeps = collectPythonDeps(pyDepLocations);
    if (pyDeps.has('django')) result.frameworks.push('django');
    if (pyDeps.has('flask')) result.frameworks.push('flask');
    if (pyDeps.has('fastapi')) result.frameworks.push('fastapi');
    if (pyDeps.has('starlette')) result.frameworks.push('starlette');
    if (pyDeps.has('sqlalchemy')) result.orms.push('sqlalchemy');
    if (pyDeps.has('django')) result.orms.push('django-orm');
    if (pyDeps.has('tortoise-orm')) result.orms.push('tortoise');
    if (pyDeps.has('mongoengine')) result.orms.push('mongoengine');
  }

  // Go
  if (existsSync(join(projectDir, 'go.mod'))) {
    result.language = result.language === 'unknown' ? 'go' : result.language;
    const goMod = readSafe(join(projectDir, 'go.mod'));
    if (goMod.includes('gin-gonic')) result.frameworks.push('gin');
    if (goMod.includes('gofiber')) result.frameworks.push('fiber');
    if (goMod.includes('labstack/echo')) result.frameworks.push('echo');
    if (goMod.includes('go-chi')) result.frameworks.push('chi');
    if (goMod.includes('gorilla/mux')) result.frameworks.push('gorilla');
    if (goMod.includes('gorm.io')) result.orms.push('gorm');
    if (goMod.includes('sqlx')) result.orms.push('sqlx');
    if (goMod.includes('ent')) result.orms.push('ent');
  }

  // Ruby
  if (existsSync(join(projectDir, 'Gemfile'))) {
    result.language = result.language === 'unknown' ? 'ruby' : result.language;
    const gemfile = readSafe(join(projectDir, 'Gemfile'));
    if (gemfile.includes("'rails'") || gemfile.includes('"rails"')) result.frameworks.push('rails');
    if (gemfile.includes("'sinatra'") || gemfile.includes('"sinatra"')) result.frameworks.push('sinatra');
    if (result.frameworks.includes('rails')) result.orms.push('activerecord');
    if (gemfile.includes('sequel')) result.orms.push('sequel');
  }

  // PHP
  if (existsSync(join(projectDir, 'composer.json'))) {
    result.language = result.language === 'unknown' ? 'php' : result.language;
    try {
      const composer = JSON.parse(readSafe(join(projectDir, 'composer.json')));
      const phpDeps = { ...(composer.require || {}), ...(composer['require-dev'] || {}) };
      if (phpDeps['laravel/framework']) result.frameworks.push('laravel');
      if (phpDeps['symfony/framework-bundle']) result.frameworks.push('symfony');
      if (phpDeps['doctrine/orm']) result.orms.push('doctrine');
      if (result.frameworks.includes('laravel')) result.orms.push('eloquent');
    } catch { /* skip */ }
  }

  // Rust
  if (existsSync(join(projectDir, 'Cargo.toml'))) {
    result.language = result.language === 'unknown' ? 'rust' : result.language;
    const cargo = readSafe(join(projectDir, 'Cargo.toml'));
    if (cargo.includes('actix-web')) result.frameworks.push('actix');
    if (cargo.includes('axum')) result.frameworks.push('axum');
    if (cargo.includes('rocket')) result.frameworks.push('rocket');
    if (cargo.includes('diesel')) result.orms.push('diesel');
    if (cargo.includes('sqlx')) result.orms.push('sqlx');
    if (cargo.includes('sea-orm')) result.orms.push('sea-orm');
  }

  // Java/Kotlin
  if (existsSync(join(projectDir, 'pom.xml')) || existsSync(join(projectDir, 'build.gradle')) ||
      existsSync(join(projectDir, 'build.gradle.kts'))) {
    result.language = result.language === 'unknown' ? 'java' : result.language;
    const buildFile = readSafe(join(projectDir, 'pom.xml')) ||
                      readSafe(join(projectDir, 'build.gradle')) ||
                      readSafe(join(projectDir, 'build.gradle.kts'));
    if (buildFile.includes('spring-boot')) result.frameworks.push('spring');
    if (buildFile.includes('quarkus')) result.frameworks.push('quarkus');
    if (buildFile.includes('hibernate')) result.orms.push('hibernate');
    if (buildFile.includes('spring-data-jpa')) result.orms.push('spring-data-jpa');
  }

  return result;
}

function collectNodeDeps(projectDir) {
  const allDeps = {};

  function collectFrom(pkgPath) {
    if (!existsSync(pkgPath)) return;
    try {
      const pkg = JSON.parse(readSafe(pkgPath));
      Object.assign(allDeps, pkg.dependencies || {}, pkg.devDependencies || {});
    } catch { /* skip */ }
  }

  for (const pkgDir of findWorkspacePackages(projectDir)) {
    collectFrom(join(pkgDir, 'package.json'));
  }

  return allDeps;
}

function collectPythonDeps(searchDirs) {
  const deps = new Set();

  for (const dir of searchDirs) {
    // requirements.txt
    const reqPath = join(dir, 'requirements.txt');
    if (existsSync(reqPath)) {
      for (const line of readSafe(reqPath).split('\n')) {
        const pkg = line.trim().split(/[=<>!~\[]/)[0].toLowerCase();
        if (pkg && !pkg.startsWith('#') && !pkg.startsWith('-')) deps.add(pkg);
      }
    }

    // pyproject.toml (basic parsing)
    const pyprojectPath = join(dir, 'pyproject.toml');
    if (existsSync(pyprojectPath)) {
      const content = readSafe(pyprojectPath);
      const depMatch = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
      if (depMatch) {
        for (const line of depMatch[1].split('\n')) {
          const pkg = line.replace(/["',]/g, '').trim().split(/[=<>!~\[]/)[0].toLowerCase();
          if (pkg) deps.add(pkg);
        }
      }
    }
  }

  return deps;
}

