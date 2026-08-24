import { StockMovementType } from '../types';
import { DataBundle } from './insights';
import { deriveSegments } from './segmentation';

/**
 * Self-serve, multi-dataset exploration engine.
 *
 * Every data domain in the system (Sales, Customers, Inventory, Suppliers,
 * Stock Movements, Credits, Supplier Issues) is exposed as a queryable dataset
 * with enriched dimensions and measures. The UI lets anyone slice any dataset:
 * pick a measure, a breakdown, any combination of filters, and a chart style —
 * mixing data across the whole system.
 */

const SALE = StockMovementType.SALE;
const PURCHASE = StockMovementType.PURCHASE;
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthLabel = (key: string) => /^\d{4}-\d{2}$/.test(key) ? new Date(key + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : key;
const extractHub = (pd?: string): string => { const mm = pd?.match(/^\[([^\]]+)\]/); return mm ? mm[1] : ''; };

export type FieldTime = 'month' | 'dow' | undefined;
export interface FieldDef { key: string; label: string; multi?: boolean; time?: FieldTime }
export interface MeasureDef { key: string; label: string; kind: 'money' | 'number'; resolve: (acc: Acc) => number }

/** A single real record, for "find" mode — a concrete order/customer/supplier/credit the user can open. */
export interface RecordMeta {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  amount?: number;
  amountKind?: 'money' | 'number';
  link?: string;
  tags?: string[];
  rollup?: boolean; // line-item rows that should merge into one record by id
}

export interface Row {
  dims: Record<string, string>;
  multi: Record<string, string[]>;
  sums: Record<string, number>;
  ids: Record<string, string>;
  date?: string;
  record?: RecordMeta;
}
export interface Acc { count: number; sums: Record<string, number>; distinct: Record<string, Set<string>> }

export interface Dataset {
  key: string;
  label: string;
  desc: string;
  fields: FieldDef[];
  measures: MeasureDef[];
  build: (d: DataBundle) => Row[];
}

// measure helpers
const mCount = (key: string, label: string): MeasureDef => ({ key, label, kind: 'number', resolve: (a) => a.count });
const mSum = (key: string, label: string, field: string, kind: 'money' | 'number' = 'money'): MeasureDef => ({ key, label, kind, resolve: (a) => a.sums[field] || 0 });
const mDistinct = (key: string, label: string, id: string): MeasureDef => ({ key, label, kind: 'number', resolve: (a) => a.distinct[id]?.size || 0 });
const mAvg = (key: string, label: string, field: string, kind: 'money' | 'number' = 'money'): MeasureDef => ({ key, label, kind, resolve: (a) => (a.count ? (a.sums[field] || 0) / a.count : 0) });
const mRatioDistinct = (key: string, label: string, field: string, id: string, kind: 'money' | 'number' = 'money'): MeasureDef => ({ key, label, kind, resolve: (a) => { const dn = a.distinct[id]?.size || 0; return dn ? (a.sums[field] || 0) / dn : 0; } });

