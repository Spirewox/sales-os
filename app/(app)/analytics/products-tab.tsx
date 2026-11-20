'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsOverviewData } from '@/types/api';
import { CHART_TOOLTIP, formatAxisMoney, formatCount, formatMoney, formatMoneyShort, plural } from '@/lib/format';
import { DataTable, KpiStrip, StatusBadge, type Column, type KpiCell } from '@/components/app';
import { AXIS_TICK, BAR_CURSOR, ChartEmpty, Panel, RankedBars, Seg, SourceNote, TabLayout, TwoCol, pctChange } from './analytics-ui';

type ProductsData = AnalyticsOverviewData['products'];
type ProductRow = ProductsData['productRevenue'][number];
type DeadRow = ProductsData['deadStock'][number];

const productHref = (id?: string) => (id ? `/inventory?product=${encodeURIComponent(id)}` : undefined);
const shortName = (s: string) => (s.length > 18 ? `${s.slice(0, 17)}…` : s);

export function ProductsTab({ data, previous, hasPrevious }: Readonly<{ data: ProductsData; previous?: ProductsData; hasPrevious: boolean }>) {
  const router = useRouter();
  const { productRevenue, categoryRevenue, stockTurnover, deadStock } = data;
  const [topMetric, setTopMetric] = useState<'revenue' | 'count'>('revenue');
  const [catMetric, setCatMetric] = useState<'revenue' | 'orders'>('revenue');
  const [turnMetric, setTurnMetric] = useState<'turnover' | 'unitsSold'>('turnover');

  const revenue = productRevenue.reduce((s, p) => s + p.revenue, 0);
  const sold = productRevenue.filter((p) => p.count > 0).length;
  const prevRevenue = previous?.productRevenue.reduce((s, p) => s + p.revenue, 0);
  const prevSold = previous?.productRevenue.filter((p) => p.count > 0).length;
  const topCat = [...categoryRevenue].sort((a, b) => b.revenue - a.revenue)[0];
  const catTotal = categoryRevenue.reduce((s, c) => s + c.revenue, 0);
  const change = (curr: number, prev?: number) => {
    const pct = hasPrevious ? pctChange(curr, prev) : null;
    return pct == null ? null : { pct };
  };

  const kpis: KpiCell[] = [
    { label: 'Product revenue', value: formatMoneyShort(revenue), change: change(revenue, prevRevenue) },
    { label: 'Products sold', value: formatCount(sold), change: change(sold, prevSold), detail: plural(productRevenue.reduce((s, p) => s + p.count, 0), 'order line') },
    { label: 'Top category', value: topCat?.name ?? '-', detail: topCat && catTotal > 0 ? `${Math.round((topCat.revenue / catTotal) * 100)}% of revenue` : undefined },
    { label: 'Not selling', value: formatCount(deadStock.length), tone: deadStock.length > 0 ? 'warning' : 'default', detail: 'In stock, no sales in period' },
  ];

  const top = [...productRevenue].sort((a, b) => b[topMetric] - a[topMetric]).slice(0, 10).map((p) => ({ ...p, short: shortName(p.name) }));
  const categories = [...categoryRevenue]
    .sort((a, b) => b[catMetric] - a[catMetric])
    .map((c) => ({ key: c.name, label: c.name, value: c[catMetric], detail: catMetric === 'revenue' ? plural(c.orders, 'order') : formatMoneyShort(c.revenue) }));
  const turnover = [...stockTurnover]
    .sort((a, b) => b[turnMetric] - a[turnMetric])
    .map((t) => ({ key: t.id ?? t.name, label: t.name, value: t[turnMetric], detail: turnMetric === 'turnover' ? `${formatCount(t.unitsSold)} sold, ${formatCount(t.currentStock)} left` : undefined, href: productHref(t.id) }));

  const productColumns: Column<ProductRow>[] = [
    { id: 'name', header: 'Product', mobile: 'title', cell: (p) => p.name, sortValue: (p) => p.name.toLowerCase() },
    { id: 'category', header: 'Category', mobile: 'subtitle', cell: (p) => (p.category ? <StatusBadge tone="neutral">{p.category}</StatusBadge> : '-'), sortValue: (p) => p.category },
    { id: 'orders', header: 'Orders', align: 'right', mobile: 'meta', cell: (p) => plural(p.count, 'order'), sortValue: (p) => p.count },
    { id: 'share', header: 'Share', align: 'right', cell: (p) => `${revenue > 0 ? Math.round((p.revenue / revenue) * 100) : 0}%`, sortValue: (p) => p.revenue, hideBelow: 'lg' },
    { id: 'revenue', header: 'Revenue', align: 'right', mobile: 'value', cell: (p) => formatMoney(p.revenue), sortValue: (p) => p.revenue },
  ];
  const deadColumns: Column<DeadRow>[] = [
    { id: 'name', header: 'Product', mobile: 'title', cell: (p) => p.name, sortValue: (p) => p.name.toLowerCase() },
    { id: 'category', header: 'Category', mobile: 'subtitle', cell: (p) => p.category || '-', sortValue: (p) => p.category },
    { id: 'stock', header: 'In stock', align: 'right', mobile: 'value', cell: (p) => formatCount(p.currentStock), sortValue: (p) => p.currentStock },
  ];

  return (
    <TabLayout>
      <KpiStrip cells={kpis} label="Product figures" />

      <Panel
        title={`Top products by ${topMetric === 'revenue' ? 'revenue' : 'orders'}`}
        subtitle="Best sellers in the selected period"
        control={<Seg label="Top products metric" value={topMetric} onChange={setTopMetric} options={[['revenue', 'Revenue'], ['count', 'Orders']]} />}
        bodyClassName="h-[340px]"
      >
        {top.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={top}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              onClick={(state) => {
                const idx = Number(state?.activeTooltipIndex);
                const href = Number.isInteger(idx) ? productHref(top[idx]?.id) : undefined;
                if (href) router.push(href);
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={(v) => (topMetric === 'revenue' ? formatAxisMoney(Number(v)) : formatCount(Number(v)))} />
              <YAxis type="category" dataKey="short" axisLine={false} tickLine={false} tick={AXIS_TICK} width={128} />
              <Tooltip
                {...CHART_TOOLTIP}
                cursor={BAR_CURSOR}
                labelFormatter={(_l, items) => (items?.[0]?.payload as ProductRow | undefined)?.name ?? ''}
                formatter={(value) => (topMetric === 'revenue' ? formatMoney(Number(value)) : formatCount(Number(value)))}
              />
              <Bar dataKey={topMetric} name={topMetric === 'revenue' ? 'Revenue' : 'Orders'} fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty text="No product sales in this period" />
        )}
      </Panel>

      <TwoCol>
        <Panel
          title="Categories"
          subtitle={catMetric === 'revenue' ? 'Revenue by category' : 'Orders by category'}
          control={<Seg label="Category metric" value={catMetric} onChange={setCatMetric} options={[['revenue', 'Revenue'], ['orders', 'Orders']]} />}
        >
          <RankedBars rows={categories} format={catMetric === 'revenue' ? formatMoneyShort : formatCount} limit={10} />
        </Panel>
        <Panel
          title={turnMetric === 'turnover' ? 'Stock turnover' : 'Units sold'}
          subtitle={turnMetric === 'turnover' ? 'Units sold in the period divided by stock on hand today' : 'Units sold in the period'}
          control={<Seg label="Stock metric" value={turnMetric} onChange={setTurnMetric} options={[['turnover', 'Turnover'], ['unitsSold', 'Units']]} />}
        >
          <RankedBars
            rows={turnover}
            format={(n) => (turnMetric === 'turnover' ? `${n}x` : formatCount(n))}
            showShare={turnMetric === 'unitsSold'}
            limit={10}
            emptyText="No stock movement in this period"
          />
        </Panel>
      </TwoCol>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">All products sold</h3>
          <p className="text-xs text-muted-foreground">Select a product to open it in Inventory</p>
        </div>
        <DataTable
          label="Products sold"
          columns={productColumns}
          rows={productRevenue}
          getRowId={(p) => p.id ?? p.name}
          defaultSort={{ id: 'revenue', dir: 'desc' }}
          onRowClick={(p) => { const href = productHref(p.id); if (href) router.push(href); }}
          pageSize={15}
          empty={<p className="px-4 py-8 text-center text-sm text-muted-foreground">No product sales in this period</p>}
        />
      </div>

      {deadStock.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Not selling: {plural(deadStock.length, 'product')}</h3>
            <p className="text-xs text-muted-foreground">Stock on hand but no sales in the selected period</p>
          </div>
          <DataTable
            label="Products not selling"
            columns={deadColumns}
            rows={deadStock}
            getRowId={(p) => p.id}
            defaultSort={{ id: 'stock', dir: 'desc' }}
            onRowClick={(p) => router.push(productHref(p.id)!)}
            pageSize={10}
          />
        </div>
      )}

      <SourceNote>Sales use the sale date. Stock levels are today&apos;s count, not the level during the period.</SourceNote>
    </TabLayout>
  );
}
