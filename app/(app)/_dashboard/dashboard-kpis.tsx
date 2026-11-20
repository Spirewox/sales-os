'use client';

import { KpiStrip, type KpiCell } from '@/components/app';
import { formatCount, formatMoneyShort, plural } from '@/lib/format';
import type { SalesListSummary } from '@/types';
import type { DashboardWindow } from './dashboard-period';
import type { AttentionData } from './use-attention-data';

const pctChange = (now: number, before: number | undefined) =>
  before != null && before > 0 ? ((now - before) / before) * 100 : null;

/** Four numbers: revenue and orders for the period (vs the previous one), what's owed, stock alerts. */
export function DashboardKpis({
  window: w,
  summary,
  previous,
  attention,
  loading,
}: Readonly<{
  window: DashboardWindow;
  summary: SalesListSummary | undefined;
  previous: SalesListSummary | undefined;
  attention: AttentionData;
  loading: boolean;
}>) {
  const revenue = summary?.revenue ?? 0;
  const orders = summary?.count ?? 0;
  const revenueChange = w.previous ? pctChange(revenue, previous?.revenue) : null;
  const ordersChange = w.previous ? pctChange(orders, previous?.count) : null;
  const salesHref = `/sales?period=${w.period.preset}`;
  const { owed, overdueAmount, overdue, outOfStock, lowStock } = attention;
  const stockAlerts = outOfStock + lowStock;

  const cells: KpiCell[] = [
    {
      label: 'Revenue',
      value: formatMoneyShort(revenue),
      href: salesHref,
      change: revenueChange != null ? { pct: revenueChange, label: w.previousLabel } : null,
      detail: revenueChange == null ? w.label : undefined,
    },
    {
      label: 'Orders',
      value: formatCount(orders),
      href: salesHref,
      change: ordersChange != null ? { pct: ordersChange, label: w.previousLabel } : null,
      detail: ordersChange == null ? (summary && summary.avgOrder > 0 ? `${formatMoneyShort(summary.avgOrder)} average` : w.label) : undefined,
    },
    {
      label: 'Owed to you',
      value: formatMoneyShort(owed),
      href: '/credits?overdue=1',
      detail: overdue.length > 0
        ? <span className="font-medium text-destructive">{formatMoneyShort(overdueAmount)} overdue, {plural(overdue.length, 'customer')}</span>
        : 'Nothing overdue',
    },
    {
      label: 'Stock alerts',
      value: formatCount(stockAlerts),
      href: '/inventory?stock=low',
      tone: outOfStock > 0 ? 'danger' : lowStock > 0 ? 'warning' : 'default',
      detail: stockAlerts > 0 ? `${formatCount(lowStock)} low, ${formatCount(outOfStock)} out of stock` : 'All above minimum',
    },
  ];

  return <KpiStrip label={`Key figures, ${w.label.toLowerCase()}`} cells={cells} loading={loading} />;
}
