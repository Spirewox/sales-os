'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { BarChart3, Flame } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useStockLogs } from '@/hooks/use-queries';
import type { StockLog } from '@/types';
import { CHART_TOOLTIP, formatAxisMoney, formatCount, formatDate, formatMoney, formatPercent, plural } from '@/lib/format';
import { DataTable, EmptyState, type Column } from '@/components/app';
import { cn } from '@/lib/utils';
import { isSale } from './supplier-utils';

/** Same query as the Products tab, so it is usually cached. */
const SALE_LIMIT = 500;

type ProductPerf = {
  itemId: string; itemName: string; uom: string;
  units: number; revenue: number; cogs: number; txns: number; lastSold: string;
  profit: number; margin: number; purchased: number; sellThrough: number;
};

function Figure({ label, value, detail, tone }: Readonly<{ label: string; value: React.ReactNode; detail?: React.ReactNode; tone?: 'good' }>) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('truncate text-lg font-semibold tabular-nums', tone === 'good' && 'text-primary')}>{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

const monthLabel = (m: string) => new Date(`${m}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });

/**
 * How this supplier's products sell in retail. Sales are attributed through the products this
 * supplier delivers (a product bought from several suppliers counts for each of them).
 * Calculations match the original Performance tab.
 */
export function SupplierPerformanceTab({ purchases }: Readonly<{ purchases: StockLog[] }>) {
  const { data: salesResult, isLoading } = useStockLogs({ type: 'SALE', limit: SALE_LIMIT });

  const perf = useMemo(() => {
    const purchasedByItem: Record<string, number> = {};
    purchases.forEach((l) => { purchasedByItem[l.itemId] = (purchasedByItem[l.itemId] || 0) + Math.abs(l.quantity); });
    const itemIds = new Set(Object.keys(purchasedByItem));
    const saleLogs = itemIds.size > 0 ? (salesResult?.data ?? []).filter((l) => isSale(l) && itemIds.has(l.itemId)) : [];

    let unitsSold = 0, revenue = 0, cogs = 0, lastSold = '';
    const byMonth: Record<string, number> = {};
    const prodMap: Record<string, Omit<ProductPerf, 'profit' | 'margin' | 'purchased' | 'sellThrough'>> = {};
    saleLogs.forEach((l) => {
      const q = Math.abs(l.quantity);
      const rev = q * l.unitPrice;
      const cost = q * l.unitCost;
      const m = l.date.substring(0, 7);
      unitsSold += q; revenue += rev; cogs += cost;
      byMonth[m] = (byMonth[m] || 0) + rev;
      if (l.date > lastSold) lastSold = l.date;
      const e = prodMap[l.itemId] || { itemId: l.itemId, itemName: l.itemName, uom: l.uom, units: 0, revenue: 0, cogs: 0, txns: 0, lastSold: '' };
      e.units += q; e.revenue += rev; e.cogs += cost; e.txns += 1;
      if (l.date > e.lastSold) e.lastSold = l.date;
      prodMap[l.itemId] = e;
    });
    const byProduct: ProductPerf[] = Object.values(prodMap).map((p) => {
      const purchased = purchasedByItem[p.itemId] || 0;
      return {
        ...p,
        profit: p.revenue - p.cogs,
        margin: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0,
        purchased,
        sellThrough: purchased ? Math.min(100, Math.round((p.units / purchased) * 100)) : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
    const totalPurchased = Object.values(purchasedByItem).reduce((a, n) => a + n, 0);
    const months = Object.keys(byMonth).length;
    return {
      hasData: saleLogs.length > 0,
      unitsSold, revenue, cogs, profit: revenue - cogs,
      margin: revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0,
      txns: saleLogs.length,
      months,
      avgPerMonth: months ? saleLogs.length / months : 0,
      lastSold,
      sellThrough: totalPurchased ? Math.min(100, Math.round((unitsSold / totalPurchased) * 100)) : 0,
      bestSeller: byProduct[0] ?? null,
      byProduct,
      trend: Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([m, amount]) => ({ month: monthLabel(m), amount })),
    };
  }, [purchases, salesResult]);

  const note = (
    <p className="text-xs text-muted-foreground">
      How this supplier&apos;s products sell. Sales are matched through the products they deliver, from the latest {formatCount(SALE_LIMIT)} sale movements across all products.
    </p>
  );

  if (isLoading) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">Loading sales…</p>;
  if (!perf.hasData) {
    return (
      <div className="space-y-3">
        {note}
        <EmptyState size="compact" icon={<BarChart3 />} title="No retail sales yet" description="No sales are recorded yet for the products this supplier delivers." />
      </div>
    );
  }

  const columns: Column<ProductPerf>[] = [
    {
      id: 'product', header: 'Product', mobile: 'title', sortValue: (p) => p.itemName.toLowerCase(),
      cell: (p) => (p.itemId ? <Link href={`/inventory?product=${p.itemId}`} onClick={(e) => e.stopPropagation()} className="hover:text-primary hover:underline">{p.itemName}</Link> : p.itemName),
    },
    { id: 'sold', header: 'Sold', align: 'right', mobile: 'meta', sortValue: (p) => p.units, cell: (p) => <span className="whitespace-nowrap">{formatCount(p.units)} {p.uom}</span> },
    { id: 'revenue', header: 'Revenue', align: 'right', mobile: 'value', sortValue: (p) => p.revenue, cell: (p) => <span className="whitespace-nowrap">{formatMoney(p.revenue)}</span> },
    {
      id: 'profit', header: 'Profit', align: 'right', mobile: 'meta', sortValue: (p) => p.profit,
      cell: (p) => <span className="whitespace-nowrap"><span className="font-medium">{formatMoney(p.profit)}</span> <span className="text-xs text-muted-foreground">{formatPercent(p.margin)}</span></span>,
    },
    {
      id: 'sell', header: 'Sell-through', align: 'right', mobile: 'meta', sortValue: (p) => p.sellThrough,
      cell: (p) => (
        <span className="inline-flex items-center justify-end gap-1.5">
          <span className="h-1.5 w-10 overflow-hidden rounded-full bg-muted max-md:hidden" aria-hidden><span className="block h-full rounded-full bg-chart-1" style={{ width: `${p.sellThrough}%` }} /></span>
          <span className="tabular-nums"><span className="md:hidden">Sold through </span>{p.sellThrough}%</span>
        </span>
      ),
    },
  ];

  const best = perf.bestSeller;
  return (
    <div className="space-y-5">
      {note}

      <section aria-label="Retail figures" className="grid grid-cols-2 gap-2">
        <Figure label="Units sold" value={formatCount(perf.unitsSold)} />
        <Figure label="Retail revenue" value={formatMoney(perf.revenue)} />
        <Figure label="Gross profit" value={formatMoney(perf.profit)} detail={`${formatPercent(perf.margin)} margin`} tone="good" />
        <Figure label="Sales frequency" value={plural(perf.txns, 'sale')} detail={`${perf.avgPerMonth.toFixed(1)} a month across ${plural(perf.months, 'month')}`} />
      </section>
      <section aria-label="More retail figures" className="grid grid-cols-3 gap-2">
        <Figure label="Sell-through" value={`${perf.sellThrough}%`} detail="of units bought" />
        <Figure label="Cost of goods" value={formatMoney(perf.cogs)} />
        <Figure label="Last sold" value={perf.lastSold ? formatDate(perf.lastSold, { day: 'numeric', month: 'short', year: '2-digit' }) : '-'} />
      </section>

      {best && (
        <section aria-label="Best seller" className="flex items-center gap-3 rounded-xl border p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Flame size={18} aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Best seller</p>
            <p className="truncate text-sm font-semibold">{best.itemName}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">{formatMoney(best.revenue)}</p>
            <p className="text-xs text-muted-foreground">{formatCount(best.units)} {best.uom} sold</p>
          </div>
        </section>
      )}

      {perf.trend.length > 1 && (
        <section aria-label="Monthly retail revenue">
          <h3 className="mb-2 text-sm font-semibold">Monthly retail revenue</h3>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perf.trend}>
                <defs><linearGradient id="supRetailGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} /><stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis width={56} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatAxisMoney(Number(v))} />
                <RechartsTooltip {...CHART_TOOLTIP} formatter={(value) => [formatMoney(Number(value)), 'Revenue']} />
                <Area type="monotone" dataKey="amount" stroke="var(--chart-1)" fill="url(#supRetailGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section aria-label="Product performance" className="space-y-2">
        <h3 className="text-sm font-semibold">Product performance ({perf.byProduct.length})</h3>
        <DataTable label="Product performance" columns={columns} rows={perf.byProduct} getRowId={(p) => p.itemId} defaultSort={{ id: 'revenue', dir: 'desc' }} pageSize={10} fixedPageSize />
      </section>
    </div>
  );
}
