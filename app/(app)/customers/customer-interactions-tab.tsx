'use client';

import Link from 'next/link';
import { MessageSquare, Plus } from 'lucide-react';
import type { Compensation, Enquiry, Feedback } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';
import { EmptyState, StatusBadge, type Tone } from '@/components/app';

const workTone = (status: string): Tone => (status === 'Open' || status === 'Pending' ? 'warning' : status === 'Resolved' || status === 'Paid' ? 'good' : 'neutral');
const feedbackTone = (type: string): Tone => (type === 'Complaint' ? 'danger' : 'neutral');

function Group({ title, count, children }: Readonly<{ title: string; count: number; children: React.ReactNode }>) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">{title} <span className="tabular-nums">({count})</span></h3>
      {count === 0 ? <p className="text-sm text-muted-foreground">None recorded.</p> : <ul className="space-y-2">{children}</ul>}
    </section>
  );
}

function Resolution({ text, by }: Readonly<{ text: string; by?: string }>) {
  return (
    <div className="mt-2 rounded-md bg-muted/50 p-2">
      <p className="text-xs font-medium">Resolution</p>
      <p className="text-xs">{text}</p>
      {by && <p className="mt-1 text-xs text-muted-foreground">{by}</p>}
    </div>
  );
}

export function CustomerInteractionsTab({ feedback, enquiries, compensations, logHref }: Readonly<{
  feedback: Feedback[];
  enquiries: Enquiry[];
  compensations: Compensation[];
  /** Shown as "Log feedback" when the user may create interactions. */
  logHref?: string;
}>) {
  const add = logHref ? (
    <Link href={logHref} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted">
      <Plus size={14} aria-hidden /> Log feedback
    </Link>
  ) : null;

  if (feedback.length + enquiries.length + compensations.length === 0) {
    return <EmptyState size="compact" icon={<MessageSquare />} title="No interactions yet" description="Feedback, enquiries and compensations for this customer will appear here." action={add} />;
  }

  return (
    <div className="space-y-5">
      {add && <div className="flex justify-end">{add}</div>}

      <Group title="Feedback" count={feedback.length}>
        {feedback.map((f) => (
          <li key={f.id} className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge tone={feedbackTone(f.type)}>{f.type}</StatusBadge>
                {f.priority && <span className="text-xs text-muted-foreground">{f.priority} priority</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">{formatDate(f.date)}</span>
                <StatusBadge tone={workTone(f.status)}>{f.status}</StatusBadge>
              </div>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.content}</p>
            {f.resolutionNote && <Resolution text={f.resolutionNote} by={f.resolvedByAgentName ? `By ${f.resolvedByAgentName}${f.resolvedDate ? ` on ${formatDate(f.resolvedDate)}` : ''}` : undefined} />}
          </li>
        ))}
      </Group>

      <Group title="Enquiries" count={enquiries.length}>
        {enquiries.map((e) => (
          <li key={e.id} className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{e.subject}</span>
                {e.category && <StatusBadge tone="neutral">{e.category}</StatusBadge>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">{formatDate(e.date)}</span>
                <StatusBadge tone={workTone(e.status)}>{e.status}</StatusBadge>
              </div>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{e.message}</p>
            {e.resolution && <Resolution text={e.resolution} by={e.managedByAgentName ? `By ${e.managedByAgentName}` : undefined} />}
          </li>
        ))}
      </Group>

      <Group title="Compensations" count={compensations.length}>
        {compensations.map((c) => (
          <li key={c.id} className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <StatusBadge tone="neutral">{c.category}</StatusBadge>
                <span className="truncate font-medium">{c.reason}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium tabular-nums">{formatMoney(c.amount)}</span>
                <StatusBadge tone={workTone(c.status)}>{c.status}</StatusBadge>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">{formatDate(c.date)}{c.recordedByAgentName ? `, by ${c.recordedByAgentName}` : ''}</p>
          </li>
        ))}
        {compensations.length > 1 && (
          <li className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total compensations</span>
            <span className="font-semibold tabular-nums">{formatMoney(compensations.reduce((a, c) => a + c.amount, 0))}</span>
          </li>
        )}
      </Group>
    </div>
  );
}
