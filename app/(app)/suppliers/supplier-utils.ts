import {
  PaymentTerms, StockMovementType, SupplierBusinessType, SupplierIssueType,
  type ProductCategory, type StockLog, type Supplier, type SupplierIssue,
} from '@/types';
import { lagosDay } from '@/lib/period';

export const BUSINESS_TYPES = Object.values(SupplierBusinessType);
export const PAYMENT_TERMS = Object.values(PaymentTerms);
export const ISSUE_TYPES = Object.values(SupplierIssueType);
export const SEVERITIES: SupplierIssue['severity'][] = ['Low', 'Medium', 'High'];

/** Suppliers with no purchase for this many days count as "gone quiet". */
export const STALE_DAYS = 60;

/** "SUP-007" or "7" → 7; anything else → null. */
export function parseSupplierCodeNum(raw?: string): number | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().toUpperCase();
  const withPrefix = t.match(/^SUP-(\d+)$/);
  if (withPrefix) return parseInt(withPrefix[1], 10);
  const digitsOnly = t.match(/^(\d+)$/);
  if (digitsOnly) return parseInt(digitsOnly[1], 10);
  return null;
}

export const isPurchase = (l: StockLog) => String(l.type).toUpperCase() === StockMovementType.PURCHASE;
export const isSale = (l: StockLog) => String(l.type).toUpperCase() === StockMovementType.SALE;
export const logValue = (l: StockLog) => Math.abs(l.quantity) * l.unitCost;

/**
 * Which supplier a purchase log belongs to. Older logs carry only the supplier's name, so fall
 * back to matching by name.
 */
export function supplierKeyResolver(suppliers: Supplier[]) {
  const byName = new Map(suppliers.map((s) => [s.name.trim().toLowerCase(), s.id]));
  return (l: StockLog): string | undefined => l.supplierId || (l.supplier ? byName.get(l.supplier.trim().toLowerCase()) : undefined);
}

export const toggleCategory = (list: ProductCategory[] | undefined, cat: ProductCategory) =>
  (list || []).includes(cat) ? (list || []).filter((c) => c !== cat) : [...(list || []), cat];

/** API body for create and update. */
export function supplierPayload(form: Partial<Supplier>, hubId: string | undefined) {
  return {
    name: form.name?.trim(),
    business_name: form.businessName?.trim() || undefined,
    business_type: form.businessType,
    hub_id: hubId,
    address: form.address?.trim() || undefined,
    contact_person: form.contactPerson?.trim() || undefined,
    phone: form.phone?.trim() || undefined,
    email: form.email?.trim() || undefined,
    categories: form.categories ?? [],
    payment_terms: form.paymentTerms,
    lead_time_days: form.leadTimeDays,
    rating: form.rating,
    notes: form.notes?.trim() || undefined,
  };
}

/** YYYY-MM-DD in Lagos, `days` before today. */
export const daysAgoDay = (days: number): string => lagosDay(new Date(Date.now() - days * 86_400_000));
