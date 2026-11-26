/**
 * Mock answer for `POST insights/explore/query`: the Sales dataset grouped and measured over the
 * sample sales. Pure (the handler passes its period and location filters in) so `npm test` can
 * check it. Other datasets answer no rows.
 */
import type * as Data from './data';
import type { Filter, QueryResult } from '@/lib/explore';

type Db = Pick<typeof Data, 'sales'>;
type Sale = Db['sales'][number];
export type ExploreBody = { dataset: string; measure: string; groupBy: string; filters?: Filter[] };
export type ExploreContext = { inRange: (date: string) => boolean; inScope: (hubId: string | null | undefined) => boolean };

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LAGOS_MS = 3_600_000;
const lagos = (iso: string) => new Date(new Date(iso).getTime() + LAGOS_MS);

/** The value of one Sales field on a sale; fields the sample data does not hold read "-". */
const DIMS: Record<string, (s: Sale) => string | undefined> = {
  DayOfWeek: (s) => DOW[lagos(s.date).getUTCDay()],
  Month: (s) => lagos(s.date).toISOString().slice(0, 7),
  WeekPart: (s) => ([0, 6].includes(lagos(s.date).getUTCDay()) ? 'Weekend' : 'Weekday'),
  Product: (s) => s.item?.product_name ?? s.product_details,
  Category: (s) => s.item?.category,
  Customer: (s) => s.customer_name,
  Location: (s) => s.hub_name,
  Hub: (s) => s.hub_name,
  Channel: (s) => s.channel,
  PaymentMode: (s) => s.payment_mode,
  PaymentType: (s) => s.payment_type,
  CashCredit: (s) => (s.payment_mode === 'Credit' ? 'Credit' : 'Cash'),
  Status: (s) => s.status,
  Agent: (s) => s.agent_name,
};
const dim = (s: Sale, field: string) => DIMS[field]?.(s) || '-';

const customerId = (s: Sale) => (typeof s.customer === 'string' ? s.customer : (s.customer as { _id?: string } | null)?._id) ?? s.customer_name;

/** Each measure: how it reads a group of sales, and whether it is an amount. */
const MEASURES: Record<string, { kind: 'money' | 'number'; of: (list: Sale[]) => number }> = {
  revenue: { kind: 'money', of: (l) => l.reduce((n, s) => n + s.amount, 0) },
  orders: { kind: 'number', of: (l) => l.length },
  units: { kind: 'number', of: (l) => l.reduce((n, s) => n + (s.item?.quantity ?? 0), 0) },
  profit: { kind: 'money', of: (l) => l.reduce((n, s) => n + (s.profit_amount ?? 0), 0) },
  aov: { kind: 'money', of: (l) => (l.length ? l.reduce((n, s) => n + s.amount, 0) / l.length : 0) },
  customers: { kind: 'number', of: (l) => new Set(l.map(customerId)).size },
};

export function runMockExplore(db: Db, body: ExploreBody, ctx: ExploreContext): QueryResult {
  const measure = MEASURES[body.measure] ?? MEASURES.revenue;
  if (body.dataset !== 'sales') return { rows: [], total: 0, measureKind: measure.kind };

  const filters = (body.filters ?? []).filter((f) => f.values.length > 0);
  const list = db.sales.filter((s) =>
    s.status !== 'Voided' && ctx.inRange(s.date) && ctx.inScope(s.hub) && filters.every((f) => f.values.includes(dim(s, f.field))));

  const groups = new Map<string, Sale[]>();
  for (const s of list) groups.set(dim(s, body.groupBy), [...(groups.get(dim(s, body.groupBy)) ?? []), s]);
  const rows = [...groups.entries()].map(([key, l]) => ({ key, label: key, value: Math.round(measure.of(l) * 100) / 100 }));

  if (body.groupBy === 'DayOfWeek') rows.sort((a, b) => DOW.indexOf(a.key) - DOW.indexOf(b.key));
  else if (body.groupBy === 'Month') rows.sort((a, b) => a.key.localeCompare(b.key));
  else rows.sort((a, b) => b.value - a.value);

  return { rows, total: rows.reduce((n, r) => n + r.value, 0), measureKind: measure.kind };
}
