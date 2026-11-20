'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useInventorySalesMetrics } from '@/hooks/use-queries';
import { CHART_TOOLTIP, formatCount, formatDate, formatMoney } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Sales analytics that used to sit above the stock table (volume by unit, meals served, best sellers,
 * most volatile). Collapsed by default and only fetched when opened. Moving it to Analytics is pending.
 */
export function SalesTrendsSection({ hubId }: Readonly<{ hubId?: string }>) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="rounded-xl border bg-card">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span>
          <span className="block text-sm font-semibold">Sales trends</span>
          <span className="block text-xs text-muted-foreground">Volume sold, meals served, best sellers and price volatility, all time</span>
        </span>
        <ChevronDown size={16} aria-hidden className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div id={id} className="border-t px-5 py-4">
          <SalesTrends hubId={hubId} />
        </div>
      )}
    </section>
  );
}

function SalesTrends({ hubId }: Readonly<{ hubId?: string }>) {
  const { data: salesMetrics, isLoading } = useInventorySalesMetrics({ hub_id: hubId, period: 'all' });
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const volumeChartData = [
    { unit: 'Kg', quantity: salesMetrics?.volumeByUnit.Kg ?? 0 },
    { unit: 'Litres', quantity: salesMetrics?.volumeByUnit.Litres ?? 0 },
    { unit: 'ml', quantity: salesMetrics?.volumeByUnit.ml ?? 0 },
    { unit: 'Units', quantity: salesMetrics?.volumeByUnit.Units ?? 0 },
  ];
  const topSellers = salesMetrics?.topSellers ?? [];
  const mostVolatile = salesMetrics?.mostVolatile ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div>
        <h3 className="mb-1 text-sm font-semibold">Volume sold by unit</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Meals served (kitchen, food plate): <span className="font-medium text-foreground tabular-nums">{formatCount(salesMetrics?.mealsServed ?? 0)}</span>
        </p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="unit" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={40} />
              <Tooltip {...CHART_TOOLTIP} cursor={{ fill: 'var(--muted)' }} formatter={(value) => formatCount(Number(value ?? 0))} />
              <Bar dataKey="quantity" name="Sold" radius={[4, 4, 0, 0]} fill="var(--chart-1)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">Best sellers</h3>
        {topSellers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sales volume yet.</p>
        ) : (
          <ol className="divide-y">
            {topSellers.map((s, i) => (
              <li key={s.productName} className="flex items-start justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-medium">{i + 1}. {s.productName}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatCount(s.quantity)} sold</p>
                </div>
                <p className="text-xs font-semibold whitespace-nowrap tabular-nums">{formatMoney(s.revenue)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">Most volatile prices</h3>
        {mostVolatile.length === 0 ? (
          <p className="text-xs text-muted-foreground">Needs 2 or more price changes per product.</p>
        ) : (
          <ol className="divide-y">
            {mostVolatile.map((v, i) => (
              <li key={v.productName} className="flex items-start justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-medium">{i + 1}. {v.productName}</p>
                  <p className="text-xs text-muted-foreground">Last change {formatDate(v.lastChangeDate)}</p>
                </div>
                <p className="text-xs font-semibold whitespace-nowrap tabular-nums">{v.volatilityPct.toFixed(1)}%</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
