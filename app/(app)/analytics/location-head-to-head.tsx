'use client';

import { useMemo } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDashboardSalesSummary } from '@/hooks/use-queries';
import { useUrlState } from '@/hooks/use-url-state';
import type { InsightScopeParams } from '@/hooks/use-insights-api';
import { CHART_TOOLTIP, formatAxisMoney, formatCount, formatDate, formatMoney, formatMoneyShort, formatPercent } from '@/lib/format';
import { addDays } from '@/components/app/calendar';
import { EmptyState, FilterSelect } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AXIS_TICK, ChartEmpty, LEGEND_STYLE, Panel } from './analytics-ui';
import type { LocationRow } from './locations-tab';

/** Which way is better for a figure: more, less, or neither (a mix, not a score). */
type Better = 'higher' | 'lower' | 'none';

type FigureId = 'trend' | 'revenue' | 'change' | 'orders' | 'avg' | 'profit' | 'credit' | 'deliveries' | 'owed' | 'overdue' | 'stock' | 'lowstock';

type Figure = {
  id: Exclude<FigureId, 'trend'>;
  label: string;
  a: number | null;
  b: number | null;
  format: (n: number) => string;
  better: Better;
  /** Bars drawn to scale; off for rates that can be negative. */
  bars: boolean;
  note?: string;
};

/** Every figure someone can pick, in display order. Profit only shows for admins. */
const CHOICES: { id: FigureId; label: string; adminOnly?: boolean }[] = [
  { id: 'trend', label: 'Revenue over time' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'change', label: 'Growth vs previous' },
  { id: 'orders', label: 'Orders' },
  { id: 'avg', label: 'Average order' },
  { id: 'profit', label: 'Profit', adminOnly: true },
  { id: 'credit', label: 'Sold on credit' },
  { id: 'deliveries', label: 'Deliveries' },
  { id: 'owed', label: 'Owed now' },
  { id: 'overdue', label: 'Customers overdue' },
  { id: 'stock', label: 'Stock value' },
  { id: 'lowstock', label: 'Low or out of stock' },
];
const DEFAULT_PICK: FigureId[] = ['trend', 'revenue', 'change', 'orders', 'avg', 'owed', 'lowstock'];

const signedPct = (n: number) => `${n >= 0 ? '+' : ''}${formatPercent(n, 1)}`;

/** Daily points across the range with missing days as zero; ranges over 92 days roll up to months. */
function series(rows: { date: string; revenue: number }[], from?: string, to?: string): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.date.slice(0, 10), (byDay.get(r.date.slice(0, 10)) ?? 0) + r.revenue);
  if (!from || !to) {
    const byMonth = new Map<string, number>();
    for (const r of rows) byMonth.set(r.date.slice(0, 7), (byMonth.get(r.date.slice(0, 7)) ?? 0) + r.revenue);
    return byMonth;
  }
  const out = new Map<string, number>();
  for (let d = from, i = 0; d <= to && i < 400; d = addDays(d, 1), i++) out.set(d, byDay.get(d) ?? 0);
  if (out.size <= 92) return out;
  const months = new Map<string, number>();
  for (const [d, v] of out) months.set(d.slice(0, 7), (months.get(d.slice(0, 7)) ?? 0) + v);
  return months;
}

const pointLabel = (key: string) =>
  key.length === 7
    ? formatDate(`${key}-01T12:00:00Z`, { month: 'short', year: '2-digit' })
    : formatDate(`${key}T12:00:00Z`, { day: 'numeric', month: 'short' });

/**
 * Two locations side by side on the figures someone picks: one card per figure with both values
 * to scale and which one leads, plus revenue over time as an optional chart. The pair and the
 * picked figures live in the URL (?loc_a=&loc_b=&figures=), so a comparison can be shared.
 */
