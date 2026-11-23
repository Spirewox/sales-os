import { PaymentTerms } from '@/types';

export type CreditStatus = 'Pending' | 'Overdue' | 'Clear' | 'Voided';

export interface CreditPayment {
  id: string;
  date: string;
  amount: number;
  method?: 'Cash' | 'Transfer' | 'POS';
  recordedBy?: string;
  recordedByName?: string;
  note?: string;
  referenceId?: string;
  balanceAfter: number;
}

export interface DueDateExtension {
  previousDueDate: string;
  newDueDate: string;
  extendedAt: string;
  extendedByName: string;
  reason?: string;
}

export interface LinkedSale {
  id: string;
  date: string;
  amount: number;
  paymentMode: string;
  productDetails?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
}

/** Per-sale credit item — one credit record per credit sale */
export interface SaleCreditRecord {
  id: string;
  customerId: string;
  customerName: string;
  sale: LinkedSale;
  originalAmount: number;
  amountOwed: number;
  dateIssued: string;
  dueDate: string;
  lastPaymentDate?: string;
  status: CreditStatus;
  paymentTerms?: PaymentTerms | string;
  extensionCount: number;
  flagged?: boolean;
  flagReason?: string;
  payments: CreditPayment[];
  dueDateExtensions: DueDateExtension[];
}

/** Customer-grouped row for credits main page */
export interface CreditCustomerSummary {
  customerId: string;
  customerName: string;
  totalOutstanding: number;
  openCreditCount: number;
  overdueCount: number;
  oldestDueDate: string | null;
  flaggedCount: number;
  /** Optional: only present when the summary endpoint returns them. */
  phone?: string;
  hubId?: string;
  hubName?: string;
  overdueAmount?: number;
  lastPaymentDate?: string | null;
  dueThisWeekCount?: number;
  dueThisWeekAmount?: number;
}

export interface CreditSummaryMetrics {
  totalOutstanding: number;
  overdueItemCount: number;
  customersWithCredit: number;
  flaggedCount: number;
  avgDaysOverdue: number;
}
