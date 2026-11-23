import { Sale, PaymentMode, SalesChannel, DeliveryStatus } from '@/types';
import { defaultVolumeUnit, isVolumeUom, volumeUnitPrice } from '@/lib/volume-units';

export type DetailTab = 'overview' | 'delivery' | 'history';
export type QuickDatePreset = 'today' | 'week' | 'month' | '30days' | 'all';
export type SaleDateFieldFilter = 'sold' | 'created';
export type CsvPreviewRow = { lineNo: number; [column: string]: string | number };

export const NAIRA = '\u20A6';
export const fmt = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(Number(n))) return '-';
  return `${NAIRA}${Number(n).toLocaleString()}`;
};

export const INPUT_CLS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
export const LABEL_CLS = 'text-sm font-medium';
export const BTN_PRIMARY = 'inline-flex items-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors h-9 px-4 py-2';
export const BTN_SECONDARY = 'inline-flex items-center rounded-md text-sm font-medium border bg-card hover:bg-muted transition-colors h-9 px-4 py-2';

export const CRM_SALES_CHANNELS = Object.values(SalesChannel).filter(
  (c) => c !== SalesChannel.POS,
);

export function isTillSale(sale: Pick<Sale, 'source' | 'channel'>) {
  return sale.source === 'pos' || sale.channel === SalesChannel.POS;
}

/** Posted from a completed kitchen job; changed from that job, not here. */
export function isKitchenSale(sale: Pick<Sale, 'source'>) {
  return sale.source === 'kitchen';
}

/** Till and kitchen sales are read-only on the Sales page. */
export function isLockedSale(sale: Pick<Sale, 'source' | 'channel'>) {
  return isTillSale(sale) || isKitchenSale(sale);
}

export function lockedSaleMessage(sale: Pick<Sale, 'source' | 'channel'>) {
  return isKitchenSale(sale) ? 'Kitchen sales are managed from their kitchen job.' : 'Till sales are read-only in Sales-OS.';
}

export const DELIVERY_STEPS: DeliveryStatus[] = [
  DeliveryStatus.PENDING,
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.DELIVERED,
  DeliveryStatus.CONFIRMED,
];

const HUB_PREFIX_RE = /^\[([^\]]+)\]/;

export function getDateRange(preset: QuickDatePreset): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  if (preset === 'all') return { from: '', to: '' };
  if (preset === 'today') return { from: to, to };
  if (preset === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return { from: d.toISOString().split('T')[0], to };
  }
  if (preset === 'month') {
    return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to };
  }
  const d = new Date(now);
  d.setDate(d.getDate() - 30);
  return { from: d.toISOString().split('T')[0], to };
}

export function extractHub(productDetails?: string): string | null {
  if (!productDetails) return null;
  const match = HUB_PREFIX_RE.exec(productDetails);
  return match?.[1] ?? null;
}

export function statusColor(s: string): string {
  if (s === 'Paid') return 'bg-primary/10 text-primary';
  if (s === 'Approved') return 'bg-muted text-foreground';
  if (s === 'Voided') return 'bg-destructive/10 text-destructive';
  return 'bg-warning/10 text-warning';
}

export function paymentModeBadgeClass(mode: PaymentMode): string {
  if (mode === PaymentMode.FULL_PAYMENT) return 'bg-primary/10 text-primary';
  if (mode === PaymentMode.FULL_CREDIT) return 'bg-warning/10 text-warning';
  return 'bg-warning/10 text-warning';
}

export function paymentModeLabel(mode: PaymentMode): string {
  if (mode === PaymentMode.FULL_PAYMENT) return 'Paid';
  if (mode === PaymentMode.FULL_CREDIT) return 'Credit';
  return 'Partial';
}

