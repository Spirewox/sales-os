import type { Customer } from '@/types';
import type { SaleCreditRecord } from '@/types/credits';
import { StatusBadge, type Tone } from '@/components/app';

/** Repeat after the second order. Same rule as the old list's status column. */
export const customerStatus = (c: Pick<Customer, 'totalOrders'>) => (c.totalOrders > 1 ? 'Repeat' : 'New');

/** Loyalty tier by lifetime spend, for repeat customers only (old drawer badge). */
export function loyaltyTier(c: Pick<Customer, 'totalOrders' | 'totalSpent'>): 'Gold' | 'Silver' | 'Bronze' | null {
  if (c.totalOrders <= 1) return null;
  if (c.totalSpent >= 500000) return 'Gold';
  if (c.totalSpent >= 100000) return 'Silver';
  return 'Bronze';
}

/**
 * Credit grade from the customer's credit records: none on record = N/A, any overdue = F, otherwise B.
 * Same rule as the old drawer. The list never had the records, so it always showed N/A there.
 */
export function creditGrade(credits: SaleCreditRecord[]): 'N/A' | 'F' | 'B' {
  if (credits.length === 0) return 'N/A';
  if (credits.some((c) => c.status === 'Overdue')) return 'F';
  return 'B';
}

const GRADE_TONE: Record<ReturnType<typeof creditGrade>, Tone> = { 'N/A': 'neutral', F: 'danger', B: 'good' };

export function CreditGradeBadge({ grade }: Readonly<{ grade: ReturnType<typeof creditGrade> }>) {
  return <StatusBadge tone={GRADE_TONE[grade]}>{grade === 'N/A' ? 'No credit grade' : `Credit grade ${grade}`}</StatusBadge>;
}

/** Repeat/New, loyalty tier and credit grade, as one row of badges. */
export function CustomerBadges({ customer, credits }: Readonly<{ customer: Customer; credits?: SaleCreditRecord[] }>) {
  const tier = loyaltyTier(customer);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <StatusBadge tone="neutral">{customerStatus(customer)}</StatusBadge>
      {tier && <StatusBadge tone="neutral">{`${tier} tier`}</StatusBadge>}
      {credits && <CreditGradeBadge grade={creditGrade(credits)} />}
    </span>
  );
}
