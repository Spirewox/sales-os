import {
  Customer, Sale, Supplier, SupplierIssue, StockLog,
  InventoryItem, CreditRecord, Agent, StockMovementType,
} from '../types';
import { deriveSegments } from './segmentation';

/**
 * Semantic insight layer.
 *
 * Defines comparable "entities" (customers, suppliers, products, categories,
 * segments, hubs, agents) and a set of derived metrics for each — a context
 * layer over the raw data. `compare()` resolves metrics for two entities and
 * produces a scored, narrated comparison — enabling business questions that
 * aren't measured anywhere else (e.g. "which of these two vendors is better?").
 */

export type EntityKind = 'customer' | 'supplier' | 'product' | 'category' | 'segment' | 'hub' | 'agent';

export interface Metric {
  key: string;
  label: string;
  value: number;
  display: string;
  /** true = higher is better, false = lower is better, null = neutral (no winner) */
  higherIsBetter: boolean | null;
  group: string; // context layer, e.g. 'Revenue', 'Profitability', 'Risk'
}

export interface EntityDef { id: string; label: string; sublabel?: string; }

export interface DataBundle {
  customers: Customer[];
  sales: Sale[];
  suppliers: Supplier[];
  supplierIssues: SupplierIssue[];
  stockLogs: StockLog[];
  inventory: InventoryItem[];
  credits: CreditRecord[];
  agents: Agent[];
}

export const ENTITY_KINDS: { key: EntityKind; label: string; noun: string }[] = [
  { key: 'customer', label: 'Customers', noun: 'customer' },
  { key: 'supplier', label: 'Suppliers', noun: 'supplier' },
  { key: 'product', label: 'Products', noun: 'product' },
  { key: 'category', label: 'Categories', noun: 'category' },
  { key: 'segment', label: 'Segments', noun: 'segment' },
  { key: 'hub', label: 'Hubs', noun: 'hub' },
  { key: 'agent', label: 'Agents', noun: 'agent' },
];

const DAY = 86_400_000;
const money = (n: number) => {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(v) >= 1000) return '₦' + (v / 1000).toFixed(0) + 'k';
  return '₦' + v.toLocaleString();
};
const num = (n: number) => Math.round(n).toLocaleString();
const pct = (n: number) => `${Math.round(n)}%`;
const days = (n: number) => `${Math.round(n)}d`;
const m = (key: string, label: string, value: number, display: string, higherIsBetter: boolean | null, group: string): Metric =>
  ({ key, label, value, display, higherIsBetter, group });

const extractHub = (pd?: string): string | null => {
  if (!pd) return null;
  const match = pd.match(/^\[([^\]]+)\]/);
  return match ? match[1] : null;
};

const PURCHASE = StockMovementType.PURCHASE;
const SALE = StockMovementType.SALE;

// ── Entity listing ──
export function listEntities(kind: EntityKind, d: DataBundle): EntityDef[] {
  switch (kind) {
    case 'customer':
      return d.customers.map((c) => ({ id: c.id, label: c.name, sublabel: c.type })).sort((a, b) => a.label.localeCompare(b.label));
    case 'supplier':
      return d.suppliers.map((s) => ({ id: s.id, label: s.name, sublabel: s.businessType })).sort((a, b) => a.label.localeCompare(b.label));
    case 'product':
      return d.inventory.map((i) => ({ id: i.id, label: i.name, sublabel: i.category })).sort((a, b) => a.label.localeCompare(b.label));
    case 'category':
      return Array.from(new Set(d.inventory.map((i) => i.category))).sort().map((c) => ({ id: c, label: c }));
    case 'segment': {
      const set = new Set<string>();
      d.customers.forEach((c) => deriveSegments(c).forEach((s) => set.add(s)));
      return Array.from(set).sort().map((s) => ({ id: s, label: s }));
    }
    case 'hub': {
      const set = new Set<string>();
      d.customers.forEach((c) => c.location && set.add(c.location));
      d.inventory.forEach((i) => i.location && set.add(i.location));
      return Array.from(set).sort().map((h) => ({ id: h, label: h }));
    }
    case 'agent':
      return d.agents.map((a) => ({ id: a.id, label: a.name, sublabel: a.role }));
    default:
      return [];
  }
}

