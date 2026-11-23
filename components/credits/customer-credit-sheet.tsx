'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageCircle, Receipt, User, Wallet } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { useCustomer, useCustomerCredits, useFlagCredit } from '@/hooks/use-queries';
import type { CreditCustomerSummary, SaleCreditRecord } from '@/types/credits';
import { EmptyState, EntityDrawer, OverflowMenu, StatusBadge } from '@/components/app';
import { CreditSheetSkeleton } from '@/components/ui/loading-skeletons';
import { CreditItemCard } from './credit-item-card';
import { ExtendDueDateForm, GeneralRepaymentForm, RecordPaymentForm } from './credit-forms';
import { fmt, formatDate, whatsAppHref } from './credit-utils';

interface CustomerCreditSheetProps {
  /** Open when set. */
  customerId: string | null;
  /** The list row, when the customer is on the Credits list (gives name and totals before items load). */
  summary?: CreditCustomerSummary | null;
  onClose: () => void;
}

const isOpenCredit = (c: SaleCreditRecord) => c.status !== 'Clear' && c.status !== 'Voided';

export function CustomerCreditSheet({ customerId, summary, onClose }: Readonly<CustomerCreditSheetProps>) {
  if (!customerId) return null;
  return <CreditSheetBody key={customerId} customerId={customerId} summary={summary ?? null} onClose={onClose} />;
}

