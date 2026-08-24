/**
 * FudFarmer POS — domain types.
 *
 * Money is held as integer kobo everywhere internally (no float drift);
 * formatting happens only at the UI edge via lib/money.ts.
 */

export type StoreType = 'Owned' | 'Franchise' | 'Subscriber';
/** Roles + the permission matrix live in lib/permissions.ts (§21, §22). */
import type { PosRole } from './permissions';
export type CashierRole = PosRole;
export type PaymentMethod = 'Cash' | 'Transfer' | 'Card' | 'Credit';
export type SyncState = 'pending' | 'syncing' | 'synced' | 'failed';
export type SaleStatus = 'completed' | 'refunded' | 'voided';

export interface StoreProfile {
  id: 'store';
  storeName: string;
  storeType: StoreType;
  hubId?: string;
  currency: string;
  receiptFooter?: string;
  plan?: 'Trial' | 'Basic' | 'Pro';
  planExpiry?: string;
  deviceId: string;
  deviceLabel: string;
  /** Allow selling below zero stock while offline (business decision per store). */
  allowNegativeStock: boolean;
  setupComplete: boolean;

  /* ── Tax (§3, §5, §25) ── */
  /** VAT/sales-tax rate. 0 disables tax entirely. */
  taxRatePct: number;
  /** True = shelf prices already include tax (tax is broken out, total unchanged).
   *  False = tax is added on top at checkout. */
  taxInclusive: boolean;
  taxLabel: string;              // e.g. 'VAT'

  /* ── Discount policy (§13) ── */
  /** Discounts above this % of the line/cart need supervisor authorisation. */
  discountApprovalThresholdPct: number;
  /** Hard ceiling — no one can discount beyond this. */
  maxDiscountPct: number;
}

export interface PosProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;      // kobo
  cost?: number;      // kobo
  unit: string;
  stock?: number;
  trackStock: boolean;
  isActive: boolean;
}

export interface PosCustomer {
  id: string;
  name: string;
  phone?: string;
  creditBalance?: number; // kobo
}

export interface Cashier {
  id: string;
  name: string;
  pin: string;
  role: CashierRole;
  isActive: boolean;
}

export interface PosSaleLine {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  qty: number;
  unitPrice: number;  // kobo
  unitCost?: number;  // kobo
  discount: number;   // kobo, line-level
  lineTotal: number;  // kobo
}

export interface PosPayment {
  method: PaymentMethod;
  amount: number;     // kobo
  reference?: string;
}

export interface PosSale {
  id: string;         // client-generated → idempotency key
  deviceId: string;
  storeId: string;
  cashierId: string;
  cashierName: string;
  shiftId?: string;
  lines: PosSaleLine[];
  subtotal: number;
  /** Total discount = line discounts + orderDiscount. */
  discount: number;
  /** Cart-level discount, on top of any line discounts. */
  orderDiscount?: number;
  /** Tax charged (or, when tax-inclusive, the portion of the total that is tax). */
  tax?: number;
  taxRatePct?: number;
  total: number;
  payments: PosPayment[];
  change: number;
  customerId?: string;
  customerName?: string;
  status: SaleStatus;
  createdAt: string;  // ISO
  syncState: SyncState;
  note?: string;
  /** Set when this sale has been refunded/voided — audit trail, never deleted. */
  refundedAt?: string;
  refundedBy?: string;
  refundReason?: string;
  /** For a refund record: the original sale it reverses. */
  reversalOf?: string;
  /** True when only part of the sale was returned (§11). */
  partial?: boolean;
  /** Cumulative qty returned per product, kept on the ORIGINAL so repeated
   *  partial returns can never exceed what was sold. */
  returnedQty?: Record<string, number>;
}

export const RETURN_REASONS = [
  'Damaged / spoiled', 'Wrong item', 'Customer changed mind',
  'Quality complaint', 'Overcharged', 'Duplicate sale', 'Other',
] as const;
export type ReturnReason = typeof RETURN_REASONS[number];

/* ─────────── Supervisor assist ───────────
 * A cashier hits a problem mid-sale and needs a supervisor to unblock them.
 * The request never blocks the till — they can hold the cart and keep serving.
 */

export type IssueType =
  | 'Price override' | 'Discount approval' | 'Wrong item rung up'
  | 'Payment problem' | 'Customer complaint' | 'Stock looks wrong'
  | 'Cash drop' | 'Sync stuck' | 'Other';

export const ISSUE_TYPES: IssueType[] = [
  'Price override', 'Discount approval', 'Wrong item rung up',
  'Payment problem', 'Customer complaint', 'Stock looks wrong',
  'Cash drop', 'Sync stuck', 'Other',
];

export type AssistStatus = 'open' | 'in_progress' | 'resolved' | 'cancelled';

/** What the supervisor actually DID — not just what they said. */
export type ResolutionKind =
  | 'price_override' | 'stock_correction' | 'cash_drop' | 'sync_retry' | 'guidance';

export interface ResolutionAction {
  kind: ResolutionKind;
  productId?: string;
  productName?: string;
  oldValue?: number;   // kobo (price) or units (stock)
  newValue?: number;
  amount?: number;     // kobo, for a cash drop
}

export interface AssistRequest {
  id: string;
  deviceId: string;
  shiftId?: string;
  cashierId: string;
  cashierName: string;
  type: IssueType;
  urgent: boolean;          // customer is waiting at the till
  note: string;
  /** What the cashier was doing when they got stuck. */
  context?: {
    cartTotal?: number;
    cartLines?: { name: string; qty: number; unit: string }[];
    productId?: string;
    productName?: string;
  };
  status: AssistStatus;
  createdAt: string;
  claimedBy?: string;
  claimedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  action?: ResolutionAction;
  syncState: SyncState;
}

/** End-of-day stock take. One record per trading day, per device. */
export interface StockCount {
  id: string;          // `${day}` — one count per day
  day: string;
  counts: Record<string, number>;  // productId → counted qty
  countedBy: string;
  countedAt: string;
}

/** A parked cart — cashier serves someone else, resumes later. Local only. */
export interface HeldSale {
  id: string;
  label: string;
  lines: { productId: string; qty: number; discount: number }[];
  customerId?: string;
  customerName?: string;
  cashierId: string;
  createdAt: string;
}

export type OutboxType = 'sale' | 'refund' | 'void' | 'shift' | 'customer';

export interface OutboxItem {
  id: string;
  type: OutboxType;
  refId: string;      // e.g. the sale id — the idempotency key
  payload: unknown;
  attempts: number;
  lastError?: string;
  createdAt: string;
  state: SyncState;
}

export interface Shift {
  id: string;
  deviceId: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;   // kobo
  countedCash?: number;   // kobo, counted at close
  /** Snapshot of expected cash at close = float + cash sales − cash refunds. */
  expectedCash?: number;
  variance?: number;      // counted − expected
  status: 'open' | 'closed';
  note?: string;
}
