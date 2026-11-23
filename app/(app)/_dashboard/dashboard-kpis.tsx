'use client';

import { KpiStrip, type KpiCell } from '@/components/app';
import { formatCount, formatMoneyShort, plural } from '@/lib/format';
import type { SalesListSummary } from '@/types';
import type { DashboardMetricsData } from '@/types/api';
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

/**
 * Second strip: the old tracker's Customers and Open tickets tiles and the old Inventory card's
 * product count and stock value. All are as of today, so they ignore the period.
 */
export function DashboardTodayKpis({ metrics, metricsLoading, stock, stockLoading, canCustomers, canTickets, canStock }: Readonly<{
  metrics: DashboardMetricsData | undefined;
  metricsLoading: boolean;
  stock: { skus: number; value: number };
  stockLoading: boolean;
  canCustomers: boolean;
  canTickets: boolean;
  canStock: boolean;
}>) {
  const m = metrics;
  const cells: KpiCell[] = [
    {
      label: 'Customers',
      value: formatCount(m?.totalCustomers ?? 0),
      href: canCustomers ? '/customers' : undefined,
      detail: m && m.newCustomersThisMonth > 0 ? <span className="font-medium text-primary">+{formatCount(m.newCustomersThisMonth)} this month</span> : 'None new this month',
    },
    {
      label: 'Open tickets',
      value: formatCount(m?.openTickets ?? 0),
      href: canTickets ? '/engagement?tab=interactions' : undefined,
      detail: m ? `${formatCount(m.openFeedback)} feedback, ${formatCount(m.openEnquiries)} ${m.openEnquiries === 1 ? 'enquiry' : 'enquiries'}` : undefined,
    },
    { label: 'Active products', value: formatCount(stock.skus), href: canStock ? '/inventory' : undefined, detail: 'In the catalogue' },
    { label: 'Stock value', value: formatMoneyShort(stock.value), href: canStock ? '/inventory' : undefined, detail: 'At average unit cost' },
  ];
  return <KpiStrip label="Customers, tickets and stock, today" cells={cells} loading={metricsLoading || stockLoading} />;
}
