'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { useExtendDueDate, useGeneralCreditPayment, useRecordPayment } from '@/hooks/use-queries';
import type { SaleCreditRecord } from '@/types/credits';
import { DateField, FormField, FormSheet, fieldClass } from '@/components/app';
import { cn } from '@/lib/utils';
import { creditProductLabel, daysUntil, fmt, formatDate, NAIRA } from './credit-utils';

type Method = 'Cash' | 'Transfer' | 'POS';
const METHODS: Method[] = ['Cash', 'Transfer', 'POS'];

/** Amount, method and note: shared by single-item and general repayments. */
function PaymentFields({
  amount, setAmount, method, setMethod, note, setNote, max, fullLabel,
}: Readonly<{
  amount: string; setAmount: (v: string) => void;
  method: Method; setMethod: (m: Method) => void;
  note: string; setNote: (v: string) => void;
  max: number; fullLabel: string;
}>) {
  const id = useId();
  return (
    <>
      <FormField label="Amount" htmlFor={`${id}-amount`} required>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden>{NAIRA}</span>
          <input
            id={`${id}-amount`}
            type="number"
            inputMode="decimal"
            min={0}
            max={max}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(fieldClass, 'h-10 pl-7 font-semibold tabular-nums')}
            placeholder="0"
          />
        </div>
        <button type="button" className="text-xs font-medium text-primary tabular-nums hover:underline" onClick={() => setAmount(String(max))}>
          {fullLabel} ({fmt(max)})
        </button>
      </FormField>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Method</legend>
        <div className="flex gap-2">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              aria-pressed={method === m}
              className={cn(
                'h-9 flex-1 rounded-md border text-sm font-medium transition-colors',
                method === m ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </fieldset>
      <FormField label="Note (optional)" htmlFor={`${id}-note`}>
        <input id={`${id}-note`} type="text" value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} placeholder="e.g. Bank transfer ref" />
      </FormField>
    </>
  );
}

function amountReason(amount: string, max: number): string | null {
  const n = parseFloat(amount) || 0;
  if (n <= 0) return 'Enter an amount';
  if (n > max) return `Enter at most ${fmt(max)}`;
  return null;
}

/** Pay one credit item. */
export function RecordPaymentForm({ credit, onClose }: Readonly<{ credit: SaleCreditRecord; onClose: () => void }>) {
  const { user } = useAuth();
  const recordPayment = useRecordPayment();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Method>('Transfer');
  const [paymentNote, setPaymentNote] = useState('');

  const handleRecordPayment = async () => {
    if (!user) return;
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0 || amount > credit.amountOwed) {
      toast.error('Enter a valid payment amount.');
      return;
    }
    try {
      await recordPayment.mutateAsync({
        creditId: credit.id,
        amount,
        method: paymentMethod,
        note: paymentNote || undefined,
        recordedBy: user.id,
        recordedByName: user.name,
      });
      toast.success(`${fmt(amount)} payment recorded.`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment failed.');
    }
  };

  return (
    <FormSheet
      title="Record payment"
      description={`${creditProductLabel(credit)}, ${fmt(credit.amountOwed)} outstanding`}
      onClose={onClose}
      onSubmit={handleRecordPayment}
      submitLabel="Record payment"
      submitting={recordPayment.isPending}
      disabledReason={amountReason(paymentAmount, credit.amountOwed)}
    >
      <PaymentFields
        amount={paymentAmount} setAmount={setPaymentAmount}
        method={paymentMethod} setMethod={setPaymentMethod}
        note={paymentNote} setNote={setPaymentNote}
        max={credit.amountOwed} fullLabel="Pay in full"
      />
    </FormSheet>
  );
}

