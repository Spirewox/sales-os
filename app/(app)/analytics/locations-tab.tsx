'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCreditSummary, useInventory, useSalesSummaries } from '@/hooks/use-queries';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { usePermissions } from '@/hooks/use-permissions';
import type { InsightScopeParams } from '@/hooks/use-insights-api';
import { CHART_TOOLTIP, formatAxisMoney, formatCount, formatMoney, formatMoneyShort, formatPercent } from '@/lib/format';
import { DataTable, KpiStrip, RowAction, StatusBadge, type Column, type KpiCell } from '@/components/app';
import { Skeleton } from '@/components/ui/skeleton';
import { stockState } from '../inventory/inventory-utils';
import { LocationHeadToHead } from './location-head-to-head';
import { AXIS_TICK, BAR_CURSOR, ChartEmpty, LEGEND_STYLE, Panel, RankedBars, Seg, SourceNote, TabLayout, TwoCol, pctChange, type RankedRow } from './analytics-ui';

type Metric = 'revenue' | 'orders' | 'avg';

export type LocationRow = {
  id: string;
  name: string;
  type: 'hub' | 'rsp';
  parent?: string;
  revenue: number;
  prevRevenue: number | null;
  change: number | null;
  orders: number;
  prevOrders: number | null;
  avgOrder: number;
  profit: number | null;
  creditSales: number;
  creditShare: number | null;
  deliveries: number;
  owed: number;
  overdueCustomers: number;
  overdueAmount: number | null;
  stockValue: number;
  products: number;
  lowStock: number;
  outOfStock: number;
};

const METRICS: [Metric, string][] = [['revenue', 'Revenue'], ['orders', 'Orders'], ['avg', 'Average order']];

/**
 * Location performance: every permitted hub and RSP side by side for the period, with the change
 * against the previous equal period, plus credit and stock as they stand now. Built from one sales
 * summary per location, the credit book and inventory, all grouped by location.
 */
