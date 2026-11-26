import type { CreditCustomerSummary } from '@/types/credits';
import { csvDate, type ExportColumn } from '@/lib/export';

const DAY_MS = 86_400_000;

/** Whole Lagos days from a `YYYY-MM-DD` due date to today; 0 before it is due, null with no date. */
export function daysOverdue(dueDate: string | null | undefined, now: Date): number | null {
  if (!dueDate) return null;
  const today = csvDate(now);
  const due = dueDate.slice(0, 10);
  if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return null;
  return Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / DAY_MS));
}

/** Columns of the Credits list; `now` fixes "Days overdue" to the moment of the export. */
export function creditExportColumns(now: Date): ExportColumn<CreditCustomerSummary>[] {
  return [
    { header: 'Customer', value: (r) => r.customerName },
    { header: 'Phone', value: (r) => r.phone },
    { header: 'Location', value: (r) => r.hubName },
    { header: 'Outstanding', value: (r) => r.totalOutstanding },
    { header: 'Open credits', value: (r) => r.openCreditCount },
    { header: 'Overdue credits', value: (r) => r.overdueCount },
    { header: 'Overdue amount', value: (r) => r.overdueAmount },
    { header: 'Oldest due date', value: (r) => (r.oldestDueDate ? r.oldestDueDate.slice(0, 10) : '') },
    { header: 'Days overdue', value: (r) => daysOverdue(r.oldestDueDate, now) },
    { header: 'Due this week', value: (r) => r.dueThisWeekCount },
    { header: 'Due this week amount', value: (r) => r.dueThisWeekAmount },
    { header: 'Last payment', value: (r) => csvDate(r.lastPaymentDate) },
    { header: 'Flagged', value: (r) => (r.flaggedCount > 0 ? 'Yes' : 'No') },
  ];
}
