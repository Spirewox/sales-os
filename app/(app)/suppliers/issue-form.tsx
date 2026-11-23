'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useCreateSupplierIssue, useInventory } from '@/hooks/use-queries';
import { SupplierIssueType, type Supplier, type SupplierIssue } from '@/types';
import { FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import { cn } from '@/lib/utils';
import { ISSUE_TYPES, SEVERITIES } from './supplier-utils';

/** Log a quality, delivery or pricing problem against a supplier. */
export function IssueFormSheet({ supplier, onClose }: Readonly<{ supplier: Supplier; onClose: () => void }>) {
  const createIssue = useCreateSupplierIssue();
  const { data: inventory = [] } = useInventory();
  const id = useId();
  const [type, setType] = useState<SupplierIssueType>(SupplierIssueType.QUALITY);
  const [severity, setSeverity] = useState<SupplierIssue['severity']>('Medium');
  const [relatedItemId, setRelatedItemId] = useState('');
  const [description, setDescription] = useState('');

  const disabledReason = !description.trim() ? 'Describe the issue' : null;

  const submit = () => {
    if (disabledReason || createIssue.isPending) return;
    createIssue.mutate({
      supplierId: supplier.id,
      type,
      severity,
      description: description.trim(),
      ...(relatedItemId ? { related_item_id: relatedItemId } : {}),
    }, {
      onSuccess: () => { toast.success('Issue logged.'); onClose(); },
      onError: () => toast.error('Unable to log issue.'),
    });
  };

  return (
    <FormSheet
      title="Log issue"
      description={`${supplier.name}${supplier.code ? `, ${supplier.code}` : ''}`}
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Save issue"
      disabledReason={disabledReason}
      submitting={createIssue.isPending}
    >
      <FormSection title="Issue">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Type" htmlFor={`${id}-type`}>
            <select id={`${id}-type`} value={type} onChange={(e) => setType(e.target.value as SupplierIssueType)} className={fieldClass}>
              {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Severity" htmlFor={`${id}-severity`}>
            <select id={`${id}-severity`} value={severity} onChange={(e) => setSeverity(e.target.value as SupplierIssue['severity'])} className={fieldClass}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Description" htmlFor={`${id}-description`} required>
          <textarea
            id={`${id}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="What went wrong, and on which delivery?"
            className={cn(fieldClass, 'h-auto py-2')}
            data-autofocus
          />
        </FormField>
        <FormField label="Related product" htmlFor={`${id}-item`} hint="Optional. Links the issue to a product so it can be traced.">
          <select id={`${id}-item`} value={relatedItemId} onChange={(e) => setRelatedItemId(e.target.value)} className={fieldClass}>
            <option value="">None</option>
            {inventory.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </FormField>
      </FormSection>
    </FormSheet>
  );
}
