import { Flag } from 'lucide-react';
import type { Column } from '@/components/app';
import type { CreditCustomerSummary } from '@/types/credits';
import { daysLate, daysUntil, fmt, formatDate, lateLabel } from '@/components/credits/credit-utils';

export type CreditFilter = 'overdue' | 'week' | 'flagged';

/** Customers with something due in the next 7 days (not yet overdue). */
export function isDueThisWeek(row: CreditCustomerSummary): boolean {
  if (row.dueThisWeekCount != null) return row.dueThisWeekCount > 0;
  // Fallback when the API omits it: the oldest open item falls due within 7 days.
  const d = daysUntil(row.oldestDueDate);
  return d !== null && d >= 0 && d <= 7;
}

export function matchesFilter(row: CreditCustomerSummary, filter: CreditFilter | null): boolean {
  if (filter === 'overdue') return row.overdueCount > 0;
  if (filter === 'week') return isDueThisWeek(row);
  if (filter === 'flagged') return row.flaggedCount > 0;
  return true;
}

/** Days past the oldest due date, for sorting: negative means not yet due. */
const lateness = (row: CreditCustomerSummary) => {
  const d = daysUntil(row.oldestDueDate);
  return d === null ? null : -d;
};

function OverdueCell({ row }: Readonly<{ row: CreditCustomerSummary }>) {
  if (row.overdueCount === 0) return <span className="text-muted-foreground">-</span>;
  const items = `${row.overdueCount} item${row.overdueCount === 1 ? '' : 's'}`;
  if (row.overdueAmount == null) return <span className="font-medium text-destructive">{items}</span>;
  return (
    <span className="inline-flex flex-col items-end">
      <span className="font-medium text-destructive">{fmt(row.overdueAmount)}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{items}</span>
    </span>
  );
}

function OldestDueCell({ row }: Readonly<{ row: CreditCustomerSummary }>) {
  if (!row.oldestDueDate) return <span className="text-muted-foreground">-</span>;
  const late = row.overdueCount > 0 ? daysLate(row.oldestDueDate) : 0;
  return (
    <span className="block whitespace-nowrap">
      <span>{formatDate(row.oldestDueDate)}</span>
      {late ? <span className="block text-xs font-medium text-destructive tabular-nums">{lateLabel(late)}</span> : null}
    </span>
  );
}

export const creditColumns: Column<CreditCustomerSummary>[] = [
  {
    id: 'customer',
    header: 'Customer',
    mobile: 'title',
    sortValue: (r) => r.customerName.toLowerCase(),
    cell: (r) => (
      <span className="block min-w-0">
        <span className="inline-flex items-center gap-1.5">
          {r.customerName}
          {r.flaggedCount > 0 && <Flag size={14} aria-label="Flagged" className="shrink-0 text-warning" />}
        </span>
        {r.phone && <span className="block text-xs font-normal text-muted-foreground tabular-nums">{r.phone}</span>}
      </span>
    ),
  },
  {
    id: 'outstanding',
    header: 'Outstanding',
    align: 'right',
    mobile: 'value',
    sortValue: (r) => r.totalOutstanding,
    cell: (r) => <span className={r.overdueCount > 0 ? 'font-semibold text-destructive' : 'font-semibold'}>{fmt(r.totalOutstanding)}</span>,
  },
  {
    id: 'open',
    header: 'Open items',
    align: 'right',
    hideBelow: 'xl',
    sortValue: (r) => r.openCreditCount,
    cell: (r) => <span className="tabular-nums">{r.openCreditCount}</span>,
  },
  {
    id: 'overdue',
    header: 'Overdue',
    align: 'right',
    sortValue: (r) => r.overdueAmount ?? r.overdueCount,
    cell: (r) => <OverdueCell row={r} />,
  },
  {
    id: 'oldest',
    header: 'Oldest due',
    mobile: 'meta',
    sortValue: lateness,
    cell: (r) => <OldestDueCell row={r} />,
  },
  {
    id: 'lastPayment',
    header: 'Last payment',
    hideBelow: 'lg',
    sortValue: (r) => r.lastPaymentDate ?? null,
    cell: (r) => (r.lastPaymentDate ? formatDate(r.lastPaymentDate) : <span className="text-muted-foreground">None</span>),
  },
];
