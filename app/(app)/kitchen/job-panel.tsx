'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Archive, ArrowRight, Ban, Copy, Edit3, FileText, Send, ThumbsDown } from 'lucide-react';
import { PanelSkeleton } from '@/components/ui/loading-skeletons';
import { SubmitButton } from '@/components/submit-button';
import { EntityDrawer, OverflowMenu, type DrawerStat, type SectionTab } from '@/components/app';
import { usePermissions } from '@/hooks/use-permissions';
import { useArchiveKitchenJob, useKitchenJob, useKitchenJobAction } from '@/hooks/use-kitchen';
import {
  ADVANCE_LABELS,
  dueState,
  FINAL_STAGES,
  formatDue,
  hubNameOf,
  isEditableStage,
  MODE_LABELS,
  naira,
  STAGE_LABELS,
  type KitchenJob,
} from '@/lib/kitchen-types';
import { btnSecondary, ErrorPanel, inputClass, labelClass, PaymentBadge, StageBadge } from './kitchen-ui';
import { CostingTab, PaymentsTab, ShoppingTab, SummaryTab, TimelineTab } from './job-panel-tabs';

type Tab = 'summary' | 'costing' | 'shopping' | 'payments' | 'timeline';
type PanelProps = {
  jobId: string;
  dueSoonMinutes: number;
  onClose: () => void;
  onEdit: (id: string) => void;
  onOpenJob: (id: string) => void;
  onShowIngredients: (filter: 'no_price' | 'stale') => void;
};

/** The job drawer. Opened from /kitchen?job=<id>. */
export function JobPanel(props: PanelProps) {
  const job = useKitchenJob(props.jobId);
  if (job.isPending || job.isError || !job.data) {
    return (
      <EntityDrawer title={job.isPending ? 'Loading job…' : 'Job unavailable'} onClose={props.onClose} width="lg">
        {job.isPending ? <PanelSkeleton label="Loading job…" /> : <ErrorPanel message={job.error?.message ?? 'Job not found'} onRetry={() => void job.refetch()} />}
      </EntityDrawer>
    );
  }
  return <JobDrawer {...props} job={job.data} />;
}

const WARNING_FIX: Record<string, { label: string; filter?: 'no_price' | 'stale' }> = {
  unpriced_ingredients: { label: 'Price ingredients', filter: 'no_price' },
};

