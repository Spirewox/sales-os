'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';
import { useCreateEnquiry } from '@/hooks/use-queries';
import type { Customer, Enquiry, EnquiryCategory } from '@/types';
import { ENQUIRY_CATEGORIES } from './interaction-utils';

const today = () => new Date().toISOString().split('T')[0];

export function EnquiryForm({ customers, onClose }: Readonly<{ customers: Customer[]; onClose: () => void }>) {
  const createEnquiry = useCreateEnquiry();
  const [draft, setDraft] = useState<Partial<Enquiry>>({ date: today(), category: 'Other' });
  const [touched, setTouched] = useState(false);
  const patch = (p: Partial<Enquiry>) => setDraft((d) => ({ ...d, ...p }));
  const reason = !draft.customerName?.trim() ? 'Enter the customer name' : !draft.message?.trim() ? 'Enter the message' : null;

  const submit = async () => {
    setTouched(true);
    if (!draft.customerName || !draft.message) { toast.error('Customer name and message are required.'); return; }
    try {
      await createEnquiry.mutateAsync({
        customerName: draft.customerName,
        email: draft.email,
        subject: draft.subject,
        message: draft.message,
        date: draft.date,
        category: (draft.category as EnquiryCategory) || 'Other',
      });
      onClose();
      toast.success('Enquiry recorded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record enquiry.');
    }
  };

  return (
    <FormSheet title="Record enquiry" onClose={onClose} onSubmit={submit} submitLabel="Save enquiry" disabledReason={reason} submitting={createEnquiry.isPending}>
      <FormSection title="Enquiry">
        <FormField label="Customer name" htmlFor="enquiry-customer" required error={touched && !draft.customerName?.trim() ? 'Enter the customer name' : null}>
          <input id="enquiry-customer" type="text" list="enquiry-customers" value={draft.customerName ?? ''} onChange={(e) => patch({ customerName: e.target.value })} aria-invalid={touched && !draft.customerName?.trim()} className={fieldClass} />
          <datalist id="enquiry-customers">{customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </FormField>
        <FormField label="Subject" htmlFor="enquiry-subject" hint="Leave blank for a general enquiry.">
          <input id="enquiry-subject" type="text" value={draft.subject ?? ''} onChange={(e) => patch({ subject: e.target.value })} placeholder="e.g. Bulk order pricing" className={fieldClass} />
        </FormField>
        <FormField label="Message" htmlFor="enquiry-message" required error={touched && !draft.message?.trim() ? 'Enter the message' : null}>
          <textarea id="enquiry-message" rows={5} value={draft.message ?? ''} onChange={(e) => patch({ message: e.target.value })} aria-invalid={touched && !draft.message?.trim()} className={`${fieldClass} h-auto min-h-28 resize-y py-2`} />
        </FormField>
      </FormSection>
      <FormSection title="Details" optional description="Category, date and email for replies.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Category" htmlFor="enquiry-category">
            <FilterSelect id="enquiry-category" value={draft.category ?? 'Other'} onChange={(v) => patch({ category: v as EnquiryCategory })} options={ENQUIRY_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </FormField>
          <FormField label="Date" htmlFor="enquiry-date">
            <input id="enquiry-date" type="date" value={draft.date ?? ''} onChange={(e) => patch({ date: e.target.value })} className={fieldClass} />
          </FormField>
        </div>
        <FormField label="Email" htmlFor="enquiry-email">
          <input id="enquiry-email" type="email" value={draft.email ?? ''} onChange={(e) => patch({ email: e.target.value })} className={fieldClass} />
        </FormField>
      </FormSection>
    </FormSheet>
  );
}
