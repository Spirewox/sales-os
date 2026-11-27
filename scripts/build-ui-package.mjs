#!/usr/bin/env node
/**
 * Builds the installable design system package, @spirewox/ui, from the app's own components so
 * the app stays the single source:
 *
 *   components/ui/*.tsx       -> primitives   (import from '@spirewox/ui/button' and so on)
 *   components/app/*          -> app kit      (import from '@spirewox/ui')
 *   app/globals.css tokens    -> styles.css   (import '@spirewox/ui/styles.css')
 *
 * It copies the sources into packages/ui/.stage, points '@/' imports at package files, swaps the
 * Next.js ties for the adapters in packages/ui/adapters, compiles with tsc to packages/ui/dist,
 * and with --pack writes packages/ui/spirewox-ui-<version>.tgz for `npm install <file>`.
 * .github/workflows/publish-ui.yml runs it and publishes the package to GitHub Packages.
 *
 *   node scripts/build-ui-package.mjs [--pack]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PKG = path.join(ROOT, 'packages/ui');
const STAGE = path.join(PKG, '.stage');
const SRC = path.join(STAGE, 'src');
const DIST = path.join(PKG, 'dist');

/** Primitives left out: the toast wrapper needs next-themes and is app wiring, not system. */
const SKIP_UI = new Set(['sonner.tsx']);

/** Where each '@/' import the kit uses lives inside the package (paths under src/, no extension). */
const ALIASES = {
  '@/lib/utils': 'lib/utils',
  '@/lib/period': 'lib/period',
  '@/lib/pagination': 'lib/pagination',
  '@/lib/format': 'lib/constants',
  '@/lib/api-mappers': 'lib/location',
  '@/hooks/use-hub-scope': 'lib/location',
  '@/hooks/use-page-size': 'hooks/use-page-size',
  '@/hooks/use-url-state': 'hooks/use-url-state',
  '@/components/filter-select': 'filter-select',
  'next/link': 'adapters/link',
};

const rel = (...p) => path.join(ROOT, ...p);
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(path.join(SRC, to)), { recursive: true });
  fs.copyFileSync(rel(from), path.join(SRC, to));
};

// 1. Stage the sources.
fs.rmSync(STAGE, { recursive: true, force: true });
fs.rmSync(DIST, { recursive: true, force: true });
const primitives = fs.readdirSync(rel('components/ui')).filter((f) => f.endsWith('.tsx') && !SKIP_UI.has(f)).sort();
for (const f of primitives) copy(`components/ui/${f}`, `ui/${f}`);
for (const f of fs.readdirSync(rel('components/app')).filter((f) => /\.tsx?$/.test(f) && !/\.stories\./.test(f))) copy(`components/app/${f}`, `app/${f}`);
copy('components/filter-select.tsx', 'filter-select.tsx');
copy('lib/period.ts', 'lib/period.ts');
copy('lib/pagination.ts', 'lib/pagination.ts');
copy('hooks/use-page-size.ts', 'hooks/use-page-size.ts');
copy('packages/ui/adapters/utils.ts', 'lib/utils.ts');
copy('packages/ui/adapters/constants.ts', 'lib/constants.ts');
copy('packages/ui/adapters/location.ts', 'lib/location.ts');
copy('packages/ui/adapters/use-url-state.ts', 'hooks/use-url-state.ts');
copy('packages/ui/adapters/link.tsx', 'adapters/link.tsx');

// The package entry: the app kit, every primitive, and the link provider.
const entry = [
  "export * from './app/index';",
  ...primitives.map((f) => `export * from './ui/${f.replace(/\.tsx$/, '')}';`),
  "export { UILinkProvider, type LinkComponent, type LinkProps } from './adapters/link';",
  "export type { HubScopeFilter as LocationScope, LocationOption } from './lib/location';",
];
fs.writeFileSync(path.join(SRC, 'index.ts'), `${entry.join('\n')}\n`);

// 2. Point imports at package files, with explicit .js extensions for ESM consumers.
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) files.push(p);
  }
})(SRC);

const resolveTarget = (base) => {
  for (const ext of ['.ts', '.tsx']) if (fs.existsSync(base + ext)) return `${base}.js`;
  for (const ext of ['.ts', '.tsx']) if (fs.existsSync(path.join(base, `index${ext}`))) return path.join(base, 'index.js');
  return null;
};

