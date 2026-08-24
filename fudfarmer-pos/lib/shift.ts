/**
 * Shift + cash-up reporting.
 *
 * X report = mid-shift snapshot (read-only, shift stays open).
 * Z report = end-of-shift close-out with a counted-cash variance.
 *
 * All figures are derived from locally-stored sales, so reports are correct
 * during a network outage — that is the whole point.
 */

import { PosSale, Shift, PaymentMethod } from './types';

export interface ShiftReport {
  shift: Shift;
  saleCount: number;
  refundCount: number;
  grossSales: number;      // completed sales only
  refunds: number;         // positive magnitude
  netSales: number;        // gross − refunds
  byMethod: { method: PaymentMethod; amount: number; count: number }[];
  cashSales: number;
  cashRefunds: number;
  cashDrops: number;
  expectedCash: number;    // float + cash sales − cash refunds
  countedCash?: number;
  variance?: number;
  topProducts: { name: string; qty: number; amount: number }[];
}

const METHODS: PaymentMethod[] = ['Cash', 'Transfer', 'Card', 'Credit'];

/** Sales that belong to a shift (reversals included — they carry negative amounts). */
export const salesForShift = (sales: PosSale[], shiftId: string) => sales.filter((s) => s.shiftId === shiftId);

export function buildReport(shift: Shift, sales: PosSale[], countedCash?: number, cashDrops = 0): ShiftReport {
  const mine = salesForShift(sales, shift.id);
  // A reversal record has reversalOf set and negative totals.
  const positives = mine.filter((s) => !s.reversalOf);
  const reversals = mine.filter((s) => !!s.reversalOf);

  const grossSales = positives.reduce((a, s) => a + s.total, 0);
  const refunds = Math.abs(reversals.reduce((a, s) => a + s.total, 0));

  const byMethod = METHODS.map((method) => {
    const amount = mine.reduce((a, s) => a + s.payments.filter((p) => p.method === method).reduce((x, p) => x + p.amount, 0), 0);
    const count = mine.reduce((a, s) => a + s.payments.filter((p) => p.method === method).length, 0);
    return { method, amount, count };
  }).filter((m) => m.count > 0);

  const cashSales = positives.reduce((a, s) => a + s.payments.filter((p) => p.method === 'Cash').reduce((x, p) => x + p.amount, 0), 0)
    - positives.reduce((a, s) => a + s.change, 0); // change handed back leaves the drawer
  const cashRefunds = Math.abs(reversals.reduce((a, s) => a + s.payments.filter((p) => p.method === 'Cash').reduce((x, p) => x + p.amount, 0), 0));
  const expectedCash = shift.openingFloat + cashSales - cashRefunds - cashDrops;

  // top products by value
  const tally = new Map<string, { name: string; qty: number; amount: number }>();
  positives.forEach((s) => s.lines.forEach((l) => {
    const cur = tally.get(l.productId) || { name: l.name, qty: 0, amount: 0 };
    cur.qty += l.qty; cur.amount += l.lineTotal;
    tally.set(l.productId, cur);
  }));
  const topProducts = Array.from(tally.values()).sort((a, b) => b.amount - a.amount).slice(0, 5);

  return {
    shift,
    saleCount: positives.length,
    refundCount: reversals.length,
    grossSales,
    refunds,
    netSales: grossSales - refunds,
    byMethod,
    cashSales,
    cashRefunds,
    cashDrops,
    expectedCash,
    countedCash,
    variance: countedCash != null ? countedCash - expectedCash : undefined,
    topProducts,
  };
}

export const openShiftFor = (shifts: Shift[], cashierId: string) =>
  shifts.find((s) => s.status === 'open' && s.cashierId === cashierId);

export const newShiftId = (deviceId: string) => `sh-${deviceId}-${Date.now().toString(36)}`;
