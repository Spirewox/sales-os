'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useInventory, useInventorySalesMetrics, useStockLogs } from '@/hooks/use-queries';
import { usePermissions } from '@/hooks/use-permissions';
import type { InsightScopeParams } from '@/hooks/use-insights-api';
import type { InventoryItem } from '@/types';
import { CHART_TOOLTIP, formatCount, formatDate, formatMoney, formatMoneyShort, formatPercent } from '@/lib/format';
import { DataTable, KpiStrip, StatusBadge, type Column, type KpiCell } from '@/components/app';
import { Skeleton } from '@/components/ui/skeleton';
import {
  buildFifoBatches, expiringOpenBatches, marginPct, sellingPriceForMargin, stockState,
} from '../inventory/inventory-utils';
import { AXIS_TICK, BAR_CURSOR, ChartEmpty, Panel, RankedBars, SourceNote, TabLayout, TwoCol, type RankedRow } from './analytics-ui';

const UOM_LABEL: Record<InventoryItem['unitOfMeasure'], string> = { Kg: 'kg', Units: 'units', Cartons: 'cartons', Liters: 'L', ml: 'ml' };
const STATE_BAR = { 'In stock': 'bg-chart-1', Low: 'bg-warning', Out: 'bg-destructive' } as const;

/**
 * Inventory analytics: stock position (as of now, for the location) and what sold in the period.
 * Brings back the old Inventory summary (value, SKUs, units, meals served, alerts, volume by unit,
 * best sellers, price volatility) and adds margin, category value and the status mix.
 */
