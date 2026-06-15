import { extname, basename } from 'path';
import { readSafe, makeRelPath, isCodeFile, isTestFile, stripComments } from './codebase-walk.mjs';

// ── Route Extraction ──

export function extractRoutes(files, projectDir) {
  const routes = [];
  const relPath = makeRelPath(projectDir);

  for (const file of files) {
    if (!isCodeFile(file)) continue;
    const rel = relPath(file);
    if (isTestFile(rel)) continue;

    const ext = extname(file);
    const rawContent = readSafe(file);
    if (!rawContent) continue;
    const content = stripComments(rawContent);

    // ── JS/TS Routes ──

    // Next.js app router: app/**/route.ts
    if (rel.includes('app/') && basename(file).startsWith('route.')) {
      const methods = [];
      for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        if (new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`).test(content)) methods.push(m);
      }
      if (methods.length > 0) {
        const routePath = '/' + rel.replace(/^.*?app\//, '').replace(/\/route\.\w+$/, '').replace(/\[([^\]]+)\]/g, ':$1');
        routes.push({ path: routePath, methods, file: rel, tags: detectRouteTags(content.slice(0, 500)) });
      }
      continue;
    }

    // SvelteKit: +server.ts/js
    if (basename(file).startsWith('+server.')) {
      const methods = [];
      for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        if (new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`).test(content)) methods.push(m);
      }
      if (methods.length > 0) {
        const routePath = '/' + rel.replace(/^.*?routes\//, '').replace(/\/\+server\.\w+$/, '').replace(/\[([^\]]+)\]/g, ':$1');
        routes.push({ path: routePath, methods, file: rel, tags: detectRouteTags(content.slice(0, 500)) });
      }
      continue;
    }

    // Nuxt: server/api/**/*.ts
    if (rel.match(/server\/api\//) && ['.ts', '.js'].includes(ext)) {
      const method = basename(file).match(/\.(get|post|put|patch|delete)\.\w+$/i);
      const methods = method ? [method[1].toUpperCase()] : ['GET'];
      const routePath = '/api/' + rel.replace(/^.*?server\/api\//, '').replace(/\.\w+$/, '').replace(/\[([^\]]+)\]/g, ':$1').replace(/\.(?:get|post|put|patch|delete)$/i, '');
      routes.push({ path: routePath, methods, file: rel, tags: detectRouteTags(content.slice(0, 500)) });
      continue;
    }

    // NestJS decorators: @Get('/path'), @Post('/path'), etc.
    if (['.ts', '.js'].includes(ext)) {
      const decoratorPattern = /@(Get|Post|Put|Patch|Delete|All)\s*\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g;
      let match;
      while ((match = decoratorPattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const path = match[2] || '/';
        // Try to find controller-level prefix
        const controllerMatch = content.match(/@Controller\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/);
        const prefix = controllerMatch ? '/' + controllerMatch[1].replace(/^\//, '') : '';
        const fullPath = prefix + (path.startsWith('/') ? path : '/' + path);
        const handlerSnippet = content.slice(match.index, Math.min(content.length, match.index + 500));
        routes.push({ path: fullPath, methods: [method], file: rel, tags: detectRouteTags(handlerSnippet) });
      }
      if (decoratorPattern.lastIndex > 0) continue; // skip generic matching if NestJS found
    }

    // Hono/Express/Fastify/Koa/Elysia: app.get('/path', ...) or router.get(...)
    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
      const routePattern = /(?:app|router|server|api|route)\s*\.\s*(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
      let match;
      while ((match = routePattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const path = match[2];
        const existing = routes.find(r => r.path === path && r.file === rel);
        if (existing) {
          if (!existing.methods.includes(method)) existing.methods.push(method);
        } else {
          const handlerSnippet = content.slice(match.index, Math.min(content.length, match.index + 500));
          routes.push({ path, methods: [method], file: rel, tags: detectRouteTags(handlerSnippet) });
        }
      }
    }

    // ── Python Routes ──

    if (ext === '.py') {
      // FastAPI/Starlette: @app.get("/path") or @router.get("/path")
      const fastapiPattern = /@(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/g;
      let match;
      while ((match = fastapiPattern.exec(content)) !== null) {
        const handlerSnippet = content.slice(match.index, Math.min(content.length, match.index + 500));
        routes.push({ path: match[2], methods: [match[1].toUpperCase()], file: rel, tags: detectRouteTags(handlerSnippet) });
      }

      // Flask: @app.route("/path", methods=["GET", "POST"])
      const flaskPattern = /@(?:app|bp|blueprint)\s*\.route\s*\(\s*["']([^"']+)["'](?:.*?methods\s*=\s*\[([^\]]+)\])?/g;
      while ((match = flaskPattern.exec(content)) !== null) {
        const path = match[1];
        const methods = match[2]
          ? match[2].replace(/["'\s]/g, '').split(',').map(m => m.toUpperCase())
          : ['GET'];
        const handlerSnippet = content.slice(match.index, Math.min(content.length, match.index + 500));
        routes.push({ path, methods, file: rel, tags: detectRouteTags(handlerSnippet) });
      }

      // Django: path('url/', view) in urls.py
      if (basename(file) === 'urls.py') {
        const djangoPattern = /path\s*\(\s*["']([^"']+)["']/g;
        while ((match = djangoPattern.exec(content)) !== null) {
          routes.push({ path: '/' + match[1], methods: ['*'], file: rel, tags: [] });
        }
      }
    }

    // ── Go Routes ──

    if (ext === '.go') {
      // Gin: r.GET("/path", handler)
      const ginPattern = /\.\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/g;
      let match;
      while ((match = ginPattern.exec(content)) !== null) {
        const handlerSnippet = content.slice(match.index, Math.min(content.length, match.index + 500));
        routes.push({ path: match[2], methods: [match[1]], file: rel, tags: detectRouteTags(handlerSnippet) });
      }

      // Echo/Fiber: e.Get("/path", handler) or app.Get("/path", handler)
      const echoPattern = /\.\s*(Get|Post|Put|Patch|Delete)\s*\(\s*"([^"]+)"/g;
      while ((match = echoPattern.exec(content)) !== null) {
        const handlerSnippet = content.slice(match.index, Math.min(content.length, match.index + 500));
        routes.push({ path: match[2], methods: [match[1].toUpperCase()], file: rel, tags: detectRouteTags(handlerSnippet) });
      }

      // Chi/Gorilla: r.Get("/path", handler) or r.HandleFunc("/path", handler).Methods("GET")
      const chiPattern = /\.HandleFunc\s*\(\s*"([^"]+)".*?\.Methods\s*\(\s*"([^"]+)"/gs;
      while ((match = chiPattern.exec(content)) !== null) {
        routes.push({ path: match[1], methods: [match[2]], file: rel, tags: [] });
      }
    }

    // ── Ruby Routes ──

    if (ext === '.rb' && (rel.includes('routes') || basename(file) === 'routes.rb')) {
      const railsPattern = /\b(get|post|put|patch|delete)\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = railsPattern.exec(content)) !== null) {
        routes.push({ path: match[2], methods: [match[1].toUpperCase()], file: rel, tags: [] });
      }
      // resources :users
      const resourcePattern = /resources?\s+:(\w+)/g;
      while ((match = resourcePattern.exec(content)) !== null) {
        routes.push({ path: `/${match[1]}`, methods: ['CRUD'], file: rel, tags: ['db'] });
      }
    }

    // ── PHP/Laravel Routes ──

    if (ext === '.php' && rel.includes('routes')) {
      const laravelPattern = /Route::(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = laravelPattern.exec(content)) !== null) {
        routes.push({ path: match[2], methods: [match[1].toUpperCase()], file: rel, tags: [] });
      }
    }

    // ── Rust Routes ──

    if (ext === '.rs') {
      // Actix: web::get().to(handler) or .route("/path", web::get())
      const actixPattern = /\.route\s*\(\s*"([^"]+)"\s*,\s*web::(get|post|put|patch|delete)/g;
      let match;
      while ((match = actixPattern.exec(content)) !== null) {
        routes.push({ path: match[1], methods: [match[2].toUpperCase()], file: rel, tags: [] });
      }

      // Axum: .route("/path", get(handler))
      const axumPattern = /\.route\s*\(\s*"([^"]+)"\s*,\s*(get|post|put|patch|delete)\s*\(/g;
      while ((match = axumPattern.exec(content)) !== null) {
        routes.push({ path: match[1], methods: [match[2].toUpperCase()], file: rel, tags: [] });
      }
    }

    // ── Java/Spring Routes ──

    if (ext === '.java' || ext === '.kt') {
      const springPattern = /@(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping|RequestMapping)\s*\(\s*(?:value\s*=\s*)?["']?([^"')]+)["']?\s*\)/g;
      let match;
      while ((match = springPattern.exec(content)) !== null) {
        const mapping = match[1];
        const path = match[2];
        let method = 'GET';
        if (mapping.startsWith('Post')) method = 'POST';
        else if (mapping.startsWith('Put')) method = 'PUT';
        else if (mapping.startsWith('Patch')) method = 'PATCH';
        else if (mapping.startsWith('Delete')) method = 'DELETE';
        else if (mapping === 'RequestMapping') method = '*';
        routes.push({ path, methods: [method], file: rel, tags: [] });
      }
    }
  }

  return routes.filter(r => isValidRoutePath(r.path));
}

// Regex route matching can catch code that isn't a route (e.g. `api.get(` inside
// a scanner's own source). Real route path literals never contain whitespace or
// JS operator syntax, so drop anything that does.
function isValidRoutePath(p) {
  if (!p || typeof p !== 'string' || p.length > 200) return false;
  if (/\s/.test(p)) return false;
  if (/[<>;`]/.test(p)) return false;
  if (/\|\||&&|=>/.test(p)) return false;
  return true;
}

function detectRouteTags(content) {
  const tags = [];
  if (/auth|session|jwt|bearer|token|login|signup|password/i.test(content)) tags.push('auth');
  if (/database|db\.|query|insert|select|update|delete.*from|\.findMany|\.findFirst|\.create\(|\.save\(/i.test(content)) tags.push('db');
  if (/cache|redis|memcache/i.test(content)) tags.push('cache');
  if (/queue|bullmq|bull|worker|celery|sidekiq/i.test(content)) tags.push('queue');
  if (/email|resend|sendgrid|nodemailer|smtp|mailer/i.test(content)) tags.push('email');
  if (/stripe|polar|paddle|payment|billing|checkout/i.test(content)) tags.push('payment');
  if (/webhook/i.test(content)) tags.push('webhook');
  if (/upload|multer|formdata|multipart|s3|storage/i.test(content)) tags.push('upload');
  return tags;
}

// ── Schema Extraction ──
