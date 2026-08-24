/**
 * Supervisor analytics.
 *
 * Two questions a supervisor actually has at close of business:
 *   1. How did each cashier perform — and is anything worth a second look?
 *   2. Does the money add up across every till and shift today?
 *
 * All of it is computed from locally-stored sales and shifts, so a supervisor
 * can reconcile the day with the network down.
 */

import { PosSale, Shift, Cashier, PaymentMethod, PosProduct, AssistRequest } from './types';
import { cashDropsForShift } from './assist';

const METHODS: PaymentMethod[] = ['Cash', 'Transfer', 'Card', 'Credit'];
export const dayOf = (iso: string) => iso.slice(0, 10);
export const todayStr = () => new Date().toISOString().slice(0, 10);

/* ─────────── per-cashier performance ─────────── */

export interface RiskFlag { level: 'warn' | 'high'; text: string }

export interface CashierPerf {
  cashierId: string;
  cashierName: string;
  role: Cashier['role'];
  transactions: number;
  gross: number;
  refunds: number;          // positive magnitude
  refundCount: number;
  net: number;
  itemsSold: number;
  avgBasket: number;
  discountGiven: number;
  byMethod: { method: PaymentMethod; amount: number }[];
  cashTaken: number;
  shifts: number;
  openShifts: number;
  variance: number;         // summed across that cashier's closed shifts
  hours: number;
  salesPerHour: number;
  flags: RiskFlag[];
}

/** Refund/discount rates above these get surfaced — not accusations, just "look here". */
const REFUND_RATE_WARN = 0.10;
const DISCOUNT_RATE_WARN = 0.05;
const VARIANCE_WARN = 50_000;   // ₦500 in kobo

export function cashierPerformance(
  sales: PosSale[], shifts: Shift[], cashiers: Cashier[], day: string,
): CashierPerf[] {
  const dayShifts = shifts.filter((s) => dayOf(s.openedAt) === day);
  const daySales = sales.filter((s) => dayOf(s.createdAt) === day);

  // every cashier who either worked a shift or rang something up
  const ids = new Set<string>([...dayShifts.map((s) => s.cashierId), ...daySales.map((s) => s.cashierId)]);

  return Array.from(ids).map((id) => {
    const mine = daySales.filter((s) => s.cashierId === id);
    const positives = mine.filter((s) => !s.reversalOf);
    const reversals = mine.filter((s) => !!s.reversalOf);
    const myShifts = dayShifts.filter((s) => s.cashierId === id);

    const gross = positives.reduce((a, s) => a + s.total, 0);
    const refunds = Math.abs(reversals.reduce((a, s) => a + s.total, 0));
    const itemsSold = positives.reduce((a, s) => a + s.lines.reduce((x, l) => x + l.qty, 0), 0);
    const discountGiven = positives.reduce((a, s) => a + s.discount, 0);

    const byMethod = METHODS.map((method) => ({
      method,
      amount: mine.reduce((a, s) => a + s.payments.filter((p) => p.method === method).reduce((x, p) => x + p.amount, 0), 0),
    })).filter((m) => m.amount !== 0);

    const cashTaken = positives.reduce(
      (a, s) => a + s.payments.filter((p) => p.method === 'Cash').reduce((x, p) => x + p.amount, 0), 0,
    ) - positives.reduce((a, s) => a + s.change, 0);

    const closed = myShifts.filter((s) => s.status === 'closed');
    const variance = closed.reduce((a, s) => a + (s.variance || 0), 0);

    const hours = myShifts.reduce((a, s) => {
      const end = s.closedAt ? new Date(s.closedAt).getTime() : Date.now();
      return a + Math.max(0, (end - new Date(s.openedAt).getTime()) / 3_600_000);
    }, 0);

    const cashier = cashiers.find((c) => c.id === id);
    const flags: RiskFlag[] = [];
    if (gross > 0 && refunds / gross > REFUND_RATE_WARN) {
      flags.push({ level: 'high', text: `Refunds are ${Math.round((refunds / gross) * 100)}% of sales` });
    }
    if (gross > 0 && discountGiven / (gross + discountGiven) > DISCOUNT_RATE_WARN) {
      flags.push({ level: 'warn', text: `Discounts ${Math.round((discountGiven / (gross + discountGiven)) * 100)}% of value` });
    }
    if (Math.abs(variance) >= VARIANCE_WARN) {
      flags.push({ level: variance < 0 ? 'high' : 'warn', text: `Drawer ${variance < 0 ? 'short' : 'over'} on close` });
    }
    if (myShifts.some((s) => s.status === 'open')) {
      flags.push({ level: 'warn', text: 'Shift still open — not yet reconciled' });
    }

    return {
      cashierId: id,
      cashierName: cashier?.name || myShifts[0]?.cashierName || mine[0]?.cashierName || 'Unknown',
      role: cashier?.role || 'cashier',
      transactions: positives.length,
      gross, refunds, refundCount: reversals.length,
      net: gross - refunds,
      itemsSold,
      avgBasket: positives.length ? gross / positives.length : 0,
      discountGiven,
      byMethod,
      cashTaken,
      shifts: myShifts.length,
      openShifts: myShifts.filter((s) => s.status === 'open').length,
      variance,
      hours,
      salesPerHour: hours > 0 ? gross / hours : 0,
      flags,
    };
  }).sort((a, b) => b.net - a.net);
}

