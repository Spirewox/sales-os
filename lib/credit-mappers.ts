import {
  ApiCreditCustomerSummary,
  ApiCreditRecord,
} from '@/types/api';
import {
  CreditCustomerSummary,
  CreditSummaryMetrics,
  SaleCreditRecord,
} from '@/types/credits';

function toDateStr(value: string | Date | undefined | null): string {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  return new Date(value).toISOString().split('T')[0];
}

export function mapCreditCustomerSummary(row: ApiCreditCustomerSummary): CreditCustomerSummary {
  return {
    customerId: row.customer_id,
    customerName: row.customer_name,
    totalOutstanding: row.total_outstanding,
    openCreditCount: row.open_credit_count,
    overdueCount: row.overdue_count,
    oldestDueDate: row.oldest_due_date ? toDateStr(row.oldest_due_date) : null,
    flaggedCount: row.flagged_count ?? 0,
    phone: row.customer_phone || undefined,
    hubId: row.hub_id || undefined,
    hubName: row.hub_name || undefined,
    overdueAmount: row.overdue_amount,
    lastPaymentDate: row.last_payment_date ? toDateStr(row.last_payment_date) : row.last_payment_date,
    dueThisWeekCount: row.due_this_week_count,
    dueThisWeekAmount: row.due_this_week_amount,
  };
}

export function mapCreditRecord(row: ApiCreditRecord): SaleCreditRecord {
  const productName =
    row.sale?.item?.product_name ||
    row.sale?.product_details ||
    undefined;
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    sale: row.sale
      ? {
          id: row.sale.id,
          date: toDateStr(row.sale.date),
          amount: row.sale.amount,
          paymentMode: row.sale.payment_mode,
          productDetails: productName,
          productName,
          quantity: row.sale.item?.quantity,
          unit: row.sale.item?.unit,
        }
      : {
          id: '',
          date: toDateStr(row.date_issued),
          amount: row.original_amount,
          paymentMode: 'Full Credit',
        },
    originalAmount: row.original_amount,
    amountOwed: row.amount_owed,
    dateIssued: toDateStr(row.date_issued),
    dueDate: toDateStr(row.due_date),
    lastPaymentDate: row.last_payment_date ? toDateStr(row.last_payment_date) : undefined,
    status: row.status,
    paymentTerms: row.payment_terms,
    extensionCount: row.extension_count ?? 0,
    flagged: row.flagged,
    flagReason: row.flag_reason,
    payments: (row.payments ?? []).map((p) => ({
      id: p.id,
      date: toDateStr(p.date),
      amount: p.amount,
      method: p.method as SaleCreditRecord['payments'][0]['method'],
      recordedByName: p.recorded_by_name,
      note: p.note,
      referenceId: p.reference_id,
      balanceAfter: p.balance_after,
    })),
    dueDateExtensions: (row.due_date_extensions ?? []).map((e) => ({
      previousDueDate: toDateStr(e.previous_due_date),
      newDueDate: toDateStr(e.new_due_date),
      extendedAt: e.extended_at,
      extendedByName: e.extended_by_name,
      reason: e.reason,
    })),
  };
}

export function buildMetricsFromSummary(summary: CreditCustomerSummary[]): CreditSummaryMetrics {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let overdueItemCount = 0;
  let flaggedCount = 0;
  let totalDaysOverdue = 0;

  summary.forEach((row) => {
    overdueItemCount += row.overdueCount;
    flaggedCount += row.flaggedCount;
    if (row.oldestDueDate && row.overdueCount > 0) {
      const due = new Date(row.oldestDueDate);
      due.setHours(0, 0, 0, 0);
      const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (days > 0) totalDaysOverdue += days;
    }
  });

  return {
    totalOutstanding: summary.reduce((s, r) => s + r.totalOutstanding, 0),
    overdueItemCount,
    customersWithCredit: summary.length,
    flaggedCount,
    avgDaysOverdue:
      summary.filter((r) => r.overdueCount > 0).length > 0
        ? Math.round(
            totalDaysOverdue / summary.filter((r) => r.overdueCount > 0).length,
          )
        : 0,
  };
}