const problems = [];
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/(from\s+|import\s*\(\s*|import\s+)(['"])([^'"]+)\2/g, (whole, lead, q, spec) => {
    let target;
    if (ALIASES[spec]) target = path.join(SRC, ALIASES[spec]);
    else if (spec.startsWith('@/components/ui/')) target = path.join(SRC, 'ui', spec.slice('@/components/ui/'.length));
    else if (spec.startsWith('@/components/app/')) target = path.join(SRC, 'app', spec.slice('@/components/app/'.length));
    else if (spec.startsWith('@/') || spec.startsWith('next/') || spec === 'next-themes') {
      problems.push(`${path.relative(SRC, file)}: no package home for '${spec}'`);
      return whole;
    } else if (spec.startsWith('.')) target = path.resolve(path.dirname(file), spec);
    else return whole; // a package dependency
    const resolved = resolveTarget(target);
    if (!resolved) {
      problems.push(`${path.relative(SRC, file)}: '${spec}' resolves to nothing`);
      return whole;
    }
    let out = path.relative(path.dirname(file), resolved).split(path.sep).join('/');
    if (!out.startsWith('.')) out = `./${out}`;
    return `${lead}${q}${out}${q}`;
  });
  if (after !== before) fs.writeFileSync(file, after);
}
if (problems.length) {
  console.error(`build-ui-package: ${problems.length} import(s) with no package home:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

// 3. Compile to dist: one .js and .d.ts per file, so each keeps its 'use client' line.
fs.writeFileSync(
  path.join(STAGE, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        lib: ['dom', 'dom.iterable', 'esnext'],
        module: 'esnext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        strict: true,
        skipLibCheck: true,
        isolatedModules: true,
        esModuleInterop: true,
        declaration: true,
        rootDir: 'src',
        outDir: '../dist',
      },
      include: ['src'],
    },
    null,
    2,
  ),
);
execFileSync(path.join(ROOT, 'node_modules/.bin/tsc'), ['-p', path.join(STAGE, 'tsconfig.json')], { stdio: 'inherit' });

// 4. styles.css: the token and base layers of app/globals.css. The consumer imports Tailwind
// itself; @source points Tailwind at this folder so the kit's classes are generated.
const globals = fs.readFileSync(rel('app/globals.css'), 'utf8');
const shadcnCss = fs.readFileSync(rel('node_modules/shadcn/dist/tailwind.css'), 'utf8');
const baseEnd = globals.indexOf('\n}\n', globals.indexOf('@layer base {')) + 3;
let tokens = globals.slice(0, baseEnd);
tokens = tokens.replace('@import "tailwindcss";\n', '');
tokens = tokens.replace('@import "shadcn/tailwind.css";\n', '');
// CSS wants every @import before any other rule, so lift the remaining ones to the top.
const imports = tokens.match(/^@import [^\n]+\n/gm) ?? [];
for (const line of imports) tokens = tokens.replace(line, '');
// The app sets --font-geist through next/font. Elsewhere it is undefined, which would void the
// whole font stack, so give it a fallback: the Geist family if installed, else the system sans.
tokens = tokens.replaceAll('var(--font-geist-mono)', 'var(--font-geist-mono, "Geist Mono")').replaceAll('var(--font-geist)', 'var(--font-geist, "Geist")');
const { name: PKG_NAME } = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8'));
const styles = [
  `/* ${PKG_NAME}: Sales OS tokens and base layer. Generated from app/globals.css by scripts/build-ui-package.mjs. */`,
  `/* Use after Tailwind: @import "tailwindcss"; @import "${PKG_NAME}/styles.css"; */`,
  imports.join('').trim(),
  '@source "./";',
  tokens.trim(),
  '/* Variants from shadcn/tailwind.css (MIT), inlined so the package needs no shadcn install. */',
  shadcnCss.trim(),
  '@media (prefers-reduced-motion: reduce) {\n  .skeleton-shimmer {\n    animation: none !important;\n  }\n}',
  '',
].join('\n\n');
fs.writeFileSync(path.join(DIST, 'styles.css'), styles);

// 5. Optionally pack.
const pkg = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8'));
const count = fs.readdirSync(DIST, { recursive: true }).filter((f) => String(f).endsWith('.js')).length;
console.log(`build-ui-package: ${pkg.name}@${pkg.version}, ${primitives.length} primitives, ${count} modules in packages/ui/dist`);
if (process.argv.includes('--pack')) {
  const out = execFileSync('npm', ['pack', '--pack-destination', PKG], { cwd: PKG, encoding: 'utf8' }).trim().split('\n').pop();
  console.log(`build-ui-package: packed packages/ui/${out}`);
}
