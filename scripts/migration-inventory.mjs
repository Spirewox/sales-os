#!/usr/bin/env node
// Migration inventory for migrate-design-system. Pure Node, no rg or ast-grep needed.
// Counts every place the app still depends on legacy UI, assigns each finding to a
// surface from queue.tsv, and prints the counts that make up the done predicate.
// Reads legacy.txt, ignore.txt, queue.tsv, allowlist.tsv and frame.md from the run folder.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const USAGE = `Usage: node scripts/migration-inventory.mjs [--run <folder>] [--root <dir>] [--paths "<glob>"] [--check] [--pin] [--help]

  (no flag)        write <run>/inventory/current.tsv and <run>/inventory/counts.txt
  --paths "<glob>" print "imports raw palette files" for findings in files matching the glob; writes nothing
  --check          exit 1 unless the predicate counts are 0, unassigned is 0 and the allowlist is clean
  --pin            rerun the counts at HEAD and write the sha and counts to <run>/inventory/pin.txt
  --run <folder>   run folder (default: the newest .migration/*/ under the root)
  --root <dir>     tree to count (default: git root of --run, else of the cwd, else the cwd)
  --help           print this and exit 2

Run folder inputs:
  legacy.txt     one rule per line: "module <specifier>" (trailing /* allowed), "path <glob>",
                 or "candidate <specifier> <gate id>" (report-only until the gate is decided)
  ignore.txt     one glob per line, root-relative; matching files are never scanned
  queue.tsv      header row, then surface<TAB>kind<TAB>paths(comma-separated globs)<TAB>...
  allowlist.tsv  header "file<TAB>match<TAB>reason<TAB>owner<TAB>remove_by", one exception per row;
                 every row needs a reason and an owner; --check fails on a row that matches no finding
  frame.md       "Palette in predicate: yes|no" (default yes)

Finding kinds: import, raw, palette, file (predicate); candidate, bypass (report-only).
Exit codes: 0 pass, 1 --check found work left, 2 usage or config error, 3 wrong root.`;

function die(code, msg) { if (msg) process.stderr.write(msg + '\n'); process.exit(code); }

// ---------- args
const args = process.argv.slice(2);
const opt = { run: null, root: null, paths: null, check: false, pin: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--run') opt.run = args[++i];
  else if (a === '--root') opt.root = args[++i];
  else if (a === '--paths') opt.paths = args[++i];
  else if (a === '--check') opt.check = true;
  else if (a === '--pin') opt.pin = true;
  else { process.stdout.write(USAGE + '\n'); process.exit(2); }
  if ((a === '--run' || a === '--root' || a === '--paths') && (args[i] === undefined || args[i].startsWith('--'))) {
    process.stdout.write(USAGE + '\n'); process.exit(2);
  }
}

function gitRoot(dir) {
  try { return execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}
function real(p) { try { return fs.realpathSync(p); } catch { return path.resolve(p); } }

// ---------- root and run folder
let root;
if (opt.root) root = real(opt.root);
else if (opt.run && fs.existsSync(opt.run)) root = real(gitRoot(path.resolve(opt.run)) ?? gitRoot(process.cwd()) ?? process.cwd());
else root = real(gitRoot(process.cwd()) ?? process.cwd());

let run;
if (opt.run) run = real(path.isAbsolute(opt.run) ? opt.run : path.resolve(process.cwd(), opt.run));
else {
  const mig = path.join(root, '.migration');
  const runs = fs.existsSync(mig) ? fs.readdirSync(mig).filter((d) => fs.statSync(path.join(mig, d)).isDirectory()).sort() : [];
  if (!runs.length) die(3, `No .migration/*/ run folder under root ${root}. Pass --run, or --root pointing at the app.`);
  run = real(path.join(mig, runs[runs.length - 1]));
}
if (!fs.existsSync(run)) die(2, `Run folder not found: ${run}`);
const rel = path.relative(root, run);
if (rel.startsWith('..') || path.isAbsolute(rel)) die(3, `Run folder ${run} is not under root ${root}. Pass --root <the app's root>.`);
// A run folder inside a nested checkout (a git worktree under another repo) is physically under
// the outer repo too, so also require the root to be the run folder's own git root.
const runRepo = gitRoot(run);
if (runRepo && real(runRepo) !== root) die(3, `Root ${root} is not the run folder's repo ${real(runRepo)}. Pass --root ${real(runRepo)}.`);

// ---------- glob
function globToRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end < 0) die(2, `Unclosed { in glob "${glob}"`);
      const alts = glob.slice(i + 1, end).split(',').map((s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'));
      re += '(?:' + alts.join('|') + ')'; i = end;
    } else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}
