'use client';

import { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateSupplier, useHubs, useUpdateSupplier } from '@/hooks/use-queries';
import { PaymentTerms, SupplierBusinessType, type Supplier } from '@/types';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import { cn } from '@/lib/utils';
import { StarRatingInput } from './star-rating';
import { BUSINESS_TYPES, PAYMENT_TERMS, supplierPayload, toggleCategory } from './supplier-utils';

type Props = {
  /** Omit to add a supplier. */
  supplier?: Supplier | null;
  existing: Supplier[];
  onClose: () => void;
  onSaved?: (s: Supplier) => void;
};

/** Add or edit a supplier. Required fields first; terms and notes collapsed. */
export function SupplierFormSheet({ supplier, existing, onClose, onSaved }: Readonly<Props>) {
  const isEdit = !!supplier;
  const { data: hubs = [] } = useHubs();
  const activeHubs = hubs.filter((h) => h.isActive);
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const id = useId();
  const ratingLabelId = `${id}-rating`;
  const catsLabelId = `${id}-cats`;

  const [form, setForm] = useState<Partial<Supplier>>(() => {
    if (supplier) return { ...supplier, hubId: supplier.hubId || hubs.find((h) => h.name === supplier.location)?.id };
    const defaultHub = activeHubs[0];
    return {
      name: '', businessName: '', businessType: SupplierBusinessType.DISTRIBUTOR,
      hubId: defaultHub?.id, location: defaultHub?.name || '', address: '', contactPerson: '',
      phone: '', email: '', categories: [], paymentTerms: PaymentTerms.COD,
      leadTimeDays: 3, rating: 3, notes: '',
    };
  });
  const patch = (p: Partial<Supplier>) => setForm((f) => ({ ...f, ...p }));

  // Hubs may load after the sheet opens: fall back to the first active one.
  const hubId = form.hubId || hubs.find((h) => h.name === form.location)?.id || (isEdit ? undefined : activeHubs[0]?.id);
  const name = form.name?.trim() ?? '';
  const duplicate = !!name && existing.some((s) => s.id !== supplier?.id && s.name.toLowerCase() === name.toLowerCase());
  const disabledReason = !name ? 'Enter the supplier name' : !hubId ? 'Choose a location' : duplicate ? `A supplier named "${name}" already exists` : null;
  const pending = createSupplier.isPending || updateSupplier.isPending;

  const submit = () => {
    if (disabledReason || pending) return;
    const body = supplierPayload(form, hubId);
    if (supplier) {
      updateSupplier.mutate({ id: supplier.id, ...body }, {
        onSuccess: (updated) => { toast.success('Supplier updated.'); onSaved?.(updated); onClose(); },
        onError: () => toast.error('Unable to update supplier.'),
      });
    } else {
      createSupplier.mutate(body, {
        onSuccess: () => { toast.success('Supplier added.'); onClose(); },
        onError: () => toast.error('Unable to add supplier.'),
      });
    }
  };

  return (
    <FormSheet
      title={isEdit ? `Edit ${supplier!.name}` : 'Add supplier'}
      description={isEdit ? supplier!.code : 'The supplier code is assigned automatically (SUP-001, SUP-002, …).'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={isEdit ? 'Save changes' : 'Save supplier'}
      disabledReason={disabledReason}
      submitting={pending}
    >
      <FormSection title="Supplier">
        <FormField label="Supplier name" htmlFor={`${id}-name`} required error={duplicate ? 'This name is already used.' : null}>
          <input id={`${id}-name`} type="text" value={form.name ?? ''} onChange={(e) => patch({ name: e.target.value })} className={fieldClass} aria-invalid={duplicate || undefined} data-autofocus />
        </FormField>
        <FormField label="Business name" htmlFor={`${id}-business`}>
          <input id={`${id}-business`} type="text" value={form.businessName ?? ''} onChange={(e) => patch({ businessName: e.target.value })} className={fieldClass} />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Business type" htmlFor={`${id}-type`}>
            <select id={`${id}-type`} value={form.businessType} onChange={(e) => patch({ businessType: e.target.value as SupplierBusinessType })} className={fieldClass}>
              {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Location" htmlFor={`${id}-hub`} required>
            <select
              id={`${id}-hub`}
              value={hubId ?? ''}
              onChange={(e) => { const hub = activeHubs.find((h) => h.id === e.target.value); patch({ hubId: hub?.id, location: hub?.name || '' }); }}
              className={fieldClass}
            >
              {!hubId && <option value="">Choose a location</option>}
              {activeHubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Contact person" htmlFor={`${id}-contact`}>
            <input id={`${id}-contact`} type="text" value={form.contactPerson ?? ''} onChange={(e) => patch({ contactPerson: e.target.value })} className={fieldClass} />
          </FormField>
          <FormField label="Phone" htmlFor={`${id}-phone`}>
            <input id={`${id}-phone`} type="tel" inputMode="tel" value={form.phone ?? ''} onChange={(e) => patch({ phone: e.target.value })} className={fieldClass} />
          </FormField>
        </div>
        <FormField label="Email" htmlFor={`${id}-email`}>
          <input id={`${id}-email`} type="email" value={form.email ?? ''} onChange={(e) => patch({ email: e.target.value })} className={fieldClass} />
        </FormField>
        <FormField label="Address" htmlFor={`${id}-address`}>
          <input id={`${id}-address`} type="text" value={form.address ?? ''} onChange={(e) => patch({ address: e.target.value })} className={fieldClass} />
        </FormField>
      </FormSection>

      <FormSection title="Terms and products" description="Payment terms, lead time, rating and what they supply." optional defaultOpen={isEdit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Payment terms" htmlFor={`${id}-terms`}>
            <select id={`${id}-terms`} value={form.paymentTerms} onChange={(e) => patch({ paymentTerms: e.target.value as PaymentTerms })} className={fieldClass}>
              {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Lead time (days)" htmlFor={`${id}-lead`}>
            <input id={`${id}-lead`} type="number" min={0} inputMode="numeric" value={form.leadTimeDays ?? 0} onChange={(e) => patch({ leadTimeDays: Number(e.target.value) })} className={fieldClass} />
          </FormField>
        </div>
        <div className="space-y-1.5">
          <p id={ratingLabelId} className="text-sm font-medium">Rating</p>
          <StarRatingInput value={form.rating ?? 3} onChange={(rating) => patch({ rating })} labelledBy={ratingLabelId} />
        </div>
        <div className="space-y-1.5">
          <p id={catsLabelId} className="text-sm font-medium">Products supplied (categories)</p>
          <div role="group" aria-labelledby={catsLabelId} className="flex flex-wrap gap-2">
            {PRODUCT_CATEGORIES.map((c) => {
              const on = !!form.categories?.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => patch({ categories: toggleCategory(form.categories, c) })}
                  className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}
                >
                  {on && <Check size={12} aria-hidden />} {c}
                </button>
              );
            })}
          </div>
        </div>
      </FormSection>

      <FormSection title="Notes" optional defaultOpen={isEdit && !!supplier?.notes}>
        <FormField label="Notes" htmlFor={`${id}-notes`}>
          <textarea id={`${id}-notes`} value={form.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} rows={3} className={cn(fieldClass, 'h-auto py-2')} />
        </FormField>
      </FormSection>
    </FormSheet>
  );
}
