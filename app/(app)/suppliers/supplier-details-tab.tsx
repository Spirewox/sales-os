'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Supplier } from '@/types';
import { formatDate } from '@/lib/format';
import { StarRating } from './star-rating';

function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function CopyButton({ text, label, done, onCopy }: Readonly<{ text: string; label: string; done: boolean; onCopy: (text: string) => void }>) {
  return (
    <button type="button" aria-label={label} onClick={() => onCopy(text)} className="ml-2 inline-flex size-7 items-center justify-center rounded-md align-middle hover:bg-muted">
      {done ? <Check size={14} aria-hidden className="text-primary" /> : <Copy size={14} aria-hidden className="text-muted-foreground" />}
    </button>
  );
}

/** Contact, terms and notes. */
export function SupplierDetailsTab({ supplier: s }: Readonly<{ supplier: Supplier }>) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };
  return (
    <div className="space-y-5">
      <section aria-labelledby="supplier-contact">
        <h3 id="supplier-contact" className="text-sm font-semibold">Contact</h3>
        <dl className="divide-y">
          <Row label="Contact person">{s.contactPerson || '-'}</Row>
          <Row label="Phone">{s.phone ? <>{s.phone}<CopyButton text={s.phone} label="Copy phone number" done={copied === 'phone'} onCopy={(t) => copy(t, 'phone')} /></> : '-'}</Row>
          <Row label="Email">{s.email ? <>{s.email}<CopyButton text={s.email} label="Copy email address" done={copied === 'email'} onCopy={(t) => copy(t, 'email')} /></> : '-'}</Row>
          <Row label="Location">{s.location || '-'}</Row>
          <Row label="Address">{s.address || '-'}</Row>
        </dl>
      </section>
      <section aria-labelledby="supplier-terms">
        <h3 id="supplier-terms" className="text-sm font-semibold">Terms</h3>
        <dl className="divide-y">
          <Row label="Business name">{s.businessName || '-'}</Row>
          <Row label="Business type">{s.businessType || '-'}</Row>
          <Row label="Payment terms">{s.paymentTerms || '-'}</Row>
          <Row label="Lead time">{s.leadTimeDays != null ? `${s.leadTimeDays} days` : '-'}</Row>
          <Row label="Rating"><StarRating value={s.rating} size={14} /></Row>
          <Row label="Categories">{s.categories?.length ? s.categories.join(', ') : '-'}</Row>
          <Row label="Added">{formatDate(s.createdDate)}{s.addedByAgentName ? ` by ${s.addedByAgentName}` : ''}</Row>
        </dl>
      </section>
      {s.notes && (
        <section aria-labelledby="supplier-notes">
          <h3 id="supplier-notes" className="text-sm font-semibold">Notes</h3>
          <p className="mt-2 rounded-xl border bg-muted/20 p-3 text-sm whitespace-pre-wrap text-muted-foreground">{s.notes}</p>
        </section>
      )}
    </div>
  );
}