const matchAny = (res, f) => res.some((r) => r.test(f));
// Split a comma-separated glob list, keeping commas inside {a,b} braces.
function splitGlobs(list) {
  const out = []; let depth = 0; let cur = '';
  for (const c of list) {
    if (c === '{') depth++;
    if (c === '}') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// ---------- run-folder inputs
function readLines(file) {
  const p = path.join(run, file);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() && !l.trim().startsWith('#'));
}
const legacy = { modules: [], paths: [], candidates: [] };
for (const l of readLines('legacy.txt')) {
  const [kind, spec, gate] = l.trim().split(/\s+/);
  if (kind === 'module') legacy.modules.push(spec);
  else if (kind === 'path') legacy.paths.push(globToRe(spec));
  else if (kind === 'candidate') legacy.candidates.push({ spec, gate: gate ?? '-' });
  else die(2, `legacy.txt: unknown rule "${l}"`);
}
const ignoreRes = readLines('ignore.txt').map((g) => globToRe(g.trim()));
const queueLines = readLines('queue.tsv');
if (!queueLines.length) die(2, `queue.tsv missing or empty in ${run}`);
const qHead = queueLines[0].split('\t');
const qi = { surface: qHead.indexOf('surface'), paths: qHead.indexOf('paths') };
if (qi.surface < 0 || qi.paths < 0) die(2, 'queue.tsv needs surface and paths columns');
const surfaces = queueLines.slice(1).map((l) => {
  const c = l.split('\t');
  return { name: c[qi.surface], res: splitGlobs(c[qi.paths]).map((g) => globToRe(g)) };
});
const allowLines = readLines('allowlist.tsv');
const allow = allowLines.slice(1).map((l, i) => {
  const [file, match, reason, owner, removeBy] = l.split('\t');
  if (!reason || !owner) die(2, `allowlist.tsv row ${i + 2} needs a reason and an owner`);
  return { file, match, reason, owner, removeBy, used: 0 };
});
const frame = fs.existsSync(path.join(run, 'frame.md')) ? fs.readFileSync(path.join(run, 'frame.md'), 'utf8') : '';
const paletteIn = !/^Palette in predicate:\s*no\b/im.test(frame);

// ---------- walk
const EXT = /\.(tsx|ts|jsx|js|mjs|cjs|css|scss)$/;
const HARD_SKIP = new Set(['node_modules', '.git', '.next', 'out', 'build', 'dist', 'coverage']);
const files = [];
(function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (HARD_SKIP.has(ent.name)) continue;
    const abs = path.join(dir, ent.name);
    const r = path.relative(root, abs).split(path.sep).join('/');
    if (ent.isDirectory()) { if (!matchAny(ignoreRes, r + '/') && !matchAny(ignoreRes, r + '/x')) walk(abs); }
    else if (EXT.test(ent.name) && !ent.name.endsWith('.d.ts') && !matchAny(ignoreRes, r)) files.push(r);
  }
})(root);
if (!files.length) die(3, `Scan read no source files under root ${root}. Pass --root <the app's root>.`);

