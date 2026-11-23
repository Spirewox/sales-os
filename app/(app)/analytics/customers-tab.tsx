'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsOverviewData } from '@/types/api';
import { CHART_TOOLTIP, formatAxisMoney, formatCount, formatMoney, formatMoneyShort, plural } from '@/lib/format';
import type { Period } from '@/lib/period';
import { DataTable, KpiStrip, StatusBadge, type Column, type KpiCell } from '@/components/app';
import {
  AXIS_TICK, BAR_CURSOR, ChartEmpty, Panel, RankedBars, Seg, SourceNote, TabLayout, TwoCol,
  effectiveGrain, grainOptions, type Grain,
} from './analytics-ui';

type CustomersData = AnalyticsOverviewData['customers'];
type CustomerRow = { id: string; name: string; type: string; totalOrders: number; totalSpent: number };

export function CustomersTab({ data, period }: Readonly<{ data: CustomersData; period: Period }>) {
  const router = useRouter();
  const { kpis, acquisitionTrend, acquisitionWeeklyTrend, clvDistribution, buyerAnalysis, topSpenders, repeatCustomers, concentration, segmentData } = data;

  const grains = grainOptions(period, ['week', 'month']);
  const [chosenGrain, setChosenGrain] = useState<Grain | null>(null);
  const acqGrain = effectiveGrain(chosenGrain, grains, 'month');
  const acqSeries = acqGrain === 'week' && acquisitionWeeklyTrend.length ? acquisitionWeeklyTrend : acquisitionTrend;
  const [clvMetric, setClvMetric] = useState<'count' | 'revenue'>('count');
  const [segMetric, setSegMetric] = useState<'revenue' | 'customers'>('revenue');
  // New per bucket, or the running total (the old chart drew both on two axes; one at a time here).
  const [acqMetric, setAcqMetric] = useState<'new' | 'total'>('new');
  // The old tab had two lists: top spenders and repeat customers. Both are back behind this toggle.
  const [list, setList] = useState<'all' | 'spenders' | 'repeat'>('all');

  const hasCustomers = kpis.totalCustomers > 0;
  const cells: KpiCell[] = [
    { label: 'Customers', value: formatCount(kpis.totalCustomers), href: '/customers', detail: 'On record' },
    { label: 'Average lifetime value', value: hasCustomers ? formatMoneyShort(kpis.avgLifetimeValue) : '-', detail: 'Lifetime spend' },
    { label: 'Repeat rate', value: `${kpis.repeatRate}%`, detail: '2 or more orders, lifetime' },
    { label: 'Top 20% share', value: `${concentration.top20Pct}%`, detail: `Of lifetime revenue, from ${plural(concentration.top20Count, 'customer')}` },
  ];

  const buyerRows = buyerAnalysis.filter((b) => b.value > 0).sort((a, b) => b.value - a.value).map((b) => ({ key: b.name, label: b.name, value: b.value }));
  const segRows = segmentData
    .map((s) => ({ name: s.name, customers: s.customers ?? s.value ?? 0, revenue: s.revenue ?? 0 }))
    .sort((a, b) => b[segMetric] - a[segMetric])
    .map((s) => ({ key: s.name, label: s.name, value: s[segMetric], detail: segMetric === 'revenue' ? plural(s.customers, 'customer') : formatMoneyShort(s.revenue) }));

  // Top spenders and most frequent buyers, one row per customer.
  const customers = useMemo(() => {
    if (list === 'spenders') return topSpenders;
    if (list === 'repeat') return repeatCustomers;
    const byId = new Map<string, CustomerRow>();
    for (const c of [...topSpenders, ...repeatCustomers]) if (!byId.has(c.id)) byId.set(c.id, c);
    return [...byId.values()];
  }, [topSpenders, repeatCustomers, list]);

  const columns: Column<CustomerRow>[] = [
    { id: 'name', header: 'Customer', mobile: 'title', cell: (c) => c.name, sortValue: (c) => c.name.toLowerCase() },
    { id: 'type', header: 'Type', mobile: 'meta', cell: (c) => <StatusBadge tone="neutral">{c.type}</StatusBadge>, sortValue: (c) => c.type },
    { id: 'orders', header: 'Orders', align: 'right', mobile: 'subtitle', cell: (c) => plural(c.totalOrders ?? 0, 'order'), sortValue: (c) => c.totalOrders ?? 0 },
    { id: 'aov', header: 'Average order', align: 'right', cell: (c) => (c.totalOrders ? formatMoney(c.totalSpent / c.totalOrders) : '-'), sortValue: (c) => (c.totalOrders ? c.totalSpent / c.totalOrders : 0), hideBelow: 'lg' },
    { id: 'spent', header: 'Lifetime spend', align: 'right', mobile: 'value', cell: (c) => formatMoney(c.totalSpent), sortValue: (c) => c.totalSpent },
  ];

  return (
    <TabLayout>
      <KpiStrip cells={cells} label="Customer figures" />

      <Panel
        title="Customer acquisition"
        subtitle={`${acqMetric === 'new' ? 'New customers' : 'Customers in total'} ${acqGrain === 'week' ? 'per week' : 'per month'}${acqSeries.length ? `, ${formatCount(acqSeries[acqSeries.length - 1].total)} in total by the end` : ''}`}
        control={
          <>
            <Seg label="Acquisition metric" value={acqMetric} onChange={setAcqMetric} options={[['new', 'New'], ['total', 'Running total']]} />
            <Seg label="Acquisition grain" value={acqGrain} onChange={(g) => setChosenGrain(g)} options={grains} />
          </>
        }
        bodyClassName="h-[300px]"
      >
        {acqSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={acqSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} minTickGap={16} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={40} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP} cursor={BAR_CURSOR} formatter={(v) => formatCount(Number(v))} />
              {/* One series, one axis: new customers or the running total, picked above. */}
              {acqMetric === 'new' ? (
                <Bar dataKey="new" name="New customers" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={16} />
              ) : (
                <Line type="monotone" dataKey="total" name="Customers in total" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty text="No new customers in this period" />
        )}
      </Panel>

      <TwoCol>
        <Panel
          title="Lifetime value"
          subtitle={clvMetric === 'count' ? 'Customers per lifetime spend band' : 'Lifetime revenue per spend band'}
          control={<Seg label="Lifetime value metric" value={clvMetric} onChange={setClvMetric} options={[['count', 'Customers'], ['revenue', 'Revenue']]} />}
          bodyClassName="h-[280px]"
        >
          {clvDistribution.some((b) => b.count > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clvDistribution} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={56} tickFormatter={(v) => (clvMetric === 'revenue' ? formatAxisMoney(Number(v)) : formatCount(Number(v)))} />
                <Tooltip {...CHART_TOOLTIP} cursor={BAR_CURSOR} formatter={(v) => (clvMetric === 'revenue' ? formatMoney(Number(v)) : formatCount(Number(v)))} />
                <Bar dataKey={clvMetric} name={clvMetric === 'count' ? 'Customers' : 'Revenue'} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty text="No customer spend yet" />
          )}
        </Panel>

        <Panel title="Buyer engagement tiers" subtitle="Customers in each tier">
          <RankedBars rows={buyerRows} format={formatCount} emptyText="No customers yet" />
        </Panel>

        {segRows.length > 0 && (
          <Panel
            className="lg:col-span-2"
            title="Segments"
            subtitle={segMetric === 'revenue' ? 'Lifetime revenue by segment' : 'Customers by segment'}
            control={<Seg label="Segment metric" value={segMetric} onChange={setSegMetric} options={[['revenue', 'Revenue'], ['customers', 'Customers']]} />}
          >
            <RankedBars rows={segRows} format={segMetric === 'revenue' ? formatMoneyShort : formatCount} showShare={segMetric === 'revenue'} />
          </Panel>
        )}
      </TwoCol>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Top customers</h3>
            <p className="text-xs text-muted-foreground">
              {list === 'spenders' ? 'Ranked by lifetime spend.' : list === 'repeat' ? 'Customers with the most orders (repeat buyers), lifetime.' : 'Biggest spenders and most frequent buyers, lifetime.'} Select one to open it.
            </p>
          </div>
          <Seg label="Customer list" value={list} onChange={setList} options={[['all', 'Both'], ['spenders', 'Top spenders'], ['repeat', 'Repeat buyers']]} />
          <Link href="/customers" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            All customers <ChevronRight size={14} aria-hidden />
          </Link>
        </div>
        <DataTable
          key={list}
          label="Top customers"
          columns={columns}
          rows={customers}
          getRowId={(c) => c.id}
          defaultSort={{ id: list === 'repeat' ? 'orders' : 'spent', dir: 'desc' }}
          onRowClick={(c) => router.push(`/customers?customer=${encodeURIComponent(c.id)}`)}
          pageSize={10}
          empty={<p className="px-4 py-8 text-center text-sm text-muted-foreground">No customers with purchases yet</p>}
        />
      </div>

      <SourceNote>Acquisition counts a customer from their first purchase. Lifetime figures cover all time, whatever the period.</SourceNote>
    </TabLayout>
  );
}
