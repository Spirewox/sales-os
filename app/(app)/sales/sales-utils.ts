import { Sale, PaymentMode, SalesChannel, DeliveryStatus } from '@/types';

export type DetailTab = 'overview' | 'delivery' | 'history';
export type QuickDatePreset = 'today' | 'week' | 'month' | '30days' | 'all';
export type SaleDateFieldFilter = 'sold' | 'created';
export type CsvPreviewRow = { lineNo: number; [column: string]: string | number };

export const NAIRA = '\u20A6';
export const fmt = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return `${NAIRA}${Number(n).toLocaleString()}`;
};

export const INPUT_CLS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
export const LABEL_CLS = 'text-sm font-medium';
export const BTN_PRIMARY = 'inline-flex items-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2';
export const BTN_SECONDARY = 'inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2';

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
  if (s === 'Paid') return 'bg-green-100 text-green-800';
  if (s === 'Approved') return 'bg-blue-100 text-blue-800';
  if (s === 'Voided') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
}

export function paymentModeBadgeClass(mode: PaymentMode): string {
  if (mode === PaymentMode.FULL_PAYMENT) return 'bg-green-100 text-green-800';
  if (mode === PaymentMode.FULL_CREDIT) return 'bg-orange-100 text-orange-800';
  return 'bg-yellow-100 text-yellow-800';
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