function JobDrawer({ job, dueSoonMinutes, onClose, onEdit, onOpenJob, onShowIngredients }: PanelProps & { job: KitchenJob }) {
  const { can } = usePermissions();
  const canManage = can('kitchen.manage_jobs');
  const canArchive = can('kitchen.archive');
  const showCosts = !job.costs_hidden && can('kitchen.view_costs');
  const [tab, setTab] = useState<Tab>('summary');
  const action = useKitchenJobAction();
  const archive = useArchiveKitchenJob();
  const [confirming, setConfirming] = useState<null | 'cancel' | 'decline'>(null);
  const [reason, setReason] = useState('');
  const due = dueState(job, dueSoonMinutes);
  const busy = action.isPending;
  const quoteStage = job.stage === 'draft' || job.stage === 'quoted';
  const open = !FINAL_STAGES.includes(job.stage);
  const balance = Math.max(0, job.total - job.paid);
  const warnings = showCosts ? job.costing?.warnings ?? [] : [];

  const run = (name: 'quote' | 'confirm' | 'advance' | 'cancel' | 'decline' | 'duplicate', body?: object, done?: string) =>
    action.mutate(
      { id: job._id, action: name, body },
      {
        onSuccess: (j) => {
          toast.success(done ?? `${j.code}: ${STAGE_LABELS[j.stage]}`);
          setConfirming(null);
          setReason('');
          if (name === 'duplicate') onOpenJob(j._id);
        },
        onError: (e) => toast.error(e.message),
      },
    );

  const doArchive = () => {
    if (!window.confirm(`Archive ${job.code}? It leaves the board and job lists but stays in reports and the audit trail.`)) return;
    archive.mutate(job._id, { onSuccess: () => { toast.success(`${job.code} archived`); onClose(); }, onError: (e) => toast.error(e.message) });
  };

  // One primary action: move the job to its next stage (or put a quote on the board).
  const primary =
    canManage && ADVANCE_LABELS[job.stage] ? (
      <SubmitButton type="button" loading={busy && action.variables?.action === 'advance'} onClick={() => run('advance')} className="h-9 gap-1.5 px-4 text-sm">
        {ADVANCE_LABELS[job.stage]} <ArrowRight size={14} aria-hidden />
      </SubmitButton>
    ) : canManage && quoteStage ? (
      <SubmitButton type="button" loading={busy && action.variables?.action === 'confirm'} onClick={() => run('confirm', undefined, `${job.code} is on the board`)} className="h-9 px-4 text-sm">
        Confirm order
      </SubmitButton>
    ) : null;

  const overflow = (
    <OverflowMenu
      label={`More actions for ${job.code}`}
      items={[
        { label: 'Send quote', icon: <Send />, hidden: !(canManage && job.stage === 'draft'), disabled: busy, onSelect: () => run('quote', undefined, 'Quote saved. Share the client quote.') },
        { label: isEditableStage(job.stage) ? 'Edit job' : 'Edit details', icon: <Edit3 />, hidden: !(canManage && open), onSelect: () => onEdit(job._id) },
        { label: 'Open client quote', icon: <FileText />, href: `/kitchen-quote/${job._id}`, external: true },
        { label: 'Duplicate', icon: <Copy />, hidden: !canManage, disabled: busy, onSelect: () => run('duplicate', undefined, 'Copied as a new draft') },
        { label: 'Mark quote declined', icon: <ThumbsDown />, hidden: !(canManage && job.stage === 'quoted'), onSelect: () => setConfirming('decline') },
        { label: 'Archive', icon: <Archive />, destructive: true, hidden: !(canArchive && !job.archived), disabled: archive.isPending, onSelect: doArchive },
        { label: 'Cancel job', icon: <Ban />, destructive: true, hidden: !(canManage && open), onSelect: () => setConfirming('cancel') },
      ]}
    />
  );

  const dueTone: DrawerStat['tone'] = due?.tone === 'overdue' ? 'danger' : due?.tone === 'soon' ? 'warning' : 'default';
  const stats: DrawerStat[] = [
    { label: 'Due', value: due?.tone && due.tone !== 'normal' ? due.label : formatDue(job.due_at), tone: dueTone },
    { label: 'Total', value: naira(job.total) },
    { label: 'Paid', value: naira(job.paid) },
    { label: 'Balance', value: naira(balance), tone: balance > 0 ? 'warning' : 'default' },
  ];

  const tabs: SectionTab<Tab>[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'costing', label: 'Costing', hidden: !showCosts },
    { id: 'shopping', label: 'Shopping list', hidden: !showCosts, count: job.costing?.shopping_list?.length },
    { id: 'payments', label: 'Payments', count: job.payments.length },
    { id: 'timeline', label: 'Timeline' },
  ];
  const activeTab = tabs.some((t) => t.id === tab && !t.hidden) ? tab : 'summary';

  return (
    <EntityDrawer
      onClose={onClose}
      width="lg"
      dismissible={!confirming}
      title={job.customer_name || 'Walk-in customer'}
      status={<><StageBadge stage={job.stage} /><PaymentBadge job={job} /></>}
      subtitle={
        <>
          <span className="font-mono">{job.code}</span>, {MODE_LABELS[job.mode].label}
          {job.count ? `, ${job.count} ${MODE_LABELS[job.mode].unit.toLowerCase()}` : ''}, {hubNameOf(job.hub)}
        </>
      }
      actions={primary}
      overflow={overflow}
      stats={stats}
      tabs={{ items: tabs, value: activeTab, onChange: setTab }}
    >
      <div className="space-y-6">
        {confirming && (
          <form
            className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(confirming, { reason }, confirming === 'cancel' ? `${job.code} cancelled` : 'Quote marked as declined');
            }}
          >
            <label htmlFor="cancel-reason" className={labelClass}>{confirming === 'cancel' ? 'Why is this job cancelled? (required)' : 'Why was the quote declined? (optional)'}</label>
            <textarea id="cancel-reason" className={`${inputClass} h-20 py-2`} value={reason} onChange={(e) => setReason(e.target.value)} required={confirming === 'cancel'} maxLength={500} autoFocus />
            <div className="flex flex-wrap gap-2">
              <SubmitButton type="submit" variant="destructive" loading={busy} className="h-9 px-4 text-sm" disabled={confirming === 'cancel' && !reason.trim()}>
                {confirming === 'cancel' ? 'Cancel job' : 'Mark declined'}
              </SubmitButton>
              <button type="button" className={btnSecondary} onClick={() => { setConfirming(null); setReason(''); }}>Keep it</button>
            </div>
          </form>
        )}

        {/* Warnings come first so a wrong price is seen before anything else. */}
        {warnings.length > 0 && (
          <section className="rounded-xl border border-warning/40 bg-warning/5 p-4" aria-live="polite">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning"><AlertTriangle size={16} aria-hidden /> Needs attention</h3>
            <ul className="space-y-1.5 text-sm">
              {warnings.map((w) => (
                <li key={w.code} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{w.message}{w.items?.length ? <span className="text-muted-foreground"> ({w.items.slice(0, 4).join(', ')}{w.items.length > 4 ? ` +${w.items.length - 4}` : ''})</span> : null}</span>
                  {WARNING_FIX[w.code]?.filter && (
                    <button type="button" className="rounded-md text-xs font-medium text-primary underline" onClick={() => onShowIngredients(WARNING_FIX[w.code].filter!)}>{WARNING_FIX[w.code].label}</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === 'summary' && <SummaryTab job={job} onOpenJob={onOpenJob} />}
        {activeTab === 'costing' && <CostingTab job={job} />}
        {activeTab === 'shopping' && <ShoppingTab job={job} />}
        {activeTab === 'payments' && <PaymentsTab job={job} canManage={canManage} />}
        {activeTab === 'timeline' && <TimelineTab job={job} canManage={canManage} />}
      </div>
    </EntityDrawer>
  );
}
