'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useDashboardMetrics, useDashboardSalesSummary, useDashboardRevenueByCategory, useSales } from '@/hooks/use-queries';
import type { DashboardPeriod, DashboardTrendGranularity } from '@/types/api';
import { EMPTY_DASHBOARD_SALES_SUMMARY } from '@/types/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Banknote, ChevronRight, Package, CreditCard, AlertTriangle,
  Users, TrendingUp, UserCheck, Eye, Plus, ArrowUpRight,
  ShoppingCart, MessageSquare, ClipboardList, Wallet,
  BarChart3, UserPlus, PackagePlus, Receipt,
} from 'lucide-react';
import { CustomerType } from '@/types';

import { PRODUCT_CATEGORY_COLORS } from '@/lib/product-categories';

const NAIRA = '\u20A6';
const fmt = (n: number) => `${NAIRA}${n.toLocaleString()}`;
const fmtK = (n: number) => n >= 1_000_000 ? `${NAIRA}${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${NAIRA}${(n / 1000).toFixed(0)}k` : fmt(n);
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

const TT = {
  contentStyle: { backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: 12 },
  cursor: { fill: 'hsl(var(--muted))', opacity: 0.2 },
};

const CAT_COLORS = PRODUCT_CATEGORY_COLORS;

const CREDIT_COLORS = ['#f59e0b', '#ef4444', '#16a34a'];

const SALES_GRANULARITY_OPTIONS: { value: DashboardTrendGranularity; label: string; caption: string }[] = [
  { value: 'day', label: 'Daily', caption: 'Today' },
  { value: 'week', label: 'Weekly', caption: 'Last 8 days' },
  { value: 'month', label: 'Monthly', caption: 'Last 30 days' },
  { value: 'all', label: 'All', caption: 'All time (by month)' },
];

const CATEGORY_PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'all', label: 'All' },
];

