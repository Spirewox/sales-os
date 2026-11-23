'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FormField, FormSheet, fieldClass } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';
import { useAuth } from '@/contexts/auth-context';
import { useCreateCompensation } from '@/hooks/use-queries';
import { formatMoney } from '@/lib/format';
import { type Compensation, CompensationCategory, type Customer } from '@/types';

const HAS_API = Boolean(process.env.NEXT_PUBLIC_API_URL);

function findCustomerByName(name: string, customers: Customer[]): Customer | undefined {
  return customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
}

type Preset = { customerId?: string; customerName: string; reason?: string };

/**
 * Record a compensation. With `preset` (issued while resolving feedback) the customer is fixed,
 * status starts Pending, and `onCreated` lets the caller note it on the resolution.
 */
export function CompensationForm({ customers, preset, onClose, onCreated }: Readonly<{
  customers: Customer[];
  preset?: Preset;
  onClose: () => void;
  onCreated?: (item: Compensation) => void;
}>) {
  const { user } = useAuth();
  const createCompensation = useCreateCompensation();
  const [draft, setDraft] = useState<Partial<Compensation>>({
    status: 'Pending',
    category: CompensationCategory.PRODUCT,
    customerName: preset?.customerName,
    customerId: preset?.customerId,
    reason: preset?.reason,
  });
  const [touched, setTouched] = useState(false);
  const patch = (p: Partial<Compensation>) => setDraft((d) => ({ ...d, ...p }));
  const reason = !draft.customerName?.trim() ? 'Enter the customer name' : !draft.amount ? 'Enter the value' : null;

  const submit = async () => {
    setTouched(true);
    if (!draft.customerName || !draft.amount) { toast.error('Customer name and amount are required.'); return; }
    const cust = findCustomerByName(draft.customerName, customers)
      ?? (draft.customerId ? customers.find((c) => c.id === draft.customerId) : undefined);
    if (HAS_API && !cust && !draft.customerId) { toast.error('Select a customer from the list (must exist in CRM).'); return; }
    try {
      const item = await createCompensation.mutateAsync({
        customerId: cust?.id || draft.customerId || '0',
        customerName: cust?.name || draft.customerName,
        reason: draft.reason || '',
        amount: Number(draft.amount),
        status: (draft.status as Compensation['status']) || 'Pending',
        category: (draft.category as CompensationCategory) || CompensationCategory.PRODUCT,
        recordedByAgentId: user?.id,
        recordedByAgentName: user?.name,
      });
      onCreated?.(item);
      onClose();
      toast.success(preset ? 'Compensation issued.' : 'Compensation recorded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : preset ? 'Failed to issue compensation.' : 'Failed to record compensation.');
    }
  };

  return (
    <FormSheet
      title={preset ? 'Issue compensation' : 'Record compensation'}
      description={preset ? `For ${preset.customerName}` : undefined}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={preset ? 'Issue' : 'Save compensation'}
      disabledReason={reason}
      submitting={createCompensation.isPending}
      preview={draft.amount ? `Value ${formatMoney(Number(draft.amount))}` : undefined}
    >
      {!preset && (
        <FormField label="Customer name" htmlFor="comp-customer" required error={touched && !draft.customerName?.trim() ? 'Enter the customer name' : null}>
          <input id="comp-customer" type="text" list="comp-customers" value={draft.customerName ?? ''} onChange={(e) => patch({ customerName: e.target.value, customerId: undefined })} aria-invalid={touched && !draft.customerName?.trim()} className={fieldClass} />
          <datalist id="comp-customers">{customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </FormField>
      )}
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Category</legend>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(CompensationCategory).map((cat) => (
            <button key={cat} type="button" aria-pressed={draft.category === cat} onClick={() => patch({ category: cat })} className={`h-9 rounded-md border px-3 text-sm font-medium transition-colors ${draft.category === cat ? 'border-primary bg-primary/5 text-primary' : 'bg-background hover:bg-muted'}`}>
              {cat}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Value (₦)" htmlFor="comp-amount" required error={touched && !draft.amount ? 'Enter the value' : null}>
          <input id="comp-amount" type="number" inputMode="numeric" min={0} value={draft.amount || ''} onChange={(e) => patch({ amount: parseInt(e.target.value) || 0 })} aria-invalid={touched && !draft.amount} className={fieldClass} />
        </FormField>
        {!preset && (
          <FormField label="Status" htmlFor="comp-status">
            <FilterSelect id="comp-status" value={draft.status ?? 'Pending'} onChange={(v) => patch({ status: v as Compensation['status'] })} options={['Pending', 'Approved', 'Paid'].map((s) => ({ value: s, label: s }))} />
          </FormField>
        )}
      </div>
      <FormField label="Reason" htmlFor="comp-reason">
        <input id="comp-reason" type="text" value={draft.reason ?? ''} onChange={(e) => patch({ reason: e.target.value })} className={fieldClass} />
      </FormField>
    </FormSheet>
  );
}