export function InventoryTab({ scope }: Readonly<{ scope: InsightScopeParams }>) {
  const router = useRouter();
  const { isAdmin } = usePermissions();
  const hubId = scope.hub_id;
  const { data: inventory, isPending: invLoading } = useInventory({ hub_id: hubId });
  const { data: metrics, isPending: metricsLoading } = useInventorySalesMetrics(
    scope.period === 'all' ? { hub_id: hubId, period: 'all' } : { hub_id: hubId, date_from: scope.date_from, date_to: scope.date_to },
  );
  const { data: logsResult } = useStockLogs({ hub_id: hubId, limit: 200 });

  const items = useMemo(() => (inventory ?? []).filter((i) => i.isActive !== false), [inventory]);

  const stock = useMemo(() => {
    let cost = 0;
    let retail = 0;
    const byUom = new Map<string, number>();
    const byCategory = new Map<string, number>();
    const states = { 'In stock': 0, Low: 0, Out: 0 };
    for (const i of items) {
      const onHand = Math.max(0, i.currentStock);
      const value = onHand * i.avgUnitCost;
      cost += value;
      retail += onHand * sellingPriceForMargin(i);
      byUom.set(i.unitOfMeasure, (byUom.get(i.unitOfMeasure) ?? 0) + onHand);
      byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + value);
      states[stockState(i)] += 1;
    }
    const logs = logsResult?.data ?? [];
    let expiring = 0;
    for (const i of items) if (expiringOpenBatches(buildFifoBatches(logs, i.id)).length) expiring += 1;
    const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    return { cost, retail, byUom, categories, states, expiring };
  }, [items, logsResult]);

  const loading = invLoading;
  const profit = stock.retail - stock.cost;
  const unitsTotal = [...stock.byUom.values()].reduce((a, b) => a + b, 0);
  const unitsDetail = [...stock.byUom.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([u, n]) => `${formatCount(n)} ${UOM_LABEL[u as InventoryItem['unitOfMeasure']] ?? u}`)
    .join(', ');

  const positionCells: KpiCell[] = [
    { label: 'Stock value (cost)', value: formatMoneyShort(stock.cost), detail: formatMoney(stock.cost) },
    // Admins only, as on the old Inventory page.
    { label: 'Retail value', value: formatMoneyShort(stock.retail), hidden: !isAdmin, detail: `${formatMoneyShort(profit)} potential gross profit${stock.retail > 0 ? `, ${formatPercent((profit / stock.retail) * 100)}` : ''}` },
    { label: 'Active products', value: formatCount(items.length), detail: `${formatCount(stock.categories.length)} categories`, href: '/inventory' },
    { label: 'Units on hand', value: formatCount(unitsTotal), detail: unitsDetail || 'Nothing on hand' },
  ];
  const attentionCells: KpiCell[] = [
    { label: 'Meals served', value: metricsLoading ? '-' : formatCount(metrics?.mealsServed ?? 0), detail: 'Kitchen, food plate, in this period' },
    { label: 'Low stock', value: formatCount(stock.states.Low), tone: stock.states.Low ? 'warning' : 'default', detail: 'At or below minimum', href: '/inventory?stock=low' },
    { label: 'Out of stock', value: formatCount(stock.states.Out), tone: stock.states.Out ? 'danger' : 'default', detail: 'Nothing on hand', href: '/inventory?stock=out' },
    { label: 'Expiring soon', value: formatCount(stock.expiring), tone: stock.expiring ? 'warning' : 'default', detail: 'Products with batches due in 30 days', href: '/inventory?stock=expiring' },
  ];

  const volume = [
    { unit: 'Kg', quantity: metrics?.volumeByUnit.Kg ?? 0 },
    { unit: 'Litres', quantity: metrics?.volumeByUnit.Litres ?? 0 },
    { unit: 'ml', quantity: metrics?.volumeByUnit.ml ?? 0 },
    { unit: 'Units', quantity: metrics?.volumeByUnit.Units ?? 0 },
  ];
  const hasVolume = volume.some((v) => v.quantity > 0);

  const bestSellers: RankedRow[] = (metrics?.topSellers ?? []).map((s) => ({
    key: s.productName,
    label: s.productName,
    value: s.revenue,
    detail: `${formatCount(s.quantity)} sold`,
  }));
  const categoryRows: RankedRow[] = stock.categories.filter(([, v]) => v > 0).map(([c, v]) => ({ key: c, label: c, value: v }));
  const stateRows: RankedRow[] = (['In stock', 'Low', 'Out'] as const).map((s) => ({
    key: s,
    label: s,
    value: stock.states[s],
    barClass: STATE_BAR[s],
    href: s === 'In stock' ? '/inventory' : `/inventory?stock=${s === 'Low' ? 'low' : 'out'}`,
  }));

  const columns: Column<InventoryItem>[] = [
    {
      id: 'name', header: 'Product', mobile: 'title', sortValue: (i) => i.name.toLowerCase(),
      cell: (i) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{i.name}</span>
          <span className="block font-mono text-xs text-muted-foreground">{i.sku}</span>
        </span>
      ),
    },
    { id: 'category', header: 'Category', mobile: 'subtitle', hideBelow: 'lg', cell: (i) => i.category, sortValue: (i) => i.category },
    { id: 'onhand', header: 'On hand', align: 'right', mobile: 'meta', cell: (i) => `${formatCount(i.currentStock)} ${UOM_LABEL[i.unitOfMeasure] ?? ''}`, sortValue: (i) => i.currentStock },
    { id: 'value', header: 'Value (cost)', align: 'right', mobile: 'value', cell: (i) => <span className="font-medium">{formatMoney(Math.max(0, i.currentStock) * i.avgUnitCost)}</span>, sortValue: (i) => Math.max(0, i.currentStock) * i.avgUnitCost },
    { id: 'margin', header: 'Margin', align: 'right', hideBelow: 'lg', cell: (i) => formatPercent(marginPct(i), 1), sortValue: (i) => marginPct(i) },
    { id: 'status', header: 'Status', mobile: 'meta', cell: (i) => <StatusBadge domain="stock" status={stockState(i)} />, sortValue: (i) => ['Out', 'Low', 'In stock'].indexOf(stockState(i)) },
  ];

  return (
    <TabLayout>
      <KpiStrip label="Stock position" cells={positionCells} loading={loading} />
      <KpiStrip label="Sales and alerts" cells={attentionCells} loading={loading} />

      <TwoCol>
        <Panel title="Volume sold by unit" subtitle="Quantity sold in this period, by unit of measure" bodyClassName="h-[260px]">
          {metricsLoading ? (
            <Skeleton className="h-full w-full" />
          ) : hasVolume ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volume} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="unit" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={48} tickFormatter={(v) => formatCount(Number(v))} />
                <Tooltip {...CHART_TOOLTIP} cursor={BAR_CURSOR} formatter={(v) => [formatCount(Number(v)), 'Sold']} />
                <Bar dataKey="quantity" name="Sold" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty text="Nothing sold in this period" />
          )}
        </Panel>
        <Panel title="Best sellers" subtitle="Revenue in this period">
          {metricsLoading ? <Skeleton className="h-40 w-full" /> : <RankedBars rows={bestSellers} format={formatMoneyShort} emptyText="No sales in this period" />}
        </Panel>
      </TwoCol>

      <TwoCol>
        <Panel title="Stock value by category" subtitle="On hand, at average cost">
          {loading ? <Skeleton className="h-40 w-full" /> : <RankedBars rows={categoryRows} format={formatMoneyShort} emptyText="No stock on hand" limit={8} />}
        </Panel>
        <Panel title="Stock status" subtitle="Active products by stock level">
          {loading ? <Skeleton className="h-24 w-full" /> : <RankedBars rows={stateRows} format={formatCount} emptyText="No products" />}
        </Panel>
      </TwoCol>

      <Panel title="Most volatile prices" subtitle="Biggest swings between lowest and highest price, with the last change">
        {metricsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (metrics?.mostVolatile ?? []).length === 0 ? (
          <ChartEmpty text="No price changes recorded" className="min-h-16" />
        ) : (
          <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
            {(metrics?.mostVolatile ?? []).map((v, i) => (
              <li key={`${v.productName}-${i}`} className="flex items-start justify-between gap-3 border-b py-2.5 last:border-b-0 sm:border-b-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{v.productName}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatMoney(v.minPrice)} to {formatMoney(v.maxPrice)}
                    {v.lastChangeDate ? `, changed ${formatDate(v.lastChangeDate, { day: 'numeric', month: 'short' })}` : ''}
                  </p>
                </div>
                <StatusBadge tone={v.volatilityPct >= 50 ? 'warning' : 'neutral'}>{formatPercent(v.volatilityPct, 1)}</StatusBadge>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">Products by stock value</h3>
          <Link href="/inventory" className="text-sm font-medium text-primary hover:underline">Open inventory</Link>
        </div>
        <DataTable
          label="Products by stock value"
          pageSizeKey="analytics-inventory"
          columns={columns}
          rows={loading ? undefined : items}
          loading={loading}
          getRowId={(i) => i.id}
          onRowClick={(i) => router.push(`/inventory?product=${i.id}`)}
          defaultSort={{ id: 'value', dir: 'desc' }}
          pageSize={10}
        />
      </section>

      <SourceNote>Stock figures are as of now for the selected location. Meals served, volume, best sellers and prices follow the period. Expiry looks at the latest 200 stock movements.</SourceNote>
    </TabLayout>
  );
}