export function entityLabel(kind: EntityKind, id: string, d: DataBundle): string {
  return listEntities(kind, d).find((e) => e.id === id)?.label || id;
}

// ── Metric resolution ──
export function resolveMetrics(kind: EntityKind, id: string, d: DataBundle): Metric[] {
  const nonVoid = d.sales.filter((s) => s.status !== 'Voided');
  const now = Date.now();

  switch (kind) {
    case 'customer': {
      const c = d.customers.find((x) => x.id === id);
      if (!c) return [];
      const cs = nonVoid.filter((s) => s.customerId === id);
      const revenue = cs.reduce((a, s) => a + s.amount, 0);
      const orders = cs.length;
      const profit = cs.reduce((a, s) => a + (s.profitAmount || 0), 0);
      const aov = orders ? revenue / orders : 0;
      const margin = revenue ? (profit / revenue) * 100 : 0;
      const cr = d.credits.filter((x) => x.customerId === id);
      const owed = cr.reduce((a, x) => a + x.amountOwed, 0);
      const overdue = cr.some((x) => x.status === 'Overdue') ? 1 : 0;
      const lastDate = cs.reduce((mx, s) => (s.date > mx ? s.date : mx), '');
      const recency = lastDate ? Math.floor((now - new Date(lastDate).getTime()) / DAY) : Infinity;
      const cashRatio = orders ? (cs.filter((s) => !s.isCredit).length / orders) * 100 : 0;
      return [
        m('revenue', 'Lifetime Revenue', revenue, money(revenue), true, 'Revenue'),
        m('orders', 'Total Orders', orders, num(orders), true, 'Activity'),
        m('aov', 'Avg Order Value', aov, money(aov), true, 'Revenue'),
        m('profit', 'Gross Profit', profit, money(profit), true, 'Profitability'),
        m('margin', 'Profit Margin', margin, pct(margin), true, 'Profitability'),
        m('recency', 'Days Since Last Order', recency === Infinity ? 9999 : recency, recency === Infinity ? '—' : days(recency), false, 'Engagement'),
        m('cashRatio', 'Cash Payment Share', cashRatio, pct(cashRatio), true, 'Risk'),
        m('owed', 'Outstanding Credit', owed, money(owed), false, 'Risk'),
        m('overdue', 'Overdue Account', overdue, overdue ? 'Yes' : 'No', false, 'Risk'),
        m('segments', 'Auto Segments', deriveSegments(c).length, num(deriveSegments(c).length), null, 'Profile'),
      ];
    }
    case 'supplier': {
      const sup = d.suppliers.find((x) => x.id === id);
      if (!sup) return [];
      const purchases = d.stockLogs.filter((l) => l.type === PURCHASE && l.supplierId === id);
      const spend = purchases.reduce((a, l) => a + Math.abs(l.quantity) * l.unitCost, 0);
      const unitsBought = purchases.reduce((a, l) => a + Math.abs(l.quantity), 0);
      const skuIds = new Set(purchases.map((l) => l.itemId));
      const avgCost = unitsBought ? spend / unitsBought : 0;
      const saleLogs = d.stockLogs.filter((l) => l.type === SALE && skuIds.has(l.itemId));
      const unitsSold = saleLogs.reduce((a, l) => a + Math.abs(l.quantity), 0);
      const retailRev = saleLogs.reduce((a, l) => a + Math.abs(l.quantity) * l.unitPrice, 0);
      const retailCogs = saleLogs.reduce((a, l) => a + Math.abs(l.quantity) * l.unitCost, 0);
      const retailProfit = retailRev - retailCogs;
      const retailMargin = retailRev ? (retailProfit / retailRev) * 100 : 0;
      const sellThrough = unitsBought ? Math.min(100, (unitsSold / unitsBought) * 100) : 0;
      const openIssues = d.supplierIssues.filter((i) => i.supplierId === id && i.status === 'Open').length;
      const totalIssues = d.supplierIssues.filter((i) => i.supplierId === id).length;
      return [
        m('spend', 'Procurement Spend', spend, money(spend), null, 'Volume'),
        m('pos', 'Purchase Orders', purchases.length, num(purchases.length), null, 'Volume'),
        m('skus', 'SKUs Supplied', skuIds.size, num(skuIds.size), true, 'Breadth'),
        m('avgCost', 'Avg Unit Cost', avgCost, money(avgCost), false, 'Cost'),
        m('retailProfit', 'Retail Profit Generated', retailProfit, money(retailProfit), true, 'Value'),
        m('retailMargin', 'Retail Margin on Goods', retailMargin, pct(retailMargin), true, 'Profitability'),
        m('sellThrough', 'Sell-through', sellThrough, pct(sellThrough), true, 'Efficiency'),
        m('rating', 'Reliability Rating', sup.rating || 0, `${sup.rating || 0}★`, true, 'Reliability'),
        m('lead', 'Lead Time', sup.leadTimeDays ?? 0, days(sup.leadTimeDays ?? 0), false, 'Operations'),
        m('openIssues', 'Open Issues', openIssues, num(openIssues), false, 'Reliability'),
        m('totalIssues', 'Total Issues Logged', totalIssues, num(totalIssues), false, 'Reliability'),
      ];
    }
    case 'product': {
      const it = d.inventory.find((x) => x.id === id);
      if (!it) return [];
      const saleLogs = d.stockLogs.filter((l) => l.type === SALE && l.itemId === id);
      const unitsSold = saleLogs.reduce((a, l) => a + Math.abs(l.quantity), 0);
      const revenue = saleLogs.reduce((a, l) => a + Math.abs(l.quantity) * l.unitPrice, 0);
      const cogs = saleLogs.reduce((a, l) => a + Math.abs(l.quantity) * l.unitCost, 0);
      const profit = revenue - cogs;
      const margin = revenue ? (profit / revenue) * 100 : 0;
      const dts = saleLogs.map((l) => new Date(l.date).getTime());
      const spanDays = dts.length ? Math.max(1, (Math.max(...dts) - Math.min(...dts)) / DAY) : 0;
      const perMonth = spanDays ? unitsSold / (spanDays / 30) : 0;
      const cover = perMonth ? Math.round(it.currentStock / (perMonth / 30)) : Infinity;
      const suppliersCount = new Set(d.stockLogs.filter((l) => l.type === PURCHASE && l.itemId === id).map((l) => l.supplierId || l.supplier).filter(Boolean)).size;
      return [
        m('unitsSold', 'Units Sold', unitsSold, num(unitsSold), true, 'Sales'),
        m('revenue', 'Revenue', revenue, money(revenue), true, 'Sales'),
        m('profit', 'Gross Profit', profit, money(profit), true, 'Profitability'),
        m('margin', 'Margin', margin, pct(margin), true, 'Profitability'),
        m('perMonth', 'Sell Velocity / mo', perMonth, num(Math.round(perMonth)), true, 'Sales'),
        m('stock', 'Current Stock', it.currentStock, num(it.currentStock), null, 'Inventory'),
        m('cover', 'Days of Cover', cover === Infinity ? 0 : cover, cover === Infinity ? '—' : days(cover), null, 'Inventory'),
        m('price', 'Selling Price', it.baseSellingPrice, money(it.baseSellingPrice), null, 'Pricing'),
        m('cost', 'Avg Unit Cost', it.avgUnitCost, money(it.avgUnitCost), false, 'Cost'),
        m('suppliers', 'Supplier Sources', suppliersCount, num(suppliersCount), true, 'Sourcing'),
      ];
    }
    case 'category': {
      const items = d.inventory.filter((i) => i.category === id);
      const ids = new Set(items.map((i) => i.id));
      const saleLogs = d.stockLogs.filter((l) => l.type === SALE && ids.has(l.itemId));
      const revenue = saleLogs.reduce((a, l) => a + Math.abs(l.quantity) * l.unitPrice, 0);
      const cogs = saleLogs.reduce((a, l) => a + Math.abs(l.quantity) * l.unitCost, 0);
      const profit = revenue - cogs;
      const margin = revenue ? (profit / revenue) * 100 : 0;
      const unitsSold = saleLogs.reduce((a, l) => a + Math.abs(l.quantity), 0);
      const spend = d.stockLogs.filter((l) => l.type === PURCHASE && ids.has(l.itemId)).reduce((a, l) => a + Math.abs(l.quantity) * l.unitCost, 0);
      const stockValue = items.reduce((a, i) => a + i.currentStock * i.avgUnitCost, 0);
      return [
        m('skus', 'SKUs', items.length, num(items.length), null, 'Breadth'),
        m('revenue', 'Revenue', revenue, money(revenue), true, 'Sales'),
        m('profit', 'Gross Profit', profit, money(profit), true, 'Profitability'),
        m('margin', 'Margin', margin, pct(margin), true, 'Profitability'),
        m('unitsSold', 'Units Sold', unitsSold, num(unitsSold), true, 'Sales'),
        m('spend', 'Procurement Spend', spend, money(spend), null, 'Cost'),
        m('stockValue', 'Stock Value', stockValue, money(stockValue), null, 'Inventory'),
      ];
    }
    case 'segment': {
      const inSeg = d.customers.filter((c) => deriveSegments(c).includes(id));
      const ids = new Set(inSeg.map((c) => c.id));
      const cs = nonVoid.filter((s) => ids.has(s.customerId));
      const revenue = cs.reduce((a, s) => a + s.amount, 0);
      const orders = cs.length;
      const profit = cs.reduce((a, s) => a + (s.profitAmount || 0), 0);
      const aov = orders ? revenue / orders : 0;
      const owed = d.credits.filter((x) => ids.has(x.customerId)).reduce((a, x) => a + x.amountOwed, 0);
      const avgLtv = inSeg.length ? inSeg.reduce((a, c) => a + c.totalSpent, 0) / inSeg.length : 0;
      return [
        m('customers', 'Customers', inSeg.length, num(inSeg.length), true, 'Size'),
        m('revenue', 'Revenue', revenue, money(revenue), true, 'Sales'),
        m('orders', 'Orders', orders, num(orders), true, 'Activity'),
        m('aov', 'Avg Order Value', aov, money(aov), true, 'Sales'),
        m('avgLtv', 'Avg Lifetime Value', avgLtv, money(avgLtv), true, 'Value'),
        m('profit', 'Gross Profit', profit, money(profit), true, 'Profitability'),
        m('owed', 'Credit Exposure', owed, money(owed), false, 'Risk'),
      ];
    }
    case 'hub': {
      const custs = d.customers.filter((c) => c.location === id);
      const custIds = new Set(custs.map((c) => c.id));
      const cs = nonVoid.filter((s) => extractHub(s.productDetails) === id);
      const revenue = cs.reduce((a, s) => a + s.amount, 0);
      const orders = cs.length;
      const profit = cs.reduce((a, s) => a + (s.profitAmount || 0), 0);
      const stockValue = d.inventory.filter((i) => i.location === id).reduce((a, i) => a + i.currentStock * i.avgUnitCost, 0);
      const owed = d.credits.filter((x) => custIds.has(x.customerId)).reduce((a, x) => a + x.amountOwed, 0);
      return [
        m('revenue', 'Sales Revenue', revenue, money(revenue), true, 'Sales'),
        m('orders', 'Orders', orders, num(orders), true, 'Activity'),
        m('profit', 'Gross Profit', profit, money(profit), true, 'Profitability'),
        m('customers', 'Customers', custs.length, num(custs.length), true, 'Base'),
        m('stockValue', 'Stock Value', stockValue, money(stockValue), null, 'Inventory'),
        m('owed', 'Credit Exposure', owed, money(owed), false, 'Risk'),
      ];
    }
    case 'agent': {
      const cs = nonVoid.filter((s) => s.agentId === id);
      const revenue = cs.reduce((a, s) => a + s.amount, 0);
      const orders = cs.length;
      const profit = cs.reduce((a, s) => a + (s.profitAmount || 0), 0);
      const aov = orders ? revenue / orders : 0;
      const added = d.customers.filter((c) => c.addedByAgentId === id).length;
      const collected = d.credits.reduce((a, cr) => a + (cr.payments || []).filter((p) => p.recordedBy === id).reduce((x, p) => x + p.amount, 0), 0);
      const resolved = d.supplierIssues.filter((i) => i.reportedByAgentId === id && i.status === 'Resolved').length;
      return [
        m('revenue', 'Sales Revenue', revenue, money(revenue), true, 'Sales'),
        m('orders', 'Orders Closed', orders, num(orders), true, 'Activity'),
        m('aov', 'Avg Order Value', aov, money(aov), true, 'Sales'),
        m('profit', 'Profit Generated', profit, money(profit), true, 'Profitability'),
        m('added', 'Customers Added', added, num(added), true, 'Growth'),
        m('collected', 'Credit Collected', collected, money(collected), true, 'Collections'),
        m('resolved', 'Issues Handled', resolved, num(resolved), true, 'Service'),
      ];
    }
    default:
      return [];
  }
}

