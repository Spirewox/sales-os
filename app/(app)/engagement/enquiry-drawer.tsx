'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, MailOpen } from 'lucide-react';
import { EntityDrawer, FormField, StatusBadge, fieldClass } from '@/components/app';
import { usePermissions } from '@/hooks/use-permissions';
import { useResolveEnquiry } from '@/hooks/use-queries';
import { formatDate } from '@/lib/format';
import type { Enquiry } from '@/types';

const BTN = 'inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-muted [&_svg]:size-3.5';

/** The API stores this placeholder when no email was given; there is nobody to reply to. */
export const replyEmail = (enq: Enquiry) => (enq.email && !enq.email.endsWith('@fudfarmer.local') ? enq.email : null);
export const replyHref = (enq: Enquiry, email: string) => `mailto:${email}?subject=${encodeURIComponent(`Re: ${enq.subject}`)}`;

export function EnquiryDrawer({ enquiry, focusClose, onClose }: Readonly<{ enquiry: Enquiry; focusClose?: boolean; onClose: () => void }>) {
  const { can } = usePermissions();
  const resolveEnquiry = useResolveEnquiry();
  const [note, setNote] = useState(enquiry.resolution || '');
  const canClose = enquiry.status === 'Open' && can('interactions.resolve');
  const email = replyEmail(enquiry);
  const blocked = !note.trim() || resolveEnquiry.isPending;

  const close = async () => {
    if (!note.trim()) return;
    try {
      await resolveEnquiry.mutateAsync({ id: enquiry.id, resolution: note });
      toast.success('Enquiry closed.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to close enquiry.');
    }
  };

  return (
    <EntityDrawer
      onClose={onClose}
      dismissible={note === (enquiry.resolution || '')}
      title={enquiry.subject || 'Enquiry'}
      subtitle={[enquiry.customerName, email].filter(Boolean).join(' · ')}
      status={<StatusBadge domain="work" status={enquiry.status} />}
      actions={canClose && email ? <a href={replyHref(enquiry, email)} className={BTN}><MailOpen aria-hidden /> Reply by email</a> : undefined}
      stats={[
        { label: 'Category', value: enquiry.category ?? 'Other' },
        { label: 'Received', value: formatDate(enquiry.date) },
        { label: 'Status', value: enquiry.status },
        { label: 'Managed by', value: enquiry.managedByAgentName || '-' },
      ]}
    >
      <div className="space-y-5">
        <section className="space-y-1.5">
          <h3 className="text-sm font-semibold">Message</h3>
          <p className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">{enquiry.message}</p>
        </section>
        {canClose ? (
          <section className="space-y-3">
            <FormField label="Resolution" htmlFor="enquiry-resolution" hint="What was the answer? Saved with the record.">
              <textarea id="enquiry-resolution" rows={5} value={note} autoFocus={focusClose} onChange={(e) => setNote(e.target.value)} className={`${fieldClass} h-auto min-h-28 resize-y py-2`} />
            </FormField>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!note.trim() && <p className="mr-auto text-xs text-muted-foreground">Add a resolution note to close</p>}
              <button type="button" onClick={onClose} className="h-9 rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">Cancel</button>
              <button type="button" onClick={close} aria-disabled={blocked} className={`inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 ${blocked ? 'cursor-not-allowed opacity-50' : ''}`}>
                <CheckCircle2 size={16} aria-hidden /> {resolveEnquiry.isPending ? 'Saving…' : 'Mark as closed'}
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-1.5 rounded-lg border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold">Resolution</h3>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{enquiry.resolution || 'No resolution details.'}</p>
            {enquiry.managedByAgentName && <p className="text-xs text-muted-foreground">Managed by {enquiry.managedByAgentName}</p>}
          </section>
        )}
      </div>
    </EntityDrawer>
  );
}