/* ─────────── closing inventory ─────────── */

export interface StockRow {
  productId: string;
  name: string;
  category: string;
  unit: string;
  opening: number;
  sold: number;
  returned: number;
  expectedClosing: number;
  counted?: number;
  variance?: number;        // counted − expected
  unitCost: number;
  closingValue: number;     // expected closing at cost
  varianceValue: number;    // variance at cost (negative = shrinkage)
}

export interface ClosingInventory {
  rows: StockRow[];
  movedRows: StockRow[];      // only products that actually moved today
  totalClosingValue: number;
  totalSoldUnits: number;
  countedProducts: number;
  totalVarianceUnits: number;
  totalVarianceValue: number;
  fullyCounted: boolean;
  discrepancies: StockRow[];
}

/**
 * Where stock stands at close of business.
 *
 * The catalog holds LIVE stock (already decremented by each sale and restored
 * by each refund), so today's opening position is derived backwards:
 *     opening = currentStock + soldToday − returnedToday
 * A supervisor can then enter a physical count; the variance against expected
 * is the shrinkage figure.
 */
export function closingInventory(
  catalog: PosProduct[], sales: PosSale[], day: string, counts?: Record<string, number>,
): ClosingInventory {
  const daySales = sales.filter((s) => dayOf(s.createdAt) === day);
  const sold = new Map<string, number>();
  const returned = new Map<string, number>();

  daySales.forEach((s) => s.lines.forEach((l) => {
    // reversal lines carry negative qty — they put stock back
    if (l.qty >= 0) sold.set(l.productId, (sold.get(l.productId) || 0) + l.qty);
    else returned.set(l.productId, (returned.get(l.productId) || 0) + Math.abs(l.qty));
  }));

  const rows: StockRow[] = catalog.map((p) => {
    const s = sold.get(p.id) || 0;
    const r = returned.get(p.id) || 0;
    const expectedClosing = p.trackStock && typeof p.stock === 'number' ? p.stock : 0;
    const counted = counts?.[p.id];
    const variance = counted != null ? counted - expectedClosing : undefined;
    const unitCost = p.cost ?? 0;
    return {
      productId: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      opening: expectedClosing + s - r,
      sold: s,
      returned: r,
      expectedClosing,
      counted,
      variance,
      unitCost,
      closingValue: expectedClosing * unitCost,
      varianceValue: (variance || 0) * unitCost,
    };
  }).sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name));

  const countedRows = rows.filter((r) => r.counted != null);
  const discrepancies = countedRows.filter((r) => (r.variance || 0) !== 0);

  return {
    rows,
    movedRows: rows.filter((r) => r.sold > 0 || r.returned > 0),
    totalClosingValue: rows.reduce((a, r) => a + r.closingValue, 0),
    totalSoldUnits: rows.reduce((a, r) => a + r.sold, 0),
    countedProducts: countedRows.length,
    totalVarianceUnits: countedRows.reduce((a, r) => a + (r.variance || 0), 0),
    totalVarianceValue: countedRows.reduce((a, r) => a + r.varianceValue, 0),
    fullyCounted: countedRows.length === rows.length && rows.length > 0,
    discrepancies,
  };
}

