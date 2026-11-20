import type { Tone } from '@/components/app';
import { formatMoney, formatDate as formatAppDate, NAIRA } from '@/lib/format';
import type { CreditStatus, SaleCreditRecord } from '@/types/credits';

export { NAIRA };

/** Exact money for credit amounts (shared formatter). */
export const fmt = (n: number) => formatMoney(n);

export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

/** Days past the due date (0 when not yet due); null without a date. */
export function daysLate(dateStr?: string | null): number | null {
  const d = daysUntil(dateStr);
  return d === null ? null : Math.max(0, -d);
}

export function formatDate(dateStr: string | null | undefined) {
  return formatAppDate(dateStr);
}

export const creditProductLabel = (credit: SaleCreditRecord) =>
  credit.sale.productName || credit.sale.productDetails || 'Credit sale';

export const lateLabel = (days: number) => `${days} day${days === 1 ? '' : 's'} late`;

const CREDIT_TONE: Record<CreditStatus, Tone> = {
  Pending: 'warning',
  Overdue: 'danger',
  Clear: 'good',
  Voided: 'neutral',
};
export const creditTone = (status: CreditStatus): Tone => CREDIT_TONE[status] ?? 'neutral';

/** tel: link with only digits and a leading +. */
export function telHref(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.replace(/\D/g, '').length >= 7 ? `tel:${cleaned}` : undefined;
}

/** wa.me link: digits only, local Nigerian 0XXXXXXXXXX numbers converted to 234XXXXXXXXXX. */
export function whatsAppHref(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = `234${digits.slice(1)}`;
  return digits.length >= 7 ? `https://wa.me/${digits}` : undefined;
}
