/**
 * Mock answers for `GET analytics/reports/:key`, built from the sample data. Pure (the handler
 * passes its period and location filters in) so `npm test` can check them.
 */
import type * as Data from './data';
import { csvDate } from '@/lib/export';
import type { ReportColumn, ReportResult, ReportRow } from '@/lib/reports';

type Db = Pick<typeof Data, 'sales' | 'products' | 'stockLogs' | 'credits' | 'customers' | 'hubs'>;
/** `periodEnd` is the last moment the period covers (now, for a period that runs to today). */
export type ReportContext = { inRange: (date: string) => boolean; inScope: (hubId: string | null | undefined) => boolean; now: Date; periodEnd: Date };

const refId = (v: unknown) => (typeof v === 'string' ? v : (v as { _id?: string } | null)?._id);
const money = (n: number) => Math.round(n * 100) / 100;
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const DAY = 86_400_000;
const CAP = 10_000;

const col = (key: string, label: string, kind: ReportColumn['kind']): ReportColumn => ({ key, label, kind });

function result(columns: ReportColumn[], rows: ReportRow[], totalKeys: string[], now: Date): ReportResult {
  const capped = rows.length > CAP;
  const kept = rows.slice(0, CAP);
  const totals = Object.fromEntries(totalKeys.map((k) => [k, money(sum(rows.map((r) => Number(r[k]) || 0)))]));
  return { columns, rows: kept, totals, capped, generatedAt: now.toISOString() };
}

/** Group rows by a key, keeping first-seen order. */
function group<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const it of items) m.set(key(it), [...(m.get(key(it)) ?? []), it]);
  return [...m.entries()];
}

/** Revenue, orders and share for live sales grouped one way, largest revenue first. */
function salesBy(db: Db, ctx: ReportContext, label: string, key: (s: Db['sales'][number]) => string): ReportResult {
  const live = db.sales.filter((s) => s.status !== 'Voided' && ctx.inRange(s.date) && ctx.inScope(s.hub));
  const total = sum(live.map((s) => s.amount));
  const rows = group(live, key)
    .map(([name, list]) => {
      const revenue = sum(list.map((s) => s.amount));
      return { name, orders: list.length, revenue: money(revenue), avg: money(revenue / list.length), share: pct(revenue, total) };
    })
    .sort((a, b) => b.revenue - a.revenue);
  return result(
    [col('name', label, 'text'), col('orders', 'Orders', 'number'), col('revenue', 'Revenue', 'money'), col('avg', 'Avg order', 'money'), col('share', 'Share %', 'percent')],
    rows, ['orders', 'revenue'], ctx.now,
  );
}

