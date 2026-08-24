'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  useCustomers, useSales, useSuppliers, useSupplierIssues,
  useStockLogs, useInventory, useCredits, useAgents,
} from '@/hooks/use-queries';
import { EntityKind, ENTITY_KINDS, DataBundle, listEntities, compare } from '@/lib/insights';
import { DATASETS, Dataset, Filter, fieldValues, runQuery } from '@/lib/explore';
import { ask, ASK_EXAMPLES, AskResult } from '@/lib/ask';
import {
  runSimulation, interpretScenario, SIM_SCENARIOS, SIM_EXAMPLES, defaultLevers,
  ScenarioKey, Levers, LeverDef, SimOutput, SimMetric,
} from '@/lib/simulate';
import { deriveSegments } from '@/lib/segmentation';
import { InsightButton } from '@/components/insight-button';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Sparkles, ArrowLeftRight, Crown, Lightbulb, Plus, X, Filter as FilterIcon,
  BarChart2, BarChart3, LineChart as LineIcon, PieChart as PieIcon, Table as TableIcon,
  Users, Truck, Package, Tag, Layers, MapPin, UserCog, Wallet, ArrowRightLeft, ClipboardList,
  Send, Wand2, ArrowUpRight, ChevronRight, Search, Calendar,
  FlaskConical, TrendingUp, TrendingDown, Minus, Sliders, CheckCircle2, AlertTriangle, XCircle, Info,
} from 'lucide-react';

