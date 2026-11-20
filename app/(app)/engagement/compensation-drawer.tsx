'use client';

import { toast } from 'sonner';
import { BadgeCheck, CheckCircle2 } from 'lucide-react';
import { EntityDrawer } from '@/components/app';
import { usePermissions } from '@/hooks/use-permissions';
import { useUpdateCompensationStatus } from '@/hooks/use-queries';
import { formatDate, formatMoney } from '@/lib/format';
import type { Compensation } from '@/types';
import { CompensationStatusBadge } from './interaction-utils';

const BTN = 'inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-muted disabled:opacity-50 [&_svg]:size-3.5';
const PRIMARY = 'inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 [&_svg]:size-3.5';

/** Pending → Approved → Paid. */
export function useCompensationStatus() {
  const update = useUpdateCompensationStatus();
  const change = async (id: string, status: Compensation['status']) => {
    try {
      await update.mutateAsync({ id, status });
      toast.success(`Compensation marked as ${status}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update compensation.');
    }
  };
  return { change, pending: update.isPending };
}

/** The next step for a compensation, or null when it is paid. */
export const nextCompensationStep = (status: Compensation['status']) =>
  status === 'Pending' ? { status: 'Approved' as const, label: 'Approve' } : status === 'Approved' ? { status: 'Paid' as const, label: 'Mark paid' } : null;

export function CompensationDrawer({ compensation: c, onClose }: Readonly<{ compensation: Compensation; onClose: () => void }>) {
  const { can } = usePermissions();
  const { change, pending } = useCompensationStatus();
  const next = can('interactions.resolve') ? nextCompensationStep(c.status) : null;

  return (
    <EntityDrawer
      onClose={onClose}
      title={c.customerName}
      subtitle={`${c.category} compensation`}
      status={<CompensationStatusBadge status={c.status} />}
      actions={next ? (
        <button type="button" disabled={pending} onClick={() => change(c.id, next.status)} className={next.status === 'Paid' ? PRIMARY : BTN}>
          {next.status === 'Paid' ? <CheckCircle2 aria-hidden /> : <BadgeCheck aria-hidden />} {next.label}
        </button>
      ) : undefined}
      stats={[
        { label: 'Value', value: formatMoney(c.amount) },
        { label: 'Category', value: c.category },
        { label: 'Date', value: formatDate(c.date) },
        { label: 'Recorded by', value: c.recordedByAgentName || '-' },
      ]}
    >
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold">Reason</h3>
        <p className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">{c.reason || 'No reason recorded.'}</p>
      </section>
    </EntityDrawer>
  );
}