export const DATASETS: Dataset[] = [
  // ─────────── SALES (line items) ───────────
  {
    key: 'sales', label: 'Sales', desc: 'Every sale line — what sold, to whom, when & how',
    fields: [
      { key: 'DayOfWeek', label: 'Day of Week', time: 'dow' }, { key: 'Month', label: 'Month', time: 'month' }, { key: 'WeekPart', label: 'Weekend / Weekday' },
      { key: 'Product', label: 'Product' }, { key: 'Category', label: 'Category' },
      { key: 'Customer', label: 'Customer' }, { key: 'CustomerType', label: 'Customer Type' }, { key: 'Segment', label: 'Segment', multi: true },
      { key: 'Location', label: 'Location' }, { key: 'BusinessCategory', label: 'Business Category' }, { key: 'FamilyType', label: 'Family Type' },
      { key: 'MaritalStatus', label: 'Marital Status' }, { key: 'AgeGroup', label: 'Age Group' }, { key: 'Lifestyle', label: 'Lifestyle' },
      { key: 'Employment', label: 'Employment' }, { key: 'Religion', label: 'Religion' },
      { key: 'Channel', label: 'Sales Channel' }, { key: 'PaymentMode', label: 'Payment Mode' }, { key: 'PaymentType', label: 'Payment Type' },
      { key: 'CashCredit', label: 'Cash / Credit' }, { key: 'Status', label: 'Sale Status' }, { key: 'Hub', label: 'Hub' }, { key: 'Agent', label: 'Agent' },
    ],
    measures: [
      mSum('revenue', 'Revenue', 'revenue'), mDistinct('orders', 'Orders', 'sale'), mSum('units', 'Units Sold', 'units', 'number'),
      mSum('profit', 'Gross Profit', 'profit'), mRatioDistinct('aov', 'Avg Order Value', 'revenue', 'sale'), mDistinct('customers', 'Distinct Customers', 'customer'),
    ],
    build: (d) => {
      const saleById = Object.fromEntries(d.sales.map((s) => [s.id, s]));
      const custById = Object.fromEntries(d.customers.map((c) => [c.id, c]));
      const itemById = Object.fromEntries(d.inventory.map((i) => [i.id, i]));
      const rows: Row[] = [];
      const withLines = new Set<string>();
      const push = (dateStr: string, saleId: string, qty: number, price: number, cost: number, item: any, sale: any, cust: any) => {
        const dt = new Date(dateStr);
        const chan = sale?.channel; const pm = sale?.paymentMode || (sale?.isCredit ? 'Credit' : 'Full Payment'); const st = sale?.status;
        rows.push({
          date: dateStr,
          record: {
            id: saleId, title: cust?.name || sale?.customerName || 'Unknown', subtitle: item?.name || '—',
            date: dateStr, amount: qty * price, amountKind: 'money', link: `/sales?open=${saleId}`,
            tags: [chan, pm, st].filter(Boolean) as string[], rollup: true,
          },
          sums: { revenue: qty * price, units: qty, profit: qty * (price - cost) },
          ids: { sale: saleId, customer: cust?.id || sale?.customerId || 'unknown' },
          multi: { Segment: cust ? deriveSegments(cust) : [] },
          dims: {
            DayOfWeek: DOW[dt.getDay()], Month: dateStr.slice(0, 7), WeekPart: (dt.getDay() === 0 || dt.getDay() === 6) ? 'Weekend' : 'Weekday',
            Product: item?.name || '—', Category: item?.category || '—',
            Customer: cust?.name || sale?.customerName || 'Unknown', CustomerType: cust?.type || '—',
            Location: cust?.location || '—', BusinessCategory: cust?.businessCategory || '—', FamilyType: cust?.familyType || '—',
            MaritalStatus: cust?.maritalStatus || '—', AgeGroup: cust?.ageGroup || '—', Lifestyle: cust?.lifestyle || '—',
            Employment: cust?.employmentStatus || '—', Religion: cust?.religion || '—',
            Channel: sale?.channel || '—', PaymentMode: sale?.paymentMode || (sale?.isCredit ? 'Credit' : 'Full Payment'),
            PaymentType: sale?.paymentType || (sale?.isCredit ? '—' : 'Cash'), CashCredit: sale?.isCredit ? 'Credit' : 'Cash',
            Status: sale?.status || '—', Hub: extractHub(sale?.productDetails) || cust?.location || '—', Agent: sale?.agentName || '—',
          },
        });
      };
      d.stockLogs.filter((l) => l.type === SALE).forEach((l) => {
        const sale = l.referenceId ? saleById[l.referenceId] : null;
        if (l.referenceId) withLines.add(l.referenceId);
        push(l.date, l.referenceId || l.id, Math.abs(l.quantity), l.unitPrice, l.unitCost, itemById[l.itemId], sale, sale ? custById[sale.customerId] : null);
      });
      d.sales.filter((s) => Array.isArray(s.items) && s.items!.length > 0 && !withLines.has(s.id)).forEach((s) => {
        const cust = custById[s.customerId];
        s.items!.forEach((it) => push(s.date, s.id, it.quantity, it.unitPrice, it.unitCost, itemById[it.itemId], s, cust));
      });
      return rows;
    },
  },
  // ─────────── CUSTOMERS ───────────
  {
    key: 'customers', label: 'Customers', desc: 'The customer base by profile, value & credit',
    fields: [
      { key: 'CustomerType', label: 'Customer Type' }, { key: 'Segment', label: 'Segment', multi: true }, { key: 'Location', label: 'Location' },
      { key: 'BusinessCategory', label: 'Business Category' }, { key: 'FamilyType', label: 'Family Type' }, { key: 'MaritalStatus', label: 'Marital Status' },
      { key: 'AgeGroup', label: 'Age Group' }, { key: 'Lifestyle', label: 'Lifestyle' }, { key: 'Employment', label: 'Employment' },
      { key: 'Religion', label: 'Religion' }, { key: 'CreditStatus', label: 'Credit Status' }, { key: 'JoinedMonth', label: 'Joined Month', time: 'month' },
    ],
    measures: [
      mCount('count', 'Customers'), mSum('spent', 'Total Spend', 'spent'), mSum('orders', 'Total Orders', 'orders', 'number'),
      mAvg('ltv', 'Avg Lifetime Value', 'spent'), mSum('owed', 'Credit Owed', 'owed'),
    ],
    build: (d) => d.customers.map((c) => {
      const cr = d.credits.filter((x) => x.customerId === c.id);
      const owed = cr.reduce((a, x) => a + x.amountOwed, 0);
      const status = cr.some((x) => x.status === 'Overdue') ? 'Overdue' : cr.some((x) => x.status === 'Pending') ? 'Pending' : cr.length ? 'Clear' : 'None';
      return {
        date: c.joinedDate,
        record: {
          id: c.id, title: c.name, subtitle: [c.type, c.location].filter(Boolean).join(' · ') || undefined,
          date: c.joinedDate, amount: c.totalSpent, amountKind: 'money', link: `/customers?open=${c.id}`,
          tags: [status !== 'None' ? status : '', ...deriveSegments(c).slice(0, 2)].filter(Boolean) as string[],
        },
        sums: { spent: c.totalSpent, orders: c.totalOrders, owed },
        ids: { customer: c.id },
        multi: { Segment: deriveSegments(c) },
        dims: {
          CustomerType: c.type, Location: c.location || '—', BusinessCategory: c.businessCategory || '—', FamilyType: c.familyType || '—',
          MaritalStatus: c.maritalStatus || '—', AgeGroup: c.ageGroup || '—', Lifestyle: c.lifestyle || '—', Employment: c.employmentStatus || '—',
          Religion: c.religion || '—', CreditStatus: status, JoinedMonth: (c.joinedDate || '').slice(0, 7) || '—',
        },
      };
    }),
  },
  // ─────────── INVENTORY ───────────
  {
    key: 'inventory', label: 'Inventory', desc: 'Stock on hand by category, hub & supplier',
    fields: [
      { key: 'Category', label: 'Category' }, { key: 'Location', label: 'Hub' }, { key: 'UoM', label: 'Unit of Measure' },
      { key: 'Supplier', label: 'Supplier' }, { key: 'StockStatus', label: 'Stock Status' }, { key: 'Active', label: 'Active' },
    ],
    measures: [
      mCount('count', 'SKUs'), mSum('value', 'Stock Value', 'value'), mSum('units', 'Stock Units', 'units', 'number'),
      mAvg('price', 'Avg Selling Price', 'price'), mAvg('margin', 'Avg Margin %', 'margin', 'number'),
    ],
    build: (d) => d.inventory.map((i) => {
      const sup = d.suppliers.find((s) => s.id === i.supplierId);
      const margin = i.baseSellingPrice > 0 ? ((i.baseSellingPrice - i.avgUnitCost) / i.baseSellingPrice) * 100 : 0;
      const status = i.currentStock <= 0 ? 'Out of Stock' : i.currentStock <= i.minStockLevel ? 'Low' : 'Healthy';
      return {
        record: {
          id: i.id, title: i.name, subtitle: [i.category, i.location].filter(Boolean).join(' · ') || undefined,
          amount: i.currentStock * i.avgUnitCost, amountKind: 'money',
          tags: [status, `${i.currentStock} ${i.unitOfMeasure}`].filter(Boolean) as string[],
        },
        sums: { value: i.currentStock * i.avgUnitCost, units: i.currentStock, price: i.baseSellingPrice, margin },
        ids: { sku: i.id },
        multi: {},
        dims: {
          Category: i.category, Location: i.location || '—', UoM: i.unitOfMeasure,
          Supplier: sup?.name || i.supplier || '—', StockStatus: status, Active: i.isActive === false ? 'No' : 'Yes',
        },
      };
    }),
  },
  // ─────────── SUPPLIERS ───────────
  {
    key: 'suppliers', label: 'Suppliers', desc: 'Vendors by spend, reliability & value generated',
    fields: [
      { key: 'BusinessType', label: 'Business Type' }, { key: 'Location', label: 'Location' }, { key: 'Categories', label: 'Category Supplied', multi: true },
      { key: 'Active', label: 'Active' }, { key: 'RatingBand', label: 'Rating' },
    ],
    measures: [
      mCount('count', 'Suppliers'), mSum('spend', 'Procurement Spend', 'spend'), mSum('retailProfit', 'Retail Profit Generated', 'retailProfit'),
      mSum('openIssues', 'Open Issues', 'openIssues', 'number'), mAvg('rating', 'Avg Rating', 'rating', 'number'), mAvg('lead', 'Avg Lead Time', 'lead', 'number'),
    ],
    build: (d) => d.suppliers.map((s) => {
      const purchases = d.stockLogs.filter((l) => l.type === PURCHASE && l.supplierId === s.id);
      const spend = purchases.reduce((a, l) => a + Math.abs(l.quantity) * l.unitCost, 0);
      const skuIds = new Set(purchases.map((l) => l.itemId));
      const saleLogs = d.stockLogs.filter((l) => l.type === SALE && skuIds.has(l.itemId));
      const retailProfit = saleLogs.reduce((a, l) => a + Math.abs(l.quantity) * (l.unitPrice - l.unitCost), 0);
      const openIssues = d.supplierIssues.filter((i) => i.supplierId === s.id && i.status === 'Open').length;
      return {
        record: {
          id: s.id, title: s.name, subtitle: [s.businessType, s.location].filter(Boolean).join(' · ') || undefined,
          amount: spend, amountKind: 'money', link: `/suppliers?open=${s.id}`,
          tags: [s.rating ? `${s.rating}★` : '', openIssues ? `${openIssues} open` : ''].filter(Boolean) as string[],
        },
        sums: { spend, retailProfit, openIssues, rating: s.rating || 0, lead: s.leadTimeDays || 0 },
        ids: { supplier: s.id },
        multi: { Categories: s.categories || [] },
        dims: {
          BusinessType: s.businessType || '—', Location: s.location || '—', Active: s.isActive ? 'Yes' : 'No',
          RatingBand: s.rating ? `${s.rating}★` : '—',
        },
      };
    }),
  },
  // ─────────── STOCK MOVEMENTS ───────────
  {
    key: 'movements', label: 'Stock Movements', desc: 'Every inventory movement — in, out, transfers',
    fields: [
      { key: 'Type', label: 'Movement Type' }, { key: 'Product', label: 'Product' }, { key: 'Category', label: 'Category' },
      { key: 'Supplier', label: 'Supplier' }, { key: 'Hub', label: 'Hub' }, { key: 'Month', label: 'Month', time: 'month' }, { key: 'Agent', label: 'Agent' },
    ],
    measures: [
      mCount('count', 'Movements'), mSum('qty', 'Quantity', 'qty', 'number'), mSum('value', 'Value', 'value'),
    ],
    build: (d) => {
      const itemById = Object.fromEntries(d.inventory.map((i) => [i.id, i]));
      const agentById = Object.fromEntries(d.agents.map((a) => [a.id, a]));
      return d.stockLogs.map((l) => {
        const item = itemById[l.itemId];
        return {
          date: l.date,
          record: {
            id: l.id, title: l.itemName || item?.name || '—', subtitle: [l.type, l.supplier].filter(Boolean).join(' · ') || undefined,
            date: l.date, amount: Math.abs(l.quantity) * l.unitCost, amountKind: 'money',
            tags: [l.type, `${Math.abs(l.quantity)} units`].filter(Boolean) as string[],
          },
          sums: { qty: Math.abs(l.quantity), value: Math.abs(l.quantity) * l.unitCost },
          ids: { log: l.id },
          multi: {},
          dims: {
            Type: l.type, Product: l.itemName || item?.name || '—', Category: item?.category || '—',
            Supplier: l.supplier || '—', Hub: item?.location || l.toLocation || l.fromLocation || '—',
            Month: l.date.slice(0, 7), Agent: agentById[l.agentId]?.name || l.agentId || '—',
          },
        };
      });
    },
  },
  // ─────────── CREDITS ───────────
  {
    key: 'credits', label: 'Credits', desc: 'The credit book by status, terms & customer',
    fields: [
      { key: 'Status', label: 'Status' }, { key: 'Customer', label: 'Customer' }, { key: 'CustomerType', label: 'Customer Type' },
      { key: 'PaymentTerms', label: 'Payment Terms' }, { key: 'Flagged', label: 'Flagged' }, { key: 'IssuedMonth', label: 'Issued Month', time: 'month' },
    ],
    measures: [
      mCount('count', 'Records'), mSum('owed', 'Amount Owed', 'owed'), mSum('original', 'Original Amount', 'original'),
    ],
    build: (d) => {
      const custById = Object.fromEntries(d.customers.map((c) => [c.id, c]));
      return d.credits.map((c) => ({
        date: c.dateIssued,
        record: {
          id: c.id, title: c.customerName, subtitle: [c.status, c.paymentTerms].filter(Boolean).join(' · ') || undefined,
          date: c.dateIssued, amount: c.amountOwed, amountKind: 'money',
          link: c.customerId ? `/customers?open=${c.customerId}` : undefined,
          tags: [c.status, c.flagged ? 'Flagged' : ''].filter(Boolean) as string[],
        },
        sums: { owed: c.amountOwed, original: c.originalAmount ?? c.amountOwed },
        ids: { credit: c.id },
        multi: {},
        dims: {
          Status: c.status, Customer: c.customerName, CustomerType: custById[c.customerId]?.type || '—',
          PaymentTerms: c.paymentTerms || '—', Flagged: c.flagged ? 'Yes' : 'No', IssuedMonth: (c.dateIssued || '').slice(0, 7) || '—',
        },
      }));
    },
  },
  // ─────────── SUPPLIER ISSUES ───────────
  {
    key: 'issues', label: 'Supplier Issues', desc: 'Quality, delivery & pricing problems',
    fields: [
      { key: 'Type', label: 'Issue Type' }, { key: 'Severity', label: 'Severity' }, { key: 'Status', label: 'Status' },
      { key: 'Supplier', label: 'Supplier' }, { key: 'Product', label: 'Related Product' }, { key: 'Month', label: 'Month', time: 'month' },
    ],
    measures: [mCount('count', 'Issues')],
    build: (d) => {
      const itemById = Object.fromEntries(d.inventory.map((i) => [i.id, i]));
      return d.supplierIssues.map((i) => ({
        date: i.date,
        record: {
          id: i.id, title: i.supplierName, subtitle: [i.type, i.severity].filter(Boolean).join(' · ') || undefined,
          date: i.date, amountKind: 'number',
          link: i.supplierId ? `/suppliers?open=${i.supplierId}` : undefined,
          tags: [i.status, i.severity].filter(Boolean) as string[],
        },
        sums: {},
        ids: { issue: i.id },
        multi: {},
        dims: {
          Type: i.type, Severity: i.severity, Status: i.status, Supplier: i.supplierName,
          Product: i.relatedItemId ? (itemById[i.relatedItemId]?.name || '—') : '—', Month: (i.date || '').slice(0, 7) || '—',
        },
      }));
    },
  },
];