// ── Comparison engine ──
export interface CompareRow { key: string; label: string; group: string; a: Metric; b: Metric | undefined; winner: 'a' | 'b' | null; deltaPct: number; }
export interface CompareGroup { group: string; rows: CompareRow[]; }
export interface Insight { text: string; winner: 'a' | 'b' | null; }
export interface CompareResult {
  aLabel: string; bLabel: string;
  groups: CompareGroup[];
  aWins: number; bWins: number;
  insights: Insight[];
}

export function compare(kind: EntityKind, aId: string, bId: string, d: DataBundle): CompareResult {
  const aM = resolveMetrics(kind, aId, d);
  const bM = resolveMetrics(kind, bId, d);
  const bMap: Record<string, Metric> = Object.fromEntries(bM.map((x) => [x.key, x]));
  const aLabel = entityLabel(kind, aId, d);
  const bLabel = entityLabel(kind, bId, d);

  const rows: CompareRow[] = aM.map((a) => {
    const b = bMap[a.key];
    let winner: 'a' | 'b' | null = null;
    let deltaPct = 0;
    if (b && a.higherIsBetter !== null && a.value !== b.value) {
      const aBetter = a.higherIsBetter ? a.value > b.value : a.value < b.value;
      winner = aBetter ? 'a' : 'b';
      const base = Math.max(Math.abs(a.value), Math.abs(b.value));
      deltaPct = base > 0 ? Math.round((Math.abs(a.value - b.value) / base) * 100) : 0;
    }
    return { key: a.key, label: a.label, group: a.group, a, b, winner, deltaPct };
  });

  const groupOrder = Array.from(new Set(rows.map((r) => r.group)));
  const groups = groupOrder.map((g) => ({ group: g, rows: rows.filter((r) => r.group === g) }));
  const aWins = rows.filter((r) => r.winner === 'a').length;
  const bWins = rows.filter((r) => r.winner === 'b').length;

  const insights: Insight[] = [];
  if (aWins !== bWins) {
    const leader = aWins > bWins ? aLabel : bLabel;
    insights.push({ text: `${leader} leads overall — ahead on ${Math.max(aWins, bWins)} of ${aWins + bWins} comparable metrics.`, winner: aWins > bWins ? 'a' : 'b' });
  } else {
    insights.push({ text: `${aLabel} and ${bLabel} are evenly matched (${aWins}–${bWins} on comparable metrics).`, winner: null });
  }
  rows.filter((r) => r.winner && r.deltaPct > 0).sort((x, y) => y.deltaPct - x.deltaPct).slice(0, 5).forEach((r) => {
    const w = r.winner === 'a' ? aLabel : bLabel;
    const wv = r.winner === 'a' ? r.a.display : r.b!.display;
    const lv = r.winner === 'a' ? r.b!.display : r.a.display;
    insights.push({ text: `${w} wins on ${r.label}: ${wv} vs ${lv} — a ${r.deltaPct}% gap.`, winner: r.winner });
  });

  return { aLabel, bLabel, groups, aWins, bWins, insights };
}
