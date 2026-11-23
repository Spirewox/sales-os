import type { Sale } from '@/types';

const DAY = 86_400_000;

export type PurchaseAnalytics = NonNullable<ReturnType<typeof buildPurchaseAnalytics>>;

/** Buying pattern for one customer, from their sales (newest first or any order). `now` keeps it pure. */
export function buildPurchaseAnalytics(customerSales: Sale[], now: number) {
  if (customerSales.length === 0) return null;
  const asc = [...customerSales].sort((a, b) => (a.date < b.date ? -1 : 1));
  const n = asc.length;
  const totalSpent = asc.reduce((a, s) => a + s.amount, 0);
  const totalProfit = asc.reduce((a, s) => a + (s.profitAmount || 0), 0);
  const aov = totalSpent / n;
  const avgMargin = totalSpent > 0 ? (totalProfit / totalSpent) * 100 : 0;
  const lastMs = new Date(asc[n - 1].date).getTime();
  const firstMs = new Date(asc[0].date).getTime();
  const daysSinceLast = Math.max(0, Math.floor((now - lastMs) / DAY));
  const tenureDays = Math.max(1, Math.floor((lastMs - firstMs) / DAY));

  const intervals: number[] = [];
  for (let i = 1; i < n; i++) intervals.push((new Date(asc[i].date).getTime() - new Date(asc[i - 1].date).getTime()) / DAY);
  const avgInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
  let regularity = 'Single order';
  if (intervals.length === 1) regularity = 'New';
  else if (intervals.length >= 2) {
    const mean = avgInterval;
    const cv = mean > 0 ? Math.sqrt(intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length) / mean : 0;
    regularity = cv < 0.45 ? 'Regular' : cv < 0.85 ? 'Semi-regular' : 'Sporadic';
  }
  const ordersPerMonth = n / Math.max(1, tenureDays / 30);

  const recent = asc.filter((s) => now - new Date(s.date).getTime() <= 90 * DAY).reduce((a, s) => a + s.amount, 0);
  const prior = asc.filter((s) => { const d = now - new Date(s.date).getTime(); return d > 90 * DAY && d <= 180 * DAY; }).reduce((a, s) => a + s.amount, 0);
  let trend: 'Growing' | 'Stable' | 'Declining' = 'Stable';
  let trendPct = 0;
  if (prior > 0) { trendPct = Math.round(((recent - prior) / prior) * 100); trend = trendPct > 15 ? 'Growing' : trendPct < -15 ? 'Declining' : 'Stable'; }
  else if (recent > 0) { trend = 'Growing'; trendPct = 100; }

  let activity: 'Active' | 'At Risk' | 'Dormant' = 'Active';
  if (avgInterval > 0) { if (daysSinceLast > avgInterval * 3) activity = 'Dormant'; else if (daysSinceLast > avgInterval * 1.8) activity = 'At Risk'; }
  else if (daysSinceLast > 90) activity = 'Dormant';
  const nextExpected = avgInterval > 0 ? new Date(lastMs + avgInterval * DAY) : null;

  const channelCounts: Record<string, number> = {};
  asc.forEach((s) => { const ch = s.channel || 'Unspecified'; channelCounts[ch] = (channelCounts[ch] || 0) + 1; });
  const preferredChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const creditCount = asc.filter((s) => s.isCredit).length;
  const biggest = asc.reduce((m, s) => (s.amount > m.amount ? s : m), asc[0]);

  let rec = { tone: 'neutral' as 'good' | 'warn' | 'neutral', text: '' };
  const cadenceDays = Math.round(avgInterval);
  const hasCadence = cadenceDays > 0;
  if (activity === 'Dormant') {
    rec = { tone: 'warn', text: hasCadence ? `No order in ${daysSinceLast} days (usually every ~${cadenceDays}). Win-back outreach recommended.` : `No order in ${daysSinceLast} days. Win-back outreach recommended.` };
  } else if (activity === 'At Risk') {
    rec = { tone: 'warn', text: hasCadence ? `Overdue for a reorder: ${daysSinceLast} days since last vs ~${cadenceDays}-day cadence. Follow up now.` : `No reorder in ${daysSinceLast} days. Follow up now.` };
  } else if (trend === 'Growing' && totalSpent >= 200000) rec = { tone: 'good', text: `Spend up ${trendPct}% recently, strong account. Upsell higher-margin lines or offer priority delivery.` };
  else if (regularity === 'Regular') rec = { tone: 'good', text: `Predictable buyer (~every ${Math.round(avgInterval)} days). Good candidate for a standing order or subscription.` };
  else if (trend === 'Declining') rec = { tone: 'warn', text: `Spend down ${Math.abs(trendPct)}% vs prior quarter. Check satisfaction and re-engage.` };
  else rec = { tone: 'neutral', text: `${regularity} buyer, ${activity.toLowerCase()}. Nurture toward a regular cadence.` };

  return { n, totalSpent, totalProfit, aov, avgMargin, daysSinceLast, avgInterval, regularity, ordersPerMonth, trend, trendPct, activity, nextExpected, preferredChannel, creditCount, cashCount: n - creditCount, biggest, firstDate: asc[0].date, lastDate: asc[n - 1].date, rec };
}

/** Monthly spend, oldest first. */
export function buildSpendingTrend(customerSales: Sale[]) {
  const byMonth: Record<string, number> = {};
  customerSales.forEach((s) => {
    const month = s.date.substring(0, 7);
    byMonth[month] = (byMonth[month] || 0) + s.amount;
  });
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month: new Date(`${month}-01T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      amount,
    }));
}

/** Products this customer buys most, by revenue. */
export function buildTopProducts(customerSales: Sale[]) {
  const map: Record<string, { itemName: string; uom: string; qty: number; revenue: number; orders: number }> = {};
  customerSales.forEach((s) => {
    const name = s.item?.productName || s.productDetails || 'Sale';
    const qty = s.item?.quantity ?? 1;
    const uom = s.item?.unit || s.item?.saleUnit || '';
    const e = map[name] || { itemName: name, uom, qty: 0, revenue: 0, orders: 0 };
    e.qty += qty;
    e.revenue += s.amount;
    e.orders += 1;
    if (!e.uom && uom) e.uom = uom;
    map[name] = e;
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

export function buildPaymentSplit(customerSales: Sale[]) {
  const credit = customerSales.filter((s) => s.isCredit);
  const cash = customerSales.filter((s) => !s.isCredit);
  return {
    creditCount: credit.length,
    creditTotal: credit.reduce((a, s) => a + s.amount, 0),
    cashCount: cash.length,
    cashTotal: cash.reduce((a, s) => a + s.amount, 0),
  };
}