/* ─────────── end-of-day reconciliation ─────────── */

export interface ShiftRecon {
  shift: Shift;
  cashSales: number;
  cashRefunds: number;
  cashDrops: number;
  expected: number;
  counted?: number;
  variance?: number;
  reconciled: boolean;   // shift closed AND counted
}

export interface DayReconciliation {
  date: string;
  shifts: ShiftRecon[];
  openShifts: number;
  transactions: number;
  gross: number;
  refunds: number;
  net: number;
  byMethod: { method: PaymentMethod; amount: number }[];
  totalFloat: number;
  totalCashSales: number;
  totalCashRefunds: number;
  totalCashDrops: number;
  totalExpected: number;
  totalCounted: number;
  totalVariance: number;
  unsynced: number;
  canClose: boolean;     // nothing open, nothing unsynced
  balanced: boolean;
}

export function reconcileDay(
  sales: PosSale[], shifts: Shift[], day: string, unsynced: number, assists: AssistRequest[] = [],
): DayReconciliation {
  const dayShifts = shifts.filter((s) => dayOf(s.openedAt) === day);
  const daySales = sales.filter((s) => dayOf(s.createdAt) === day);
  const positives = daySales.filter((s) => !s.reversalOf);
  const reversals = daySales.filter((s) => !!s.reversalOf);

  const shiftRecons: ShiftRecon[] = dayShifts.map((shift) => {
    const mine = daySales.filter((s) => s.shiftId === shift.id);
    const pos = mine.filter((s) => !s.reversalOf);
    const rev = mine.filter((s) => !!s.reversalOf);
    const cashSales = pos.reduce((a, s) => a + s.payments.filter((p) => p.method === 'Cash').reduce((x, p) => x + p.amount, 0), 0)
      - pos.reduce((a, s) => a + s.change, 0);
    const cashRefunds = Math.abs(rev.reduce((a, s) => a + s.payments.filter((p) => p.method === 'Cash').reduce((x, p) => x + p.amount, 0), 0));
    const cashDrops = cashDropsForShift(assists, shift.id);
    const expected = shift.openingFloat + cashSales - cashRefunds - cashDrops;
    return {
      shift, cashSales, cashRefunds, cashDrops, expected,
      counted: shift.countedCash,
      variance: shift.countedCash != null ? shift.countedCash - expected : undefined,
      reconciled: shift.status === 'closed' && shift.countedCash != null,
    };
  });

  const gross = positives.reduce((a, s) => a + s.total, 0);
  const refunds = Math.abs(reversals.reduce((a, s) => a + s.total, 0));
  const byMethod = METHODS.map((method) => ({
    method,
    amount: daySales.reduce((a, s) => a + s.payments.filter((p) => p.method === method).reduce((x, p) => x + p.amount, 0), 0),
  })).filter((m) => m.amount !== 0);

  const totalFloat = shiftRecons.reduce((a, r) => a + r.shift.openingFloat, 0);
  const totalCashSales = shiftRecons.reduce((a, r) => a + r.cashSales, 0);
  const totalCashRefunds = shiftRecons.reduce((a, r) => a + r.cashRefunds, 0);
  const totalCashDrops = shiftRecons.reduce((a, r) => a + r.cashDrops, 0);
  const totalExpected = shiftRecons.reduce((a, r) => a + r.expected, 0);
  const totalCounted = shiftRecons.reduce((a, r) => a + (r.counted ?? 0), 0);
  const openShifts = shiftRecons.filter((r) => r.shift.status === 'open').length;
  const totalVariance = shiftRecons.filter((r) => r.reconciled).reduce((a, r) => a + (r.variance || 0), 0);

  return {
    date: day,
    shifts: shiftRecons,
    openShifts,
    transactions: positives.length,
    gross, refunds, net: gross - refunds,
    byMethod,
    totalFloat, totalCashSales, totalCashRefunds, totalCashDrops,
    totalExpected, totalCounted, totalVariance,
    unsynced,
    canClose: openShifts === 0 && unsynced === 0 && dayShifts.length > 0,
    balanced: totalVariance === 0,
  };
}