function PeriodTabs<T extends string>({
  value,
  onChange,
  options,
}: Readonly<{
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}>) {
  return (
    <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
            value === opt.value
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function formatTrendLabel(
  isoKey: string,
  unit: 'day' | 'week' | 'month',
): string {
  if (unit === 'month') {
    const d = new Date(`${isoKey}-01T00:00:00.000Z`);
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  if (unit === 'week') {
    const start = new Date(`${isoKey}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const fmtDay = (x: Date) =>
      x.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return `${fmtDay(start)} – ${fmtDay(end)}`;
  }
  const d = new Date(`${isoKey}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function DashboardPage() {
  const router = useRouter();
  const [salesGranularity, setSalesGranularity] = useState<DashboardTrendGranularity>('all');
  const [catPeriod, setCatPeriod] = useState<DashboardPeriod>('all');
  const [custFilter, setCustFilter] = useState<'all' | 'B2B' | 'B2C'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const { can, isAdmin, user } = usePermissions();
  const { data: metrics } = useDashboardMetrics();
  const { data: salesSummary, isFetching: salesFetching } = useDashboardSalesSummary(salesGranularity);
  const { data: categoryRevenue } = useDashboardRevenueByCategory(catPeriod);
  const { data: customerSalesResult } = useSales(
    {
      search: selectedCustomer?.name,
      limit: 50,
      exclude_voided: true,
    },
    { enabled: !!selectedCustomer },
  );

  const customers = metrics?.customers ?? [];
  const inventory = metrics?.inventory ?? [];
  const creditSummaries = metrics?.creditSummaries ?? [];
  const feedbacks = metrics?.feedbacks ?? [];
  const enquiries = metrics?.enquiries ?? [];
  const tracker = metrics ? {
    todayRevenue: metrics.revenueToday,
    todayOrders: metrics.salesToday,
    stockAlerts: metrics.lowStockCount + metrics.outOfStockCount,
    lowStock: metrics.lowStockCount,
    outOfStock: metrics.outOfStockCount,
    overdueCredits: metrics.overdueCreditsCount,
    overdueAmount: metrics.overdueAmount,
    openTickets: metrics.openTickets,
    openFeedback: metrics.openFeedback,
    openEnquiries: metrics.openEnquiries,
    totalCustomers: metrics.totalCustomers,
    newCustomersThisMonth: metrics.newCustomersThisMonth,
    totalOutstanding: metrics.totalOutstanding,
  } : {
    todayRevenue: 0, todayOrders: 0, stockAlerts: 0, lowStock: 0, outOfStock: 0,
    overdueCredits: 0, overdueAmount: 0, openTickets: 0, openFeedback: 0, openEnquiries: 0,
    totalCustomers: 0, newCustomersThisMonth: 0, totalOutstanding: 0,
  };

  const salesTrendUnit: 'day' | 'week' | 'month' = (() => {
    if (salesSummary?.granularity) return salesSummary.granularity;
    if (salesGranularity === 'week') return 'week';
    if (salesGranularity === 'month' || salesGranularity === 'all') return 'month';
    return 'day';
  })();

  const salesWindowCaption =
    SALES_GRANULARITY_OPTIONS.find((o) => o.value === salesGranularity)?.caption ?? '';

  const salesData = useMemo(() => {
    const s = salesSummary ?? EMPTY_DASHBOARD_SALES_SUMMARY;
    const unit = s.granularity ?? salesTrendUnit;
    return {
      revenue: s.revenue,
      orders: s.orders,
      profit: s.profit ?? 0,
      aov: s.aov,
      cashRevenue: s.cashRevenue,
      creditRevenue: s.creditRevenue,
      walkIn: s.walkInRevenue,
      delivery: s.deliveryRevenue,
      trend: s.trend.map((row) => ({
        date: formatTrendLabel(row.date, unit),
        rawDate: row.date,
        revenue: row.revenue,
      })),
    };
  }, [salesSummary, salesTrendUnit]);

  // Dense series (month buckets for All, or many day points) get stronger emerald contrast
  const salesChartStyle = useMemo(() => {
    const dense = salesGranularity === 'month' || salesGranularity === 'all' || salesData.trend.length > 14;
    return {
      strokeColor: '#059669',
      topOpacity: dense ? 0.45 : 0.28,
      midOpacity: dense ? 0.22 : 0.12,
      bottomOpacity: dense ? 0.08 : 0.02,
      strokeWidth: dense ? 2.5 : 2,
      chartMinWidth: Math.max(salesData.trend.length * 44, 0),
    };
  }, [salesGranularity, salesData.trend.length]);

  const categoryData = useMemo(
    () =>
      (categoryRevenue?.categories ?? []).map((cat) => ({
        name: cat.name,
        value: cat.revenue,
        fill: cat.fill,
        percentage: cat.percentage,
      })),
    [categoryRevenue],
  );

  // ═══ TOP CUSTOMERS ═══
  const customerData = useMemo(() => {
    const filtered = custFilter === 'all' ? customers : customers.filter((c) => c.type === custFilter);
    const top = [...filtered].filter((c) => c.totalSpent > 0).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
    const total = customers.length;
    const b2b = customers.filter((c) => c.type === CustomerType.B2B).length;
    const b2c = customers.filter((c) => c.type === CustomerType.B2C).length;
    const repeat = customers.filter((c) => c.totalOrders >= 2).length;
    const repeatPct = pct(repeat, total);
    return { top, total, b2b, b2c, repeat, repeatPct };
  }, [customers, custFilter]);

  // ═══ INVENTORY ═══
  const invData = useMemo(() => {
    const totalValue = inventory.reduce((a, i) => a + i.currentStock * i.avgUnitCost, 0);
    const low = inventory.filter((i) => i.currentStock <= i.minStockLevel && i.currentStock > 0);
    const out = inventory.filter((i) => i.currentStock <= 0);

    // Stock by category chart
    const catMap: Record<string, { value: number; count: number }> = {};
    inventory.forEach((i) => {
      if (!catMap[i.category]) catMap[i.category] = { value: 0, count: 0 };
      catMap[i.category].value += i.currentStock * i.avgUnitCost;
      catMap[i.category].count += 1;
    });
    const catChart = Object.entries(catMap)
      .map(([name, data]) => ({ name, value: data.value, count: data.count, fill: CAT_COLORS[name] || CAT_COLORS.Other }))
      .sort((a, b) => b.value - a.value);

    return { skus: inventory.length, totalValue, low, out, catChart };
  }, [inventory]);

  // ═══ CREDIT BOOK ═══
  const creditData = useMemo(() => {
    const outstanding = creditSummaries.filter((c) => c.totalOutstanding > 0);
    const totalOwed = outstanding.reduce((a, c) => a + c.totalOutstanding, 0);
    const overdue = creditSummaries.filter((c) => c.overdueCount > 0);
    const overdueTotal = overdue.reduce((a, c) => a + c.totalOutstanding, 0);
    const pending = creditSummaries.filter((c) => c.openCreditCount > 0 && c.overdueCount === 0);
    const pendingTotal = pending.reduce((a, c) => a + c.totalOutstanding, 0);

    const statusChart = [
      { name: 'Pending', value: pendingTotal, fill: '#f59e0b' },
      { name: 'Overdue', value: overdueTotal, fill: '#ef4444' },
    ].filter((s) => s.value > 0);

    return {
      outstanding: outstanding.length, totalOwed,
      overdue: overdue.length, overdueTotal,
      pending: pending.length, pendingTotal,
      records: outstanding.slice(0, 5).map((c) => ({
        id: c.customerId,
        customerName: c.customerName,
        amountOwed: c.totalOutstanding,
        status: c.overdueCount > 0 ? 'Overdue' as const : 'Pending' as const,
      })),
      statusChart,
    };
  }, [creditSummaries]);

  // ═══ TRACKER DATA — derived from useDashboardMetrics ═══

  // ═══ PURCHASE HISTORY FOR SELECTED CUSTOMER ═══
  const purchaseHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    return (customerSalesResult?.items ?? [])
      .filter((s) => s.customerId === selectedCustomer.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedCustomer, customerSalesResult]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
      {/* Header + Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Sales OS'} &middot; {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════
           TRACKER STRIP
         ═══════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Today's Revenue */}
        <button onClick={() => router.push('/sales')} className="group relative rounded-xl border bg-card p-4 hover:border-emerald-300 transition-all text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Banknote size={16} className="text-emerald-600" />
            </div>
            <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </div>
          <p className="text-xl font-black text-emerald-600">{tracker.todayRevenue > 0 ? fmtK(tracker.todayRevenue) : `${NAIRA}0`}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Today&apos;s Revenue</p>
          {tracker.todayOrders > 0 && <p className="text-[10px] text-muted-foreground">{tracker.todayOrders} order{tracker.todayOrders !== 1 ? 's' : ''}</p>}
        </button>

        {/* Total Outstanding */}
        <button onClick={() => router.push('/credits')} className="group relative rounded-xl border bg-card p-4 hover:border-amber-300 transition-all text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Wallet size={16} className="text-amber-600" />
            </div>
            <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </div>
          <p className="text-xl font-black">{tracker.totalOutstanding > 0 ? fmtK(tracker.totalOutstanding) : `${NAIRA}0`}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Outstanding Credit</p>
        </button>

        {/* Overdue */}
        <button onClick={() => router.push('/credits')} className={`group relative rounded-xl border p-4 transition-all text-left ${tracker.overdueCredits > 0 ? 'bg-red-50/50 border-red-200 hover:border-red-400' : 'bg-card hover:border-muted-foreground/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tracker.overdueCredits > 0 ? 'bg-red-100' : 'bg-muted'}`}>
              <CreditCard size={16} className={tracker.overdueCredits > 0 ? 'text-red-600' : 'text-muted-foreground'} />
            </div>
            {tracker.overdueCredits > 0 && <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{tracker.overdueCredits}</span>}
          </div>
          <p className={`text-xl font-black ${tracker.overdueCredits > 0 ? 'text-red-600' : ''}`}>{tracker.overdueAmount > 0 ? fmtK(tracker.overdueAmount) : `${NAIRA}0`}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Overdue</p>
        </button>

        {/* Stock Alerts */}
        <button onClick={() => router.push('/inventory')} className={`group relative rounded-xl border p-4 transition-all text-left ${tracker.stockAlerts > 0 ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400' : 'bg-card hover:border-muted-foreground/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tracker.stockAlerts > 0 ? 'bg-amber-100' : 'bg-muted'}`}>
              <Package size={16} className={tracker.stockAlerts > 0 ? 'text-amber-600' : 'text-muted-foreground'} />
            </div>
            {tracker.stockAlerts > 0 && <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{tracker.stockAlerts}</span>}
          </div>
          <p className={`text-xl font-black ${tracker.stockAlerts > 0 ? 'text-amber-600' : ''}`}>{tracker.stockAlerts}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Stock Alerts</p>
          {tracker.stockAlerts > 0 && <p className="text-[10px] text-muted-foreground">{tracker.lowStock} low &middot; {tracker.outOfStock} out</p>}
        </button>

        {/* Open Tickets */}
        <button onClick={() => router.push('/interactions')} className={`group relative rounded-xl border p-4 transition-all text-left ${tracker.openTickets > 0 ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400' : 'bg-card hover:border-muted-foreground/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tracker.openTickets > 0 ? 'bg-blue-100' : 'bg-muted'}`}>
              <MessageSquare size={16} className={tracker.openTickets > 0 ? 'text-blue-600' : 'text-muted-foreground'} />
            </div>
            {tracker.openTickets > 0 && <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">{tracker.openTickets}</span>}
          </div>
          <p className={`text-xl font-black ${tracker.openTickets > 0 ? 'text-blue-600' : ''}`}>{tracker.openTickets}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Open Tickets</p>
          {tracker.openTickets > 0 && <p className="text-[10px] text-muted-foreground">{tracker.openFeedback} feedback &middot; {tracker.openEnquiries} enquiries</p>}
        </button>

        {/* Customers */}
        <button onClick={() => router.push('/customers')} className="group relative rounded-xl border bg-card p-4 hover:border-purple-300 transition-all text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users size={16} className="text-purple-600" />
            </div>
            <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </div>
          <p className="text-xl font-black">{tracker.totalCustomers}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Customers</p>
          {tracker.newCustomersThisMonth > 0 && <p className="text-[10px] text-emerald-600 font-semibold">+{tracker.newCustomersThisMonth} this month</p>}
        </button>
      </div>

      {/* ═══════════════════════════════════════
           QUICK ACTIONS
         ═══════════════════════════════════════ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0 mr-1">Quick Actions</span>
        {can('sales.create') && (
          <button onClick={() => router.push('/sales')} className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold hover:border-emerald-300 hover:bg-emerald-50 transition-all">
            <Receipt size={14} className="text-emerald-600" /> Record Sale
          </button>
        )}
        {can('customers.create') && (
          <button onClick={() => router.push('/customers')} className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold hover:border-purple-300 hover:bg-purple-50 transition-all">
            <UserPlus size={14} className="text-purple-600" /> Add Customer
          </button>
        )}
        {can('inventory.create') && (
          <button onClick={() => router.push('/inventory')} className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold hover:border-blue-300 hover:bg-blue-50 transition-all">
            <PackagePlus size={14} className="text-blue-600" /> Add Stock
          </button>
        )}
        {can('credits.view') && (
          <button onClick={() => router.push('/credits')} className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold hover:border-amber-300 hover:bg-amber-50 transition-all">
            <Wallet size={14} className="text-amber-600" /> Manage Credits
          </button>
        )}
        {can('interactions.create') && (
          <button onClick={() => router.push('/interactions')} className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold hover:border-sky-300 hover:bg-sky-50 transition-all">
            <MessageSquare size={14} className="text-sky-600" /> Log Feedback
          </button>
        )}
        <button onClick={() => router.push('/analytics')} className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold hover:border-indigo-300 hover:bg-indigo-50 transition-all">
          <BarChart3 size={14} className="text-indigo-600" /> Analytics
        </button>
      </div>

      {/* ═══════════════════════════════════════
           1. SALES
         ═══════════════════════════════════════ */}
      <div className="rounded-xl border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-5 border-b">
          <div className="flex items-center gap-2">
            <Banknote size={16} className="text-emerald-600" />
            <h2 className="text-sm font-bold">Sales</h2>
            <span className="text-[10px] font-medium text-muted-foreground">{salesWindowCaption}</span>
          </div>
          <PeriodTabs
            value={salesGranularity}
            onChange={setSalesGranularity}
            options={SALES_GRANULARITY_OPTIONS}
          />
        </div>

        <div className="p-5">
          {/* KPIs */}
          <div className={`grid gap-4 mb-5 ${isAdmin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Revenue</p>
              <p className="text-2xl font-black text-emerald-600">{salesData.revenue > 0 ? fmtK(salesData.revenue) : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Orders</p>
              <p className="text-2xl font-black">{salesData.orders}</p>
              {salesData.aov > 0 && <p className="text-[10px] text-muted-foreground">AOV: {fmtK(salesData.aov)}</p>}
            </div>
            {isAdmin && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Profit</p>
                <p className="text-2xl font-black">{salesData.profit > 0 ? fmtK(salesData.profit) : '—'}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Cash / Credit</p>
              <p className="text-sm font-bold text-emerald-600">{fmtK(salesData.cashRevenue)}</p>
              {salesData.creditRevenue > 0 && <p className="text-[10px] font-semibold text-amber-600">{fmtK(salesData.creditRevenue)} credit</p>}
            </div>
          </div>

          {/* Channel split */}
          {salesData.orders > 0 && (
            <div className="flex items-center gap-4 text-xs mb-5 pb-4 border-b">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase mr-1">Channels:</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Walk-In <b>{fmtK(salesData.walkIn)}</b></span>
              {salesData.delivery > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Delivery <b>{fmtK(salesData.delivery)}</b></span>}
            </div>
          )}

          {/* Chart — horizontally scrollable so dense series are not clipped */}
          <div className="relative">
            {salesFetching && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60 text-xs font-medium text-muted-foreground">
                Updating chart…
              </div>
            )}
            <div className="overflow-x-auto">
              <div
                className="h-[240px]"
                style={{
                  minWidth: Math.max(salesChartStyle.chartMinWidth, 320),
                  width: '100%',
                }}
              >
                {salesData.trend.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={Math.max(salesChartStyle.chartMinWidth, 320)}>
                    <AreaChart data={salesData.trend} margin={{ top: 10, right: 24, left: 0, bottom: 4 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={salesChartStyle.strokeColor} stopOpacity={salesChartStyle.topOpacity} />
                          <stop offset="55%" stopColor={salesChartStyle.strokeColor} stopOpacity={salesChartStyle.midOpacity} />
                          <stop offset="100%" stopColor={salesChartStyle.strokeColor} stopOpacity={salesChartStyle.bottomOpacity} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        padding={{ left: 8, right: 8 }}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        dy={8}
                        angle={salesData.trend.length > 16 ? -35 : 0}
                        textAnchor={salesData.trend.length > 16 ? 'end' : 'middle'}
                        height={salesData.trend.length > 16 ? 50 : 30}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickFormatter={(v) => `${NAIRA}${(v / 1000).toFixed(0)}k`}
                        width={48}
                      />
                      <Tooltip
                        {...TT}
                        formatter={(value) => fmt(Number(value))}
                        labelFormatter={(label, payload) => {
                          const raw = payload?.[0]?.payload?.rawDate;
                          return raw ? `${label}` : String(label);
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke={salesChartStyle.strokeColor}
                        strokeWidth={salesChartStyle.strokeWidth}
                        fill="url(#salesGrad)"
                        fillOpacity={1}
                        activeDot={{ r: 4, strokeWidth: 0, fill: salesChartStyle.strokeColor }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : salesData.trend.length === 1 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-3xl font-black text-emerald-600">{fmt(salesData.trend[0].revenue)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{salesData.trend[0].date}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    {salesFetching ? 'Loading sales…' : 'No sales data for this window'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
           2. REVENUE PER CATEGORY
         ═══════════════════════════════════════ */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-emerald-600" />
            <h2 className="text-sm font-bold">Revenue per Category</h2>
          </div>
          <PeriodTabs
            value={catPeriod}
            onChange={setCatPeriod}
            options={CATEGORY_PERIOD_OPTIONS}
          />
        </div>
        <div className="p-5">
          {categoryData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart */}
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v) => `${NAIRA}${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={100} />
                    <Tooltip {...TT} formatter={(value) => fmt(Number(value))} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {categoryData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="space-y-2">
                {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: cat.fill }} />
                      <span className="text-sm font-medium flex-1">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">{cat.percentage}%</span>
                      <span className="text-sm font-bold w-20 text-right">{fmtK(cat.value)}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No sales recorded for this period</p>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════
           3. TOP CUSTOMERS
         ═══════════════════════════════════════ */}
      <div className="rounded-xl border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b gap-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold">Top Customers</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border">
              {([['all', 'All'], ['B2B', 'B2B'], ['B2C', 'B2C']] as ['all' | 'B2B' | 'B2C', string][]).map(([key, label]) => (
                <button key={key} onClick={() => setCustFilter(key)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${custFilter === key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => router.push('/customers')} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Customer list */}
          {customerData.top.length > 0 ? (
            <div className="space-y-1">
              {customerData.top.map((c, idx) => (
                <div key={c.id}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-black text-muted-foreground w-5 text-center">{idx + 1}</span>
                    <p className="text-sm font-semibold flex-1 truncate">{c.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.type === 'B2B' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {c.type}
                    </span>
                    <span className="text-sm font-black text-emerald-600 w-20 text-right">{fmtK(c.totalSpent)}</span>
                    <button
                      onClick={() => setSelectedCustomer(selectedCustomer?.id === c.id ? null : c)}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground border transition-all"
                    >
                      <Eye size={11} />
                      Purchase History
                    </button>
                  </div>

                  {/* Inline purchase history */}
                  {selectedCustomer?.id === c.id && (
                    <div className="ml-8 mr-3 mb-2 rounded-lg border bg-muted/10 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
                        <p className="text-xs font-bold">{c.name} &mdash; {purchaseHistory.length} transactions</p>
                        <button onClick={() => setSelectedCustomer(null)} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">Close</button>
                      </div>
                      {purchaseHistory.length > 0 ? (
                        <div className="max-h-[220px] overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/30 border-b sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-[9px] font-bold text-muted-foreground uppercase">Date</th>
                                <th className="px-3 py-2 text-left text-[9px] font-bold text-muted-foreground uppercase">Product</th>
                                <th className="px-3 py-2 text-center text-[9px] font-bold text-muted-foreground uppercase">Payment</th>
                                <th className="px-3 py-2 text-right text-[9px] font-bold text-muted-foreground uppercase">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {purchaseHistory.map((s) => (
                                <tr key={s.id} className="hover:bg-muted/20">
                                  <td className="px-3 py-2 font-medium whitespace-nowrap">{new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                  <td className="px-3 py-2 truncate max-w-[160px]" title={s.productDetails}>{s.productDetails || '—'}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.isCredit ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{s.isCredit ? 'Credit' : 'Cash'}</span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-black text-emerald-600">{fmt(s.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">No purchase history found</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No customers with purchases yet</p>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════
           4 & 5. INVENTORY + CREDIT BOOK
         ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* INVENTORY */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between p-5 border-b">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <h2 className="text-sm font-bold">Inventory</h2>
            </div>
            <button onClick={() => router.push('/inventory')} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Manage <ChevronRight size={12} />
            </button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg border bg-muted/10">
                <p className="text-3xl font-black">{invData.skus}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Active SKUs</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/10">
                <p className="text-3xl font-black">{fmtK(invData.totalValue)}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Stock Value</p>
              </div>
            </div>

            {/* Stock value by category chart */}
            {invData.catChart.length > 0 && (
              <div className="h-[180px] mb-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Value by Category</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={invData.catChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} interval={0} angle={-35} textAnchor="end" height={50} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickFormatter={(v) => fmtK(v)} />
                    <Tooltip {...TT} formatter={(value) => fmt(Number(value))} />
                    <Bar dataKey="value" name="Stock Value" radius={[3, 3, 0, 0]} barSize={20}>
                      {invData.catChart.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {invData.low.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-amber-600 uppercase mb-2 flex items-center gap-1"><AlertTriangle size={10} /> Low Stock ({invData.low.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {invData.low.slice(0, 6).map((i) => (
                    <span key={i.id} className="text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                      {i.name} ({i.currentStock})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {invData.out.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-red-600 uppercase mb-2 flex items-center gap-1"><AlertTriangle size={10} /> Out of Stock ({invData.out.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {invData.out.slice(0, 6).map((i) => (
                    <span key={i.id} className="text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                      {i.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {invData.low.length === 0 && invData.out.length === 0 && (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5"><TrendingUp size={12} /> All stock levels healthy</p>
            )}
          </div>
        </div>

        {/* CREDIT BOOK */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between p-5 border-b">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className={creditData.overdue > 0 ? 'text-red-600' : 'text-emerald-600'} />
              <h2 className="text-sm font-bold">Credit Book</h2>
            </div>
            <button onClick={() => router.push('/credits')} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Manage <ChevronRight size={12} />
            </button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg border bg-muted/10 text-center">
                <p className="text-xl font-black">{creditData.outstanding}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Outstanding</p>
              </div>
              <div className={`p-3 rounded-lg border text-center ${creditData.overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-muted/10'}`}>
                <p className={`text-xl font-black ${creditData.overdue > 0 ? 'text-red-600' : ''}`}>{creditData.overdue}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Overdue</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/10 text-center">
                <p className="text-xl font-black">{creditData.pending}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Pending</p>
              </div>
            </div>

            {/* Credit status pie chart */}
            {creditData.statusChart.length > 0 && (
              <div className="h-[180px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={creditData.statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={3}>
                      {creditData.statusChart.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip {...TT} formatter={(value) => fmt(Number(value))} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Owed</p>
                <p className="text-xl font-black">{creditData.totalOwed > 0 ? fmtK(creditData.totalOwed) : '—'}</p>
              </div>
              <div className={`p-3 rounded-lg border ${creditData.overdueTotal > 0 ? 'border-red-200' : ''}`}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Overdue Amount</p>
                <p className={`text-xl font-black ${creditData.overdueTotal > 0 ? 'text-red-600' : ''}`}>{creditData.overdueTotal > 0 ? fmtK(creditData.overdueTotal) : fmt(0)}</p>
              </div>
            </div>

            {/* Recent credits */}
            {creditData.records.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Recent</p>
                <div className="space-y-2">
                  {creditData.records.map((cr) => (
                    <div key={cr.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${cr.status === 'Overdue' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className="text-xs font-semibold flex-1 truncate">{cr.customerName}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cr.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {cr.status}
                      </span>
                      <span className="text-xs font-black">{fmtK(cr.amountOwed)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-emerald-600 font-medium">No outstanding credits</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
