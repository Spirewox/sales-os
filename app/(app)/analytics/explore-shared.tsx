'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_TOOLTIP, formatAxisMoney, formatCount, formatMoney, formatMoneyShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AXIS_TICK, BAR_CURSOR, RankedBars } from './analytics-ui';

export type ResultRow = { key: string; label: string; value: number };
export type ValueKind = 'money' | 'number';
/** No pie: part-of-whole breakdowns show as a ranked bar list with shares. */
export type ChartKind = 'column' | 'bar' | 'line' | 'table';
export const CHART_KINDS: [ChartKind, string][] = [['column', 'Columns'], ['bar', 'Ranked bars'], ['line', 'Line'], ['table', 'Table']];

/** The Ask API may still suggest a pie; show it as ranked bars. */
export const toChartKind = (c: string): ChartKind => (c === 'pie' ? 'bar' : (CHART_KINDS.some(([k]) => k === c) ? (c as ChartKind) : 'column'));

export const fmtShort = (v: number, kind: ValueKind) => (kind === 'money' ? formatMoneyShort(v) : formatCount(v));
export const fmtExact = (v: number, kind: ValueKind) => (kind === 'money' ? formatMoney(v) : formatCount(v));
const fmtAxis = (v: number, kind: ValueKind) => (kind === 'money' ? formatAxisMoney(v) : formatCount(v));

export const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring';

export function ResultChart({ rows, chart, measureLabel, measureKind, groupLabel }: Readonly<{ rows: ResultRow[]; chart: ChartKind; measureLabel: string; measureKind: ValueKind; groupLabel: string }>) {
  if (rows.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Nothing matches. Try fewer filters or a longer period.</p>;
  if (chart === 'table') return <ResultTable rows={rows} kind={measureKind} label={groupLabel} />;
  if (chart === 'bar') return <RankedBars rows={rows} format={(n) => fmtShort(n, measureKind)} limit={12} />;
  // A line is a timeline: every point stays. Columns show the top 12.
  const capped = chart !== 'line' && rows.length > 12;
  const data = chart === 'line' ? rows : rows.slice(0, 12);
  const tooltipFormat = (v: unknown) => fmtExact(Number(v), measureKind);
  return (
    <>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          {chart === 'line' ? (
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtAxis(Number(v), measureKind)} />
              <Tooltip {...CHART_TOOLTIP} formatter={tooltipFormat} />
              <Line type="monotone" dataKey="value" name={measureLabel} stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, fill: 'var(--chart-1)' }} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={64} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtAxis(Number(v), measureKind)} />
              <Tooltip {...CHART_TOOLTIP} cursor={BAR_CURSOR} formatter={tooltipFormat} />
              <Bar dataKey="value" name={measureLabel} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {capped && <p className="mt-2 text-center text-xs text-muted-foreground tabular-nums">Showing the top 12 of {rows.length}</p>}
    </>
  );
}

function ResultTable({ rows, kind, label }: Readonly<{ rows: ResultRow[]; kind: ValueKind; label: string }>) {
  const total = rows.reduce((a, r) => a + r.value, 0);
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 text-left font-medium">{label}</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Value</th>
            <th scope="col" className="w-16 px-4 py-2 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-4 py-2 font-medium">{r.label}</td>
              <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmtExact(r.value, kind)}</td>
              <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">{total > 0 ? Math.round((r.value / total) * 100) : 0}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t">
            <td className="px-4 py-2 font-medium text-muted-foreground">Total</td>
            <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmtExact(total, kind)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function Pending({ text }: Readonly<{ text: string }>) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground" role="status">
      <Loader2 className="animate-spin" size={16} aria-hidden /> {text}
    </div>
  );
}

/** Two panes on desktop (controls left, results right); results first on phones. */
export function TwoPane({ controls, results, className }: Readonly<{ controls: ReactNode; results: ReactNode; className?: string }>) {
  return (
    <div className={cn('grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(280px,340px)_1fr]', className)}>
      <div className="order-2 min-w-0 space-y-4 lg:order-1">{controls}</div>
      <div className="order-1 min-w-0 space-y-4 lg:order-2">{results}</div>
    </div>
  );
}

export function Chip({ children, onClick, disabled }: Readonly<{ children: ReactNode; onClick: () => void; disabled?: boolean }>) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="w-full rounded-md border bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50">
      {children}
    </button>
  );
}

/**
 * A short list of example prompts with the rest behind "More examples", so every example the old
 * Insights page offered is still one click away.
 */
export function ExampleList({ title, featured, all, onPick, disabled }: Readonly<{ title: string; featured: string[]; all: readonly string[]; onPick: (q: string) => void; disabled?: boolean }>) {
  const [open, setOpen] = useState(false);
  const rest = all.filter((x) => !featured.includes(x));
  const shown = open ? [...featured, ...rest] : featured;
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 space-y-2">
        {shown.map((ex) => <Chip key={ex} onClick={() => onPick(ex)} disabled={disabled}>{ex}</Chip>)}
      </div>
      {rest.length > 0 && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          {open ? 'Fewer examples' : `More examples (${rest.length})`}
          <ChevronDown size={14} aria-hidden className={open ? 'rotate-180' : ''} />
        </button>
      )}
    </section>
  );
}

/* Recent questions: kept in this browser only (localStorage), at most 5. */
const RECENT_KEY = 'fudfarmer_explore_recent';
const RECENT_MAX = 5;
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let recentCache: string[] | null = null;

function readRecent(): string[] {
  if (recentCache) return recentCache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    recentCache = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    recentCache = [];
  }
  return recentCache;
}

function writeRecent(next: string[]) {
  recentCache = next;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode or storage full: keep the in-memory list */
  }
  listeners.forEach((l) => l());
}

export function addRecentQuestion(question: string) {
  const q = question.trim();
  if (!q) return;
  writeRecent([q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX));
}

export const clearRecentQuestions = () => writeRecent([]);

export function useRecentQuestions(): string[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    readRecent,
    () => EMPTY,
  );
}
