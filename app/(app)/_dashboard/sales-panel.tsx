'use client';

import { useMemo } from 'react';
import { AreaChart, Area, Bar, BarChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART_TOOLTIP, formatAxisMoney, formatDate, formatMoney, formatMoneyShort } from '@/lib/format';
import type { DashboardSalesSummary } from '@/types/api';
import { addDays } from '@/components/app/calendar';
import { Panel } from './panel';

function trendLabel(key: string, unit: 'day' | 'week' | 'month'): string {
  if (unit === 'month') return formatDate(`${key}-01T12:00:00Z`, { month: 'short', year: '2-digit' });
  return formatDate(`${key}T12:00:00Z`, { day: 'numeric', month: 'short' });
}

type Point = { key: string; label: string; revenue: number };

/**
 * Daily series with every day present: days without sales count as zero, so a chart always draws.
 * Monthly series (All time) are left as returned.
 */
function fillDays(rows: { date: string; revenue: number }[], unit: string, from?: string | null, to?: string | null): Point[] {
  const byKey = new Map(rows.map((r) => [r.date.slice(0, unit === 'month' ? 7 : 10), r.revenue]));
  if (unit === 'month' || !from || !to) return rows.map((r) => ({ key: r.date, label: trendLabel(r.date, unit === 'month' ? 'month' : 'day'), revenue: r.revenue }));
  const out: Point[] = [];
  for (let d = from, i = 0; d <= to && i < 400; d = addDays(d, 1), i++) out.push({ key: d, label: trendLabel(d, 'day'), revenue: byKey.get(d) ?? 0 });
  return out;
}

/** Revenue over the page period, with how it was paid and sold underneath. */
export function SalesPanel({ summary, contextTrend, range, loading, refreshing, periodLabel, showProfit, className }: Readonly<{
  summary: DashboardSalesSummary | undefined;
  /** For a single-day period: the last 7 days, charted with the day highlighted. */
  contextTrend?: DashboardSalesSummary;
  range: { from: string | null; to: string | null };
  loading: boolean;
  refreshing: boolean;
  periodLabel: string;
  showProfit: boolean;
  className?: string;
}>) {
  const trend = useMemo(
    () => fillDays(summary?.trend ?? [], summary?.granularity === 'month' ? 'month' : 'day', range.from, range.to),
    [summary, range.from, range.to],
  );
  const singleDay = trend.length < 2 && !!range.to;
  const week = useMemo(
    () => (singleDay && range.to ? fillDays(contextTrend?.trend ?? [], 'day', addDays(range.to, -6), range.to) : []),
    [singleDay, contextTrend, range.to],
  );

  const s = summary;
  const profit = s?.profit ?? 0;
  const margin = s && s.revenue > 0 ? Math.round((profit / s.revenue) * 100) : null;

  return (
    <Panel title="Sales" caption={singleDay ? `${periodLabel}, against the last 7 days` : periodLabel} className={className}>
      <div className="space-y-4 p-5">
        <div className="relative h-[220px]" aria-busy={refreshing}>
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : singleDay ? (
            <>
              {/* One day can't make a trend line: show it as the highlighted bar among the last 7 days. */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={week} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} width={56} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} tickFormatter={formatAxisMoney} />
                  <Tooltip {...CHART_TOOLTIP} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} formatter={(v) => [formatMoney(Number(v)), 'Revenue']} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {week.map((p) => <Cell key={p.key} fill={p.key === range.to ? 'var(--chart-1)' : 'var(--chart-4)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="sr-only">Today is highlighted against the previous 6 days.</p>
            </>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={24} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} dy={6} />
                <YAxis axisLine={false} tickLine={false} width={56} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} tickFormatter={formatAxisMoney} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v) => [formatMoney(Number(v)), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#salesFill)" activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--chart-1)' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {refreshing && !loading && <div className="absolute inset-0 rounded-md bg-card/50" aria-hidden />}
        </div>

        {s && s.orders > 0 && (
          <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-xs sm:grid-cols-4">
            <Fact label="Paid upfront" value={formatMoneyShort(s.cashRevenue)} />
            <Fact label="On credit" value={formatMoneyShort(s.creditRevenue)} />
            <Fact label="Walk-in" value={formatMoneyShort(s.walkInRevenue)} />
            <Fact label="Delivery" value={formatMoneyShort(s.deliveryRevenue)} />
            <Fact label="Average order" value={s.aov > 0 ? formatMoneyShort(s.aov) : '-'} />
            {showProfit && <Fact label="Profit" value={formatMoneyShort(profit)} />}
            {showProfit && margin != null && <Fact label="Margin" value={`${margin}%`} />}
          </dl>
        )}
      </div>
    </Panel>
  );
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
