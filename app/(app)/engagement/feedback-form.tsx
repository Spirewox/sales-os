'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FormField, FormSheet, fieldClass } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';
import { SearchableCustomerSelect } from '@/components/searchable-customer-select';
import { useCreateFeedback, useCustomer, useCustomers } from '@/hooks/use-queries';
import { type Customer, FeedbackPriority, FeedbackType } from '@/types';

/** Log feedback. `initialCustomerId` preselects the customer (from ?customer=<id>). */
export function FeedbackForm({ initialCustomerId, onClose }: Readonly<{ initialCustomerId?: string | null; onClose: () => void }>) {
  const createFeedback = useCreateFeedback();
  const [customerId, setCustomerId] = useState(initialCustomerId ?? '');
  const [type, setType] = useState<FeedbackType>(FeedbackType.COMPLAINT);
  const [priority, setPriority] = useState<FeedbackPriority>(FeedbackPriority.MEDIUM);
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pinned, setPinned] = useState<Customer | null>(null);
  const [touched, setTouched] = useState(false);

  // With the customer already chosen, start in the message box. The sheet focuses its first field
  // on mount, so move focus on the next frame.
  useEffect(() => {
    if (!initialCustomerId) return;
    const raf = requestAnimationFrame(() => document.getElementById('feedback-content')?.focus());
    return () => cancelAnimationFrame(raf);
  }, [initialCustomerId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: list, isFetching: searching } = useCustomers({ search: debouncedSearch || undefined, limit: 50 });
  // The preselected customer may not be in the first page of results; fetch it directly.
  const { data: initialCustomer, isFetching: initialLoading, isError: initialCustomerError } = useCustomer(initialCustomerId || null);

  const options = useMemo(() => {
    const items = list?.items ?? [];
    const extra = [pinned, initialCustomer].filter((c): c is Customer => !!c && !items.some((i) => i.id === c.id));
    return [...extra.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i), ...items];
  }, [list, pinned, initialCustomer]);

  const selected = options.find((c) => c.id === customerId) ?? null;
  const [changing, setChanging] = useState(false);
  const preset = !!initialCustomerId && !changing && customerId === initialCustomerId && !(initialCustomerError && !selected);
  const reason = !customerId ? 'Choose a customer' : !content.trim() ? 'Describe the feedback' : null;

  const submit = async () => {
    setTouched(true);
    if (!content || !customerId) { toast.error('Customer and content are required.'); return; }
    const cust = selected ?? pinned;
    if (!cust) { toast.error('Select a customer from the list (must exist in CRM).'); return; }
    try {
      await createFeedback.mutateAsync({ customerId: cust.id, customerName: cust.name, type, content, priority });
      onClose();
      toast.success('Feedback recorded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record feedback.');
    }
  };

  return (
    <FormSheet
      title="Log feedback"
      description="A complaint, suggestion or thank-you from a customer."
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Save feedback"
      disabledReason={reason}
      submitting={createFeedback.isPending}
    >
      <FormField
        label="Customer"
        htmlFor="feedback-customer"
        required
        hint={initialLoading && !selected ? 'Loading customer…' : searching ? 'Searching customers…' : undefined}
        error={touched && !customerId ? 'Choose a customer' : null}
      >
        {preset ? (
          // Opened for one customer: show who, with a way to pick someone else.
          <div className="flex items-center gap-2">
            <input id="feedback-customer" readOnly value={selected ? selected.name : 'Loading customer…'} className={`${fieldClass} bg-muted/40`} />
            <button type="button" onClick={() => setChanging(true)} className="h-9 shrink-0 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">Change</button>
          </div>
        ) : (
          <SearchableCustomerSelect
            id="feedback-customer"
            customers={options}
            value={customerId}
            serverSearch
            onSearchChange={setSearch}
            error={touched && !customerId}
            onChange={(id) => {
              setCustomerId(id);
              const match = options.find((c) => c.id === id);
              if (match) setPinned(match);
            }}
            placeholder="Type to search by name, email or company"
          />
        )}
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Type" htmlFor="feedback-type">
          <FilterSelect id="feedback-type" value={type} onChange={(v) => setType(v as FeedbackType)} options={Object.values(FeedbackType).map((t) => ({ value: t, label: t }))} />
        </FormField>
        <FormField label="Priority" htmlFor="feedback-priority">
          <FilterSelect id="feedback-priority" value={priority} onChange={(v) => setPriority(v as FeedbackPriority)} options={Object.values(FeedbackPriority).map((p) => ({ value: p, label: p }))} />
        </FormField>
      </div>
      <FormField label="What did they say?" htmlFor="feedback-content" required error={touched && !content.trim() ? 'Describe the feedback' : null}>
        <textarea
          id="feedback-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-invalid={touched && !content.trim()}
          rows={5}
          className={`${fieldClass} h-auto min-h-28 resize-y py-2`}
        />
      </FormField>
    </FormSheet>
  );
}
