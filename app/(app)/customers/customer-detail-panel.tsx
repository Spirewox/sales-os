'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CreditCard, MessageCircle, MessageSquare, ShoppingCart, Pencil } from 'lucide-react';
import { useCustomerCredits, useSales, useFeedback, useEnquiries, useCompensations } from '@/hooks/use-queries';
import type { Customer } from '@/types';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate, formatMoney, formatCount } from '@/lib/format';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { EntityDrawer, OverflowMenu, SectionErrorBoundary, type SectionTab } from '@/components/app';
import { buildPaymentSplit, buildPurchaseAnalytics, buildSpendingTrend, buildTopProducts } from './customer-analytics';
import { creditHref, customerTitle, hasPhone, logFeedbackHref, recordSaleHref, whatsappHref } from './customer-links';
import { prioritizeCustomerSegments } from './customer-segments';
import { CustomerFormSheet, customerTypeLabel } from './customer-form';
import { CustomerOverviewTab } from './customer-overview-tab';
import { CustomerPurchasesTab } from './customer-purchases-tab';
import { CustomerCreditTab } from './customer-credit-tab';
import { CustomerInteractionsTab } from './customer-interactions-tab';
import { CustomerBadges, creditGrade } from './customer-grades';

// Kept for existing imports (engagement, older call sites).
export { ProfileFields, clearOppositeProfileFields } from './customer-form';
export { prioritizeCustomerSegments, segmentBadgeClass } from './customer-segments';

type DetailTab = 'overview' | 'purchases' | 'credit' | 'interactions';

/** Plain side-sheet shell, used by Engagement while a customer is still loading. */
export function CustomerDrawer({ children, onClose, animate = true }: Readonly<{
  children: ReactNode;
  onClose: () => void;
  animate?: boolean;
}>) {
  return (
    <ModalDialog onClose={onClose} align="end" label="Customer details">
      <div className={'relative z-10 h-full w-full max-w-xl overflow-y-auto border-l bg-background shadow-xl' + (animate ? ' animate-in slide-in-from-right duration-200 motion-reduce:animate-none' : '')}>
        {children}
      </div>
    </ModalDialog>
  );
}

const ACTION = 'inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-muted [&_svg]:size-3.5';

export type CustomerDetailPanelProps = Readonly<{
  customer: Customer;
  onClose: () => void;
  onUpdated?: (customer: Customer) => void;
  prioritySegmentNames?: string[];
  /** Kept for compatibility; the drawer no longer animates in. */
  animate?: boolean;
}>;