export function resolveSalePaymentMode(sale: Sale, paid: number): PaymentMode {
  if (sale.paymentMode) return sale.paymentMode as PaymentMode;
  if (!sale.isCredit) return PaymentMode.FULL_PAYMENT;
  return paid > 0 ? PaymentMode.PARTIAL_CREDIT : PaymentMode.FULL_CREDIT;
}

export function getAmountPaidForMode(paymentMode: PaymentMode, amount: number, amountPaid: number): number {
  if (paymentMode === PaymentMode.FULL_PAYMENT) return amount;
  if (paymentMode === PaymentMode.FULL_CREDIT) return 0;
  return amountPaid;
}

function money(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Same rule as the API: amount + discount must equal the selected SKU price times quantity. */
export function catalogBatchPriceError(args: {
  batchUnitPrice: number;
  unitOfMeasure?: string;
  saleUnit?: string;
  cartonWeight?: number;
  cartonPrice?: number;
  quantity: number;
  batchNumber: string;
  amount: number;
  discount: number;
  amountPaid: number;
  paymentMode: string;
}): string | null {
  const batch = Number(args.batchUnitPrice);
  const uom = (args.unitOfMeasure || '').trim().toLowerCase();
  const unit = (args.saleUnit || '').trim().toLowerCase();
  const byCarton = unit === 'carton' || unit === 'cartons' || (uom === 'cartons' && unit !== 'kg');
  let unitPrice: number | null = null;
  if (byCarton) {
    const carton = Number(args.cartonPrice);
    unitPrice = carton > 0 ? money(carton) : null;
  } else if (batch > 0) {
    if (uom === 'cartons') {
      unitPrice = money(batch);
    } else if (isVolumeUom(args.unitOfMeasure)) {
      const entered = unit === 'ml' ? 'ml' : unit === 'liters' || unit === 'liter' ? 'Liters' : (defaultVolumeUnit(args.unitOfMeasure) ?? 'Liters');
      unitPrice = money(volumeUnitPrice(args.unitOfMeasure, batch, entered));
    } else {
      unitPrice = money(batch);
    }
  }
  if (unitPrice == null) {
    if (byCarton) {
      return `This SKU has no carton selling price.`;
    }
    return `This SKU has no selling price.`;
  }
  const listTotal = money(unitPrice * args.quantity);
  const amount = money(args.amount);
  const discount = money(args.discount);
  const paid = money(args.amountPaid);
  const combined = money(amount + discount);
  const gap = money(listTotal - amount);
  if (amount < 0) return 'Sale amount cannot be negative.';
  if (discount > listTotal) {
    return `Discount cannot be more than the SKU price times quantity (${fmt(listTotal)}).`;
  }
  if (paid > listTotal) {
    return `Amount paid cannot be more than the SKU price times quantity (${fmt(listTotal)}).`;
  }
  if (amount > listTotal) {
    return `Sale amount cannot be more than the SKU price times quantity (${fmt(listTotal)}).`;
  }
  if (combined > listTotal) {
    return `Sale amount plus discount cannot be more than the SKU price times quantity (${fmt(listTotal)}).`;
  }
  if (combined !== listTotal) {
    if (args.paymentMode === PaymentMode.FULL_PAYMENT) {
      const modeHint = paid <= 0
        ? 'or change Full Payment to Full Credit'
        : paid < listTotal
          ? 'or change Full Payment to Partial Credit'
          : 'or change the payment mode';
      return `This sale is ${fmt(gap)} below the SKU price of ${fmt(listTotal)}. Add a discount of ${fmt(gap)} so the total matches, ${modeHint}.`;
    }
    return `Sale amount plus discount must equal the batch total of ${fmt(listTotal)}. Set the sale amount to ${fmt(listTotal)}, or enter a discount for the difference.`;
  }
  if (args.paymentMode === PaymentMode.FULL_PAYMENT && paid !== amount) {
    if (paid <= 0) return 'Change Full Payment to Full Credit, or pay the full sale amount.';
    if (paid < amount) return 'Change Full Payment to Partial Credit, or pay the full sale amount.';
    return 'Amount paid cannot be more than the sale amount.';
  }
  return null;
}

export function creditWarningText(row: { totalOutstanding: number; overdueCount: number }): string {
  const itemLabel = row.overdueCount === 1 ? 'item' : 'items';
  if (row.overdueCount > 0) {
    return `Overdue credit: ${fmt(row.totalOutstanding)} (${row.overdueCount} ${itemLabel})`;
  }
  return `Outstanding credit: ${fmt(row.totalOutstanding)}`;
}

export function saleCountLabel(count: number): string {
  return `${count} sale${count === 1 ? '' : 's'}`;
}

export function escapeCsvCell(value: unknown): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

export async function parseCsvFile(file: File): Promise<{ rows: CsvPreviewRow[]; errors: string[] }> {
  const text = await file.text();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must have a header row and at least one data row.'] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.replaceAll(/^"|"$/g, '').trim().toLowerCase());
  const requiredHeaders = ['date', 'customer', 'amount'];
  const missing = requiredHeaders.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { rows: [], errors: [`Missing required columns: ${missing.join(', ')}. Required: date, customer, amount`] };
  }

  const rows: CsvPreviewRow[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]).map((v) => v.replaceAll(/^"|"$/g, '').replaceAll('""', '"').trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    if (!row.date || !row.customer || !row.amount) {
      errors.push(`Row ${i + 1}: Missing date, customer, or amount.`);
      continue;
    }
    if (Number.isNaN(Number(row.amount))) {
      errors.push(`Row ${i + 1}: Amount "${row.amount}" is not a number.`);
      continue;
    }
    rows.push({ ...row, lineNo: i + 1 });
  }
  return { rows, errors };
}

