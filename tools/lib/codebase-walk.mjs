// tools/lib/codebase-walk.mjs
// Shared filesystem walk helpers for codebase scanning tools

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

export const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', '.svelte-kit', 'dist', 'build',
  '.output', 'coverage', '.turbo', '.cache', '.mighty-powers', '.ai-codex',
  '__pycache__', '.venv', 'venv', 'env', 'vendor', 'target', '.gradle',
  '.idea', '.vscode', 'tmp', 'log', 'logs', '.bundle', 'deps', '_build',
  '.elixir_ls', 'bin', 'obj', '.dart_tool', '.pub-cache',
]);

export const SKIP_EXTENSIONS = new Set([
  '.map', '.min.js', '.min.css', '.d.ts', '.lock', '.ico', '.png', '.jpg',
  '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.pdf',
  '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.dylib', '.pyc', '.pyo',
  '.class', '.jar', '.wasm', '.o', '.a',
]);

export const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rb', '.php', '.rs', '.java', '.kt',
  '.svelte', '.vue', '.astro',
]);

export const UI_PRIMITIVES = new Set([
  'Button', 'Input', 'Label', 'Card', 'CardContent', 'CardHeader', 'CardTitle',
  'CardDescription', 'CardFooter', 'Dialog', 'DialogContent', 'DialogHeader',
  'DialogTitle', 'DialogDescription', 'DialogFooter', 'DialogTrigger',
  'Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue',
  'Tabs', 'TabsContent', 'TabsList', 'TabsTrigger', 'Badge', 'Avatar',
  'Separator', 'Skeleton', 'Switch', 'Checkbox', 'RadioGroup', 'Textarea',
  'Tooltip', 'TooltipContent', 'TooltipProvider', 'TooltipTrigger',
  'Popover', 'PopoverContent', 'PopoverTrigger', 'Sheet', 'SheetContent',
  'SheetHeader', 'SheetTitle', 'SheetTrigger', 'Table', 'TableBody',
  'TableCell', 'TableHead', 'TableHeader', 'TableRow', 'ScrollArea',
  'DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuTrigger',
  'Command', 'CommandInput', 'CommandList', 'CommandItem', 'CommandGroup',
  'Accordion', 'AccordionItem', 'AccordionTrigger', 'AccordionContent',
  'Alert', 'AlertDescription', 'AlertTitle', 'Progress', 'Slider',
]);

const MAX_FILE_BYTES = 100_000;

/** JS/TS-only extensions for tools that scan Node codebases. */
export const JS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

export function walk(projectDir, files = []) {
  return walkLimited(projectDir, { files });
}

/**
 * Bounded directory walk for architecture/onboard scanners.
 * Pass a pre-allocated `files` array via options to append into an existing list.
 */
export function walkLimited(rootDir, options = {}) {
  const {
    maxDepth = Infinity,
    maxFiles = Infinity,
    extensions = null,
    maxFileBytes = MAX_FILE_BYTES,
    files = [],
  } = options;

  function walkDir(dir, depth) {
    if (depth > maxDepth || files.length >= maxFiles) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (files.length >= maxFiles) return;
        if (SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (SKIP_EXTENSIONS.has(ext)) continue;
          if (extensions && !extensions.has(ext)) continue;
          try {
            if (statSync(fullPath).size > maxFileBytes) continue;
          } catch { continue; }
          files.push(fullPath);
        }
      }
    } catch { /* permission denied */ }
  }

  walkDir(rootDir, 0);
  return files;
}

export function readSafe(filePath) {
  try { return readFileSync(filePath, 'utf8'); } catch { return ''; }
}

export function makeRelPath(projectDir) {
  return (filePath) => relative(projectDir, filePath);
}

export function isCodeFile(file) {
  return CODE_EXTENSIONS.has(extname(file));
}

export function isTestFile(rel) {
  return /\.(test|spec|_test|_spec)\./i.test(rel) ||
    /\/__tests__\//i.test(rel) ||
    (/\/tests?\//i.test(rel) && !/\/test-utils/i.test(rel)) ||
    /\/spec\//i.test(rel);
}

/** Strip line and block comments so route regexes do not match examples in comments. */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

export function extractStructure(projectDir) {
  const structure = [];
  try {
    const entries = readdirSync(projectDir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        const subEntries = [];
        try {
          const sub = readdirSync(join(projectDir, entry.name), { withFileTypes: true });
          for (const s of sub.slice(0, 10)) {
            subEntries.push(s.isDirectory() ? s.name + '/' : s.name);
          }
          if (sub.length > 10) subEntries.push(`+${sub.length - 10} more`);
        } catch { /* skip */ }
        structure.push({ name: entry.name + '/', children: subEntries });
      }
    }
  } catch { /* skip */ }
  return structure;
}