function CreditSheetBody({ customerId, summary, onClose }: Readonly<{ customerId: string; summary: CreditCustomerSummary | null; onClose: () => void }>) {
  const router = useRouter();
  const { can } = usePermissions();
  const { data: credits = [], isLoading } = useCustomerCredits(customerId);
  const { data: customer } = useCustomer(customerId);
  const flagCredit = useFlagCredit();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentCredit, setPaymentCredit] = useState<SaleCreditRecord | null>(null);
  const [extendCredit, setExtendCredit] = useState<SaleCreditRecord | null>(null);
  const [showGeneralPayment, setShowGeneralPayment] = useState(false);

  const openItems = useMemo(
    () => credits.filter(isOpenCredit).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [credits],
  );
  const clearedItems = credits.filter((c) => !isOpenCredit(c));

  const loaded = !isLoading;
  const totalOutstanding = loaded ? openItems.reduce((s, c) => s + c.amountOwed, 0) : summary?.totalOutstanding ?? 0;
  const overdueItems = openItems.filter((c) => c.status === 'Overdue');
  const overdueAmount = loaded ? overdueItems.reduce((s, c) => s + c.amountOwed, 0) : summary?.overdueAmount;
  const overdueCount = loaded ? overdueItems.length : summary?.overdueCount ?? 0;
  const flaggedCount = loaded ? openItems.filter((c) => c.flagged).length : summary?.flaggedCount ?? 0;
  const itemCount = loaded ? openItems.length : summary?.openCreditCount ?? 0;
  const lastPayment = useMemo(() => {
    const dates = credits.flatMap((c) => [c.lastPaymentDate, ...c.payments.map((p) => p.date)]).filter(Boolean) as string[];
    return dates.sort().at(-1) ?? summary?.lastPaymentDate ?? null;
  }, [credits, summary?.lastPaymentDate]);

  const name = customer?.companyName || customer?.name || summary?.customerName || credits[0]?.customerName || 'Customer';
  const phone = customer?.phone || summary?.phone;
  const whatsapp = whatsAppHref(phone);
  const location = customer?.location || summary?.hubName;

  const handleFlag = async (credit: SaleCreditRecord) => {
    try {
      await flagCredit.mutateAsync({ creditId: credit.id });
      toast.success(credit.flagged ? 'Flag removed.' : 'Flagged for review.');
    } catch {
      toast.error('Could not update flag.');
    }
  };

  const status =
    overdueCount > 0 ? <StatusBadge tone="danger">{overdueCount} overdue</StatusBadge>
    : totalOutstanding > 0 ? <StatusBadge tone="warning">Pending</StatusBadge>
    : loaded ? <StatusBadge tone="good">Clear</StatusBadge>
    : null;

  const contactBtn = 'inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted [&_svg]:size-4';

  return (
    <>
      <EntityDrawer
        onClose={onClose}
        width="lg"
        title={name}
        subtitle={[phone, location].filter(Boolean).join(' · ') || undefined}
        status={
          <>
            {status}
            {flaggedCount > 0 && <StatusBadge tone="warning">{flaggedCount} flagged</StatusBadge>}
          </>
        }
        actions={
          <>
            {can('credits.record_payment') && totalOutstanding > 0 && (
              <button
                type="button"
                onClick={() => setShowGeneralPayment(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 [&_svg]:size-4"
              >
                <Wallet aria-hidden /> Record repayment
              </button>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={contactBtn}>
                <MessageCircle aria-hidden /> WhatsApp
              </a>
            )}
          </>
        }
        overflow={
          <OverflowMenu
            items={[
              { label: 'View customer', icon: <User />, onSelect: () => router.push(`/customers?customer=${encodeURIComponent(customerId)}`) },
              { label: 'Record sale', icon: <Receipt />, onSelect: () => router.push(`/sales?new=1&customer=${encodeURIComponent(customerId)}`) },
            ]}
          />
        }
        stats={
          !loaded && !summary
            ? ['Outstanding', 'Overdue', 'Items', 'Last payment'].map((label) => ({ label, value: '-' }))
            : [
                { label: 'Outstanding', value: fmt(totalOutstanding) },
                {
                  label: 'Overdue',
                  value: overdueAmount != null ? fmt(overdueAmount) : `${overdueCount} item${overdueCount === 1 ? '' : 's'}`,
                  tone: overdueCount > 0 ? 'danger' : 'default',
                },
                { label: 'Items', value: itemCount },
                { label: 'Last payment', value: lastPayment ? formatDate(lastPayment) : 'None' },
              ]
        }
      >
        {isLoading ? (
          <CreditSheetSkeleton />
        ) : credits.length === 0 ? (
          <EmptyState size="compact" title="No credit records" description="This customer has no credit sales." />
        ) : (
          <div className="space-y-6">
            {openItems.length > 0 && (
              <section className="space-y-3" aria-labelledby="open-credits-heading">
                <h3 id="open-credits-heading" className="text-sm font-semibold">
                  Open items <span className="font-normal text-muted-foreground">({openItems.length}, oldest due first)</span>
                </h3>
                <ul className="space-y-3">
                  {openItems.map((credit) => (
                    <CreditItemCard
                      key={credit.id}
                      credit={credit}
                      expanded={expandedId === credit.id}
                      onToggle={() => setExpandedId(expandedId === credit.id ? null : credit.id)}
                      canRecordPayment={can('credits.record_payment')}
                      canExtend={can('credits.set_due_date')}
                      onRecordPayment={() => setPaymentCredit(credit)}
                      onExtend={() => setExtendCredit(credit)}
                      onFlag={() => handleFlag(credit)}
                      flagging={flagCredit.isPending}
                    />
                  ))}
                </ul>
              </section>
            )}
            {clearedItems.length > 0 && (
              <section className="space-y-3" aria-labelledby="closed-credits-heading">
                <h3 id="closed-credits-heading" className="text-sm font-semibold">
                  Cleared or closed <span className="font-normal text-muted-foreground">({clearedItems.length})</span>
                </h3>
                <ul className="space-y-3">
                  {clearedItems.map((credit) => (
                    <CreditItemCard
                      key={credit.id}
                      credit={credit}
                      expanded={expandedId === credit.id}
                      onToggle={() => setExpandedId(expandedId === credit.id ? null : credit.id)}
                      canRecordPayment={false}
                      canExtend={false}
                      onRecordPayment={() => {}}
                      onExtend={() => {}}
                      onFlag={() => {}}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </EntityDrawer>

      {/* Forms sit above the drawer and are non-dismissible (Escape and backdrop do nothing). */}
      {paymentCredit && <RecordPaymentForm credit={paymentCredit} onClose={() => setPaymentCredit(null)} />}
      {extendCredit && <ExtendDueDateForm credit={extendCredit} onClose={() => setExtendCredit(null)} />}
      {showGeneralPayment && (
        <GeneralRepaymentForm
          customerId={customerId}
          customerName={name}
          totalOutstanding={totalOutstanding}
          onClose={() => setShowGeneralPayment(false)}
        />
      )}
    </>
  );
}