export function LocationHeadToHead({ rows, scope, showProfit, loading }: Readonly<{
  rows: LocationRow[];
  scope: InsightScopeParams;
  showProfit: boolean;
  loading: boolean;
}>) {
  const { get, set } = useUrlState();
  const ranked = useMemo(() => [...rows].sort((x, y) => y.revenue - x.revenue), [rows]);
  const pick = (key: 'loc_a' | 'loc_b', fallback: LocationRow | undefined) => rows.find((r) => r.id === get(key)) ?? fallback;
  const a = pick('loc_a', ranked[0]);
  const b = pick('loc_b', ranked.find((r) => r.id !== a?.id));

  const choices = CHOICES.filter((c) => showProfit || !c.adminOnly);
  const raw = get('figures');
  const picked = new Set<FigureId>(
    raw == null ? DEFAULT_PICK : raw.split(',').filter((id): id is FigureId => choices.some((c) => c.id === id)),
  );
  const toggle = (id: FigureId, on: boolean) => {
    const next = choices.map((c) => c.id).filter((c) => (c === id ? on : picked.has(c)));
    set({ figures: next.join(',') || 'none' });
  };
  const showTrend = picked.has('trend');

  const allTime = scope.period === 'all';
  const from = allTime ? undefined : scope.date_from;
  const to = allTime ? undefined : scope.date_to;
  const granularity = allTime ? 'all' : 'month';
  const trendA = useDashboardSalesSummary(granularity, { date_from: from, date_to: to, hub_id: a?.id }, { enabled: !!a && showTrend });
  const trendB = useDashboardSalesSummary(granularity, { date_from: from, date_to: to, hub_id: b?.id }, { enabled: !!b && showTrend });
  const rowsA = trendA.data?.trend;
  const rowsB = trendB.data?.trend;

  const chart = useMemo(() => {
    const sa = series(rowsA ?? [], from, to);
    const sb = series(rowsB ?? [], from, to);
    const keys = [...new Set([...sa.keys(), ...sb.keys()])].sort();
    return keys.map((k) => ({ key: k, label: pointLabel(k), a: sa.get(k) ?? 0, b: sb.get(k) ?? 0 }));
  }, [rowsA, rowsB, from, to]);

  if (!loading && rows.length < 2) {
    return (
      <Panel title="Head to head" subtitle="Two locations side by side">
        <EmptyState size="compact" title="Only one location" description="Head to head needs at least two active locations you can see." />
      </Panel>
    );
  }

  const options = rows.map((r) => ({ value: r.id, label: r.name }));
  const swap = () => set({ loc_a: b?.id, loc_b: a?.id });
  const choose = (key: 'loc_a' | 'loc_b', id: string) => {
    // Picking the location already on the other side swaps them, so the two never match.
    const other = key === 'loc_a' ? b : a;
    if (other && id === other.id) swap();
    else set({ [key]: id });
  };

  const all: Figure[] = a && b ? [
    { id: 'revenue', label: 'Revenue', a: a.revenue, b: b.revenue, format: formatMoneyShort, better: 'higher', bars: true },
    { id: 'change', label: 'Growth vs previous period', a: a.change, b: b.change, format: signedPct, better: 'higher', bars: false, note: allTime ? 'No previous period for All time' : undefined },
    { id: 'orders', label: 'Orders', a: a.orders, b: b.orders, format: formatCount, better: 'higher', bars: true },
    { id: 'avg', label: 'Average order', a: a.orders ? a.avgOrder : null, b: b.orders ? b.avgOrder : null, format: formatMoneyShort, better: 'higher', bars: true },
    { id: 'profit', label: 'Profit', a: a.profit, b: b.profit, format: formatMoneyShort, better: 'higher', bars: true },
    { id: 'credit', label: 'Share sold on credit', a: a.creditShare, b: b.creditShare, format: (n: number) => formatPercent(n), better: 'none', bars: true },
    { id: 'deliveries', label: 'Deliveries', a: a.deliveries, b: b.deliveries, format: formatCount, better: 'higher', bars: true },
    { id: 'owed', label: 'Credit owed now', a: a.owed, b: b.owed, format: formatMoneyShort, better: 'lower', bars: true },
    { id: 'overdue', label: 'Customers overdue', a: a.overdueCustomers, b: b.overdueCustomers, format: formatCount, better: 'lower', bars: true },
    { id: 'stock', label: 'Stock value now', a: a.stockValue, b: b.stockValue, format: formatMoneyShort, better: 'none', bars: true },
    { id: 'lowstock', label: 'Products low or out of stock', a: a.lowStock + a.outOfStock, b: b.lowStock + b.outOfStock, format: formatCount, better: 'lower', bars: true },
  ] : [];
  const figures = all.filter((f) => picked.has(f.id));
  const scored = figures.filter((f) => leader(f) != null);
  const aAhead = scored.filter((f) => leader(f) === 'a').length;
  const trendLoading = trendA.isPending || trendB.isPending;

  return (
    <Panel title="Head to head" subtitle="Pick two locations and the figures you want to compare">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <SideDot side="a" />
            <FilterSelect ariaLabel="First location" size="compact" value={a?.id ?? ''} onChange={(id) => choose('loc_a', id)} options={options} className="w-full min-w-0 sm:w-48" />
          </span>
          <Button variant="outline" size="icon" onClick={swap} aria-label="Swap the two locations" disabled={!a || !b}>
            <ArrowLeftRight aria-hidden />
          </Button>
          <span className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <SideDot side="b" />
            <FilterSelect ariaLabel="Second location" size="compact" value={b?.id ?? ''} onChange={(id) => choose('loc_b', id)} options={options} className="w-full min-w-0 sm:w-48" />
          </span>
        </div>

        <fieldset className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <legend className="text-xs font-medium text-muted-foreground">Figures to compare</legend>
            <span className="flex gap-1">
              <Button variant="ghost" size="xs" onClick={() => set({ figures: choices.map((c) => c.id).join(',') })}>Select all</Button>
              <Button variant="ghost" size="xs" onClick={() => set({ figures: null })}>Reset</Button>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {choices.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer select-none items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-2.5 text-sm hover:bg-muted has-data-checked:border-primary/50 has-data-checked:bg-primary/5"
              >
                <Checkbox checked={picked.has(c.id)} onCheckedChange={(on) => toggle(c.id, on === true)} />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        {loading || !a || !b ? (
          <Skeleton className="h-64 w-full" />
        ) : picked.size === 0 ? (
          <EmptyState size="compact" title="No figures picked" description="Tick one or more figures above to compare the two locations." />
        ) : (
          <>
            {figures.length > 0 && (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={`${a.name} against ${b.name}`}>
                {figures.map((f) => <FigureCard key={f.id} f={f} aName={a.name} bName={b.name} />)}
              </ul>
            )}

            {showTrend && (
              <div className="rounded-xl border p-4">
                <p className="mb-2 text-sm font-medium">Revenue over time</p>
                <div className="h-64">
                  {trendLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : chart.some((p) => p.a > 0 || p.b > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} minTickGap={24} dy={6} />
                        <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={56} tickFormatter={(v) => formatAxisMoney(Number(v))} />
                        <Tooltip {...CHART_TOOLTIP} formatter={(v, name) => [formatMoney(Number(v)), name === 'a' ? a.name : b.name]} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ ...LEGEND_STYLE, paddingTop: 8 }} formatter={(v) => (v === 'a' ? a.name : b.name)} />
                        <Line type="monotone" dataKey="a" name="a" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                        <Line type="monotone" dataKey="b" name="b" stroke="var(--series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmpty text="Neither location sold anything in this period" />
                  )}
                </div>
              </div>
            )}

            {scored.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {aAhead * 2 === scored.length
                  ? `Level: each location is ahead on ${formatCount(aAhead)} of the ${formatCount(scored.length)} figures picked.`
                  : `${aAhead * 2 > scored.length ? a.name : b.name} is ahead on ${formatCount(Math.max(aAhead, scored.length - aAhead))} of the ${formatCount(scored.length)} figures picked that have a better side.`}
              </p>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}

function leader(f: Figure): 'a' | 'b' | null {
  if (f.better === 'none' || f.a == null || f.b == null || f.a === f.b) return null;
  return (f.better === 'higher') === (f.a > f.b) ? 'a' : 'b';
}

/** One figure for both locations: each value with a bar to the same scale, then who leads and by how much. */
function FigureCard({ f, aName, bName }: Readonly<{ f: Figure; aName: string; bName: string }>) {
  const lead = leader(f);
  const hi = Math.max(Math.abs(f.a ?? 0), Math.abs(f.b ?? 0));
  const lo = Math.min(Math.abs(f.a ?? 0), Math.abs(f.b ?? 0));
  // Higher is better: how much more the leader has. Lower is better: how much less, against the larger.
  const gap = !lead || !f.bars || hi <= 0 ? null
    : f.better === 'lower' ? Math.round((1 - lo / hi) * 100)
      : lo > 0 ? Math.round((hi / lo - 1) * 100) : null;
  const leadName = lead === 'a' ? aName : lead === 'b' ? bName : null;
  const verdict = f.note
    ?? (leadName ? `${leadName} ${f.better === 'lower' ? 'is lower' : 'leads'}${gap != null ? ` by ${formatCount(gap)}%` : ''}` : f.better === 'none' ? 'Not scored: neither side is better' : 'Level');

  const side = (name: string, value: number | null, which: 'a' | 'b') => (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <SideDot side={which} />
          <span className="truncate">{name}</span>
        </span>
        <span className={cn('shrink-0 tabular-nums', lead === which ? 'font-semibold' : 'text-muted-foreground')}>{value == null ? '-' : f.format(value)}</span>
      </div>
      {f.bars && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className={cn('h-full rounded-full', which === 'a' ? 'bg-series-1' : 'bg-series-2')} style={{ width: `${hi > 0 ? (Math.abs(value ?? 0) / hi) * 100 : 0}%` }} />
        </div>
      )}
    </div>
  );

  return (
    <li className="space-y-3 rounded-xl border p-4">
      <p className="text-sm font-medium">{f.label}</p>
      <div className="space-y-2.5">
        {side(aName, f.a, 'a')}
        {side(bName, f.b, 'b')}
      </div>
      <p className="text-xs text-muted-foreground">{verdict}</p>
    </li>
  );
}

function SideDot({ side }: Readonly<{ side: 'a' | 'b' }>) {
  return <span aria-hidden className={cn('size-2 shrink-0 rounded-full', side === 'a' ? 'bg-series-1' : 'bg-series-2')} />;
}