export function fieldValues(rows: Row[], field: FieldDef): string[] {
  const set = new Set<string>();
  rows.forEach((r) => { if (field.multi) (r.multi[field.key] || []).forEach((s) => set.add(s)); else set.add(r.dims[field.key] ?? '—'); });
  return Array.from(set).sort();
}

export interface Filter { field: string; multi: boolean; values: string[] }
export interface QueryResult { rows: { key: string; label: string; value: number }[]; total: number; measureKind: 'money' | 'number' }

function matchRow(r: Row, filters: Filter[]): boolean {
  return filters.every((f) => {
    if (f.values.length === 0) return true;
    if (f.multi) return (r.multi[f.field] || []).some((s) => f.values.includes(s));
    return f.values.includes(r.dims[f.field] ?? '—');
  });
}

export function runQuery(ds: Dataset, rows: Row[], filters: Filter[], groupBy: string, measureKey: string): QueryResult {
  const gDef = ds.fields.find((f) => f.key === groupBy);
  const measure = ds.measures.find((m) => m.key === measureKey) || ds.measures[0];
  const filtered = rows.filter((r) => matchRow(r, filters));
  const groups = new Map<string, Acc>();
  const bump = (k: string, r: Row) => {
    let a = groups.get(k);
    if (!a) { a = { count: 0, sums: {}, distinct: {} }; groups.set(k, a); }
    a.count += 1;
    Object.entries(r.sums).forEach(([f, v]) => { a!.sums[f] = (a!.sums[f] || 0) + v; });
    Object.entries(r.ids).forEach(([f, v]) => { (a!.distinct[f] = a!.distinct[f] || new Set()).add(v); });
  };
  filtered.forEach((r) => {
    if (gDef?.multi) (r.multi[groupBy]?.length ? r.multi[groupBy] : ['—']).forEach((s) => bump(s, r));
    else bump(r.dims[groupBy] ?? '—', r);
  });

  let out = Array.from(groups.entries()).map(([key, a]) => ({ key, label: gDef?.time === 'month' ? monthLabel(key) : key, value: measure.resolve(a) }));
  if (gDef?.time === 'dow') out.sort((a, b) => DOW.indexOf(a.key) - DOW.indexOf(b.key));
  else if (gDef?.time === 'month') out.sort((a, b) => a.key.localeCompare(b.key));
  else out.sort((a, b) => b.value - a.value);

  const total = out.reduce((a, r) => a + r.value, 0);
  return { rows: out, total, measureKind: measure.kind };
}