const BUILDERS: Record<string, (db: Db, ctx: ReportContext) => ReportResult> = {
  'sales-daily': (db, ctx) => {
    const inScope = db.sales.filter((s) => ctx.inRange(s.date) && ctx.inScope(s.hub));
    const rows = group(inScope, (s) => csvDate(s.date))
      .map(([date, list]) => {
        const live = list.filter((s) => s.status !== 'Voided');
        const revenue = sum(live.map((s) => s.amount));
        return { date, orders: live.length, revenue: money(revenue), avg: live.length ? money(revenue / live.length) : 0, voided: list.length - live.length };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    return result(
      [col('date', 'Date', 'date'), col('orders', 'Orders', 'number'), col('revenue', 'Revenue', 'money'), col('avg', 'Avg order', 'money'), col('voided', 'Voided', 'number')],
      rows, ['orders', 'revenue', 'voided'], ctx.now,
    );
  },
  'sales-by-product': (db, ctx) => {
    const live = db.sales.filter((s) => s.status !== 'Voided' && ctx.inRange(s.date) && ctx.inScope(s.hub));
    const total = sum(live.map((s) => s.amount));
    const sku = new Map(db.products.map((p) => [p._id, p.sku]));
    const rows = group(live, (s) => s.item?.product_name ?? s.product_details ?? 'Unknown')
      .map(([product, list]) => {
        const revenue = sum(list.map((s) => s.amount));
        const first = list[0].item as { product_id?: string; category?: string } | undefined;
        return {
          product, sku: (first?.product_id && sku.get(first.product_id)) || '', category: first?.category ?? '',
          quantity: sum(list.map((s) => s.item?.quantity ?? 0)), revenue: money(revenue), share: pct(revenue, total),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
    return result(
      [col('product', 'Product', 'text'), col('sku', 'SKU', 'text'), col('category', 'Category', 'text'), col('quantity', 'Quantity', 'number'), col('revenue', 'Revenue', 'money'), col('share', 'Share %', 'percent')],
      rows, ['quantity', 'revenue'], ctx.now,
    );
  },
  'sales-by-location': (db, ctx) => {
    const r = salesBy(db, ctx, 'Location', (s) => s.hub_name ?? 'Unknown');
    return { ...r, columns: r.columns.map((c) => (c.key === 'name' ? { ...c, key: 'location' } : c)), rows: r.rows.map(({ name, ...rest }) => ({ location: name, ...rest })) };
  },
  'payment-methods': (db, ctx) => {
    const r = salesBy(db, ctx, 'Method', (s) => s.payment_mode || 'Not recorded');
    return { ...r, columns: r.columns.filter((c) => c.key !== 'avg').map((c) => (c.key === 'name' ? { ...c, key: 'method' } : c)), rows: r.rows.map((x) => ({ method: x.name, orders: x.orders, revenue: x.revenue, share: x.share })) };
  },
  'top-customers': (db, ctx) => {
    const live = db.sales.filter((s) => s.status !== 'Voided' && ctx.inRange(s.date) && ctx.inScope(s.hub));
    const byId = new Map(db.customers.map((c) => [c._id, c]));
    const rows = group(live, (s) => refId(s.customer) ?? s.customer_name)
      .map(([id, list]) => {
        const c = byId.get(id);
        const loc = c?.customer_location;
        return {
          customer: c?.company_name ?? c?.customer_name ?? list[0].customer_name,
          type: String(c?.customer_type ?? '').toUpperCase() === 'B2B' ? 'Business' : 'Individual',
          location: typeof loc === 'object' && loc ? loc.hub_name ?? '' : '',
          orders: list.length,
          spent: money(sum(list.map((s) => s.amount))),
          last: csvDate(list.map((s) => s.date).sort().at(-1)),
        };
      })
      .sort((a, b) => b.spent - a.spent);
    return result(
      [col('customer', 'Customer', 'text'), col('type', 'Type', 'text'), col('location', 'Location', 'text'), col('orders', 'Orders', 'number'), col('spent', 'Spent', 'money'), col('last', 'Last purchase', 'date')],
      rows, ['orders', 'spent'], ctx.now,
    );
  },
  'credit-aging': (db, ctx) => {
    const hubOf = new Map(db.customers.map((c) => [c._id, refId(c.customer_location)]));
    const open = db.credits.filter((c) => c.amount_owed > 0 && ctx.inScope(hubOf.get(c.customer_id)));
    const rows = group(open, (c) => c.customer_id)
      .map(([, list]) => {
        const row = { customer: list[0].customer_name, outstanding: 0, notDue: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
        for (const c of list) {
          const late = Math.floor((ctx.now.getTime() - new Date(c.due_date).getTime()) / DAY);
          const k = late <= 0 ? 'notDue' : late <= 30 ? 'd30' : late <= 60 ? 'd60' : late <= 90 ? 'd90' : 'over90';
          row[k] += c.amount_owed;
          row.outstanding += c.amount_owed;
        }
        return row;
      })
      .sort((a, b) => b.outstanding - a.outstanding);
    return result(
      [col('customer', 'Customer', 'text'), col('outstanding', 'Outstanding', 'money'), col('notDue', 'Not due', 'money'), col('d30', '1-30 days', 'money'), col('d60', '31-60 days', 'money'), col('d90', '61-90 days', 'money'), col('over90', 'Over 90 days', 'money')],
      rows, ['outstanding', 'notDue', 'd30', 'd60', 'd90', 'over90'], ctx.now,
    );
  },
  'stock-valuation': (db, ctx) => {
    const hubName = new Map(db.hubs.map((h) => [h._id, h.hub_name]));
    const rows = db.products
      .filter((p) => p.is_active !== false && ctx.inScope(refId(p.hub)))
      .map((p) => ({
        product: p.name, sku: p.sku, location: hubName.get(refId(p.hub) ?? '') ?? '', onHand: p.current_stock, unit: p.unit_of_measure,
        avgCost: p.avg_unit_cost, value: money(p.current_stock * p.avg_unit_cost),
      }))
      .sort((a, b) => b.value - a.value);
    return result(
      [col('product', 'Product', 'text'), col('sku', 'SKU', 'text'), col('location', 'Location', 'text'), col('onHand', 'On hand', 'number'), col('unit', 'Unit', 'text'), col('avgCost', 'Avg cost', 'money'), col('value', 'Stock value', 'money')],
      rows, ['value'], ctx.now,
    );
  },
  'stock-movements': (db, ctx) => {
    const product = new Map(db.products.map((p) => [p._id, p]));
    const logs = db.stockLogs.filter((l) => ctx.inScope(refId(product.get(refId(l.item) ?? '')?.hub)));
    const rows = group(logs, (l) => refId(l.item) ?? l.item_name)
      .map(([id, list]) => {
        const p = product.get(id);
        const inPeriod = list.filter((l) => ctx.inRange(String(l.date)));
        const after = list.filter((l) => new Date(String(l.date)) > ctx.periodEnd);
        const signed = (l: (typeof list)[number]) => (l.type === 'Sale' || l.type === 'Spoilage' ? -Math.abs(l.quantity) : l.quantity);
        const by = (t: string, sign?: 1 | -1) => sum(inPeriod.filter((l) => l.type === t && (!sign || Math.sign(l.quantity) === sign)).map((l) => Math.abs(l.quantity)));
        const closing = (p?.current_stock ?? 0) - sum(after.map(signed));
        const net = sum(inPeriod.map(signed));
        return {
          product: list[0].item_name, opening: closing - net, purchased: by('Purchase'), transferredIn: by('Transfer', 1), transferredOut: by('Transfer', -1),
          sold: by('Sale') + by('Spoilage'), adjusted: sum(inPeriod.filter((l) => l.type === 'Adjustment').map((l) => l.quantity)), closing,
        };
      })
      .filter((r) => r.purchased || r.transferredIn || r.transferredOut || r.sold || r.adjusted);
    return result(
      [col('product', 'Product', 'text'), col('opening', 'Opening', 'number'), col('purchased', 'Purchased', 'number'), col('transferredIn', 'Transferred in', 'number'), col('transferredOut', 'Transferred out', 'number'), col('sold', 'Sold', 'number'), col('adjusted', 'Adjusted', 'number'), col('closing', 'Closing', 'number')],
      rows, [], ctx.now,
    );
  },
  'supplier-purchases': (db, ctx) => {
    const product = new Map(db.products.map((p) => [p._id, p]));
    const buys = db.stockLogs.filter((l) => l.type === 'Purchase' && l.supplier && ctx.inRange(String(l.date)) && ctx.inScope(refId(product.get(refId(l.item) ?? '')?.hub)));
    const rows = group(buys, (l) => l.supplier as string)
      .map(([supplier, list]) => {
        const spend = sum(list.map((l) => l.quantity * l.unit_cost));
        return { supplier, purchases: list.length, spend: money(spend), avg: money(spend / list.length), last: csvDate(list.map((l) => String(l.date)).sort().at(-1)) };
      })
      .sort((a, b) => b.spend - a.spend);
    return result(
      [col('supplier', 'Supplier', 'text'), col('purchases', 'Purchases', 'number'), col('spend', 'Total spend', 'money'), col('avg', 'Avg order', 'money'), col('last', 'Last purchase', 'date')],
      rows, ['purchases', 'spend'], ctx.now,
    );
  },
};

/** A report's result, or null for a key no builder knows. */
export function buildReport(key: string, db: Db, ctx: ReportContext): ReportResult | null {
  const build = BUILDERS[key];
  return build ? build(db, ctx) : null;
}
