'use client';

import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useKitchenAnalytics, type KitchenAnalytics } from '@/hooks/use-kitchen';
import { pct } from '@/lib/kitchen-types';
import { CHART_TOOLTIP, formatAxisMoney, formatMoney, formatMoneyShort, plural } from '@/lib/format';
import { AnalyticsPageSkeleton } from '@/components/ui/loading-skeletons';
import { DataTable, EmptyState, KpiStrip, type Column, type KpiCell } from '@/components/app';
import {
  AXIS_TICK, BAR_CURSOR, LEGEND_STYLE, Panel, RankedBars, SourceNote, TabLayout, TwoCol, pctChange,
} from '@/app/(app)/analytics/analytics-ui';

type Scope = { hub_id?: string; period?: string; date_from?: string; date_to?: string };
type Outlet = KitchenAnalytics['by_outlet'][number];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (ym: string) => `${MONTHS.at(Number(ym.slice(5, 7)) - 1)} ${ym.slice(2, 4)}`;
const minutes = (m: number | null) => (m == null ? '-' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`);

export function KitchenAnalyticsTab({ scope, prevScope }: Readonly<{ scope: Scope; prevScope?: Scope | null }>) {
  const q = useKitchenAnalytics(scope);
  const prev = useKitchenAnalytics(prevScope ?? {}, { enabled: !!prevScope });
  if (q.isPending) return <AnalyticsPageSkeleton />;
  if (q.isError) return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">{q.error.message}</p>;
  const a = q.data;
  const showCosts = a.completed.profit !== undefined;
  const costed = a.completed.costed_jobs > 0;
  const months = a.by_month.map((m) => ({ ...m, label: monthLabel(m.month) }));

  if (!a.completed.jobs && !a.quotes.sent && !a.cancelled.jobs) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState title="No kitchen activity in this period" description="No kitchen jobs were completed, quoted or cancelled. Try a longer period." action={<Link href="/kitchen?tab=jobs" className="text-sm font-medium text-primary hover:underline">Open kitchen jobs</Link>} />
      </div>
    );
  }

  const revChange = prevScope ? pctChange(a.completed.revenue, prev.data?.completed.revenue) : null;
  const cells: KpiCell[] = [
    { label: 'Kitchen revenue', value: formatMoneyShort(a.completed.revenue), change: revChange == null ? null : { pct: revChange }, detail: `${plural(a.completed.jobs, 'completed job')}, average ${formatMoneyShort(a.completed.average)}` },
    showCosts
      ? { label: 'Profit', value: costed ? formatMoneyShort(a.completed.profit) : '-', detail: costed ? `${pct(a.completed.margin)} margin on ${plural(a.completed.costed_jobs, 'costed job')}` : 'No costed jobs yet' }
      : { label: 'Time to accept', value: minutes(a.time_to_accept.median_minutes), detail: a.time_to_accept.jobs ? `Median of ${a.time_to_accept.jobs} jobs` : 'No accepted jobs yet' },
    { label: 'Still owed', value: formatMoneyShort(a.completed.owed), tone: a.completed.owed > 0 ? 'warning' : 'default', detail: `${formatMoneyShort(a.completed.collected)} collected` },
    { label: 'Quotes turned into orders', value: pct(a.quotes.conversion_rate), detail: `${a.quotes.converted} of ${a.quotes.sent} sent` },
  ];

  // Second strip (cost views only): the old Food cost tile, and how much of the work is costed.
  const costCells: KpiCell[] = showCosts
    ? [
        { label: 'Food cost', value: costed ? pct(a.completed.food_cost_pct) : '-', tone: costed && (a.completed.food_cost_pct ?? 0) > 0.3 ? 'warning' : 'default', detail: costed ? 'Of the price, costed jobs (target 30%)' : 'Needs jobs priced from recipes' },
        { label: 'Costed jobs', value: `${a.completed.costed_jobs} of ${a.completed.jobs}`, detail: 'Completed jobs with a recipe cost' },
      ]
    : [];

  const channels = [...a.by_channel].sort((x, y) => y.revenue - x.revenue).map((c) => ({ key: c.channel, label: c.channel, value: c.revenue, detail: plural(c.jobs, 'job') }));
  const outletColumns: Column<Outlet>[] = [
    { id: 'name', header: 'Outlet', mobile: 'title', cell: (o) => o.name, sortValue: (o) => o.name.toLowerCase() },
    { id: 'jobs', header: 'Jobs', align: 'right', mobile: 'subtitle', cell: (o) => plural(o.jobs, 'job'), sortValue: (o) => o.jobs },
    ...(showCosts ? [{ id: 'profit', header: 'Profit', align: 'right' as const, mobile: 'meta' as const, cell: (o: Outlet) => (costed ? formatMoney(o.profit) : '-'), sortValue: (o: Outlet) => o.profit ?? 0 }] : []),
    { id: 'revenue', header: 'Revenue', align: 'right', mobile: 'value', cell: (o) => formatMoney(o.revenue), sortValue: (o) => o.revenue },
  ];

  return (
    <TabLayout>
      <KpiStrip cells={cells} label="Kitchen figures" />
      {costCells.length > 0 && <KpiStrip cells={costCells} label="Kitchen costs" />}

      <Panel
        title={showCosts ? 'Revenue and profit by month' : 'Revenue by month'}
        subtitle={`Completed kitchen jobs by completion month${showCosts ? '; profit counts costed jobs only' : ''}`}
        bodyClassName="h-[280px]"
      >
        {months.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={(v) => formatAxisMoney(Number(v))} width={56} />
              <Tooltip {...CHART_TOOLTIP} cursor={BAR_CURSOR} formatter={(value, name) => [formatMoney(Number(value)), name]} />
              {showCosts && <Legend iconType="circle" iconSize={8} wrapperStyle={{ ...LEGEND_STYLE, paddingTop: 8 }} />}
              <Bar dataKey="revenue" name="Revenue" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              {showCosts && <Bar dataKey="profit" name="Profit" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={32} />}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No completed jobs in this period</p>
        )}
      </Panel>

      <TwoCol>
        <Panel title="By channel" subtitle="Revenue from completed jobs">
          <RankedBars rows={channels} format={formatMoneyShort} emptyText="No completed jobs" />
        </Panel>
        <Panel title="Quotes and response" subtitle="How quickly jobs are accepted and how quotes end">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Time to accept (median)</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{minutes(a.time_to_accept.median_minutes)}</dd>
              <dd className="text-xs text-muted-foreground">{a.time_to_accept.jobs ? `Average ${minutes(a.time_to_accept.average_minutes)}` : 'No accepted jobs yet'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Quotes sent</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{a.quotes.sent}</dd>
              <dd className="text-xs text-muted-foreground">{a.quotes.converted} ordered, {a.quotes.declined} declined, {a.quotes.expired} expired</dd>
            </div>
          </dl>
          {a.cancelled.jobs > 0 && (
            <div className="mt-5 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">{plural(a.cancelled.jobs, 'cancelled job')}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {a.cancelled.top_reasons.map((r) => (
                  <li key={r.reason} className="flex justify-between gap-4"><span>{r.reason}</span><span className="tabular-nums text-muted-foreground">{r.jobs}</span></li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </TwoCol>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">By outlet</h3>
        <DataTable
          label="Kitchen jobs by outlet"
          columns={outletColumns}
          rows={a.by_outlet}
          getRowId={(o) => o.hub}
          defaultSort={{ id: 'revenue', dir: 'desc' }}
          empty={<p className="px-4 py-8 text-center text-sm text-muted-foreground">No completed jobs</p>}
        />
      </div>

      <SourceNote>
        Kitchen jobs also post to Sales when completed, so they are included in the Sales tab too.{' '}
        <Link href="/kitchen?tab=jobs" className="text-primary hover:underline">Open kitchen jobs</Link>
      </SourceNote>
    </TabLayout>
  );
}
