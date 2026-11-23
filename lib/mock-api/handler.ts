/**
 * Dev-only axios adapter that answers API calls from local sample data.
 * Installed by lib/api.ts when MOCK_API is on (next dev + no NEXT_PUBLIC_API_URL).
 * Writes succeed but are not persisted, reloads show the original sample data.
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiSale, AnalyticsOverviewData, ApiCustomer } from '@/types/api';
import { MOCK_USER } from '@/lib/mock-auth';
import * as db from './data';
import { kitchenJobList, kitchenJobs } from './kitchen-fixtures';

const { NOW, DAY } = db;

// ── helpers ─────────────────────────────────────────────────────────────────
const ok = (data: unknown, extra: Record<string, unknown> = {}) => ({ message: 'OK', data, ...extra });

function paginate<T>(rows: T[], q: URLSearchParams, defaultLimit = 20) {
  const page = Math.max(1, Number(q.get('page') ?? 1));
  const limit = Math.max(1, Number(q.get('limit') ?? defaultLimit));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    rows: rows.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages, hasMore: page < totalPages },
  };
}

const lc = (s?: string | null) => (s ?? '').toLowerCase();
const matches = (q: URLSearchParams, ...fields: (string | undefined)[]) => {
  const s = lc(q.get('search') ?? q.get('q'));
  return !s || fields.some((f) => lc(f).includes(s));
};
const refId = (v: unknown) => (typeof v === 'string' ? v : (v as { _id?: string } | null)?._id);
const sum = (rows: number[]) => rows.reduce((a, b) => a + b, 0);
const live = (s: ApiSale) => s.status !== 'Voided';

function periodStart(period: string | null): Date | null {
  const d = new Date(NOW);
  d.setHours(0, 0, 0, 0);
  switch (period) {
    case 'today': return d;
    case 'week': return new Date(d.getTime() - 6 * DAY);
    case 'month': return new Date(d.getFullYear(), d.getMonth(), 1);
    case 'quarter': return new Date(d.getTime() - 90 * DAY);
    case 'year': return new Date(d.getFullYear(), 0, 1);
    default: return null;
  }
}

function inRange(date: string, q: URLSearchParams) {
  const from = q.get('date_from') ? new Date(q.get('date_from')!) : periodStart(q.get('period'));
  const to = q.get('date_to') ? new Date(`${q.get('date_to')}T23:59:59`) : null;
  const t = new Date(date);
  return (!from || t >= from) && (!to || t <= to);
}

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleString('en-GB', { month: 'short', year: '2-digit' });
function weekKey(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
const weekLabel = (key: string) => new Date(key).toLocaleString('en-GB', { day: 'numeric', month: 'short' });

function groupBy<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, T[]>();
  rows.forEach((r) => {
    const k = key(r);
    m.set(k, [...(m.get(k) ?? []), r]);
  });
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
}

// ── sales ───────────────────────────────────────────────────────────────────
function filterSales(q: URLSearchParams) {
  return db.sales.filter((s) =>
    inRange(s.date, q) &&
    (!q.get('status') || s.status === q.get('status')) &&
    (!q.get('hub_id') || s.hub === q.get('hub_id')) &&
    (!q.get('customer_id') || s.customer === q.get('customer_id')) &&
    (!q.get('agent_id') || s.agent === q.get('agent_id')) &&
    (!q.get('payment_mode') || s.payment_mode === q.get('payment_mode')) &&
    (!q.get('channel') || s.channel === q.get('channel')) &&
    (q.get('exclude_voided') !== 'true' || live(s)) &&
    matches(q, s.customer_name, s.product_details, s._id, s.agent_name),
  );
}

function salesSummary(rows: ApiSale[]) {
  const valid = rows.filter(live);
  const revenue = sum(valid.map((s) => s.amount));
  const credit = valid.filter((s) => s.payment_mode !== 'Full Payment');
  const unitsByUnit: Record<string, number> = {};
  valid.forEach((s) => {
    const u = s.item?.unit ?? 'Units';
    unitsByUnit[u] = (unitsByUnit[u] ?? 0) + (s.item?.quantity ?? 0);
  });
  return {
    revenue,
    profit: sum(valid.map((s) => s.profit_amount ?? 0)),
    count: valid.length,
    avgOrder: valid.length ? Math.round(revenue / valid.length) : 0,
    creditCount: credit.length,
    creditAmount: sum(credit.map((s) => s.amount - (s.amount_paid ?? 0))),
    deliveryCount: valid.filter((s) => s.channel === 'Delivery').length,
    revenueChange: 12.4,
    profitChange: 8.1,
    unitsByUnit,
  };
}

function salesList(q: URLSearchParams) {
  const rows = filterSales(q);
  const sortBy = q.get('sort_by');
  if (sortBy === 'amount') rows.sort((a, b) => (q.get('sort_dir') === 'asc' ? a.amount - b.amount : b.amount - a.amount));
  const { rows: page, meta } = paginate(rows, q, 25);
  return ok({ items: page, pagination: meta, summary: salesSummary(rows) });
}

function dashboardSalesSummary(q: URLSearchParams) {
  const g = q.get('granularity') ?? 'all';
  const windowStart = g === 'day' ? periodStart('today') : g === 'week' ? periodStart('week') : g === 'month' ? periodStart('month') : null;
  const exact = q.has('date_from') || q.has('date_to');
  const rows = db.sales.filter((s) => live(s) && (exact ? inRange(s.date, q) : !windowStart || new Date(s.date) >= windowStart) && (!q.get('hub_id') || s.hub === q.get('hub_id')));
  const revenue = sum(rows.map((s) => s.amount));
  const unit = g === 'day' || g === 'week' ? 'day' : g === 'month' ? 'day' : 'month';
  const trend = groupBy(rows, (s) => (unit === 'month' ? monthKey(s.date) : s.date.slice(0, 10)))
    .map(([date, list]) => ({ date, revenue: sum(list.map((s) => s.amount)) }));
  return ok({
    revenue,
    orders: rows.length,
    profit: sum(rows.map((s) => s.profit_amount ?? 0)),
    aov: rows.length ? Math.round(revenue / rows.length) : 0,
    cashRevenue: sum(rows.filter((s) => s.payment_mode === 'Full Payment').map((s) => s.amount)),
    creditRevenue: sum(rows.filter((s) => s.payment_mode !== 'Full Payment').map((s) => s.amount)),
    walkInRevenue: sum(rows.filter((s) => s.channel !== 'Delivery').map((s) => s.amount)),
    deliveryRevenue: sum(rows.filter((s) => s.channel === 'Delivery').map((s) => s.amount)),
    granularity: unit,
    trend,
  });
}

function revenueByCategory(q: URLSearchParams) {
  const rows = db.sales.filter((s) => live(s) && inRange(s.date, q) && (!q.get('hub_id') || s.hub === q.get('hub_id')));
  const total = sum(rows.map((s) => s.amount));
  const categories = groupBy(rows, (s) => s.item?.category ?? 'Other')
    .map(([name, list]) => {
      const revenue = sum(list.map((s) => s.amount));
      return { name, revenue, orders: list.length, percentage: total ? Math.round((revenue / total) * 1000) / 10 : 0, fill: db.categoryColor(name) };
    })
    .sort((a, b) => b.revenue - a.revenue);
  return ok({ totalRevenue: total, categories });
}

// ── customers ───────────────────────────────────────────────────────────────
function customerList(q: URLSearchParams) {
  let rows = db.customers.filter((c) =>
    (!q.get('type') || c.customer_type === q.get('type')) &&
    (!q.get('hub_id') || refId(c.customer_location) === q.get('hub_id')) &&
    (!q.get('segment_id') || (c.segments ?? []).some((s) => refId(s) === q.get('segment_id'))) &&
    matches(q, c.customer_name, c.company_name, c.customer_phone, c.customer_email),
  );
  const sortBy = q.get('sort_by') as 'total_orders' | 'total_spent' | null;
  if (sortBy) {
    const dir = q.get('sort_dir') === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => dir * ((a[sortBy] ?? 0) - (b[sortBy] ?? 0)));
  }
  const { rows: page, meta } = paginate(rows, q, 20);
  const monthStart = periodStart('month')!;
  const lastMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const newThisMonth = rows.filter((c) => new Date(c.joined_date!) >= monthStart).length;
  const newLastMonth = rows.filter((c) => { const d = new Date(c.joined_date!); return d >= lastMonthStart && d < monthStart; }).length;
  const totalRevenue = sum(rows.map((c) => c.total_spent ?? 0));
  return {
    data: page.map((c) => ({ ...c, last_purchase_date: lastPurchaseDate(c._id) })),
    meta,
    summary: {
      total: rows.length,
      b2b: rows.filter((c) => c.customer_type === 'B2B').length,
      b2c: rows.filter((c) => c.customer_type === 'B2C').length,
      repeat: rows.filter((c) => (c.total_orders ?? 0) > 1).length,
      totalRevenue,
      avgValue: rows.length ? Math.round(totalRevenue / rows.length) : 0,
      ytdCustomers: rows.filter((c) => new Date(c.joined_date!) >= periodStart('year')!).length,
      newThisMonth,
      newLastMonth,
      newCustomersMomPct: newLastMonth ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : 100,
      retentionRate: 68,
    },
  };
}

function lastPurchaseDate(customerId: string): string | undefined {
  let latest: string | undefined;
  for (const s of db.sales) {
    if (s.customer === customerId && live(s) && (!latest || s.date > latest)) latest = s.date;
  }
  return latest;
}

function lastSaleDays(c: ApiCustomer) {
  const last = db.sales.find((s) => s.customer === c._id && live(s));
  return last ? Math.floor((NOW.getTime() - new Date(last.date).getTime()) / DAY) : 999;
}

function engagement(q: URLSearchParams) {
  const rows = db.customers
    .filter((c) => (c.total_orders ?? 0) > 1)
    .map((c) => {
      const days = lastSaleDays(c);
      const avgInterval = Math.max(7, Math.round(180 / (c.total_orders ?? 1)));
      const activity: 'At Risk' | 'Dormant' = days > avgInterval * 3 ? 'Dormant' : 'At Risk';
      return {
        id: c._id,
        name: c.company_name ?? c.customer_name,
        phone: c.customer_phone,
        hub: (c.customer_location as { hub_name?: string }).hub_name ?? '',
        loyalty: (c.total_orders ?? 0) > 8 ? 'Loyal' : 'Regular',
        loyaltyGrade: (c.total_orders ?? 0) > 8 ? 'A' : 'B',
        activity,
        daysSinceLast: days,
        avgInterval,
        daysLate: Math.max(0, days - avgInterval),
        lastOrderDate: new Date(NOW.getTime() - days * DAY).toISOString(),
        recommendedAction: activity === 'Dormant' ? 'Send a win-back offer' : 'Send a WhatsApp check-in',
        ltv: c.total_spent ?? 0,
        totalOrders: c.total_orders ?? 0,
      };
    })
    .filter((r) => r.daysLate > 0)
    .filter((r) => !q.get('activity') || q.get('activity') === 'All' || r.activity === q.get('activity'));
  return { data: rows, meta: { total: rows.length, summaryUpdatedAt: NOW.toISOString(), summaryStale: false } };
}

// ── credits ─────────────────────────────────────────────────────────────────
function creditSummary(q: URLSearchParams) {
  const open = db.credits.filter((c) => c.status !== 'Clear' && c.status !== 'Voided');
  const weekEnd = NOW.getTime() + 7 * DAY;
  const rows = groupBy(open, (c) => c.customer_id).map(([customer_id, list]) => {
    const cust = db.customers.find((c) => c._id === customer_id);
    const hub = cust?.customer_location as { _id?: string; hub_name?: string } | undefined;
    const dueSoon = list.filter((c) => c.status !== 'Overdue' && new Date(c.due_date).getTime() <= weekEnd);
    return {
      customer_id,
      customer_name: list[0].customer_name,
      total_outstanding: sum(list.map((c) => c.amount_owed)),
      open_credit_count: list.length,
      overdue_count: list.filter((c) => c.status === 'Overdue').length,
      oldest_due_date: list.map((c) => c.due_date).sort()[0] ?? null,
      flagged_count: list.filter((c) => c.flagged).length,
      customer_phone: cust?.customer_phone,
      hub_id: hub?._id,
      hub_name: hub?.hub_name,
      overdue_amount: sum(list.filter((c) => c.status === 'Overdue').map((c) => c.amount_owed)),
      last_payment_date: list.map((c) => c.last_payment_date).filter(Boolean).sort().at(-1) ?? null,
      due_this_week_count: dueSoon.length,
      due_this_week_amount: sum(dueSoon.map((c) => c.amount_owed)),
    };
  })
    .filter((r) => matches(q, r.customer_name) && (q.get('flagged') !== 'true' || r.flagged_count > 0))
    .filter((r) => !q.get('hub_id') || r.hub_id === q.get('hub_id'))
    .sort((a, b) => b.total_outstanding - a.total_outstanding);
  return ok(rows);
}

// ── analytics overview ──────────────────────────────────────────────────────
function analyticsOverview(q: URLSearchParams): AnalyticsOverviewData {
  const rows = db.sales.filter((s) => live(s) && inRange(s.date, q));
  const totalRevenue = sum(rows.map((s) => s.amount));
  const byMonth = groupBy(rows, (s) => monthKey(s.date));
  const byWeek = groupBy(rows, (s) => weekKey(s.date));
  const last30 = rows.filter((s) => NOW.getTime() - new Date(s.date).getTime() < 30 * DAY);
  const trend = (groups: [string, ApiSale[]][], label: (k: string) => string) =>
    groups.map(([key, list]) => ({ key, month: label(key), revenue: sum(list.map((s) => s.amount)), orders: list.length }));
  const monthlyTrend = trend(byMonth, monthLabel);
  const curr = monthlyTrend.at(-1);
  const prev = monthlyTrend.at(-2);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const credit = db.credits;
  const outstanding = sum(credit.map((c) => c.amount_owed));
  const overdue = sum(credit.filter((c) => c.status === 'Overdue').map((c) => c.amount_owed));
  const cleared = sum(credit.filter((c) => c.status === 'Clear').map((c) => c.original_amount));
  const custSorted = [...db.customers].sort((a, b) => (b.total_spent ?? 0) - (a.total_spent ?? 0));
  const top20Count = Math.ceil(custSorted.length * 0.2);
  const custRev = sum(custSorted.map((c) => c.total_spent ?? 0));
  const productGroups = groupBy(rows, (s) => s.item?.product_name ?? 'Other');
  const split = (key: (s: ApiSale) => string) =>
    groupBy(rows, key).map(([name, list]) => ({ name, value: sum(list.map((s) => s.amount)), count: list.length }));
  const clvBands = [[0, 100_000, 'Under ₦100k'], [100_000, 500_000, '₦100k-500k'], [500_000, 2_000_000, '₦500k-2m'], [2_000_000, Infinity, '₦2m+']] as const;
  const aging = [[0, 30, '0-30 days'], [31, 60, '31-60 days'], [61, 90, '61-90 days'], [91, 9999, '90+ days']] as const;
  const openCredits = credit.filter((c) => c.amount_owed > 0);

  return {
    sales: {
      monthlyTrend,
      weeklyTrend: trend(byWeek, weekLabel),
      dailyTrend: trend(groupBy(last30, (s) => s.date.slice(0, 10)), weekLabel),
      growth: curr && prev ? {
        revGrowth: Math.round(((curr.revenue - prev.revenue) / Math.max(1, prev.revenue)) * 1000) / 10,
        orderGrowth: Math.round(((curr.orders - prev.orders) / Math.max(1, prev.orders)) * 1000) / 10,
        currMonth: curr.month,
        prevMonth: prev.month,
      } : null,
      dayOfWeekPattern: days.map((day, i) => {
        const list = rows.filter((s) => (new Date(s.date).getDay() + 6) % 7 === i);
        const revenue = sum(list.map((s) => s.amount));
        return { day, revenue, avgRevenue: Math.round(revenue / 26), orders: list.length };
      }),
      channelBreakdown: groupBy(rows, (s) => s.channel ?? 'Walk-In').map(([name, list]) => ({ name, revenue: sum(list.map((s) => s.amount)), count: list.length })),
      paymentModeSplit: split((s) => s.payment_mode ?? 'Full Payment'),
      paymentTypeSplit: split((s) => s.payment_type ?? 'Cash'),
      collectedVsOutstanding: { collected: totalRevenue - outstanding, outstanding, total: totalRevenue },
      aovTrend: monthlyTrend.map((m) => ({ key: m.key, month: m.month, aov: Math.round(m.revenue / Math.max(1, m.orders)) })),
      aovWeeklyTrend: trend(byWeek, weekLabel).map((m) => ({ key: m.key, month: m.month, aov: Math.round(m.revenue / Math.max(1, m.orders)) })),
      totalRevenue,
    },
    products: {
      productRevenue: productGroups
        .map(([name, list]) => ({ id: list[0].item?.product_id, name, category: list[0].item?.category ?? '', revenue: sum(list.map((s) => s.amount)), count: list.length }))
        .sort((a, b) => b.revenue - a.revenue),
      categoryRevenue: groupBy(rows, (s) => s.item?.category ?? 'Other')
        .map(([name, list]) => ({ name, revenue: sum(list.map((s) => s.amount)), orders: list.length, fill: db.categoryColor(name) }))
        .sort((a, b) => b.revenue - a.revenue),
      stockTurnover: db.products.slice(0, 12).map((p) => {
        const unitsSold = sum(rows.filter((s) => s.item?.product_id === p._id).map((s) => s.item?.quantity ?? 0));
        return { id: p._id, name: p.name, category: p.category, unitsSold, currentStock: p.current_stock, turnover: Math.round((unitsSold / Math.max(1, p.current_stock)) * 10) / 10, fill: db.categoryColor(p.category) };
      }),
      deadStock: db.products
        .filter((p) => p.current_stock > 0 && !rows.some((s) => s.item?.product_id === p._id && NOW.getTime() - new Date(s.date).getTime() < 30 * DAY))
        .map((p) => ({ id: p._id, name: p.name, category: p.category, currentStock: p.current_stock })),
    },
    customers: {
      kpis: {
        totalCustomers: db.customers.length,
        avgLifetimeValue: Math.round(custRev / db.customers.length),
        repeatRate: Math.round((db.customers.filter((c) => (c.total_orders ?? 0) > 1).length / db.customers.length) * 100),
      },
      acquisitionTrend: groupBy(db.customers, (c) => monthKey(c.joined_date!)).map(([key, list], i, all) => ({
        key, month: monthLabel(key), new: list.length, total: sum(all.slice(0, i + 1).map(([, l]) => l.length)),
      })),
      acquisitionWeeklyTrend: groupBy(db.customers.filter((c) => NOW.getTime() - new Date(c.joined_date!).getTime() < 90 * DAY), (c) => weekKey(c.joined_date!))
        .map(([key, list]) => ({ key, month: weekLabel(key), new: list.length, total: list.length })),
      clvDistribution: clvBands.map(([min, max, label]) => {
        const list = db.customers.filter((c) => (c.total_spent ?? 0) >= min && (c.total_spent ?? 0) < max);
        return { label, min, max: Number.isFinite(max) ? max : 99_999_999, count: list.length, revenue: sum(list.map((c) => c.total_spent ?? 0)) };
      }),
      segmentData: db.segments.map((seg) => {
        const list = db.customers.filter((c) => (c.segments ?? []).some((s) => refId(s) === seg._id));
        return { name: seg.name, customers: list.length, revenue: sum(list.map((c) => c.total_spent ?? 0)), value: list.length };
      }),
      buyerAnalysis: [
        { name: 'B2B', value: db.customers.filter((c) => c.customer_type === 'B2B').length, fill: '#16a34a' },
        { name: 'B2C', value: db.customers.filter((c) => c.customer_type === 'B2C').length, fill: '#0891b2' },
      ],
      topSpenders: custSorted.slice(0, 10).map((c) => ({ id: c._id, name: c.company_name ?? c.customer_name, type: c.customer_type, totalSpent: c.total_spent ?? 0, totalOrders: c.total_orders ?? 0 })),
      repeatCustomers: [...db.customers].sort((a, b) => (b.total_orders ?? 0) - (a.total_orders ?? 0)).slice(0, 10)
        .map((c) => ({ id: c._id, name: c.company_name ?? c.customer_name, type: c.customer_type, totalOrders: c.total_orders ?? 0, totalSpent: c.total_spent ?? 0 })),
      concentration: {
        top20Pct: Math.round((sum(custSorted.slice(0, top20Count).map((c) => c.total_spent ?? 0)) / Math.max(1, custRev)) * 100),
        top20Count,
        total: custSorted.length,
        totalRev: custRev,
      },
      feedback: {
        sentiments: groupBy(db.feedbacks, (f) => f.sentiment ?? 'Neutral').map(([name, list]) => ({ name, value: list.length })),
        complaintsBySegment: [{ name: 'Restaurant Partners', value: 3 }, { name: 'Wholesale', value: 2 }, { name: 'VIP', value: 1 }],
      },
    },
    credit: {
      kpis: { totalOutstanding: outstanding, totalOverdue: overdue, totalCleared: cleared, collectionRate: Math.round((cleared / Math.max(1, cleared + outstanding)) * 100) },
      agingReport: aging.map(([min, max, label]) => {
        const list = openCredits.filter((c) => {
          const age = Math.floor((NOW.getTime() - new Date(c.date_issued).getTime()) / DAY);
          return age >= min && age <= max;
        });
        return { label, min, max, amount: sum(list.map((c) => c.amount_owed)), count: list.length };
      }),
      topDebtors: [...openCredits].sort((a, b) => b.amount_owed - a.amount_owed).slice(0, 8).map((c) => ({
        id: c.id, customerId: c.customer_id, customerName: c.customer_name, amountOwed: c.amount_owed, dateIssued: c.date_issued, status: c.status,
      })),
      customerRisk: groupBy(openCredits, (c) => c.customer_id).map(([id, list]) => {
        const cust = db.customers.find((c) => c._id === id)!;
        const owed = sum(list.map((c) => c.amount_owed));
        return {
          customerId: id,
          name: list[0].customer_name,
          type: cust.customer_type,
          totalSpent: cust.total_spent ?? 0,
          totalOwed: owed,
          overdueAmount: sum(list.filter((c) => c.status === 'Overdue').map((c) => c.amount_owed)),
          creditRatio: Math.round((owed / Math.max(1, cust.total_spent ?? 1)) * 100),
          overdueCount: list.filter((c) => c.status === 'Overdue').length,
        };
      }).sort((a, b) => b.totalOwed - a.totalOwed),
      collectionTrend: groupBy(credit, (c) => monthKey(c.date_issued)).map(([key, list]) => {
        const issued = sum(list.map((c) => c.original_amount));
        const clr = sum(list.map((c) => c.original_amount - c.amount_owed));
        return { key, month: monthLabel(key), issued, cleared: clr, rate: Math.round((clr / Math.max(1, issued)) * 100) };
      }),
      collectionWeeklyTrend: [],
    },
  };
}

function inventorySalesMetrics(q: URLSearchParams) {
  const rows = db.sales.filter((s) => live(s) && inRange(s.date, q));
  const vol = { Kg: 0, Litres: 0, Units: 0, ml: 0 };
  rows.forEach((s) => {
    const u = s.item?.unit;
    const qty = s.item?.quantity ?? 0;
    if (u === 'Kg') vol.Kg += qty;
    else if (u === 'Liters') vol.Litres += qty;
    else vol.Units += qty;
  });
  const topSellers = groupBy(rows, (s) => s.item?.product_name ?? '')
    .map(([productName, list]) => ({ productName, quantity: sum(list.map((s) => s.item?.quantity ?? 0)), revenue: sum(list.map((s) => s.amount)) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const mostVolatile = db.products.slice(0, 5).map((p, i) => ({
    productName: p.name,
    volatilityPct: 14 - i * 2,
    lastChangeDate: p.price_history?.at(-1)?.date ?? null,
    minPrice: Math.min(...(p.price_history ?? []).map((h) => h.price)),
    maxPrice: Math.max(...(p.price_history ?? []).map((h) => h.price)),
  }));
  return ok({ volumeByUnit: vol, topSellers, mostVolatile, mealsServed: 1840 });
}

// Alert preferences are kept in memory so toggles round-trip like the real API.
const alertPrefs = { email: 'critical', push: false, muted: ['quote_confirmed'] as string[], mutable_types: ['job_confirmed', 'not_accepted', 'due_soon', 'quote_confirmed', 'completed_with_balance', 'bulk_job'] };

// POS operations (transactions, tills, shifts, payment review) built from POS-channel sales.
// Cursor pagination like the real API: ?before=<cursor> returns the next 20 rows.
function posOperations(section: string, q: URLSearchParams) {
  const tills = db.hubs.flatMap((h, i) => [1, 2].map((n) => ({
    _id: `till_${h._id}_${n}`, hub: h._id, device_id: `T-${i + 1}${n}`, label: `Till ${n}`,
    registered: n === 1 || i % 2 === 0, revoked: i === 1 && n === 2, last_seen: new Date(NOW.getTime() - (i * 3 + n) * 3_600_000).toISOString(),
  })));
  const pos = db.sales.filter((s) => s.channel === 'POS');
  const statusOf = (i: number, s: ApiSale) => (s.status === 'Voided' ? 'cancelled' : i % 11 === 3 ? 'awaiting' : i % 13 === 5 ? 'review' : 'completed');
  let rows: Record<string, unknown>[] = [];
  if (section === 'tills') rows = tills;
  if (section === 'transactions') rows = pos.map((s, i) => {
    const till = tills.find((t) => t.hub === s.hub && t.label === `Till ${(i % 2) + 1}`);
    return {
      _id: `txn_${s._id}`, hub: s.hub, client_sale_id: `POS-${String(s._id).replace('sale_', '').padStart(5, '0')}`, device_id: till?.device_id,
      cashier_id: s.agent, cashier_name: s.agent_name, kind: i % 17 === 4 ? 'refund' : 'sale', status: statusOf(i, s), total_kobo: s.amount * 100, createdAt: s.date,
      receipt: { lines: [{ name: s.item?.product_name ?? 'Item', qty: s.item?.quantity ?? 1, lineTotal: s.amount * 100 }], receiptPayment: { checkoutReference: `CHK-${s._id}`, provider: 'Moniepoint', actualMethod: s.payment_type ?? 'Cash' } },
    };
  });
  if (section === 'shifts') rows = tills.filter((t) => !t.revoked).map((t, i) => ({
    _id: `shift_${t._id}`, hub: t.hub, device_id: t.device_id, client_shift_id: `SH-${100 + i}`, cashier_name: db.users[i % db.users.length]?.full_name,
    status: i % 3 === 0 ? 'open' : 'closed', opened_at: new Date(NOW.getTime() - (i + 8) * 3_600_000).toISOString(), closed_at: i % 3 === 0 ? undefined : new Date(NOW.getTime() - i * 3_600_000).toISOString(), variance: i % 4 === 1 ? -50_000 : 0,
  }));
  if (section === 'reviews') rows = pos.filter((s, i) => statusOf(i, s) === 'review').map((s) => ({
    _id: `rev_${s._id}`, hub: s.hub, createdAt: s.date, checkoutReference: `CHK-${s._id}`, review_reason: 'Terminal amount does not match the receipt',
    evidence: { amountKobo: s.amount * 100, terminalSerial: 'MP-2231', reference: `REV-${s._id}`, transactionReference: `TRX-${s._id}` },
  }));
  const day = (r: Record<string, unknown>) => String(r.createdAt ?? r.opened_at ?? r.last_seen ?? '');
  const text = (r: Record<string, unknown>) => JSON.stringify(r).toLowerCase();
  const filtered = rows.filter((r) =>
    (!q.get('hub_id') || r.hub === q.get('hub_id')) &&
    (section === 'tills' || !day(r) || inRange(day(r), q)) &&
    (!q.get('q') || text(r).includes(lc(q.get('q')))) &&
    (!q.get('reference') || text(r).includes(lc(q.get('reference')))) &&
    (!q.get('status') || r.status === q.get('status')) &&
    (!q.get('kind') || r.kind === q.get('kind')) &&
    (!q.get('device_id') || r.device_id === q.get('device_id')) &&
    (!q.get('cashier_id') || r.cashier_id === q.get('cashier_id')));
  filtered.sort((a, b) => day(b).localeCompare(day(a)));
  const start = Number(q.get('before') ?? 0);
  const page = filtered.slice(start, start + 20);
  return { data: page, nextCursor: start + 20 < filtered.length ? String(start + 20) : null };
}

// ── router ──────────────────────────────────────────────────────────────────
type Route = [RegExp, (m: RegExpMatchArray, q: URLSearchParams) => unknown];

const GET_ROUTES: Route[] = [
  [/^auth\/whoami$/, () => ok({ ...MOCK_USER })],
  [/^hub$/, () => ok(db.hubs)],
  [/^hub\/([^/]+)$/, (m) => ok(db.hubs.find((h) => h._id === m[1]) ?? null)],
  [/^hub\/[^/]+\/pos-devices$/, () => ({ data: [] })],
  [/^pos\/operations\/(transactions|tills|shifts|reviews)$/, (m, q) => posOperations(m[1], q)],
  [/^roles$/, () => ok(db.roles)],
  [/^users$/, (_m, q) => ({ page: 1, limit: Number(q.get('limit') ?? 200), total: db.users.length, totalPages: 1, users: db.users })],
  [/^dashboard\/metrics$/, () => ({
    totalCustomers: db.customers.length,
    sales_today: db.sales.filter((s) => live(s) && new Date(s.date) >= periodStart('today')!).length,
    revenue_today: sum(db.sales.filter((s) => live(s) && new Date(s.date) >= periodStart('today')!).map((s) => s.amount)),
    customersByLocation: db.hubs.map((h) => ({ name: h.hub_name, customers: db.customers.filter((c) => refId(c.customer_location) === h._id).length })),
    feedbackBreakdown: groupBy(db.feedbacks, (f) => f.type).map(([name, list]) => ({ name, value: list.length })),
    revenue_trend: groupBy(db.sales.filter(live), (s) => s.date.slice(0, 10)).slice(-30).map(([date, list]) => ({ date, amount: sum(list.map((s) => s.amount)) })),
  })],
  [/^dashboard\/sales-summary$/, (_m, q) => dashboardSalesSummary(q)],
  [/^dashboard\/revenue-by-category$/, (_m, q) => revenueByCategory(q)],
  [/^analytics\/overview$/, (_m, q) => ok(analyticsOverview(q))],
  [/^customers$/, (_m, q) => customerList(q)],
  [/^customers\/segments$/, () => ok(db.segments)],
  [/^customers\/engagement$/, (_m, q) => engagement(q)],
  [/^customers\/([^/]+)$/, (m) => ok(db.customers.find((c) => c._id === m[1]) ?? db.customers[0])],
  [/^sales$/, (_m, q) => salesList(q)],
  [/^sales\/([^/]+)$/, (m) => ok(db.sales.find((s) => s._id === m[1]) ?? null)],
  [/^inventory$/, (_m, q) => ok(db.products.filter((p) =>
    (!q.get('category') || p.category === q.get('category')) &&
    (!q.get('hub_id') || refId(p.hub) === q.get('hub_id')) &&
    (q.get('low_stock') !== 'true' || p.current_stock <= p.min_stock_level) &&
    matches(q, p.name, p.sku)))],
  [/^inventory\/sales-metrics$/, (_m, q) => inventorySalesMetrics(q)],
  [/^inventory\/stock-logs$/, (_m, q) => {
    // The API takes `type=PURCHASE`; mock rows say "Purchase", so compare case-insensitively.
    const rows = db.stockLogs.filter((l) => (!q.get('item_id') || refId(l.item) === q.get('item_id')) && (!q.get('type') || lc(l.type) === lc(q.get('type'))) && inRange(String(l.date), q));
    const { rows: page, meta } = paginate(rows, q, 25);
    return ok(page, { meta });
  }],
  [/^inventory\/requests$/, (_m, q) => ok(db.inventoryRequests.filter((r) => !q.get('status') || r.status === q.get('status')))],
  [/^inventory\/([^/]+)\/batches$/, (m) => {
    const p = db.products.find((x) => x._id === m[1]);
    return ok(p ? [{ batch_number: 'B4821', quantity_remaining: p.current_stock, unit_cost: p.avg_unit_cost, unit_price: p.base_selling_price, received_date: p.last_stock_update, supplier: db.suppliers[0].name, uom: p.unit_of_measure }] : []);
  }],
  [/^inventory\/([^/]+)\/suppliers$/, () => ok([])],
  [/^inventory\/([^/]+)\/sales-performance$/, () => ok(null)],
  [/^suppliers$/, (_m, q) => ({
    data: db.suppliers.filter((s) => matches(q, s.name, s.contact_person)),
    summary: { total: db.suppliers.length, active: db.suppliers.filter((s) => s.is_active).length, open_issues: db.supplierIssues.filter((i) => i.status === 'Open').length },
  })],
  [/^suppliers\/([^/]+)\/issues$/, (m) => ok(db.supplierIssues.filter((i) => refId(i.supplier) === m[1]))],
  [/^suppliers\/([^/]+)\/purchases$/, (m) => {
    const name = db.suppliers.find((s) => s._id === m[1])?.name;
    const rows = db.stockLogs.filter((l) => l.supplier === name);
    const total = sum(rows.map((l) => l.quantity * l.unit_cost));
    return { data: rows, summary: { order_count: rows.length, total_spend: total, avg_order: rows.length ? Math.round(total / rows.length) : 0 } };
  }],
  [/^suppliers\/([^/]+)$/, (m) => db.suppliers.find((s) => s._id === m[1]) ?? db.suppliers[0]],
  [/^credits\/summary$/, (_m, q) => creditSummary(q)],
  [/^credits$/, (_m, q) => ok(db.credits.filter((c) => !q.get('customer_id') || c.customer_id === q.get('customer_id')))],
  [/^credits\/([^/]+)$/, (m) => ok(db.credits.find((c) => c.id === m[1]) ?? null)],
  [/^feedbacks$/, (_m, q) => ok(db.feedbacks.filter((f) => !q.get('status') || f.status === q.get('status')))],
  [/^enquiries$/, (_m, q) => ok(db.enquiries.filter((e) => !q.get('status') || e.status === q.get('status')))],
  [/^compensations$/, () => ok(db.compensations)],
  [/^tasks$/, (_m, q) => ok(db.tasks.filter((t) => (!q.get('status') || t.status === q.get('status')) && (!q.get('assigned_to') || t.assigned_to === q.get('assigned_to'))))],
  [/^audit-trail$/, (_m, q) => {
    const rows = db.auditLogs.filter((l) => matches(q, l.details, l.user_name));
    const { rows: page, meta } = paginate(rows, q, 25);
    return ok({ items: page, pagination: meta, summary: { total: rows.length, bulk: 0, sales: rows.filter((l) => l.entity_type === 'Sale').length, inventory: 0, customers: rows.filter((l) => l.entity_type === 'Customer').length } });
  }],
  [/^kitchen\/jobs$/, (_m, q) => kitchenJobList(q)],
  [/^kitchen\/jobs\/([^/]+)$/, (m) => ok(kitchenJobs().find((j) => j._id === m[1]) ?? null)],
  [/^kitchen\/jobs\/([^/]+)\/events$/, (m) => ok([{ _id: `ev-${m[1]}`, job: m[1], at: new Date().toISOString(), by: 'u-1', by_name: 'Ada', type: 'create', text: 'Job created', data: null }])],
  [/^kitchen\/settings$/, () => ok({
    defaults: {
      markup_packs: 150, markup_buffet: 120, markup_trays: 140, food_cost_pct: 35, round_to: 500, buffer_pct: 10,
      service_charge_pct: 0, protein_basis: 'cost', min_profit_job: 20_000, ack_minutes: 30, due_soon_minutes: 120,
      quote_expiry_days: 7, escalate_after_reminders: 2, post_sales_on_complete: true, credit_days: 14,
    },
    alert_rules: [],
    running_costs: null,
    running_costs_source: 'company',
    hubs_with_override: [],
    can_edit: true,
  })],
  [/^kitchen\/analytics$/, () => ok({
    completed: { jobs: 0, revenue: 0, collected: 0, owed: 0, average: 0, costed_jobs: 0 },
    by_outlet: [], by_channel: [], by_month: [],
    time_to_accept: { jobs: 0, median_minutes: null, average_minutes: null },
    quotes: { sent: 0, converted: 0, declined: 0, expired: 0, open: 0, conversion_rate: null },
    cancelled: { jobs: 0, top_reasons: [] },
  })],
  [/^pos\/overview$/, (_m, q) => {
    const pos = db.sales.filter((s) => live(s) && s.channel === 'POS' && inRange(s.date, q));
    const loc = db.hubs.map((h) => {
      const list = pos.filter((s) => s.hub === h._id);
      return { id: h._id, name: h.hub_name, locationType: h.location_type ?? 'hub', parentHubId: refId(h.parent_hub) ?? null, tillCount: 2, registeredCount: 2, netSales: sum(list.map((s) => s.amount)), transactions: list.length, refunds: 0 };
    });
    return ok({
      dateFrom: q.get('date_from') ?? '', dateTo: q.get('date_to') ?? '', timeZone: 'Africa/Lagos', currency: 'NGN',
      tillCount: loc.length * 2, registeredCount: loc.length * 2,
      netSales: sum(pos.map((s) => s.amount)), transactions: pos.length, refunds: 0,
      locations: loc,
      payments: groupBy(pos, (s) => s.payment_type ?? 'Cash').map(([method, list]) => ({ method, netSales: sum(list.map((s) => s.amount)), transactions: list.length })),
    });
  }],
  [/^notifications$/, () => ({ data: db.notifications, unread: db.notifications.filter((n) => !n.readAt).length, live: false })],
  [/^notifications\/preferences$/, () => ok({ ...alertPrefs })],
  [/^notifications\/push\/key$/, () => ok(null)],
];

function route(method: string, path: string, q: URLSearchParams, body: unknown): { status: number; data: unknown } {
  if (method === 'get') {
    for (const [re, fn] of GET_ROUTES) {
      const m = path.match(re);
      if (m) return { status: 200, data: fn(m, q) };
    }
    // Unmapped list endpoints (kitchen, POS, insights…) come back empty.
    return { status: 200, data: ok([], { meta: { page: 1, limit: 20, total: 0, totalPages: 1, hasMore: false } }) };
  }
  if (path === 'auth/login') return { status: 200, data: ok({ ...MOCK_USER }) };
  if (path === 'pos/live-ticket') return { status: 200, data: ok(null) };
  if (/^hub\/[^/]+\/pos-enrollment-codes$/.test(path)) return { status: 200, data: ok({ code: '482913', expiresAt: new Date(NOW.getTime() + 15 * 60_000).toISOString(), hubId: path.split('/')[1], hubName: '' }) };
  if (path === 'notifications/preferences') {
    Object.assign(alertPrefs, body && typeof body === 'object' ? body : {});
    return { status: 200, data: ok({ ...alertPrefs }) };
  }
  // Writes: echo the payload back so success toasts and optimistic UI work.
  const payload = body && typeof body === 'object' ? body : {};
  return { status: 200, data: ok({ _id: db.newId('mock'), id: db.newId('mock'), ...payload, createdAt: NOW.toISOString() }) };
}

export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const raw = (config.url ?? '').replace(/^undefined/, '').replace(/^https?:\/\/[^/]+\/?/, '').replace(/^\//, '');
  const [path, query = ''] = raw.split('?');
  const q = new URLSearchParams(query);
  Object.entries((config.params as Record<string, unknown>) ?? {}).forEach(([k, v]) => v != null && q.set(k, String(v)));
  let body: unknown = config.data;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* keep string */ }
  }
  const method = (config.method ?? 'get').toLowerCase();
  // Small delay so loading states are visible but brief.
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
  const res = route(method, path.replace(/\/$/, ''), q, body);
  if (config.responseType === 'blob' || config.responseType === 'arraybuffer') {
    res.data = new Blob(['Mock export, no backend connected.'], { type: 'text/plain' });
  }
  if (process.env.NODE_ENV === 'development') console.debug(`[mock-api] ${method.toUpperCase()} /${raw}`);
  return { data: res.data, status: res.status, statusText: 'OK', headers: {}, config, request: {} } as AxiosResponse;
};