export function matchesSaleFilters(
  sale: Sale,
  opts: {
    searchTerm: string;
    filterAgent: string;
    filterStatus: string;
    filterChannel: string;
    hubMatches: (hubName?: string) => boolean;
  },
): boolean {
  if (sale.status === 'Voided') return opts.filterStatus === 'Voided';
  const term = opts.searchTerm.toLowerCase();
  const matchSearch =
    sale.customerName.toLowerCase().includes(term) ||
    (sale.productDetails || '').toLowerCase().includes(term) ||
    (sale.notes || '').toLowerCase().includes(term);
  const matchAgent = opts.filterAgent === 'All' || sale.agentId === opts.filterAgent;
  const matchStatus = opts.filterStatus === 'All' || sale.status === opts.filterStatus;
  const matchHub = opts.hubMatches(extractHub(sale.productDetails) ?? undefined);
  const matchChannel = opts.filterChannel === 'All' || sale.channel === opts.filterChannel;
  return matchSearch && matchAgent && matchStatus && matchHub && matchChannel;
}

export function computeSalesKpis(
  filteredSales: Sale[],
  activeSales: Sale[],
) {
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const prevMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const thisMonthSales = activeSales.filter((s) => s.date >= thisMonthStart);
  const prevMonthSales = activeSales.filter((s) => s.date >= prevMonthStart && s.date < prevMonthEnd);
  const nonVoided = filteredSales.filter((s) => s.status !== 'Voided');

  const revenue = nonVoided.reduce((a, s) => a + s.amount, 0);
  const profit = nonVoided.reduce((a, s) => a + s.profitAmount, 0);
  const count = nonVoided.length;
  const avgOrder = count > 0 ? revenue / count : 0;
  const creditSales = nonVoided.filter((s) => s.paymentMode !== PaymentMode.FULL_PAYMENT);
  const creditCount = creditSales.length;
  const creditAmount = creditSales.reduce((a, s) => a + s.amount, 0);
  const deliveryCount = nonVoided.filter((s) => s.channel === SalesChannel.DELIVERY).length;

  const thisRev = thisMonthSales.reduce((a, s) => a + s.amount, 0);
  const prevRev = prevMonthSales.reduce((a, s) => a + s.amount, 0);
  const thisProf = thisMonthSales.reduce((a, s) => a + s.profitAmount, 0);
  const prevProf = prevMonthSales.reduce((a, s) => a + s.profitAmount, 0);
  const revenueChange = prevRev > 0 ? ((thisRev - prevRev) / prevRev) * 100 : 0;
  const profitChange = prevProf > 0 ? ((thisProf - prevProf) / prevProf) * 100 : 0;

  return { revenue, profit, count, avgOrder, creditCount, creditAmount, deliveryCount, revenueChange, profitChange };
}