export function LocationsTab({ scope, prevScope }: Readonly<{ scope: InsightScopeParams; prevScope: InsightScopeParams | null }>) {
  const router = useRouter();
  const { isAdmin } = usePermissions();
  const hubScope = useHubScopeFilter();
  const locations = hubScope.activeHubs;
  const [metric, setMetric] = useState<Metric>('revenue');

  const range = scope.period === 'all' ? {} : { date_from: scope.date_from, date_to: scope.date_to };
  const current = useSalesSummaries(locations.map((h) => ({ hub_id: h.id, exclude_voided: true, ...range })), { enabled: locations.length > 0 });
  const previous = useSalesSummaries(
    prevScope ? locations.map((h) => ({ hub_id: h.id, exclude_voided: true, date_from: prevScope.date_from, date_to: prevScope.date_to })) : [],
    { enabled: !!prevScope && locations.length > 0 },
  );
  const { data: credit = [], isPending: creditLoading } = useCreditSummary();
  const { data: inventory = [], isPending: stockLoading } = useInventory();

  const salesLoading = current.some((q) => q.isPending);

  const rows = useMemo<LocationRow[]>(() => {
    const owed = new Map<string, { amount: number; overdueCustomers: number; overdueAmount: number; hasAmount: boolean }>();
    for (const c of credit) {
      const key = c.hubId ?? locations.find((h) => h.name === c.hubName)?.id;
      if (!key) continue;
      const o = owed.get(key) ?? { amount: 0, overdueCustomers: 0, overdueAmount: 0, hasAmount: false };
      o.amount += c.totalOutstanding;
      if (c.overdueCount > 0) o.overdueCustomers += 1;
      if (typeof c.overdueAmount === 'number') {
        o.overdueAmount += c.overdueAmount;
        o.hasAmount = true;
      }
      owed.set(key, o);
    }
    const stock = new Map<string, { value: number; products: number; low: number; out: number }>();
    for (const i of inventory) {
      if (i.isActive === false) continue;
      const key = i.hubId ?? locations.find((h) => h.name === i.location)?.id;
      if (!key) continue;
      const s = stock.get(key) ?? { value: 0, products: 0, low: 0, out: 0 };
      s.value += Math.max(0, i.currentStock) * i.avgUnitCost;
      s.products += 1;
      const state = stockState(i);
      if (state === 'Low') s.low += 1;
      if (state === 'Out') s.out += 1;
      stock.set(key, s);
    }
    return locations.map((h, idx) => {
      const cur = current[idx]?.data;
      const prev = prevScope ? previous[idx]?.data : undefined;
      const o = owed.get(h.id);
      const s = stock.get(h.id);
      const revenue = cur?.revenue ?? 0;
      return {
        id: h.id,
        name: h.name,
        type: h.locationType === 'rsp' ? 'rsp' : 'hub',
        parent: h.parentHubName ?? locations.find((p) => p.id === h.parentHubId)?.name,
        revenue,
        prevRevenue: prev ? prev.revenue : null,
        change: prev ? pctChange(revenue, prev.revenue) : null,
        orders: cur?.count ?? 0,
        prevOrders: prev ? prev.count : null,
        avgOrder: cur?.avgOrder ?? 0,
        profit: typeof cur?.profit === 'number' ? cur.profit : null,
        creditSales: cur?.creditAmount ?? 0,
        creditShare: revenue > 0 ? ((cur?.creditAmount ?? 0) / revenue) * 100 : null,
        deliveries: cur?.deliveryCount ?? 0,
        owed: o?.amount ?? 0,
        overdueCustomers: o?.overdueCustomers ?? 0,
        overdueAmount: o?.hasAmount ? o.overdueAmount : null,
        stockValue: s?.value ?? 0,
        products: s?.products ?? 0,
        lowStock: s?.low ?? 0,
        outOfStock: s?.out ?? 0,
      };
    });
  }, [locations, current, previous, prevScope, credit, inventory]);

  const total = rows.reduce((a, r) => a + r.revenue, 0);
  const prevTotal = prevScope ? rows.reduce((a, r) => a + (r.prevRevenue ?? 0), 0) : null;
  const byRevenue = [...rows].sort((a, b) => b.revenue - a.revenue);
  const top = byRevenue[0];
  const growers = rows.filter((r) => r.change != null && r.change > 0);
  const fastest = [...rows].filter((r) => r.change != null && r.prevRevenue).sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0];
  const mostOwed = [...rows].sort((a, b) => b.owed - a.owed)[0];
  const hubs = rows.filter((r) => r.type === 'hub').length;

  const cells: KpiCell[] = [
    {
      label: 'Revenue across locations',
      value: formatMoneyShort(total),
      detail: `${formatCount(rows.length)} locations: ${formatCount(hubs)} hubs, ${formatCount(rows.length - hubs)} RSPs`,
      change: prevTotal != null ? (() => { const c = pctChange(total, prevTotal); return c != null ? { pct: c } : null; })() : null,
    },
    {
      label: 'Top location',
      value: top && top.revenue > 0 ? top.name : '-',
      detail: top && total > 0 ? `${formatMoneyShort(top.revenue)}, ${formatPercent((top.revenue / total) * 100)} of revenue` : 'No sales in this period',
    },
    {
      label: 'Growing vs previous',
      value: prevScope ? `${formatCount(growers.length)} of ${formatCount(rows.length)}` : '-',
      detail: prevScope ? (fastest && fastest.change != null ? `Fastest: ${fastest.name}, +${formatPercent(fastest.change, 1)}` : 'No growth to compare') : 'No previous period for All time',
      tone: prevScope && growers.length < rows.length / 2 ? 'warning' : 'default',
    },
    {
      label: 'Most owed',
      value: mostOwed && mostOwed.owed > 0 ? mostOwed.name : '-',
      detail: mostOwed && mostOwed.owed > 0 ? `${formatMoneyShort(mostOwed.owed)} owed, ${formatCount(mostOwed.overdueCustomers)} customers overdue` : 'Nothing owed',
      tone: mostOwed && mostOwed.overdueCustomers > 0 ? 'danger' : 'default',
      href: '/credits?overdue=1',
    },
  ];

  const metricValue = (r: LocationRow, prev = false) =>
    metric === 'revenue' ? (prev ? r.prevRevenue ?? 0 : r.revenue)
      : metric === 'orders' ? (prev ? r.prevOrders ?? 0 : r.orders)
        : prev ? (r.prevOrders ? (r.prevRevenue ?? 0) / r.prevOrders : 0) : r.avgOrder;
  const chartData = byRevenue.map((r) => ({ name: r.name, current: metricValue(r), previous: prevScope ? metricValue(r, true) : undefined }));
  const fmtMetric = metric === 'orders' ? formatCount : formatMoney;
  const axisMetric = metric === 'orders' ? (v: number) => formatCount(v) : formatAxisMoney;

  const shareRows: RankedRow[] = byRevenue.filter((r) => r.revenue > 0).map((r) => ({ key: r.id, label: r.name, value: r.revenue, detail: `${formatCount(r.orders)} orders` }));
  const avgRows: RankedRow[] = [...rows].filter((r) => r.orders > 0).sort((a, b) => b.avgOrder - a.avgOrder).map((r) => ({ key: r.id, label: r.name, value: r.avgOrder, detail: `${formatCount(r.orders)} orders` }));
  const owedRows: RankedRow[] = [...rows].filter((r) => r.owed > 0).sort((a, b) => b.owed - a.owed).map((r) => ({
    key: r.id,
    label: r.name,
    value: r.owed,
    detail: r.overdueCustomers ? `${formatCount(r.overdueCustomers)} overdue` : 'none overdue',
    barClass: r.overdueCustomers ? 'bg-destructive' : 'bg-chart-1',
  }));
  const stockRows: RankedRow[] = [...rows].filter((r) => r.stockValue > 0).sort((a, b) => b.stockValue - a.stockValue).map((r) => ({
    key: r.id,
    label: r.name,
    value: r.stockValue,
    detail: r.lowStock + r.outOfStock ? `${formatCount(r.lowStock)} low, ${formatCount(r.outOfStock)} out` : `${formatCount(r.products)} products`,
    barClass: r.outOfStock ? 'bg-warning' : 'bg-chart-1',
  }));

  const openLocation = (r: LocationRow, path: string) => {
    hubScope.setFilterHub(r.name);
    router.push(path);
  };

  const columns: Column<LocationRow>[] = [
    {
      id: 'name', header: 'Location', mobile: 'title', sortValue: (r) => r.name.toLowerCase(),
      cell: (r) => (
        <span className="block min-w-0">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="truncate">{r.name}</span>
            <StatusBadge tone="neutral">{r.type === 'rsp' ? 'RSP' : 'Hub'}</StatusBadge>
          </span>
          {r.parent && <span className="block truncate text-xs text-muted-foreground">Under {r.parent}</span>}
        </span>
      ),
    },
    { id: 'revenue', header: 'Revenue', align: 'right', mobile: 'value', sortValue: (r) => r.revenue, cell: (r) => <span className="font-medium">{formatMoney(r.revenue)}</span> },
    {
      id: 'change', header: 'vs previous', align: 'right', mobile: 'meta', sortValue: (r) => r.change,
      cell: (r) => (r.change == null ? <span className="text-muted-foreground">-</span> : <span className={r.change >= 0 ? 'text-primary' : 'text-destructive'}>{r.change >= 0 ? '+' : ''}{formatPercent(r.change, 1)}</span>),
    },
    { id: 'orders', header: 'Orders', align: 'right', mobile: 'meta', sortValue: (r) => r.orders, cell: (r) => formatCount(r.orders) },
    { id: 'avg', header: 'Average order', align: 'right', hideBelow: 'lg', sortValue: (r) => r.avgOrder, cell: (r) => (r.orders ? formatMoney(r.avgOrder) : '-') },
    ...(isAdmin
      ? [{ id: 'profit', header: 'Profit', align: 'right' as const, hideBelow: 'xl' as const, sortValue: (r: LocationRow) => r.profit, cell: (r: LocationRow) => (r.profit == null ? '-' : formatMoney(r.profit)) }]
      : []),
    { id: 'credit', header: 'On credit', align: 'right', hideBelow: 'xl', sortValue: (r) => r.creditShare, cell: (r) => (r.creditShare == null ? '-' : formatPercent(r.creditShare)) },
    {
      id: 'owed', header: 'Owed now', align: 'right', mobile: 'meta', sortValue: (r) => r.owed,
      cell: (r) => (
        <span className="block">
          <span className={r.overdueCustomers ? 'text-destructive' : undefined}>{formatMoney(r.owed)}</span>
          {r.overdueCustomers > 0 && <span className="block text-xs text-muted-foreground">{formatCount(r.overdueCustomers)} overdue</span>}
        </span>
      ),
    },
    {
      id: 'stock', header: 'Stock value', align: 'right', hideBelow: 'lg', sortValue: (r) => r.stockValue,
      cell: (r) => (
        <span className="block">
          {formatMoney(r.stockValue)}
          {r.lowStock + r.outOfStock > 0 && <span className="block text-xs text-warning">{formatCount(r.lowStock)} low, {formatCount(r.outOfStock)} out</span>}
        </span>
      ),
    },
  ];

  const loading = salesLoading || hubScope.activeHubs.length === 0;

  return (
    <TabLayout>
      <KpiStrip label="Location figures" cells={cells} loading={salesLoading || creditLoading} />

      <Panel
        title="Location comparison"
        subtitle={prevScope ? 'This period against the previous one of the same length' : 'All time'}
        control={<Seg label="Compare by" value={metric} onChange={setMetric} options={METRICS} />}
        bodyClassName="h-75"
      >
        {salesLoading ? (
          <Skeleton className="h-full w-full" />
        ) : chartData.some((d) => d.current > 0 || (d.previous ?? 0) > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} interval={0} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={56} tickFormatter={(v) => axisMetric(Number(v))} />
              <Tooltip {...CHART_TOOLTIP} cursor={BAR_CURSOR} formatter={(v, name) => [fmtMetric(Number(v)), name === 'current' ? 'This period' : 'Previous period']} />
              {prevScope && <Legend iconType="circle" iconSize={8} wrapperStyle={{ ...LEGEND_STYLE, paddingTop: 8 }} formatter={(v) => (v === 'current' ? 'This period' : 'Previous period')} />}
              <Bar dataKey="current" name="current" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              {prevScope && <Bar dataKey="previous" name="previous" fill="var(--series-other)" radius={[4, 4, 0, 0]} maxBarSize={36} />}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty text="No sales at any location in this period" />
        )}
      </Panel>

      <LocationHeadToHead rows={rows} scope={scope} showProfit={isAdmin} loading={loading || creditLoading || stockLoading} />

      <TwoCol>
        <Panel title="Share of revenue" subtitle="Each location's part of the total">
          {salesLoading ? <Skeleton className="h-40 w-full" /> : <RankedBars rows={shareRows} format={formatMoneyShort} emptyText="No sales in this period" />}
        </Panel>
        <Panel title="Average order" subtitle="Revenue per order, highest first">
          {salesLoading ? <Skeleton className="h-40 w-full" /> : <RankedBars rows={avgRows} format={formatMoneyShort} showShare={false} emptyText="No orders in this period" />}
        </Panel>
      </TwoCol>

      <TwoCol>
        <Panel title="Credit owed by location" subtitle="Outstanding now; red where customers are overdue">
          {creditLoading ? <Skeleton className="h-40 w-full" /> : <RankedBars rows={owedRows} format={formatMoneyShort} emptyText="Nothing owed" />}
        </Panel>
        <Panel title="Stock value by location" subtitle="On hand now at average cost, with low and out-of-stock counts">
          {stockLoading ? <Skeleton className="h-40 w-full" /> : <RankedBars rows={stockRows} format={formatMoneyShort} emptyText="No stock on hand" />}
        </Panel>
      </TwoCol>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Location scorecard</h3>
        <DataTable
          label="Location scorecard"
          pageSizeKey="analytics-locations"
          columns={columns}
          rows={loading ? undefined : rows}
          loading={loading}
          getRowId={(r) => r.id}
          defaultSort={{ id: 'revenue', dir: 'desc' }}
          rowActions={(r) => (
            <RowAction onClick={() => openLocation(r, '/')} ariaLabel={`Open the dashboard for ${r.name}`}>Open dashboard</RowAction>
          )}
        />
      </section>

      <SourceNote>
        Revenue, orders, profit and credit sales follow the period; owed credit and stock are as they stand now. Every permitted location is compared, whatever the location filter says. Opening a location sets it as your app-wide location.
      </SourceNote>
    </TabLayout>
  );
}