/* ─────────── Record finder (return the actual matching records, not aggregates) ─────────── */

export interface NumFilter { op: 'gte' | 'lte'; value: number }
export interface DateRange { from?: string; to?: string; label?: string }
export interface FoundRecord extends RecordMeta { count?: number; lines?: string[] }
export interface FindResult {
  records: FoundRecord[];
  shown: number;
  matched: number;
  totalAmount: number;
  amountKind: 'money' | 'number';
  entityLabel: string;
}

const inRange = (date: string | undefined, r?: DateRange): boolean => {
  if (!r || (!r.from && !r.to)) return true;
  if (!date) return false;
  const d = date.slice(0, 10);
  if (r.from && d < r.from) return false;
  if (r.to && d > r.to) return false;
  return true;
};

// singular/plural noun for each dataset's records
const RECORD_NOUN: Record<string, string> = {
  sales: 'order', customers: 'customer', inventory: 'product', suppliers: 'supplier',
  movements: 'movement', credits: 'credit record', issues: 'issue',
};

export function findRecords(
  ds: Dataset,
  rows: Row[],
  opts: { filters?: Filter[]; numFilters?: NumFilter[]; dateRange?: DateRange; sort?: 'amount' | 'date'; dir?: 'desc' | 'asc'; limit?: number } = {},
): FindResult {
  const { filters = [], numFilters = [], dateRange, sort = 'amount', dir = 'desc', limit = 60 } = opts;
  const noun = RECORD_NOUN[ds.key] || 'record';

  // 1. dimension + date filter on raw rows
  const kept = rows.filter((r) => matchRow(r, filters) && inRange(r.date || r.record?.date, dateRange) && r.record);

  // 2. build records (rollup line-items into one per id where flagged — e.g. sales orders)
  const map = new Map<string, FoundRecord>();
  for (const r of kept) {
    const rec = r.record!;
    if (rec.rollup) {
      const cur = map.get(rec.id);
      if (cur) {
        cur.amount = (cur.amount || 0) + (rec.amount || 0);
        cur.count = (cur.count || 1) + 1;
        if (rec.subtitle && rec.subtitle !== '—' && !cur.lines!.includes(rec.subtitle)) cur.lines!.push(rec.subtitle);
      } else {
        map.set(rec.id, { ...rec, count: 1, lines: rec.subtitle && rec.subtitle !== '—' ? [rec.subtitle] : [] });
      }
    } else {
      map.set(rec.id + ':' + map.size, { ...rec });
    }
  }
  let recs = Array.from(map.values());
  // finalize rollup subtitles → "3 items: Rice, Chicken…"
  recs.forEach((r) => {
    if (r.lines && r.lines.length) {
      r.subtitle = r.lines.length > 1 ? `${r.lines.length} items · ${r.lines.slice(0, 3).join(', ')}${r.lines.length > 3 ? '…' : ''}` : r.lines[0];
    }
  });

  // 3. numeric threshold on the record's headline amount
  const withNum = recs.filter((r) => numFilters.every((n) => {
    const v = r.amount ?? 0;
    return n.op === 'gte' ? v >= n.value : v <= n.value;
  }));

  const totalAmount = withNum.reduce((a, r) => a + (r.amount || 0), 0);
  const matched = withNum.length;

  // 4. sort + limit
  const mul = dir === 'desc' ? -1 : 1;
  withNum.sort((a, b) => sort === 'date'
    ? mul * ((a.date || '').localeCompare(b.date || ''))
    : mul * ((a.amount || 0) - (b.amount || 0)));

  const amountKind = recs[0]?.amountKind || 'money';
  const nounPlural = matched === 1 ? noun : (noun.endsWith('s') ? noun : noun + 's');
  return { records: withNum.slice(0, limit), shown: Math.min(matched, limit), matched, totalAmount, amountKind, entityLabel: nounPlural };
}

/** Latest activity date across the dataset — used to anchor relative ranges ("last week"). */
export function latestActivity(bundle: DataBundle): string {
  let max = '';
  const scan = (d?: string) => { if (d && d.slice(0, 10) > max) max = d.slice(0, 10); };
  bundle.sales.forEach((s) => scan(s.date));
  bundle.stockLogs.forEach((l) => scan(l.date));
  bundle.credits.forEach((c) => scan(c.dateIssued));
  return max || new Date().toISOString().slice(0, 10);
}