export function CustomerDetailPanel({ customer, onClose, onUpdated, prioritySegmentNames = [] }: CustomerDetailPanelProps) {
  const { can } = usePermissions();
  const [tab, setTab] = useState<DetailTab>('overview');
  const [editing, setEditing] = useState(false);
  const [seenId, setSeenId] = useState(customer.id);
  if (seenId !== customer.id) {
    setSeenId(customer.id);
    setTab('overview');
    setEditing(false);
  }
  const [now] = useState(() => Date.now());

  const { data: salesList, isLoading: salesLoading } = useSales({ customer_id: customer.id, limit: 200, exclude_voided: true });
  const { data: feedback = [] } = useFeedback();
  const { data: enquiries = [] } = useEnquiries();
  const { data: compensations = [] } = useCompensations();
  const { data: allCredits = [], isLoading: creditsLoading } = useCustomerCredits(customer.id);

  const customerSales = useMemo(
    () => (salesList?.items ?? []).filter((s) => s.customerId === customer.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [customer.id, salesList],
  );
  const analytics = useMemo(() => buildPurchaseAnalytics(customerSales, now), [customerSales, now]);
  const trend = useMemo(() => buildSpendingTrend(customerSales), [customerSales]);
  const topProducts = useMemo(() => buildTopProducts(customerSales), [customerSales]);
  const split = useMemo(() => buildPaymentSplit(customerSales), [customerSales]);

  // Cleared items come back from the API too; only open balances belong here.
  const credits = allCredits.filter((c) => c.amountOwed > 0);
  const outstanding = credits.reduce((sum, c) => sum + c.amountOwed, 0);
  const overdue = credits.some((c) => c.status === 'Overdue');
  const customerFeedback = feedback.filter((f) => f.customerId === customer.id || f.customerName === customer.name);
  const customerEnquiries = enquiries.filter((e) => (!!customer.email && e.email === customer.email) || e.customerName === customer.name);
  const customerCompensations = compensations.filter((c) => c.customerId === customer.id || c.customerName === customer.name);
  const interactionCount = customerFeedback.length + customerEnquiries.length + customerCompensations.length;
  const lastPurchase = customerSales[0]?.date ?? customer.lastPurchaseDate;

  const { primary, secondary } = customerTitle(customer);
  const phone = hasPhone(customer.phone) ? customer.phone : null;
  const canSell = can('sales.create');
  const canLog = can('interactions.create');
  const canPay = can('credits.record_payment');
  const segments = prioritizeCustomerSegments(customer.segments ?? [], prioritySegmentNames);

  const tabs: SectionTab<DetailTab>[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'purchases', label: 'Purchases', count: customerSales.length },
    { id: 'credit', label: 'Credit', count: credits.length, countTone: overdue ? 'danger' : 'warning' },
    { id: 'interactions', label: 'Interactions', count: interactionCount },
  ];

  return (
    <>
      <EntityDrawer
        onClose={onClose}
        title={primary}
        status={<CustomerBadges customer={customer} credits={creditsLoading ? undefined : allCredits} />}
        subtitle={[secondary, phone, customerTypeLabel(customer.type), customer.location].filter(Boolean).join(' · ')}
        actions={
          <>
            {phone && <a href={whatsappHref(phone)} target="_blank" rel="noopener noreferrer" className={ACTION}><MessageCircle aria-hidden /> WhatsApp</a>}
            {canSell && <Link href={recordSaleHref(customer.id)} className={ACTION}><ShoppingCart aria-hidden /> Record sale</Link>}
            {canPay && outstanding > 0 && <Link href={creditHref(customer.id)} className={ACTION}><CreditCard aria-hidden /> Record payment</Link>}
            {canLog && <Link href={logFeedbackHref(customer.id)} className={ACTION}><MessageSquare aria-hidden /> Log interaction</Link>}
          </>
        }
        overflow={
          <OverflowMenu
            size="sm"
            label="More customer actions"
            items={[{ label: 'Edit customer', icon: <Pencil />, onSelect: () => setEditing(true), hidden: !can('customers.edit') }]}
          />
        }
        stats={[
          { label: 'Revenue', value: formatMoney(customer.totalSpent) },
          { label: 'Orders', value: formatCount(customer.totalOrders) },
          { label: 'Outstanding', value: creditsLoading ? '…' : formatMoney(outstanding), tone: overdue ? 'danger' : 'default' },
          { label: 'Last purchase', value: lastPurchase ? formatDate(lastPurchase, { day: 'numeric', month: 'short', year: '2-digit' }) : salesLoading ? '…' : 'None' },
        ]}
        tabs={{ items: tabs, value: tab, onChange: setTab }}
      >
        <SectionErrorBoundary label="Customer details" resetKey={`${customer.id}-${tab}`}>
          {tab === 'overview' && <CustomerOverviewTab customer={customer} segments={segments} analytics={analytics} trend={trend} />}
          {tab === 'purchases' && (
            <CustomerPurchasesTab sales={customerSales} analytics={analytics} topProducts={topProducts} loading={salesLoading} recordSaleHref={canSell ? recordSaleHref(customer.id) : undefined} />
          )}
          {tab === 'credit' && (
            <CustomerCreditTab grade={creditGrade(allCredits)} credits={credits} outstanding={outstanding} overdue={overdue} split={split} creditLink={creditHref(customer.id)} canRecordPayment={canPay} loading={creditsLoading} />
          )}
          {tab === 'interactions' && (
            <CustomerInteractionsTab feedback={customerFeedback} enquiries={customerEnquiries} compensations={customerCompensations} logHref={canLog ? logFeedbackHref(customer.id) : undefined} />
          )}
        </SectionErrorBoundary>
      </EntityDrawer>

      {editing && <CustomerFormSheet customer={customer} onClose={() => setEditing(false)} onSaved={onUpdated} />}
    </>
  );
}
