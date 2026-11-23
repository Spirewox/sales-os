'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsOverviewData } from '@/types/api';
import { PaymentMode } from '@/types';
import { CHART_TOOLTIP, formatAxisMoney, formatCount, formatMoney, formatMoneyShort, plural } from '@/lib/format';
import type { Period } from '@/lib/period';
import { DataTable, KpiStrip, type Column, type KpiCell } from '@/components/app';
import {
  AXIS_TICK, BAR_CURSOR, ChartEmpty, Panel, RankedBars, Seg, SourceNote, TabLayout, TwoCol,
  effectiveGrain, grainOptions, pctChange, type Grain,
} from './analytics-ui';

type SalesData = AnalyticsOverviewData['sales'];
type TrendRow = SalesData['monthlyTrend'][number];

const PAYMENT_MODE_LABEL: Record<string, string> = {
  [PaymentMode.FULL_PAYMENT]: 'Paid in full',
  [PaymentMode.FULL_CREDIT]: 'Credit',
  [PaymentMode.PARTIAL_CREDIT]: 'Part paid',
};

const signedPct = (n: number) => `${n > 0 ? '+' : ''}${n}%`;
const ordersIn = (d: SalesData) => d.monthlyTrend.reduce((s, m) => s + m.orders, 0);

export function SalesTab({ data, previous, period, hasPrevious }: Readonly<{ data: SalesData; previous?: SalesData; period: Period; hasPrevious: boolean }>) {
  const { monthlyTrend, weeklyTrend, dailyTrend, growth, dayOfWeekPattern, channelBreakdown, paymentModeSplit, paymentTypeSplit, collectedVsOutstanding, aovTrend, aovWeeklyTrend, totalRevenue } = data;

  const grains = grainOptions(period);
  const [chosenGrain, setChosenGrain] = useState<Grain | null>(null);
  const [drillMonth, setDrillMonth] = useState<string | null>(null);
  const [dowMetric, setDowMetric] = useState<'avgRevenue' | 'revenue' | 'orders'>('avgRevenue');
  const [chanMetric, setChanMetric] = useState<'revenue' | 'count'>('revenue');
  const [payView, setPayView] = useState<'mode' | 'type'>('mode');

  const grain = effectiveGrain(chosenGrain, grains, 'day');
  // A month drill only makes sense while the chart shows months.
  const drill = grain === 'month' ? drillMonth : null;
  const effGrain: Grain = drill ? 'day' : grain;
  const trend: TrendRow[] = useMemo(() => {
    if (drill) return dailyTrend.filter((d) => (d.key ?? '').startsWith(drill));
    return effGrain === 'day' ? dailyTrend : effGrain === 'week' ? weeklyTrend : monthlyTrend;
  }, [drill, effGrain, dailyTrend, weeklyTrend, monthlyTrend]);

  // Average order has its own week / month choice, as before; it starts on the coarsest the period allows.
  const aovGrains = grainOptions(period, ['week', 'month']).filter(([g]) => g !== 'week' || aovWeeklyTrend.length > 0);
  const [chosenAovGrain, setChosenAovGrain] = useState<Grain | null>(null);
  const aovGrain = effectiveGrain(chosenAovGrain, aovGrains, 'month');
  const aovSeries = aovGrain === 'week' && aovWeeklyTrend.length ? aovWeeklyTrend : aovTrend;

  const orders = ordersIn(data);
  const aov = orders > 0 ? totalRevenue / orders : 0;
  const prevOrders = previous ? ordersIn(previous) : undefined;
  const prevAov = previous && prevOrders ? previous.totalRevenue / prevOrders : undefined;
  const change = (curr: number, prev: number | undefined) => {
    const pct = hasPrevious ? pctChange(curr, prev) : null;
    return pct == null ? null : { pct };
  };

  const kpis: KpiCell[] = [
    { label: 'Revenue', value: formatMoneyShort(totalRevenue), change: change(totalRevenue, previous?.totalRevenue), detail: !hasPrevious ? 'All time' : undefined },
    { label: 'Orders', value: formatCount(orders), change: change(orders, prevOrders) },
    { label: 'Average order', value: orders ? formatMoneyShort(aov) : '-', change: orders ? change(aov, prevAov) : null },
    {
      label: 'Collected',
      value: formatMoneyShort(collectedVsOutstanding.collected),
      detail: collectedVsOutstanding.outstanding > 0 ? `${formatMoneyShort(collectedVsOutstanding.outstanding)} still owed` : 'Nothing owed',
      href: collectedVsOutstanding.outstanding > 0 ? '/credits' : undefined,
    },
  ];

  // Month over month: the latest month against the one before, whatever the period (the old growth banner).
  const growthCells: KpiCell[] = growth
    ? [
        { label: 'Revenue growth', value: signedPct(growth.revGrowth), tone: growth.revGrowth > 0 ? 'good' : growth.revGrowth < 0 ? 'danger' : 'default', detail: `Month on month, ${growth.currMonth} vs ${growth.prevMonth}` },
        { label: 'Order growth', value: signedPct(growth.orderGrowth), tone: growth.orderGrowth > 0 ? 'good' : growth.orderGrowth < 0 ? 'danger' : 'default', detail: `Month on month, ${growth.currMonth} vs ${growth.prevMonth}` },
      ]
    : [];

  const isMoneyDow = dowMetric !== 'orders';
  const channelRows = [...channelBreakdown]
    .sort((a, b) => (chanMetric === 'revenue' ? b.revenue - a.revenue : b.count - a.count))
    .map((c) => ({ key: c.name, label: c.name, value: chanMetric === 'revenue' ? c.revenue : c.count, detail: chanMetric === 'revenue' ? plural(c.count, 'order') : formatMoneyShort(c.revenue) }));
  const paySource = payView === 'mode' ? paymentModeSplit : paymentTypeSplit;
  const payRows = [...paySource]
    .filter((p) => p.count > 0)
    .sort((a, b) => b.value - a.value)
    .map((p) => ({ key: p.name, label: payView === 'mode' ? PAYMENT_MODE_LABEL[p.name] ?? p.name : p.name, value: p.value, detail: plural(p.count, 'sale') }));

  const periodNoun = effGrain === 'day' ? 'Day' : effGrain === 'week' ? 'Week' : 'Month';
  const trendTotal = trend.reduce((s, r) => s + r.revenue, 0);
  const columns: Column<TrendRow>[] = [
    { id: 'period', header: periodNoun, mobile: 'title', cell: (r) => r.month, sortValue: (r) => r.key ?? r.month },
    { id: 'orders', header: 'Orders', align: 'right', mobile: 'subtitle', cell: (r) => plural(r.orders, 'order'), sortValue: (r) => r.orders },
    { id: 'aov', header: 'Average order', align: 'right', cell: (r) => (r.orders ? formatMoney(r.revenue / r.orders) : '-'), sortValue: (r) => (r.orders ? r.revenue / r.orders : 0), hideBelow: 'lg' },
    { id: 'share', header: 'Share', align: 'right', cell: (r) => `${trendTotal > 0 ? Math.round((r.revenue / trendTotal) * 100) : 0}%`, sortValue: (r) => r.revenue, hideBelow: 'lg' },
    { id: 'revenue', header: 'Revenue', align: 'right', mobile: 'value', cell: (r) => formatMoney(r.revenue), sortValue: (r) => r.revenue },
  ];

  return (
    <TabLayout>
      <KpiStrip cells={kpis} label="Sales figures" />
      {growthCells.length > 0 && <KpiStrip cells={growthCells} label="Month on month growth" />}

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            Revenue trend
            {drill && (
              <button type="button" onClick={() => setDrillMonth(null)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                <ArrowLeft size={12} aria-hidden /> All months
              </button>
            )}
          </span>
        }
        subtitle={drill ? 'Daily revenue for the selected month' : effGrain === 'month' ? 'Select a month to see its days' : `Revenue ${effGrain === 'day' ? 'per day' : 'per week'}`}
        control={!drill && <Seg label="Trend grain" value={grain} onChange={(g) => setChosenGrain(g)} options={grains} />}
        bodyClassName="h-[300px]"
      >
        {trend.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trend}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onClick={(state) => {
                const idx = Number(state?.activeTooltipIndex);
                const key = Number.isInteger(idx) ? trend[idx]?.key : undefined;
                if (!drill && effGrain === 'month' && key) setDrillMonth(key);
              }}
              style={{ cursor: !drill && effGrain === 'month' ? 'pointer' : 'default' }}
            >
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} minTickGap={16} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={56} tickFormatter={(v) => formatAxisMoney(Number(v))} />
              <Tooltip {...CHART_TOOLTIP} formatter={(value) => formatMoney(Number(value))} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#revGrad)" dot={effGrain !== 'day'} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty text="No sales in this period" />
        )}
      </Panel>

      <TwoCol>
        <Panel
          title="Sales by day of week"
          subtitle={dowMetric === 'avgRevenue' ? 'Average revenue per weekday' : dowMetric === 'revenue' ? 'Total revenue per weekday' : 'Orders per weekday'}
          control={<Seg label="Day of week metric" value={dowMetric} onChange={setDowMetric} options={[['avgRevenue', 'Average'], ['revenue', 'Total'], ['orders', 'Orders']]} />}
          bodyClassName="h-[260px]"
        >
          {dayOfWeekPattern.some((d) => d.orders > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekPattern} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={AXIS_TICK} />
                <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={56} tickFormatter={(v) => (isMoneyDow ? formatAxisMoney(Number(v)) : formatCount(Number(v)))} />
                <Tooltip {...CHART_TOOLTIP} cursor={BAR_CURSOR} formatter={(value) => (isMoneyDow ? formatMoney(Number(value)) : formatCount(Number(value)))} />
                <Bar dataKey={dowMetric} name={dowMetric === 'orders' ? 'Orders' : dowMetric === 'revenue' ? 'Revenue' : 'Average revenue'} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </Panel>

        <Panel
          title="Average order value"
          subtitle={`Average sale ${aovGrain === 'week' ? 'per week' : 'per month'}`}
          control={aovGrains.length > 1 && <Seg label="Average order grain" value={aovGrain} onChange={(g) => setChosenAovGrain(g)} options={aovGrains} />}
          bodyClassName="h-[260px]"
        >
          {aovSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aovSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} minTickGap={16} />
                <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={56} tickFormatter={(v) => formatAxisMoney(Number(v))} />
                <Tooltip {...CHART_TOOLTIP} formatter={(value) => formatMoney(Number(value))} />
                <Line type="monotone" dataKey="aov" name="Average order" stroke="var(--chart-1)" strokeWidth={2} dot={{ fill: 'var(--chart-1)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </Panel>

        <Panel
          title="Sales channels"
          subtitle={chanMetric === 'revenue' ? 'Revenue by channel' : 'Orders by channel'}
          control={<Seg label="Channel metric" value={chanMetric} onChange={setChanMetric} options={[['revenue', 'Revenue'], ['count', 'Orders']]} />}
        >
          <RankedBars rows={channelRows} format={chanMetric === 'revenue' ? formatMoneyShort : formatCount} />
        </Panel>

        <Panel
          title={payView === 'mode' ? 'How sales were settled' : 'How customers paid'}
          subtitle={payView === 'mode' ? 'Paid in full, on credit or part paid, by value' : 'Cash, transfer or POS, by value (excludes full credit sales)'}
          control={<Seg label="Payment breakdown" value={payView} onChange={setPayView} options={[['mode', 'Settlement'], ['type', 'Method']]} />}
        >
          <RankedBars rows={payRows} format={formatMoneyShort} />
        </Panel>
      </TwoCol>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Revenue by {periodNoun.toLowerCase()}</h3>
          <p className="text-xs text-muted-foreground">{effGrain === 'month' && !drill ? 'Select a month to see its days in the chart' : 'Same figures as the trend above'}</p>
        </div>
        <DataTable
          label={`Revenue by ${periodNoun.toLowerCase()}`}
          columns={columns}
          rows={trend}
          getRowId={(r) => r.key ?? r.month}
          defaultSort={{ id: 'period', dir: 'desc' }}
          onRowClick={effGrain === 'month' && !drill ? (r) => r.key && setDrillMonth(r.key) : undefined}
          pageSize={12}
          resetPageKey={`${effGrain}|${drill ?? ''}`}
          empty={<p className="px-4 py-8 text-center text-sm text-muted-foreground">No sales in this period</p>}
        />
      </div>

      <SourceNote>Sales figures use the sale date. Collected and still owed come from the same sales.</SourceNote>
    </TabLayout>
  );
}