/** Payment status vocabulary shared by the table, the filter and the drawer (StatusBadge domain="payment"). */
export type SalePaymentStatus = 'Paid' | 'Partial' | 'Credit' | 'Overdue' | 'Voided';
export const PAYMENT_STATUS_FILTERS: { value: string; label: SalePaymentStatus }[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'credit', label: 'Credit' },
  { value: 'voided', label: 'Voided' },
];

/** Paid so far and what is still owed. A linked credit record's balance wins (it includes repayments). */
export function saleBalance(sale: Pick<Sale, 'amount' | 'amountPaid' | 'isCredit'>, creditOwed?: number | null) {
  const owed = creditOwed ?? Math.max(0, sale.amount - (sale.amountPaid ?? (sale.isCredit ? 0 : sale.amount)));
  const balance = Math.max(0, Math.round(owed * 100) / 100);
  return { paid: Math.max(0, sale.amount - balance), balance };
}

export function salePaymentStatus(
  sale: Pick<Sale, 'status' | 'amount' | 'amountPaid' | 'isCredit' | 'dueDate'>,
  opts: { creditOwed?: number | null; overdue?: boolean; today?: string } = {},
): SalePaymentStatus {
  if (sale.status === 'Voided') return 'Voided';
  const { paid, balance } = saleBalance(sale, opts.creditOwed);
  if (balance <= 0) return 'Paid';
  const overdue = opts.overdue ?? (!!sale.dueDate && !!opts.today && sale.dueDate < opts.today);
  if (overdue) return 'Overdue';
  return paid > 0 ? 'Partial' : 'Credit';
}

/** Short reference shown as "Sale #". The API has no sale number yet, so this is the id's tail. */
export function saleRef(id: string): string {
  return id.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase();
}

/** "Gizzard, 12 kg" */
export function saleItemsLabel(sale: Pick<Sale, 'item' | 'productDetails'>): string {
  const item = sale.item;
  if (!item?.productName) return sale.productDetails || '-';
  const qty = Number(item.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return item.productName;
  const unit = item.saleUnit || item.unit || '';
  return `${item.productName}, ${qty.toLocaleString('en-NG')}${unit ? ` ${unit === 'Kg' ? 'kg' : unit}` : ''}`;
}

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  [PaymentMode.FULL_PAYMENT]: 'Paid in full',
  [PaymentMode.PARTIAL_CREDIT]: 'Part paid',
  [PaymentMode.FULL_CREDIT]: 'On credit',
};

/** Units sold, main units first in a fixed order, then any other recorded unit by size (as the old Units sold card). */
const MAIN_UNIT_ORDER = ['Kg', 'Cartons', 'Liters', 'ml', 'Plates', 'Units'];
export function unitsSoldRows(unitsByUnit: Record<string, number> | undefined): { unit: string; qty: number; main: boolean }[] {
  const byUnit = unitsByUnit ?? {};
  const main = MAIN_UNIT_ORDER.filter((u) => byUnit[u]).map((u) => ({ unit: u, qty: byUnit[u], main: true }));
  const other = Object.entries(byUnit)
    .filter(([u, q]) => q && !MAIN_UNIT_ORDER.includes(u))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([unit, qty]) => ({ unit, qty, main: false }));
  return [...main, ...other];
}