// ---------- import resolution and barrel taint
const RESOLVE_EXT = ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '/index.tsx', '/index.ts', '/index.js'];
function resolveSpec(spec, fromFile) {
  let base;
  if (spec.startsWith('@/')) base = spec.slice(2);
  else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  else return null;
  for (const e of RESOLVE_EXT) {
    const p = base + e;
    try { if (fs.statSync(path.join(root, p)).isFile()) return p; } catch { /* next */ }
  }
  return null;
}
const specMatches = (rule, spec) => (rule.endsWith('/*') ? spec.startsWith(rule.slice(0, -1)) : spec === rule);
const legacyFile = (f) => f && matchAny(legacy.paths, f);
const IMPORT_RES = [
  /\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  /@import\s+(?:url\()?\s*['"]([^'"]+)['"]/g,
];
const taintMemo = new Map();
function tainted(file, seen = new Set()) {
  if (!file) return false;
  if (taintMemo.has(file)) return taintMemo.get(file);
  if (legacyFile(file)) { taintMemo.set(file, true); return true; }
  if (seen.has(file)) return false;
  seen.add(file);
  let out = false;
  let text = '';
  try { text = fs.readFileSync(path.join(root, file), 'utf8'); } catch { /* none */ }
  for (const m of text.matchAll(/\bexport\s[^;]*?\bfrom\s*['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    if (legacy.modules.some((r) => specMatches(r, spec))) { out = true; break; }
    if (tainted(resolveSpec(spec, file), seen)) { out = true; break; }
  }
  taintMemo.set(file, out);
  return out;
}

// ---------- value patterns
const PAL = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const RE_PALETTE = new RegExp(`\\b(?:bg|text|border|ring|fill|stroke)-(?:${PAL})-[0-9]{2,3}\\b`, 'g');
const RE_HEX = /(?<![\w&#/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const RE_FUNC = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/g;
const NAMED = 'white|black|red|green|blue|gray|grey|silver|orange|yellow|purple|pink|brown|navy|teal|maroon|olive|lime|aqua|fuchsia';
const RE_NAMED = new RegExp(`\\b(?:fill|stroke|color|background|backgroundColor|borderColor|stopColor)\\s*[:=]\\s*\\{?\\s*['"](?:${NAMED})['"]`, 'g');
const RE_ARBITRARY = /(?<![\w\-[])(?:-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*)-\[[^\]\s'"`]+\](?!:)/g;
const RE_STYLE_LEN = /\b(?:fontSize|lineHeight|borderRadius|padding(?:Top|Right|Bottom|Left|Inline|Block)?|margin(?:Top|Right|Bottom|Left|Inline|Block)?|gap|rowGap|columnGap|letterSpacing)\s*[:=]\s*\{?\s*['"]?(?!0(?![.\d]))-?\d+(?:\.\d+)?(?:px|rem|em)?['"]?/g;
const RE_CSS_LEN = /(?:^|[;{\s])(?:padding|margin|gap|border-radius|font-size|line-height|font)(?:-[a-z]+)?\s*:\s*[^;}'"`]*?\d+(?:\.\d+)?(?:px|rem|em)\b/g;
const RE_BYPASS_EL = /<(button|input|select|textarea)\b/g;
const RE_BYPASS_CONST = /\bexport\s+const\s+((?:btn|BTN)[A-Za-z_]*|INPUT_CLS|inputClass|selectClass)\b/g;
const pureVar = (m) => /-\[var\(--[\w-]+\)\]$/.test(m);

// ---------- scan
const rows = [];
const add = (kind, file, line, match) => rows.push({ kind, file, line, match: match.replace(/\t/g, ' ').trim() });
for (const f of files) {
  const text = fs.readFileSync(path.join(root, f), 'utf8');
  const lines = text.split('\n');
  const lineAt = (idx) => text.slice(0, idx).split('\n').length;
  if (legacyFile(f)) add('file', f, '-', '-');
  for (const re of IMPORT_RES) {
    for (const m of text.matchAll(re)) {
      const spec = m[1];
      const resolved = resolveSpec(spec, f);
      if (legacy.modules.some((r) => specMatches(r, spec)) || legacyFile(resolved) || (resolved && tainted(resolved))) add('import', f, lineAt(m.index), spec);
      else {
        const cand = legacy.candidates.find((c) => specMatches(c.spec, spec));
        if (cand) add('candidate', f, lineAt(m.index), `${spec} (${cand.gate})`);
      }
    }
  }
  const isTsx = /\.(tsx|jsx)$/.test(f);
  const isCss = /\.(css|scss)$/.test(f);
  lines.forEach((ln, i) => {
    const t = ln.trim();
    if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return;
    const n = i + 1;
    // One finding per span: a value two patterns both see (a hex inside an arbitrary class,
    // a CSS length inside a string) is counted once, by the first pattern that claims it.
    const spans = [];
    const claim = (m, lead = 0) => {
      const a = m.index + lead, b = m.index + m[0].length;
      if (spans.some(([x, y]) => a < y && x < b)) return false;
      spans.push([a, b]); return true;
    };
    if (!isCss) for (const m of ln.matchAll(RE_ARBITRARY)) if (!pureVar(m[0]) && claim(m)) add('raw', f, n, m[0]);
    for (const m of ln.matchAll(RE_HEX)) if (claim(m)) add('raw', f, n, m[0]);
    for (const m of ln.matchAll(RE_FUNC)) if (claim(m)) add('raw', f, n, m[0]);
    for (const m of ln.matchAll(RE_NAMED)) if (claim(m)) add('raw', f, n, m[0]);
    for (const m of ln.matchAll(RE_CSS_LEN)) { const lead = m[0].length - m[0].replace(/^[;{\s]/, '').length; if (claim(m, lead)) add('raw', f, n, m[0].slice(lead)); }
    if (!isCss) for (const m of ln.matchAll(RE_STYLE_LEN)) if (claim(m)) add('raw', f, n, m[0]);
    if (!isCss) for (const m of ln.matchAll(RE_PALETTE)) add('palette', f, n, m[0]);
    if (isTsx) for (const m of ln.matchAll(RE_BYPASS_EL)) add('bypass', f, n, `<${m[1]}>`);
    for (const m of ln.matchAll(RE_BYPASS_CONST)) add('bypass', f, n, `const ${m[1]}`);
  });
}

// ---------- surfaces
const overlaps = [];
for (const r of rows) {
  const hit = surfaces.filter((s) => matchAny(s.res, r.file));
  if (hit.length > 1) overlaps.push(`${r.file}: ${hit.map((s) => s.name).join(' and ')}`);
  r.surface = hit.length ? hit[0].name : 'unassigned';
}
if (overlaps.length) die(2, 'Overlapping surface globs (fix queue.tsv paths so one surface owns each file):\n' + [...new Set(overlaps)].join('\n'));

// ---------- allowlist
for (const r of rows) {
  const a = allow.find((x) => x.file === r.file && x.match === r.match);
  if (a) { a.used++; r.allowed = true; }
}
const stale = allow.filter((a) => !a.used);

rows.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : (a.line === '-' ? 0 : a.line) - (b.line === '-' ? 0 : b.line) || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.match < b.match ? -1 : a.match > b.match ? 1 : 0)));
const count = (list, k) => list.filter((r) => r.kind === k && !r.allowed).length;
function tally(list) {
  return { imports: count(list, 'import'), raw: count(list, 'raw'), palette: count(list, 'palette'), files: count(list, 'file'),
    unassigned: list.filter((r) => r.surface === 'unassigned').length, candidates: count(list, 'candidate'), bypasses: count(list, 'bypass'),
    allowlisted: list.filter((r) => r.allowed).length };
}

if (opt.paths) {
  const re = globToRe(opt.paths);
  const t = tally(rows.filter((r) => re.test(r.file)));
  process.stdout.write(`${t.imports} ${t.raw} ${t.palette} ${t.files}\n`);
  process.exit(0);
}

const t = tally(rows);
const countsText = [
  `imports ${t.imports}`, `raw ${t.raw}`, `palette ${t.palette}`, `files ${t.files}`, `unassigned ${t.unassigned}`,
  `# report-only, not in the predicate until their gates are decided`,
  `candidates ${t.candidates}`, `bypasses ${t.bypasses}`, `allowlisted ${t.allowlisted}`, `allowlist_stale ${stale.length}`,
  `scanned_files ${files.length}`, `palette_in_predicate ${paletteIn ? 'yes' : 'no'}`,
].join('\n') + '\n';

if (opt.check) {
  const left = t.imports + t.raw + (paletteIn ? t.palette : 0) + t.files + t.unassigned;
  process.stdout.write(countsText);
  for (const s of stale) process.stdout.write(`allowlist stale: ${s.file}\t${s.match}\n`);
  process.exit(left === 0 && stale.length === 0 ? 0 : 1);
}

const inv = path.join(run, 'inventory');
fs.mkdirSync(inv, { recursive: true });
fs.writeFileSync(path.join(inv, 'current.tsv'), 'kind\tfile\tline\tmatch\tsurface\n' + rows.map((r) => [r.kind, r.file, r.line, r.match, r.surface].join('\t')).join('\n') + '\n');
fs.writeFileSync(path.join(inv, 'counts.txt'), countsText);
if (opt.pin) {
  let sha = 'unknown';
  try { sha = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* not a repo */ }
  fs.writeFileSync(path.join(inv, 'pin.txt'), `${sha}\n${countsText}`);
}
process.stdout.write(countsText);
