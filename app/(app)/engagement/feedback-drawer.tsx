'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUp, CheckCircle2, Gift } from 'lucide-react';
import { EntityDrawer, FormField, StatusBadge, fieldClass } from '@/components/app';
import { usePermissions } from '@/hooks/use-permissions';
import { useResolveFeedback, useUpdateFeedbackPriority } from '@/hooks/use-queries';
import { formatDate, formatMoney } from '@/lib/format';
import { type Customer, type Feedback, FeedbackPriority } from '@/types';
import { CompensationForm } from './compensation-form';
import { PriorityBadge, calcResolutionDays } from './interaction-utils';

const BTN = 'inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-muted disabled:opacity-50 [&_svg]:size-3.5';
const PRIORITY_ORDER: FeedbackPriority[] = [FeedbackPriority.LOW, FeedbackPriority.MEDIUM, FeedbackPriority.HIGH, FeedbackPriority.URGENT];

/** Raise a feedback item's priority one step (Low → Medium → High → Urgent). */
export function useEscalatePriority() {
  const update = useUpdateFeedbackPriority();
  const escalate = async (fb: Feedback) => {
    const currentIdx = PRIORITY_ORDER.indexOf(fb.priority || FeedbackPriority.MEDIUM);
    const next = currentIdx < PRIORITY_ORDER.length - 1 ? PRIORITY_ORDER[currentIdx + 1] : fb.priority;
    if (next === fb.priority) { toast.info('Already at highest priority.'); return; }
    try {
      await update.mutateAsync({ id: fb.id, priority: next! });
      toast.success('Priority escalated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to escalate priority.');
    }
  };
  return { escalate, pending: update.isPending };
}

export type FeedbackIntent = 'view' | 'resolve' | 'compensate';

export function FeedbackDrawer({ feedback, intent, customers, onClose }: Readonly<{
  feedback: Feedback;
  intent: FeedbackIntent;
  customers: Customer[];
  onClose: () => void;
}>) {
  const { can } = usePermissions();
  const resolveFeedback = useResolveFeedback();
  const { escalate, pending: escalating } = useEscalatePriority();
  const [note, setNote] = useState(feedback.resolutionNote || '');
  const [compensating, setCompensating] = useState(intent === 'compensate');
  const canResolve = feedback.status === 'Open' && can('interactions.resolve');
  const dirty = note !== (feedback.resolutionNote || '');

  const resolve = async () => {
    if (!note.trim()) return;
    try {
      await resolveFeedback.mutateAsync({ id: feedback.id, resolution: note });
      toast.success('Feedback resolved.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve feedback.');
    }
  };

  const days = feedback.status === 'Resolved' && feedback.resolvedDate ? calcResolutionDays(feedback.date, feedback.resolvedDate) : null;

  return (
    <>
      <EntityDrawer
        onClose={onClose}
        dismissible={!dirty}
        title={`${feedback.type} from ${feedback.customerName}`}
        subtitle={`Logged ${formatDate(feedback.date)}${days !== null ? `, resolved in ${days} day${days === 1 ? '' : 's'}` : ''}`}
        status={<StatusBadge domain="work" status={feedback.status} />}
        actions={canResolve ? (
          <>
            <button type="button" className={BTN} onClick={() => setCompensating(true)}><Gift aria-hidden /> Issue compensation</button>
            <button type="button" className={BTN} disabled={escalating || feedback.priority === FeedbackPriority.URGENT} onClick={() => escalate(feedback)}><ArrowUp aria-hidden /> Escalate priority</button>
          </>
        ) : undefined}
        stats={[
          { label: 'Type', value: feedback.type },
          { label: 'Priority', value: <PriorityBadge priority={feedback.priority} /> },
          { label: 'Sentiment', value: feedback.sentiment ?? 'Neutral' },
          { label: 'Days to resolve', value: days !== null ? `${days}d` : '-' },
        ]}
      >
        <div className="space-y-5">
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">What they said</h3>
            <p className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">{feedback.content}</p>
          </section>
          {canResolve ? (
            <section className="space-y-3">
              <FormField label="Resolution" htmlFor="feedback-resolution" hint="How was this handled? Saved with the record.">
                <textarea
                  id="feedback-resolution"
                  rows={5}
                  value={note}
                  autoFocus={intent === 'resolve'}
                  onChange={(e) => setNote(e.target.value)}
                  className={`${fieldClass} h-auto min-h-28 resize-y py-2`}
                />
              </FormField>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {!note.trim() && <p className="mr-auto text-xs text-muted-foreground">Add a resolution note to resolve</p>}
                <button type="button" onClick={onClose} className="h-9 rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">Cancel</button>
                <button
                  type="button"
                  onClick={resolve}
                  aria-disabled={!note.trim() || resolveFeedback.isPending}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 ${!note.trim() || resolveFeedback.isPending ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <CheckCircle2 size={16} aria-hidden /> {resolveFeedback.isPending ? 'Saving…' : 'Mark resolved'}
                </button>
              </div>
            </section>
          ) : (
            <section className="space-y-1.5 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold">Resolution</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{feedback.resolutionNote || 'No details recorded.'}</p>
              {feedback.resolvedByAgentName && (
                <p className="text-xs text-muted-foreground">Resolved by {feedback.resolvedByAgentName}{feedback.resolvedDate ? ` on ${formatDate(feedback.resolvedDate)}` : ''}</p>
              )}
            </section>
          )}
        </div>
      </EntityDrawer>
      {compensating && canResolve && (
        <CompensationForm
          customers={customers}
          preset={{ customerId: feedback.customerId, customerName: feedback.customerName, reason: `Ref: ${feedback.type}` }}
          onClose={() => setCompensating(false)}
          onCreated={(item) => {
            const line = `[Compensation] ${formatMoney(item.amount)} (${item.category}) issued.`;
            setNote((prev) => (prev ? `${prev}\n${line}` : line));
          }}
        />
      )}
    </>
  );
}
