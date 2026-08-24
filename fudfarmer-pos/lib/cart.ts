/** Cart maths — pure functions, kobo throughout. */

import { PosProduct, PosSaleLine, PosPayment } from './types';

export interface CartLine {
  product: PosProduct;
  qty: number;
  discount: number; // kobo, line-level
}

export const lineTotal = (l: CartLine) => Math.max(0, l.product.price * l.qty - l.discount);

export const cartSubtotal = (lines: CartLine[]) => lines.reduce((s, l) => s + l.product.price * l.qty, 0);
export const cartDiscount = (lines: CartLine[]) => lines.reduce((s, l) => s + l.discount, 0);
/** Net of line discounts, before any cart-level discount or tax. */
export const cartNet = (lines: CartLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0);
export const cartCount = (lines: CartLine[]) => lines.reduce((s, l) => s + l.qty, 0);

/* ─────────── tax (§3, §5) ───────────
 * Two regimes, because retail here does both:
 *   inclusive — shelf price already contains tax; the total is unchanged and we
 *               simply break out how much of it is tax.
 *   exclusive — tax is added on top of the net at checkout.
 */
export interface CartTotals {
  subtotal: number;      // gross of line discounts
  lineDiscount: number;
  orderDiscount: number;
  discount: number;      // line + order
  net: number;           // after all discounts, before tax adjustment
  tax: number;
  total: number;         // what the customer pays
}

export function computeTotals(
  lines: CartLine[],
  opts: { orderDiscount?: number; taxRatePct?: number; taxInclusive?: boolean } = {},
): CartTotals {
  const subtotal = cartSubtotal(lines);
  const lineDiscount = cartDiscount(lines);
  const afterLines = cartNet(lines);
  // A cart-level discount can never exceed what's left to discount.
  const orderDiscount = Math.min(Math.max(0, opts.orderDiscount || 0), afterLines);
  const net = afterLines - orderDiscount;
  const rate = (opts.taxRatePct || 0) / 100;

  let tax = 0, total = net;
  if (rate > 0) {
    if (opts.taxInclusive) {
      // price already contains tax → extract it, total stays the same
      tax = net - net / (1 + rate);
      total = net;
    } else {
      tax = net * rate;
      total = net + tax;
    }
  }
  return {
    subtotal, lineDiscount, orderDiscount,
    discount: lineDiscount + orderDiscount,
    net, tax: Math.round(tax), total: Math.round(total),
  };
}

/** Kept for callers that only need the payable figure. */
export const cartTotal = (lines: CartLine[], opts?: { orderDiscount?: number; taxRatePct?: number; taxInclusive?: boolean }) =>
  computeTotals(lines, opts).total;

/* ─────────── discount helpers (§13) ─────────── */
export const pctToAmount = (base: number, pct: number) => Math.round(base * (Math.max(0, pct) / 100));
export const amountToPct = (base: number, amount: number) => (base > 0 ? (amount / base) * 100 : 0);
/** Largest discount % applied anywhere in the cart — drives the approval gate. */
export function maxDiscountPctInCart(lines: CartLine[], orderDiscount: number): number {
  const linePcts = lines.map((l) => amountToPct(l.product.price * l.qty, l.discount));
  const orderPct = amountToPct(cartNet(lines), orderDiscount);
  return Math.max(0, ...linePcts, orderPct);
}

export const paid = (payments: PosPayment[]) => payments.reduce((s, p) => s + p.amount, 0);

/** Change owed when tendered exceeds the total (cash only can produce change). */
export const changeDue = (payments: PosPayment[], total: number) => Math.max(0, paid(payments) - total);
export const balanceDue = (payments: PosPayment[], total: number) => Math.max(0, total - paid(payments));

export const toSaleLines = (lines: CartLine[]): PosSaleLine[] =>
  lines.map((l) => ({
    productId: l.product.id,
    name: l.product.name,
    sku: l.product.sku,
    unit: l.product.unit,
    qty: l.qty,
    unitPrice: l.product.price,
    unitCost: l.product.cost,
    discount: l.discount,
    lineTotal: lineTotal(l),
  }));

/** Client-generated, collision-free across tills. */
export const newSaleId = (deviceId: string) =>
  `${deviceId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