/** One repayment for a customer, allocated by the API oldest due first. */
export function GeneralRepaymentForm({
  customerId, customerName, totalOutstanding, onClose,
}: Readonly<{ customerId: string; customerName: string; totalOutstanding: number; onClose: () => void }>) {
  const generalPayment = useGeneralCreditPayment();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Method>('Transfer');
  const [paymentNote, setPaymentNote] = useState('');

  const handleGeneralPayment = async () => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0 || amount > totalOutstanding) {
      toast.error(
        totalOutstanding > 0
          ? `Enter an amount between 0 and ${fmt(totalOutstanding)}.`
          : 'No outstanding credit to repay.',
      );
      return;
    }
    try {
      const result = await generalPayment.mutateAsync({
        customerId,
        amount,
        method: paymentMethod,
        note: paymentNote || undefined,
      });
      const allocations = result.allocations ?? [];
      const cleared = allocations.filter((a) => a.balance_after === 0).length;
      toast.success(
        `${fmt(amount)} applied across ${allocations.length} credit${allocations.length !== 1 ? 's' : ''}` +
          (cleared ? ` (${cleared} cleared).` : '.'),
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'General payment failed.');
    }
  };

  return (
    <FormSheet
      title="Record repayment"
      description={`${customerName}, ${fmt(totalOutstanding)} outstanding. Applied to the oldest due items first.`}
      onClose={onClose}
      onSubmit={handleGeneralPayment}
      submitLabel="Apply repayment"
      submitting={generalPayment.isPending}
      disabledReason={totalOutstanding > 0 ? amountReason(paymentAmount, totalOutstanding) : 'No outstanding credit to repay'}
    >
      <PaymentFields
        amount={paymentAmount} setAmount={setPaymentAmount}
        method={paymentMethod} setMethod={setPaymentMethod}
        note={paymentNote} setNote={setPaymentNote}
        max={totalOutstanding} fullLabel="Pay full outstanding"
      />
    </FormSheet>
  );
}

/** Move one item's due date, with a reason for the extension trail. */
export function ExtendDueDateForm({ credit, onClose }: Readonly<{ credit: SaleCreditRecord; onClose: () => void }>) {
  const { user } = useAuth();
  const extendDueDate = useExtendDueDate();
  const id = useId();
  const [newDueDate, setNewDueDate] = useState('');
  const [extendReason, setExtendReason] = useState('');

  const handleExtendDueDate = async () => {
    if (!user) return;
    if (!newDueDate) {
      toast.error('Select a new due date.');
      return;
    }
    try {
      await extendDueDate.mutateAsync({
        creditId: credit.id,
        newDueDate,
        reason: extendReason || undefined,
        extendedByName: user.name,
      });
      toast.success('Due date extended.');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Extension failed.');
    }
  };

  const d = newDueDate ? daysUntil(newDueDate) : null;
  const hint =
    d === null ? undefined : d < 0 ? `${Math.abs(d)} days overdue from today` : d === 0 ? 'Due today' : `${d} days from today`;

  return (
    <FormSheet
      title="Extend due date"
      description={
        `${creditProductLabel(credit)}, due ${formatDate(credit.dueDate)}` +
        (credit.extensionCount > 0 ? `, ${credit.extensionCount} prior extension${credit.extensionCount !== 1 ? 's' : ''}` : '')
      }
      onClose={onClose}
      onSubmit={handleExtendDueDate}
      submitLabel="Save extension"
      submitting={extendDueDate.isPending}
      disabledReason={newDueDate ? null : 'Choose a new due date'}
    >
      <FormField label="New due date" htmlFor={`${id}-date`} required hint={hint}>
        <DateField id={`${id}-date`} value={newDueDate} min={credit.dueDate?.slice(0, 10)} onChange={setNewDueDate} />
      </FormField>
      <FormField label="Reason (recommended)" htmlFor={`${id}-reason`}>
        <textarea
          id={`${id}-reason`}
          value={extendReason}
          onChange={(e) => setExtendReason(e.target.value)}
          rows={3}
          className={cn(fieldClass, 'h-auto resize-none py-2')}
          placeholder="Why is the due date being extended?"
        />
      </FormField>
    </FormSheet>
  );
}
