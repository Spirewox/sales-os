import { DataBundle, EntityKind, listEntities } from './insights';
import { DATASETS, Dataset, Filter, fieldValues, runQuery, FieldDef, NumFilter, DateRange, FoundRecord, findRecords, latestActivity } from './explore';

/**
 * Natural-language context layer.
 *
 * Interprets a plain-English question against the semantic model (datasets,
 * dimensions, measures and their real values) and resolves it to a concrete
 * query — dataset + measure + breakdown + filters — then narrates the answer.
 * No external LLM: the structured semantic layer *is* the understanding.
 */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const money = (n: number) => { const v = Math.round(n); if (Math.abs(v) >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M'; if (Math.abs(v) >= 1000) return '₦' + (v / 1000).toFixed(0) + 'k'; return '₦' + v.toLocaleString(); };
const fmtV = (v: number, k: 'money' | 'number') => k === 'money' ? money(v) : Math.round(v).toLocaleString();

// stop-values that shouldn't be auto-matched as filters
const STOP = new Set(['yes', 'no', 'other', 'none', 'unspecified', 'n a', 'healthy', '']);

// ─────────── amount / threshold parsing ───────────
function parseAmount(raw: string): number | null {
  const m = raw.match(/(\d[\d,]*)(?:\.(\d+))?\s*([kmb])?/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, '') + (m[2] ? '.' + m[2] : ''));
  const suf = (m[3] || '').toLowerCase();
  if (suf === 'k') n *= 1e3; else if (suf === 'm') n *= 1e6; else if (suf === 'b') n *= 1e9;
  return Number.isFinite(n) ? n : null;
}
const AMT = String.raw`₦?\s*(\d[\d,]*(?:\.\d+)?\s*[kmb]?)`;
function detectNumFilters(q: string): NumFilter[] {
  const out: NumFilter[] = [];
  const between = q.match(new RegExp(`\\bbetween\\s+${AMT}\\s+and\\s+${AMT}`, 'i'));
  if (between) { const a = parseAmount(between[1]), b = parseAmount(between[2]); if (a != null && b != null) return [{ op: 'gte', value: Math.min(a, b) }, { op: 'lte', value: Math.max(a, b) }]; }
  const gte = q.match(new RegExp(`\\b(?:over|above|more than|greater than|at least|minimum|min|>=?|bigger than|higher than)\\s+${AMT}`, 'i'));
  if (gte) { const v = parseAmount(gte[1]); if (v != null) out.push({ op: 'gte', value: v }); }
  const lte = q.match(new RegExp(`\\b(?:under|below|less than|at most|maximum|max|<=?|cheaper than|smaller than|up to)\\s+${AMT}`, 'i'));
  if (lte) { const v = parseAmount(lte[1]); if (v != null) out.push({ op: 'lte', value: v }); }
  return out;
}

// ─────────── relative / named date ranges (anchored to latest activity) ───────────
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (base: string, days: number) => { const d = new Date(base + 'T00:00:00'); d.setDate(d.getDate() + days); return iso(d); };
function detectDateRange(q: string, anchor: string): DateRange | undefined {
  const A = new Date(anchor + 'T00:00:00'); const yr = A.getFullYear();
  const monthRange = (mIdx: number, y: number): DateRange => {
    const from = new Date(y, mIdx, 1); const to = new Date(y, mIdx + 1, 0);
    return { from: iso(from), to: iso(to), label: `${MONTHS[mIdx][0].toUpperCase()}${MONTHS[mIdx].slice(1)} ${y}` };
  };
  if (/\btoday\b/.test(q)) return { from: anchor, to: anchor, label: 'today' };
  if (/\byesterday\b/.test(q)) return { from: shift(anchor, -1), to: shift(anchor, -1), label: 'yesterday' };
  const lastN = q.match(/\b(?:last|past|previous)\s+(\d+)\s+days?\b/);
  if (lastN) { const n = +lastN[1]; return { from: shift(anchor, -(n - 1)), to: anchor, label: `last ${n} days` }; }
  if (/\b(last|past)\s+week\b/.test(q) || /\blast 7 days\b/.test(q)) return { from: shift(anchor, -6), to: anchor, label: 'last 7 days' };
  if (/\b(last|past)\s+(30|thirty)\s+days\b/.test(q)) return { from: shift(anchor, -29), to: anchor, label: 'last 30 days' };
  if (/\b(last|past)\s+(90|ninety)\s+days\b/.test(q) || /\b(last|past)\s+quarter\b/.test(q)) return { from: shift(anchor, -89), to: anchor, label: 'last 90 days' };
  if (/\bthis month\b/.test(q)) return { from: iso(new Date(yr, A.getMonth(), 1)), to: anchor, label: 'this month' };
  if (/\b(last|past)\s+month\b/.test(q)) { const m = A.getMonth() - 1; return monthRange((m + 12) % 12, m < 0 ? yr - 1 : yr); }
  if (/\bthis year\b/.test(q)) return { from: iso(new Date(yr, 0, 1)), to: anchor, label: `${yr}` };
  if (/\b(last|past)\s+year\b/.test(q)) return { from: `${yr - 1}-01-01`, to: `${yr - 1}-12-31`, label: `${yr - 1}` };
  const qm = q.match(/\bq([1-4])(?:\s+(\d{4}))?\b/);
  if (qm) { const s = (+qm[1] - 1) * 3; const y = qm[2] ? +qm[2] : yr; return { from: iso(new Date(y, s, 1)), to: iso(new Date(y, s + 3, 0)), label: `Q${qm[1]} ${y}` }; }
  for (let i = 0; i < 12; i++) {
    if (new RegExp(`\\b(?:in |for |during )?${MONTHS[i]}(?:\\s+(\\d{4}))?\\b`).test(q) && new RegExp(`\\b(?:in|for|during|month of)\\b`).test(q)) {
      const ym = q.match(new RegExp(`${MONTHS[i]}\\s+(\\d{4})`)); const y = ym ? +ym[1] : (i > A.getMonth() ? yr - 1 : yr);
      return monthRange(i, y);
    }
  }
  const yOnly = q.match(/\bin\s+(20\d{2})\b/);
  if (yOnly) { const y = +yOnly[1]; return { from: `${y}-01-01`, to: `${y}-12-31`, label: `${y}` }; }
  return undefined;
}

const inRange = (date: string | undefined, r?: DateRange): boolean => {
  if (!r || (!r.from && !r.to)) return true;
  if (!date) return false;
  const d = date.slice(0, 10);
  if (r.from && d < r.from) return false;
  if (r.to && d > r.to) return false;
  return true;
};

// ─────────── find vs aggregate intent ───────────
const RECORD_NOUNS = /\b(orders?|sales?|transactions?|purchases?|invoices?|customers?|clients?|buyers?|suppliers?|vendors?|credits?|debtors?|movements?|deliveries|records?|products?|items?|skus?)\b/;
const FIND_VERBS = /\b(find|show|list|display|pull up|get me|give me|fetch|look up|search|which|what)\b/;
const SUPERLATIVE_FIND = /\b(biggest|largest|highest|smallest|lowest|cheapest|most recent|latest|newest|oldest|top)\s+(orders?|sales?|transactions?|purchases?|customers?|suppliers?|vendors?|credits?|debtors?|records?|deals?)\b/;
function isFindIntent(q: string, hasNum: boolean): boolean {
  if (SUPERLATIVE_FIND.test(q)) return true;
  if (hasNum && RECORD_NOUNS.test(q)) return true;
  if (FIND_VERBS.test(q) && RECORD_NOUNS.test(q) && !/\b(by |per |breakdown|distribution|split|trend|average|total revenue|how much in total)\b/.test(q)) return true;
  return false;
}
function findSort(q: string): { sort: 'amount' | 'date'; dir: 'desc' | 'asc' } {
  if (/\b(most recent|latest|newest|recent)\b/.test(q)) return { sort: 'date', dir: 'desc' };
  if (/\boldest\b/.test(q)) return { sort: 'date', dir: 'asc' };
  if (/\b(smallest|lowest|cheapest)\b/.test(q)) return { sort: 'amount', dir: 'asc' };
  return { sort: 'amount', dir: 'desc' };
}

// business-generic name tokens that shouldn't alone trigger a fuzzy match
const GENERIC = new Set(['ltd', 'limited', 'nig', 'nigeria', 'enterprise', 'enterprises', 'store', 'stores', 'shop', 'foods', 'food', 'farm', 'farms', 'fresh', 'kitchen', 'restaurant', 'hotel', 'company', 'co', 'and', 'the', 'de', 'group', 'global', 'services', 'ventures', 'concept', 'concepts', 'international']);
function tokens(s: string): string[] { return norm(s).split(' ').filter((t) => t.length >= 3); }

// dataset routing keywords
const DS_HINTS: [string, string[]][] = [
  ['credits', ['credit', 'owed', 'overdue', 'debt', 'debtor', 'receivable', 'repay', 'outstanding']],
  ['suppliers', ['supplier', 'vendor', 'procure', 'procurement', 'sourcing', 'reliab']],
  ['issues', ['issue', 'complaint', 'defect', 'quality problem', 'late delivery']],
  ['movements', ['restock', 'purchase order', 'stock movement', 'movement', 'received stock']],
  ['inventory', ['inventory', 'stock level', 'on hand', 'sku', 'in stock', 'out of stock', 'low stock']],
  ['customers', ['customer base', 'how many customers', 'customer profile', 'demographic', 'segment size']],
];

// measure concept → candidate measure keys (first that exists in dataset)
const MEASURE_CONCEPTS: [RegExp, string[]][] = [
  [/\bunique customers|distinct customers|how many customers|number of customers\b/, ['customers', 'count']],
  [/\bavg order|average order|basket|ticket size|aov\b/, ['aov']],
  [/\bprofit|margin|markup|earnings\b/, ['profit', 'retailProfit', 'margin']],
  [/\bunits?|quantity|qty|volume|kg sold\b/, ['units', 'qty']],
  [/\bhow (many|often)|orders?|frequency|transactions?|times|count\b/, ['orders', 'count']],
  [/\bowed|debt|outstanding|balance\b/, ['owed']],
  [/\brevenue|sales|sell|sold|spend|spent|earn|money|turnover|how much|value|worth\b/, ['revenue', 'spend', 'value', 'owed']],
];

// breakdown intent phrase → field key
const GROUP_PHRASES: [RegExp, string][] = [
  [/\bwhat (do|did|does) .* buy|what they buy|which products?|what products?|top products?|by product\b/, 'Product'],
  [/\bcategor/, 'Category'],
  [/\bwhen |what day|which day|day of week|weekday\b/, 'DayOfWeek'],
  [/\bweekend\b/, 'WeekPart'],
  [/\bover time|by month|monthly|per month|trend|each month\b/, 'Month'],
  [/\bwho |which customers?|top customers?|by customer\b/, 'Customer'],
  [/\bchannel\b/, 'Channel'],
  [/\bsegment\b/, 'Segment'],
  [/\bage group|age band|by age\b/, 'AgeGroup'],
  [/\blifestyle\b/, 'Lifestyle'],
  [/\breligion\b/, 'Religion'],
  [/\bfamily\b/, 'FamilyType'],
  [/\bemployment|occupation|job\b/, 'Employment'],
  [/\bbusiness (type|category)\b/, 'BusinessCategory'],
  [/\bwhere |location|hub\b/, 'Location'],
  [/\bagent|rep\b/, 'Agent'],
  [/\bpayment (mode|type)|cash or credit|cash vs credit\b/, 'PaymentMode'],
  [/\bstatus\b/, 'Status'],
  [/\bsupplier|vendor\b/, 'Supplier'],
  [/\btype of movement|movement type\b/, 'Type'],
  [/\bseverity\b/, 'Severity'],
];

function pickDataset(q: string): Dataset {
  for (const [key, words] of DS_HINTS) if (words.some((w) => q.includes(w))) return DATASETS.find((d) => d.key === key)!;
  return DATASETS.find((d) => d.key === 'sales')!;
}

function pickMeasure(q: string, ds: Dataset): string {
  for (const [re, cands] of MEASURE_CONCEPTS) {
    if (re.test(q)) { const hit = cands.find((c) => ds.measures.some((m) => m.key === c)); if (hit) return hit; }
  }
  return ds.measures[0].key;
}

function pickGroupBy(q: string, ds: Dataset, filterFields: Set<string>): string {
  // explicit "by/per/across <label>"
  for (const f of ds.fields) {
    const l = norm(f.label);
    if (new RegExp(`\\b(by|per|across|for each|breakdown by) ${esc(l)}\\b`).test(q)) return f.key;
  }
  // intent phrases (only fields that exist here)
  for (const [re, key] of GROUP_PHRASES) if (ds.fields.some((f) => f.key === key) && re.test(q)) return key;
  // else first field not used as a filter
  return ds.fields.find((f) => !filterFields.has(f.key))?.key || ds.fields[0].key;
}

const NAME_FIELDS = new Set(['Customer', 'Supplier', 'Product']);
function detectFilters(q: string, ds: Dataset, rows: any[]): Filter[] {
  const claimed = new Set<string>(); // value already used by a field
  const byField: Record<string, { field: FieldDef; values: string[] }> = {};
  const add = (field: FieldDef, value: string, vn: string) => { claimed.add(vn); (byField[field.key] = byField[field.key] || { field, values: [] }).values.push(value); };

  // pass 1 — exact / substring match
  for (const field of ds.fields) {
    for (const value of fieldValues(rows, field)) {
      const vn = norm(value);
      if (STOP.has(vn) || vn.length < 2 || claimed.has(vn)) continue;
      const short = vn.length <= 3;
      const hit = short ? new RegExp(`\\b${esc(vn)}\\b`).test(q) : q.includes(vn);
      if (hit) add(field, value, vn);
    }
  }
  // pass 2 — fuzzy token match on name-like fields ("mama kudi" → "Mama Kudi's Kitchen")
  for (const field of ds.fields) {
    if (!NAME_FIELDS.has(field.key) || byField[field.key]) continue;
    let best: { value: string; vn: string; score: number } | null = null;
    for (const value of fieldValues(rows, field)) {
      const vn = norm(value);
      if (STOP.has(vn) || claimed.has(vn)) continue;
      const toks = tokens(value);
      const present = toks.filter((t) => new RegExp(`\\b${esc(t)}\\b`).test(q));
      const distinctive = present.filter((t) => !GENERIC.has(t));
      const strong = distinctive.some((t) => t.length >= 5);
      if ((distinctive.length >= 2 || (distinctive.length >= 1 && strong)) && (!best || present.length > best.score)) best = { value, vn, score: present.length };
    }
    if (best) add(field, best.value, best.vn);
  }
  return Object.values(byField).map((b) => ({ field: b.field.key, multi: !!b.field.multi, values: b.values }));
}

// comparison detection (two named entities)
function detectCompare(q: string, bundle: DataBundle): { kind: EntityKind; aId: string; bId: string } | null {
  if (!/\bvs\b|versus|compare|against/.test(q)) return null;
  const kinds: EntityKind[] = ['supplier', 'customer', 'product'];
  for (const kind of kinds) {
    const ents = listEntities(kind, bundle);
    const found = ents.filter((e) => q.includes(norm(e.label))).slice(0, 2);
    if (found.length >= 2) return { kind, aId: found[0].id, bId: found[1].id };
  }
  return null;
}

export interface AskResult {
  ok: boolean;
  mode: 'aggregate' | 'find';
  dataset: string; datasetLabel: string;
  measure: string; measureLabel: string;
  groupBy: string; groupLabel: string;
  filters: Filter[]; filterChips: string[];
  chart: 'column' | 'bar' | 'line' | 'pie' | 'table';
  rows: { key: string; label: string; value: number }[];
  total: number; measureKind: 'money' | 'number';
  narrative: string;
  understoodAs: string;
  compare?: { kind: EntityKind; aId: string; bId: string };
  // find mode
  records?: FoundRecord[];
  find?: { matched: number; shown: number; totalAmount: number; amountKind: 'money' | 'number'; entityLabel: string; sortLabel: string };
  dateChip?: string;
}

function fmtDate(d?: string): string { return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }

export function ask(question: string, bundle: DataBundle): AskResult {
  const q = ` ${norm(question)} `;
  const compare = detectCompare(q, bundle);
  const ds = pickDataset(q);
  const allRows = ds.build(bundle);

  const anchor = latestActivity(bundle);
  const dateRange = detectDateRange(q, anchor);
  const numFilters = detectNumFilters(q);
  const filters = detectFilters(q, ds, allRows);
  const filterChips = filters.map((f) => `${ds.fields.find((x) => x.key === f.field)?.label}: ${f.values.join(' / ')}`);
  const dateChip = dateRange?.label;
  const numChips = numFilters.map((n) => `${n.op === 'gte' ? '≥' : '≤'} ${money(n.value)}`);
  const allChips = [...filterChips, ...numChips, ...(dateChip ? [`📅 ${dateChip}`] : [])];

  // ─── FIND MODE — return the actual matching records ───
  if (!compare && isFindIntent(q, numFilters.length > 0)) {
    const { sort, dir } = findSort(q);
    const fr = findRecords(ds, allRows, { filters, numFilters, dateRange, sort, dir });
    const sortLabel = sort === 'date' ? (dir === 'desc' ? 'most recent' : 'oldest') : (dir === 'desc' ? 'largest' : 'smallest');
    const top = fr.records[0];
    const cond = allChips.length ? ` ${allChips.join(' · ')}` : '';
    const parts: string[] = [];
    if (fr.matched === 0) {
      parts.push(`No ${fr.entityLabel} match${cond ? ` ${cond}` : ' that'}. Try loosening the amount or date.`);
    } else {
      parts.push(`Found ${fr.matched} ${fr.entityLabel}${cond}${fr.amountKind === 'money' && fr.totalAmount > 0 ? ` — worth ${money(fr.totalAmount)} in total` : ''}.`);
      if (top) parts.push(`${dir === 'desc' ? 'Largest' : 'Smallest'}: ${top.title}${top.amount != null && top.amountKind === 'money' ? ` (${money(top.amount)})` : ''}${top.date ? ` on ${fmtDate(top.date)}` : ''}.`);
      if (fr.matched > fr.shown) parts.push(`Showing the top ${fr.shown}.`);
    }
    return {
      ok: fr.matched > 0, mode: 'find',
      dataset: ds.key, datasetLabel: ds.label,
      measure: '', measureLabel: '', groupBy: '', groupLabel: '',
      filters, filterChips, chart: 'table', rows: [], total: fr.totalAmount, measureKind: fr.amountKind,
      narrative: parts.join(' '),
      understoodAs: `Find ${fr.entityLabel}${allChips.length ? ` · ${allChips.join(' · ')}` : ''} · sorted by ${sortLabel} · ${ds.label}`,
      records: fr.records,
      find: { matched: fr.matched, shown: fr.shown, totalAmount: fr.totalAmount, amountKind: fr.amountKind, entityLabel: fr.entityLabel, sortLabel },
      dateChip,
    };
  }

  // ─── AGGREGATE MODE ───
  const rows = dateRange ? allRows.filter((r) => inRange(r.date || r.record?.date, dateRange)) : allRows;
  const filterFields = new Set(filters.map((f) => f.field));
  const groupBy = pickGroupBy(q, ds, filterFields);
  const measure = pickMeasure(q, ds);
  const res = runQuery(ds, rows, filters, groupBy, measure);

  const measureLabel = ds.measures.find((m) => m.key === measure)?.label || '';
  const groupLabel = ds.fields.find((f) => f.key === groupBy)?.label || '';

  // chart choice
  const gDef = ds.fields.find((f) => f.key === groupBy);
  let chart: AskResult['chart'] = 'column';
  if (gDef?.time === 'month') chart = 'line';
  else if (gDef?.time === 'dow') chart = 'column';
  else if (res.rows.length > 8) chart = 'bar';
  else if (res.rows.length <= 6 && res.measureKind === 'money') chart = 'pie';

  // narrative
  const top = res.rows[0];
  const parts: string[] = [];
  const fp = allChips.length ? ` for ${allChips.join(', ')}` : '';
  if (res.rows.length === 0) {
    parts.push(`No ${ds.label.toLowerCase()} data matches${fp || ' that'}.`);
  } else {
    parts.push(`${measureLabel}${fp}, broken down by ${groupLabel}: total ${fmtV(res.total, res.measureKind)} across ${res.rows.length} ${groupLabel.toLowerCase()}${res.rows.length !== 1 ? 's' : ''}.`);
    if (top) parts.push(`Top ${groupLabel.toLowerCase()}: ${top.label} — ${fmtV(top.value, res.measureKind)}${res.total > 0 ? ` (${Math.round((top.value / res.total) * 100)}% of total)` : ''}.`);
    const rest = res.rows.slice(1, 3);
    if (rest.length) parts.push(`Followed by ${rest.map((r) => `${r.label} (${fmtV(r.value, res.measureKind)})`).join(', ')}.`);
  }

  return {
    ok: res.rows.length > 0, mode: 'aggregate',
    dataset: ds.key, datasetLabel: ds.label,
    measure, measureLabel, groupBy, groupLabel,
    filters, filterChips, chart,
    rows: res.rows, total: res.total, measureKind: res.measureKind,
    narrative: parts.join(' '),
    understoodAs: `${measureLabel} by ${groupLabel}${allChips.length ? ` · ${allChips.join(' · ')}` : ''} · ${ds.label}`,
    compare: compare || undefined,
    dateChip,
  };
}

export const ASK_EXAMPLES = [
  'Show orders over ₦50k',
  'Find credit sales from last month',
  'Biggest orders this quarter',
  'List orders between ₦20k and ₦100k',
  'What do Sunday customers buy?',
  'Revenue by customer segment',
  'Which supplier gives the best retail profit?',
  'Most recent orders over ₦30k',
  'Orders by day of week for B2B customers',
  'Amount owed by credit status',
];