const PALETTE = ['#0891b2', '#ea580c', '#7c3aed', '#dc2626', '#ca8a04', '#16a34a', '#2563eb', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6', '#64748b'];
const money = (n: number) => { const v = Math.round(n); if (Math.abs(v) >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M'; if (Math.abs(v) >= 1000) return '₦' + (v / 1000).toFixed(0) + 'k'; return '₦' + v.toLocaleString(); };
const fmtVal = (v: number, kind: 'money' | 'number') => kind === 'money' ? money(v) : Math.round(v).toLocaleString();
const DS_ICON: Record<string, typeof Users> = { sales: Wallet, customers: Users, inventory: Package, suppliers: Truck, movements: ArrowRightLeft, credits: Wallet, issues: ClipboardList };
const KIND_ICON: Record<EntityKind, typeof Users> = { customer: Users, supplier: Truck, product: Package, category: Tag, segment: Layers, hub: MapPin, agent: UserCog };

type Chart = 'column' | 'bar' | 'line' | 'pie' | 'table';
type Mode = 'ask' | 'explore' | 'simulate' | 'compare';
export interface SeedQuery { dataset: string; measure: string; groupBy: string; filters: Filter[] }

export default function InsightsPage() {
  const { data: customers = [] } = useCustomers();
  const { data: sales = [] } = useSales();
  const { data: suppliers = [] } = useSuppliers();
  const { data: supplierIssues = [] } = useSupplierIssues();
  const { data: stockLogs = [] } = useStockLogs();
  const { data: inventory = [] } = useInventory();
  const { data: credits = [] } = useCredits();
  const { data: agents = [] } = useAgents();
  const bundle: DataBundle = useMemo(() => ({ customers, sales, suppliers, supplierIssues, stockLogs, inventory, credits, agents }), [customers, sales, suppliers, supplierIssues, stockLogs, inventory, credits, agents]);

  const [mode, setMode] = useState<Mode>('ask');
  const [seed, setSeed] = useState<SeedQuery | null>(null);
  const [initialQ, setInitialQ] = useState('');

  useEffect(() => {
    const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ask') : null;
    if (p) { setInitialQ(p); setMode('ask'); }
  }, []);

  const MODES: { key: Mode; label: string; icon: typeof Users }[] = [
    { key: 'ask', label: 'Ask', icon: Sparkles }, { key: 'explore', label: 'Explore', icon: BarChart3 }, { key: 'simulate', label: 'Simulate', icon: FlaskConical }, { key: 'compare', label: 'Compare', icon: ArrowLeftRight },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3"><Sparkles className="text-primary" /> Insight Explorer</h1>
          <p className="text-sm text-muted-foreground">Ask a question in plain English, or build your own view — across every dataset in the system.</p>
        </div>
        <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border shrink-0">
          {MODES.map((mo) => (
            <button key={mo.key} onClick={() => setMode(mo.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${mode === mo.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}><mo.icon size={13} /> {mo.label}</button>
          ))}
        </div>
      </div>
      {mode === 'ask' && <Ask bundle={bundle} initialQ={initialQ} onRefine={(q) => { setSeed(q); setMode('explore'); }} />}
      {mode === 'explore' && <Explore bundle={bundle} seed={seed} />}
      {mode === 'simulate' && <Simulate bundle={bundle} />}
      {mode === 'compare' && <Compare bundle={bundle} />}
    </div>
  );
}

/* ═══════════ shared chart ═══════════ */
function ResultChart({ rows, chart, measureLabel, measureKind, groupLabel }: { rows: { key: string; label: string; value: number }[]; chart: Chart; measureLabel: string; measureKind: 'money' | 'number'; groupLabel: string }) {
  const data = rows.slice(0, 12);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-10">No data matches.</p>;
  if (chart === 'table') return <ResultTable rows={rows} kind={measureKind} label={groupLabel} />;
  return (
    <>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          {chart === 'line' ? (
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtVal(v, measureKind)} />
              <Tooltip formatter={(v: any) => fmtVal(Number(v), measureKind)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="value" name={measureLabel} stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : chart === 'pie' ? (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={110} innerRadius={55} paddingAngle={2}>{data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie>
              <Tooltip formatter={(v: any) => fmtVal(Number(v), measureKind)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          ) : chart === 'bar' ? (
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtVal(v, measureKind)} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={130} />
              <Tooltip formatter={(v: any) => fmtVal(Number(v), measureKind)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" name={measureLabel} radius={[0, 4, 4, 0]} barSize={18}>{data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Bar>
            </BarChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtVal(v, measureKind)} />
              <Tooltip formatter={(v: any) => fmtVal(Number(v), measureKind)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" name={measureLabel} radius={[4, 4, 0, 0]} barSize={26}>{data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {rows.length > 12 && <p className="text-[11px] text-muted-foreground text-center mt-2">Showing top 12 of {rows.length}.</p>}
    </>
  );
}

function ResultTable({ rows, kind, label }: { rows: { key: string; label: string; value: number }[]; kind: 'money' | 'number'; label: string }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const total = rows.reduce((a, r) => a + r.value, 0);
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 border-b"><tr><th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase">{label}</th><th className="px-4 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase">Value</th><th className="px-4 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase w-24">Share</th></tr></thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-muted/20">
              <td className="px-4 py-2 font-medium">{r.label}</td>
              <td className="px-4 py-2 text-right font-bold tabular-nums">{fmtVal(r.value, kind)}</td>
              <td className="px-4 py-2"><div className="flex items-center gap-2 justify-end"><div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(Math.abs(r.value) / max) * 100}%` }} /></div><span className="text-[11px] text-muted-foreground w-8 text-right">{total > 0 ? Math.round((r.value / total) * 100) : 0}%</span></div></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="bg-muted/20 border-t-2 border-dashed"><td className="px-4 py-2 font-medium text-muted-foreground">Total</td><td className="px-4 py-2 text-right font-black">{fmtVal(total, kind)}</td><td /></tr></tfoot>
      </table>
    </div>
  );
}

/* ═══════════ ASK (natural language) ═══════════ */
const dateShort = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' }) : '';

function RecordsList({ result }: { result: AskResult }) {
  const router = useRouter();
  const recs = result.records || [];
  const f = result.find!;
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Search size={15} className="text-primary shrink-0" />
          <h3 className="text-sm font-bold truncate">{f.matched} {f.entityLabel}</h3>
          <span className="text-[11px] text-muted-foreground shrink-0">by {f.sortLabel}</span>
        </div>
        {f.amountKind === 'money' && f.totalAmount > 0 && (
          <div className="text-right shrink-0"><p className="text-[10px] text-muted-foreground">Total</p><p className="text-sm font-black text-primary">{money(f.totalAmount)}</p></div>
        )}
      </div>
      {recs.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No matching records.</div>
      ) : (
        <ul className="divide-y max-h-[520px] overflow-y-auto">
          {recs.map((r, i) => {
            const clickable = !!r.link;
            return (
              <li key={r.id + i}
                onClick={() => r.link && router.push(r.link)}
                className={`flex items-center gap-3 px-4 py-2.5 ${clickable ? 'cursor-pointer hover:bg-muted/40 group' : ''}`}>
                <span className="text-[11px] font-mono text-muted-foreground w-6 shrink-0 text-right">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{r.title}</p>
                    {r.count && r.count > 1 && <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 shrink-0">{r.count} lines</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    {r.date && <span className="inline-flex items-center gap-1 shrink-0"><Calendar size={10} />{dateShort(r.date)}</span>}
                    {r.subtitle && <span className="truncate">{r.subtitle}</span>}
                  </div>
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">{r.tags.slice(0, 3).map((t) => <span key={t} className="text-[9px] font-medium rounded-full border px-1.5 py-0.5 text-muted-foreground">{t}</span>)}</div>
                  )}
                </div>
                {r.amount != null && r.amountKind === 'money' && <p className="text-sm font-bold shrink-0">{money(r.amount)}</p>}
                {clickable && <ChevronRight size={15} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />}
              </li>
            );
          })}
        </ul>
      )}
      {f.matched > f.shown && <div className="px-4 py-2 border-t text-center text-[11px] text-muted-foreground">Showing top {f.shown} of {f.matched} — narrow with an amount or date.</div>}
    </div>
  );
}

function Ask({ bundle, initialQ, onRefine }: { bundle: DataBundle; initialQ: string; onRefine: (q: SeedQuery) => void }) {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const result: AskResult | null = useMemo(() => submitted.trim() ? ask(submitted, bundle) : null, [submitted, bundle]);
  useEffect(() => { if (initialQ) { setQ(initialQ); setSubmitted(initialQ); } }, [initialQ]);

  const run = (text: string) => { setQ(text); setSubmitted(text); };
  const cmp = useMemo(() => (result?.compare ? compare(result.compare.kind, result.compare.aId, result.compare.bId, bundle) : null), [result, bundle]);

  return (
    <div className="space-y-5">
      {/* Ask box */}
      <div className="rounded-xl border bg-card shadow-sm p-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') run(q); }} placeholder="Ask anything — e.g. what do Sunday customers buy?" className="flex-1 h-10 bg-transparent text-sm focus:outline-none" />
          <button onClick={() => run(q)} disabled={!q.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 h-9 text-sm font-semibold disabled:opacity-50"><Send size={14} /> Ask</button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {ASK_EXAMPLES.map((ex) => <button key={ex} onClick={() => run(ex)} className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent">{ex}</button>)}
        </div>
      </div>

      {result && (
        <>
          {/* Understanding */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-2.5">
              <Wand2 size={16} className="text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase text-primary mb-1">Answer</p>
                <p className="text-sm leading-relaxed">{result.narrative}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[10px] text-muted-foreground">Understood as:</span>
                  {result.mode === 'find' && <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold"><Search size={9} /> Find records</span>}
                  <span className="inline-flex items-center rounded-full bg-background border px-2 py-0.5 text-[10px] font-semibold">{result.datasetLabel}</span>
                  {result.mode === 'aggregate' && <span className="inline-flex items-center rounded-full bg-background border px-2 py-0.5 text-[10px] font-semibold">{result.measureLabel}</span>}
                  {result.mode === 'aggregate' && <span className="inline-flex items-center rounded-full bg-background border px-2 py-0.5 text-[10px] font-semibold">by {result.groupLabel}</span>}
                  {result.dateChip && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold"><Calendar size={9} /> {result.dateChip}</span>}
                  {result.filterChips.map((c) => <span key={c} className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-semibold">{c}</span>)}
                </div>
              </div>
              {!result.compare && result.mode === 'aggregate' && result.rows.length > 0 && (
                <button onClick={() => onRefine({ dataset: result.dataset, measure: result.measure, groupBy: result.groupBy, filters: result.filters })} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-accent shrink-0"><ArrowUpRight size={12} /> Refine</button>
              )}
            </div>
          </div>

          {/* Find mode — real records */}
          {result.mode === 'find' ? (
            result.records && result.records.length > 0 ? <RecordsList result={result} /> : null
          ) : result.compare && cmp ? (
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="p-5 border-b flex items-center justify-between"><h3 className="text-sm font-bold">{cmp.aLabel} vs {cmp.bLabel}</h3><span className="text-sm font-black">{cmp.aWins} <span className="text-muted-foreground">–</span> {cmp.bWins}</span></div>
              <div className="p-5 space-y-2.5">{cmp.insights.map((ins, i) => <div key={i} className="flex items-start gap-2.5 text-sm"><span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${ins.winner === 'a' ? 'bg-primary' : ins.winner === 'b' ? 'bg-blue-500' : 'bg-muted-foreground'}`} /><span>{ins.text}</span></div>)}</div>
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="p-5 border-b flex items-start justify-between gap-3"><h3 className="text-sm font-bold">{result.measureLabel} by {result.groupLabel}</h3><InsightButton title={`${result.measureLabel} by ${result.groupLabel}`} kind={result.measureKind} time={result.chart === 'line'} series={result.rows.map((r) => ({ label: r.label, value: r.value }))} /></div>
              <div className="p-5"><ResultChart rows={result.rows} chart={result.chart} measureLabel={result.measureLabel} measureKind={result.measureKind} groupLabel={result.groupLabel} /></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════ EXPLORE (query builder) ═══════════ */
function Explore({ bundle, seed }: { bundle: DataBundle; seed: SeedQuery | null }) {
  const [dsKey, setDsKey] = useState(seed?.dataset || 'sales');
  const ds: Dataset = useMemo(() => DATASETS.find((d) => d.key === dsKey)!, [dsKey]);
  const rows = useMemo(() => ds.build(bundle), [ds, bundle]);
  const [measure, setMeasure] = useState(seed?.measure || ds.measures[0].key);
  const [groupBy, setGroupBy] = useState(seed?.groupBy || ds.fields[0].key);
  const [filters, setFilters] = useState<Filter[]>(seed?.filters || []);
  const [chart, setChart] = useState<Chart>('column');

  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } setMeasure(ds.measures[0].key); setGroupBy(ds.fields[0].key); setFilters([]); }, [dsKey]); // eslint-disable-line

  const result = useMemo(() => runQuery(ds, rows, filters, groupBy, measure), [ds, rows, filters, groupBy, measure]);
  const measureLabel = ds.measures.find((m) => m.key === measure)?.label || '';
  const groupLabel = ds.fields.find((f) => f.key === groupBy)?.label || '';
  const top = result.rows[0];

  const addFilter = () => { const used = new Set(filters.map((f) => f.field)); const next = ds.fields.find((f) => !used.has(f.key) && f.key !== groupBy) || ds.fields[0]; setFilters([...filters, { field: next.key, multi: !!next.multi, values: [] }]); };
  const updateFilter = (idx: number, patch: Partial<Filter>) => setFilters(filters.map((f, i) => i === idx ? { ...f, ...patch } : f));
  const removeFilter = (idx: number) => setFilters(filters.filter((_, i) => i !== idx));

  const CHARTS: { key: Chart; icon: typeof Users }[] = [{ key: 'column', icon: BarChart3 }, { key: 'bar', icon: BarChart2 }, { key: 'line', icon: LineIcon }, { key: 'pie', icon: PieIcon }, { key: 'table', icon: TableIcon }];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {DATASETS.map((d) => { const Icon = DS_ICON[d.key] || Package; return <button key={d.key} onClick={() => setDsKey(d.key)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${dsKey === d.key ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card hover:bg-accent text-muted-foreground'}`}><Icon size={14} /> {d.label}</button>; })}
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">{ds.desc}</p>

      <div className="rounded-xl border bg-card shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-muted-foreground">Measure</label><select value={measure} onChange={(e) => setMeasure(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm font-semibold">{ds.measures.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></div>
          <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-muted-foreground">Break down by</label><select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm font-semibold">{ds.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></div>
          <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-muted-foreground">Chart</label><div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-md border h-9">{CHARTS.map((c) => <button key={c.key} onClick={() => setChart(c.key)} className={`flex-1 flex items-center justify-center rounded py-1 transition-all ${chart === c.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}><c.icon size={14} /></button>)}</div></div>
        </div>
        <div className="space-y-2">
          {filters.map((f, idx) => {
            const fDef = ds.fields.find((x) => x.key === f.field);
            if (!fDef) return null;
            const values = fieldValues(rows, fDef);
            return (
              <div key={idx} className="rounded-lg border bg-muted/20 p-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <FilterIcon size={12} className="text-muted-foreground shrink-0" />
                  <select value={f.field} onChange={(e) => { const nd = ds.fields.find((x) => x.key === e.target.value)!; updateFilter(idx, { field: nd.key, multi: !!nd.multi, values: [] }); }} className="h-7 rounded-md border bg-background px-2 text-xs font-semibold">{ds.fields.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select>
                  <span className="text-xs text-muted-foreground">is</span><span className="text-[10px] text-muted-foreground ml-auto">{f.values.length || 'any'}</span>
                  <button onClick={() => removeFilter(idx)} className="text-muted-foreground hover:text-red-600 p-0.5"><X size={13} /></button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {values.map((v) => { const on = f.values.includes(v); return <button key={v} onClick={() => updateFilter(idx, { values: on ? f.values.filter((x) => x !== v) : [...f.values, v] })} className={`rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:bg-accent'}`}>{v}</button>; })}
                </div>
              </div>
            );
          })}
          <button onClick={addFilter} className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent"><Plus size={13} /> Add filter</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm"><p className="text-[10px] font-bold uppercase text-muted-foreground">Total {measureLabel}</p><p className="text-2xl font-black">{fmtVal(result.total, result.measureKind)}</p></div>
        <div className="rounded-xl border bg-card p-4 shadow-sm"><p className="text-[10px] font-bold uppercase text-muted-foreground">{groupLabel} Groups</p><p className="text-2xl font-black">{result.rows.length}</p></div>
        <div className="rounded-xl border bg-card p-4 shadow-sm"><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Lightbulb size={11} className="text-amber-500" /> Top {groupLabel}</p><p className="text-sm font-black truncate">{top ? top.label : '—'}</p>{top && <p className="text-[11px] text-muted-foreground">{fmtVal(top.value, result.measureKind)}{result.total > 0 ? ` · ${Math.round((top.value / result.total) * 100)}%` : ''}</p>}</div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-5 border-b flex items-start justify-between gap-3"><h3 className="text-sm font-bold">{measureLabel} by {groupLabel}</h3><InsightButton title={`${measureLabel} by ${groupLabel}`} kind={result.measureKind} time={!!ds.fields.find((f) => f.key === groupBy)?.time} series={result.rows.map((r) => ({ label: r.label, value: r.value }))} /></div>
        <div className="p-5"><ResultChart rows={result.rows} chart={chart} measureLabel={measureLabel} measureKind={result.measureKind} groupLabel={groupLabel} /></div>
      </div>
    </div>
  );
}

/* ═══════════ SIMULATE (what-if scenarios) ═══════════ */

const fmtM = (v: number, k: SimMetric['kind']) => k === 'money' ? money(v) : k === 'percent' ? `${Math.round(v)}%` : Math.round(v).toLocaleString();

function targetOptions(bundle: DataBundle, includeSuppliers: boolean): { value: string; label: string }[] {
  const cats = Array.from(new Set(bundle.inventory.map((i) => i.category))).sort();
  const items = [...bundle.inventory].sort((a, b) => a.name.localeCompare(b.name));
  const opts = [{ value: 'all', label: 'Whole catalogue' }];
  cats.forEach((c) => opts.push({ value: `cat:${c}`, label: `${c} · category` }));
  items.forEach((i) => opts.push({ value: `item:${i.id}`, label: i.name }));
  if (includeSuppliers) bundle.suppliers.forEach((s) => opts.push({ value: `sup:${s.id}`, label: `${s.name} · supplier` }));
  return opts;
}
function segmentOptions(bundle: DataBundle): string[] {
  const set = new Set<string>();
  bundle.customers.forEach((c) => deriveSegments(c).forEach((s) => set.add(s)));
  return Array.from(set).sort();
}

function MetricTile({ mt, big }: { mt: SimMetric; big?: boolean }) {
  const delta = mt.projected - mt.baseline;
  const base = Math.abs(mt.baseline);
  const dpct = base > 1e-9 ? (delta / base) * 100 : delta !== 0 ? 100 : 0;
  const dir = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
  const good = dir === 'flat' ? 'flat' : (mt.better || 'up') === dir ? 'good' : 'bad';
  const color = good === 'good' ? 'text-green-600' : good === 'bad' ? 'text-red-600' : 'text-muted-foreground';
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;
  const deltaLabel = mt.kind === 'percent' ? `${delta >= 0 ? '+' : ''}${Math.round(delta)}pp` : `${dpct >= 0 ? '+' : ''}${Math.round(dpct)}%`;
  return (
    <div className={`rounded-lg border p-3 ${big ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}>
      <p className="text-[11px] text-muted-foreground font-medium truncate">{mt.label}</p>
      <p className={`font-black tracking-tight mt-0.5 ${big ? 'text-2xl' : 'text-lg'}`}>{fmtM(mt.projected, mt.kind)}</p>
      <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
        <span className="text-muted-foreground">from {fmtM(mt.baseline, mt.kind)}</span>
        <span className={`inline-flex items-center gap-0.5 font-bold ${color}`}><Icon size={11} />{deltaLabel}</span>
      </div>
    </div>
  );
}

function LeverControl({ def, levers, patch, bundle }: { def: LeverDef; levers: Levers; patch: (p: Partial<Levers>) => void; bundle: DataBundle }) {
  if (def.kind === 'target') {
    if (def.key === 'churnSegment') {
      return (
        <label className="block">
          <span className="text-[11px] font-semibold text-muted-foreground">{def.label}</span>
          <select value={levers.churnSegment} onChange={(e) => patch({ churnSegment: e.target.value })} className="mt-1 w-full h-9 rounded-md border bg-background px-2 text-sm">
            <option value="">— use top customers —</option>
            {segmentOptions(bundle).map((s) => <option key={s} value={`seg:${s}`}>{s}</option>)}
          </select>
        </label>
      );
    }
    const opts = targetOptions(bundle, !!def.includeSuppliers);
    return (
      <label className="block">
        <span className="text-[11px] font-semibold text-muted-foreground">{def.label}</span>
        <select value={String(levers[def.key])} onChange={(e) => patch({ [def.key]: e.target.value } as Partial<Levers>)} className="mt-1 w-full h-9 rounded-md border bg-background px-2 text-sm">
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    );
  }
  const val = Number(levers[def.key]);
  const showSign = (def.min ?? 0) < 0 && def.kind !== 'elasticity';
  const display = def.kind === 'elasticity' ? val.toFixed(1) : `${showSign && val > 0 ? '+' : ''}${Math.round(val)}${def.kind === 'int' ? '' : '%'}`;
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground">{def.label}</span>
        <span className="text-xs font-bold tabular-nums">{display}</span>
      </div>
      <input type="range" min={def.min} max={def.max} step={def.step} value={val} onChange={(e) => patch({ [def.key]: Number(e.target.value) } as Partial<Levers>)} className="mt-1.5 w-full accent-primary" />
      {def.hint && <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">{def.hint}</span>}
    </label>
  );
}

const VERDICT_STYLE = {
  positive: { icon: CheckCircle2, cls: 'bg-green-50 border-green-200 text-green-800', dot: 'text-green-600' },
  caution: { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200 text-amber-800', dot: 'text-amber-600' },
  negative: { icon: XCircle, cls: 'bg-red-50 border-red-200 text-red-800', dot: 'text-red-600' },
  neutral: { icon: Info, cls: 'bg-muted/50 border-border text-foreground', dot: 'text-muted-foreground' },
} as const;

function Simulate({ bundle }: { bundle: DataBundle }) {
  const [q, setQ] = useState('');
  const [scenario, setScenario] = useState<ScenarioKey>('price');
  const [levers, setLevers] = useState<Levers>(defaultLevers());
  const [understood, setUnderstood] = useState<string>('');

  const def = SIM_SCENARIOS.find((s) => s.key === scenario)!;
  const out: SimOutput = useMemo(() => runSimulation(scenario, levers, bundle), [scenario, levers, bundle]);
  const patch = (p: Partial<Levers>) => setLevers((prev) => ({ ...prev, ...p }));

  const runNL = (text: string) => {
    setQ(text);
    const r = interpretScenario(text, bundle);
    setScenario(r.scenario); setLevers(r.levers); setUnderstood(r.understood);
  };
  const pickScenario = (k: ScenarioKey) => { setScenario(k); setLevers({ ...defaultLevers(), target: levers.target }); setUnderstood(''); };

  const v = VERDICT_STYLE[out.verdict.tone];
  const VIcon = v.icon;

  return (
    <div className="space-y-5">
      {/* NL box */}
      <div className="rounded-xl border bg-card shadow-sm p-4">
        <div className="flex items-center gap-2">
          <FlaskConical size={18} className="text-primary shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) runNL(q); }} placeholder="Describe a what-if — e.g. what if I raise Beef prices 10%?" className="flex-1 h-10 bg-transparent text-sm focus:outline-none" />
          <button onClick={() => q.trim() && runNL(q)} disabled={!q.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 h-9 text-sm font-semibold disabled:opacity-50"><Send size={14} /> Simulate</button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {SIM_EXAMPLES.map((ex) => <button key={ex} onClick={() => runNL(ex)} className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent">{ex}</button>)}
        </div>
        {understood && <p className="text-[11px] text-muted-foreground mt-2.5"><Wand2 size={11} className="inline mr-1 text-primary" />Understood as: <span className="font-semibold text-foreground">{understood}</span></p>}
      </div>

      {/* Scenario chips */}
      <div className="flex flex-wrap gap-1.5">
        {SIM_SCENARIOS.map((s) => (
          <button key={s.key} onClick={() => pickScenario(s.key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${scenario === s.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:bg-accent'}`}>{s.label}</button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Levers */}
        <div className="rounded-xl border bg-card shadow-sm p-4 space-y-4 h-fit">
          <div className="flex items-center gap-2 pb-1"><Sliders size={14} className="text-primary" /><h3 className="text-sm font-bold">{def.label}</h3></div>
          <p className="text-[11px] text-muted-foreground -mt-2">{def.blurb}</p>
          {def.levers.map((ld) => <LeverControl key={ld.key} def={ld} levers={levers} patch={patch} bundle={bundle} />)}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border bg-card shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-primary tracking-wide">Projected outcome</p>
                <h3 className="text-base font-bold leading-tight">{out.title}</h3>
                <p className="text-[11px] text-muted-foreground">{out.subtitle}</p>
              </div>
              <MetricTile mt={out.headline} big />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              {out.metrics.map((mt, i) => <MetricTile key={i} mt={mt} />)}
            </div>

            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={out.chart} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tickFormatter={(v2) => money(v2)} tick={{ fontSize: 10 }} width={48} stroke="var(--muted-foreground)" />
                  <Tooltip formatter={(v2) => money(Number(v2))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Baseline" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Projected" fill="#0891b2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI read */}
          <div className={`rounded-xl border p-4 ${v.cls}`}>
            <div className="flex items-start gap-2.5">
              <VIcon size={18} className={`mt-0.5 shrink-0 ${v.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1 opacity-80">AI recommendation</p>
                <p className="text-sm font-semibold leading-snug">{out.verdict.text}</p>
                <p className="text-xs mt-2 leading-relaxed opacity-90">{out.narrative}</p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {out.assumptions.map((a, i) => <span key={i} className="inline-flex items-center rounded-full bg-background/60 border border-current/10 px-2 py-0.5 text-[10px] font-medium opacity-80">{a}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ COMPARE ═══════════ */
function Compare({ bundle }: { bundle: DataBundle }) {
  const [kind, setKind] = useState<EntityKind>('supplier');
  const entities = useMemo(() => listEntities(kind, bundle), [kind, bundle]);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  useEffect(() => { if (entities.length === 0) return; if (!entities.find((e) => e.id === aId)) setAId(entities[0].id); if (!entities.find((e) => e.id === bId)) setBId(entities[1]?.id || entities[0].id); }, [entities]); // eslint-disable-line
  const result = useMemo(() => (aId && bId ? compare(kind, aId, bId, bundle) : null), [kind, aId, bId, bundle]);
  const selCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">{ENTITY_KINDS.map((k) => { const Icon = KIND_ICON[k.key]; return <button key={k.key} onClick={() => setKind(k.key)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${kind === k.key ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card hover:bg-accent text-muted-foreground'}`}><Icon size={14} /> {k.label}</button>; })}</div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-primary">Entity A</label><select value={aId} onChange={(e) => setAId(e.target.value)} className={selCls}>{entities.map((e) => <option key={e.id} value={e.id}>{e.label}{e.sublabel ? ` · ${e.sublabel}` : ''}</option>)}</select></div>
        <div className="hidden sm:flex items-center justify-center h-10 w-10 rounded-full border bg-muted/40 text-muted-foreground shrink-0 mt-4"><ArrowLeftRight size={16} /></div>
        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-blue-600">Entity B</label><select value={bId} onChange={(e) => setBId(e.target.value)} className={selCls}>{entities.map((e) => <option key={e.id} value={e.id}>{e.label}{e.sublabel ? ` · ${e.sublabel}` : ''}</option>)}</select></div>
      </div>
      {!result || aId === bId ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">{aId === bId ? 'Pick two different entities to compare.' : 'Select entities to compare.'}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-3">
            <ScoreCard label={result.aLabel} wins={result.aWins} lead={result.aWins > result.bWins} tone="a" />
            <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/20 p-4"><span className="text-[10px] font-bold uppercase text-muted-foreground">Metric Wins</span><span className="text-2xl font-black">{result.aWins} <span className="text-muted-foreground text-lg">–</span> {result.bWins}</span></div>
            <ScoreCard label={result.bLabel} wins={result.bWins} lead={result.bWins > result.aWins} tone="b" />
          </div>
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="p-5 border-b flex items-center gap-2"><Lightbulb size={16} className="text-amber-500" /><h3 className="text-sm font-bold">Key Insights</h3></div>
            <div className="p-5 space-y-2.5">{result.insights.map((ins, i) => <div key={i} className="flex items-start gap-2.5 text-sm"><span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${ins.winner === 'a' ? 'bg-primary' : ins.winner === 'b' ? 'bg-blue-500' : 'bg-muted-foreground'}`} /><span>{ins.text}</span></div>)}</div>
          </div>
          {result.groups.map((g) => (
            <div key={g.group} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/20"><h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{g.group}</h4></div>
              <div className="divide-y">{g.rows.map((r) => (
                <div key={r.key} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[minmax(140px,1fr)_1fr_1fr] items-center gap-3 px-5 py-3">
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <div className={`flex items-center justify-end gap-2 rounded-md px-3 py-1.5 ${r.winner === 'a' ? 'bg-primary/10' : ''}`}>{r.winner === 'a' && <Crown size={12} className="text-primary" />}<span className={`text-sm font-bold tabular-nums ${r.winner === 'a' ? 'text-primary' : ''}`}>{r.a.display}</span></div>
                  <div className={`flex items-center justify-end gap-2 rounded-md px-3 py-1.5 ${r.winner === 'b' ? 'bg-blue-500/10' : ''}`}>{r.winner === 'b' && <Crown size={12} className="text-blue-600" />}<span className={`text-sm font-bold tabular-nums ${r.winner === 'b' ? 'text-blue-600' : ''}`}>{r.b?.display ?? '—'}</span>{r.winner && r.deltaPct > 0 && <span className="text-[10px] text-muted-foreground w-10 text-right">{r.deltaPct}%</span>}</div>
                </div>
              ))}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ScoreCard({ label, wins, lead, tone }: { label: string; wins: number; lead: boolean; tone: 'a' | 'b' }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${lead ? (tone === 'a' ? 'border-primary/40 bg-primary/5' : 'border-blue-500/40 bg-blue-500/5') : 'bg-card'}`}>
      <div className="flex items-center justify-between"><span className={`text-[10px] font-bold uppercase ${tone === 'a' ? 'text-primary' : 'text-blue-600'}`}>Entity {tone.toUpperCase()}</span>{lead && <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${tone === 'a' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-600'}`}><Crown size={9} /> Leader</span>}</div>
      <p className="text-lg font-black truncate mt-1">{label}</p>
      <p className="text-xs text-muted-foreground">{wins} metric win{wins !== 1 ? 's' : ''}</p>
    </div>
  );
}
