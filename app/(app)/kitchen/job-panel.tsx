'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Archive, Copy, Edit3, ExternalLink, FileText, Phone, Send, X } from 'lucide-react';
import { ModalDialog } from '../sales/modal-dialog';
import { PanelSkeleton } from '@/components/ui/loading-skeletons';
import { SubmitButton } from '@/components/submit-button';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useAddKitchenNote,
  useArchiveKitchenJob,
  useKitchenJob,
  useKitchenJobAction,
  useKitchenJobEvents,
  useKitchenJobs,
  useRecordKitchenPayment,
} from '@/hooks/use-kitchen';
import { cn } from '@/lib/utils';
import {
  ADVANCE_LABELS,
  dueState,
  FINAL_STAGES,
  formatDue,
  hubNameOf,
  isEditableStage,
  KITCHEN_PAYMENT_METHODS,
  MODE_LABELS,
  naira,
  pct,
  STAGE_LABELS,
  type KitchenJob,
  type KitchenPaymentMethod,
} from '@/lib/kitchen-types';
import { btnDanger, btnSecondary, ErrorPanel, inputClass, labelClass, MoneyInput, PaymentBadge, StageBadge } from './kitchen-ui';

type Tab = 'overview' | 'costing' | 'payments' | 'timeline';

export function JobPanel({
  jobId,
  dueSoonMinutes,
  onClose,
  onEdit,
  onOpenJob,
  onShowIngredients,
}: {
  jobId: string;
  dueSoonMinutes: number;
  onClose: () => void;
  onEdit: (id: string) => void;
  onOpenJob: (id: string) => void;
  onShowIngredients: (filter: 'no_price' | 'stale') => void;
}) {
  const { can } = usePermissions();
  const canManage = can('kitchen.manage_jobs');
  const job = useKitchenJob(jobId);
  const [tab, setTab] = useState<Tab>('overview');
  const j = job.data;
  const showCosts = !!j && !j.costs_hidden && can('kitchen.view_costs');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    ...(showCosts ? [{ id: 'costing' as const, label: 'Costing' }] : []),
    { id: 'payments', label: `Payments${j?.payments.length ? ` (${j.payments.length})` : ''}` },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <ModalDialog onClose={onClose} align="end">
      <div className="relative z-10 h-full w-full max-w-2xl overflow-y-auto border-l bg-card shadow-xl animate-in slide-in-from-right duration-200" aria-labelledby="job-panel-title">
        {job.isPending ? (
          <PanelSkeleton label="Loading job…" />
        ) : job.isError || !j ? (
          <div className="p-6">
            <button type="button" onClick={onClose} className="float-right text-muted-foreground hover:text-foreground" aria-label="Close"><X size={20} /></button>
            <ErrorPanel message={job.error?.message ?? 'Job not found'} onRetry={() => void job.refetch()} />
          </div>
        ) : (
          <>
            <PanelHeader job={j} canManage={canManage} canArchive={can('kitchen.archive')} dueSoonMinutes={dueSoonMinutes} onClose={onClose} onEdit={() => onEdit(j._id)} onOpenJob={onOpenJob} />
            <div className="flex border-b" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn('flex-1 py-3 text-center text-xs font-medium transition-colors', tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="space-y-6 p-6">
              {tab === 'overview' && <Overview job={j} onOpenJob={onOpenJob} />}
              {tab === 'costing' && showCosts && <Costing job={j} onShowIngredients={onShowIngredients} />}
              {tab === 'payments' && <Payments job={j} canManage={canManage} />}
              {tab === 'timeline' && <Timeline job={j} canManage={canManage} />}
            </div>
          </>
        )}
      </div>
    </ModalDialog>
  );
}

function PanelHeader({ job, canManage, canArchive, dueSoonMinutes, onClose, onEdit, onOpenJob }: {
  job: KitchenJob; canManage: boolean; canArchive: boolean; dueSoonMinutes: number; onClose: () => void; onEdit: () => void; onOpenJob: (id: string) => void;
}) {
  const action = useKitchenJobAction();
  const archive = useArchiveKitchenJob();
  const [confirming, setConfirming] = useState<null | 'cancel' | 'decline'>(null);
  const [reason, setReason] = useState('');
  const due = dueState(job, dueSoonMinutes);
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
  const busy = action.isPending;
  const quoteStage = job.stage === 'draft' || job.stage === 'quoted';

  return (
    <div className="sticky top-0 z-10 border-b bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="job-panel-title" className="truncate text-lg font-bold">{job.customer_name || 'Walk-in customer'}</h2>
            <StageBadge stage={job.stage} />
            <PaymentBadge job={job} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="font-mono">{job.code}</span> · {MODE_LABELS[job.mode].label}{job.count ? ` · ${job.count} ${MODE_LABELS[job.mode].unit.toLowerCase()}` : ''} · {hubNameOf(job.hub)}
          </p>
          <p className={cn('mt-0.5 text-sm', due?.tone === 'overdue' ? 'font-semibold text-destructive' : due?.tone === 'soon' ? 'font-semibold text-amber-600' : 'text-muted-foreground')}>
            {due?.tone && due.tone !== 'normal' ? due.label : `Due ${formatDue(job.due_at)}`}
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close"><X size={20} /></button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {canManage && ADVANCE_LABELS[job.stage] && (
          <SubmitButton type="button" loading={busy && action.variables?.action === 'advance'} onClick={() => run('advance')} className="h-9 gap-1.5 px-4 text-sm">
            {ADVANCE_LABELS[job.stage]} <ArrowRight size={14} />
          </SubmitButton>
        )}
        {canManage && quoteStage && (
          <SubmitButton type="button" loading={busy && action.variables?.action === 'confirm'} onClick={() => run('confirm', undefined, `${job.code} is on the board`)} className="h-9 px-4 text-sm">
            Confirm order
          </SubmitButton>
        )}
        {canManage && job.stage === 'draft' && (
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => run('quote', undefined, 'Quote saved. Share the client quote.')}>
            <Send size={14} /> Send quote
          </button>
        )}
        {canManage && !FINAL_STAGES.includes(job.stage) && (
          <button type="button" className={btnSecondary} onClick={onEdit}><Edit3 size={14} /> {isEditableStage(job.stage) ? 'Edit' : 'Edit details'}</button>
        )}
        <a className={btnSecondary} href={`/kitchen-quote/${job._id}`} target="_blank" rel="noopener noreferrer">
          <FileText size={14} /> Client quote <ExternalLink size={12} />
        </a>
        {canManage && (
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => run('duplicate', undefined, 'Copied as a new draft')}>
            <Copy size={14} /> Duplicate
          </button>
        )}
        {canManage && job.stage === 'quoted' && (
          <button type="button" className={btnSecondary} onClick={() => setConfirming('decline')}>Declined</button>
        )}
        {canManage && !FINAL_STAGES.includes(job.stage) && (
          <button type="button" className={btnDanger} onClick={() => setConfirming('cancel')}>Cancel job</button>
        )}
        {canArchive && !job.archived && (
          <button
            type="button"
            className={btnSecondary}
            disabled={archive.isPending}
            onClick={() => {
              if (!window.confirm(`Archive ${job.code}? It leaves the board and job lists but stays in reports and the audit trail.`)) return;
              archive.mutate(job._id, { onSuccess: () => { toast.success(`${job.code} archived`); onClose(); }, onError: (e) => toast.error(e.message) });
            }}
          >
            <Archive size={14} /> Archive
          </button>
        )}
      </div>

      {confirming && (
        <form
          className="mt-4 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(confirming, { reason }, confirming === 'cancel' ? `${job.code} cancelled` : 'Quote marked as declined');
          }}
        >
          <label htmlFor="cancel-reason" className={labelClass}>{confirming === 'cancel' ? 'Why is this job cancelled? (required)' : 'Reason (optional)'}</label>
          <textarea id="cancel-reason" className={`${inputClass} h-20 py-2`} value={reason} onChange={(e) => setReason(e.target.value)} required={confirming === 'cancel'} maxLength={500} />
          <div className="flex gap-2">
            <SubmitButton type="submit" variant="destructive" loading={busy} className="h-9 px-4 text-sm" disabled={confirming === 'cancel' && !reason.trim()}>
              {confirming === 'cancel' ? 'Cancel job' : 'Mark declined'}
            </SubmitButton>
            <button type="button" className={btnSecondary} onClick={() => setConfirming(null)}>Keep it</button>
          </div>
        </form>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function Overview({ job, onOpenJob }: { job: KitchenJob; onOpenJob: (id: string) => void }) {
  const customerId = job.customer ? (typeof job.customer === 'string' ? job.customer : job.customer._id) : undefined;
  const history = useKitchenJobs({ customer_id: customerId, limit: 6 }, { enabled: !!customerId });
  const past = (history.data?.data ?? []).filter((h) => h._id !== job._id);
  const customer = job.customer && typeof job.customer === 'object' ? job.customer : null;
  const balance = Math.max(0, job.total - job.paid);

  return (
    <>
      <section className="rounded-md border p-4">
        <h3 className="mb-2 text-sm font-semibold">Customer & service</h3>
        <dl className="divide-y">
          <Row label="Customer">{job.customer_name || '—'}</Row>
          <Row label="Phone">{job.phone ? <a href={`tel:${job.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Phone size={12} /> {job.phone}</a> : '—'}</Row>
          <Row label="Channel">{job.channel}</Row>
          <Row label="Fulfilment">{job.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}</Row>
          {job.fulfilment === 'delivery' && <Row label="Address">{job.address || '—'}</Row>}
          <Row label="Due">{formatDue(job.due_at)}</Row>
          <Row label="Taken by">{job.created_by_name || '—'}</Row>
          {job.expires_at && job.stage === 'quoted' && <Row label="Quote expires">{formatDue(job.expires_at)}</Row>}
          {job.cancel_reason && <Row label={job.stage === 'cancelled' ? 'Cancel reason' : 'Reason'}>{job.cancel_reason}</Row>}
          {job.sale && <Row label="Sales"><Link href="/sales" className="text-primary hover:underline">Posted on completion</Link>{balance > 0 && <> · <Link href="/credits" className="text-primary hover:underline">{naira(balance)} in Credits</Link></>}</Row>}
        </dl>
        {job.notes && <p className="mt-3 whitespace-pre-wrap rounded bg-muted/50 p-3 text-sm"><span className="font-semibold">Kitchen notes: </span>{job.notes}</p>}
      </section>

      <section className="rounded-md border">
        <h3 className="border-b px-4 py-3 text-sm font-semibold">Bill</h3>
        <table className="w-full text-sm">
          <tbody className="divide-y">
            {job.bill_lines.map((b, i) => (
              <tr key={i}>
                <td className="px-4 py-2">{b.desc}</td>
                <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{b.qty} × {naira(b.unit_price)}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">{naira(b.qty * b.unit_price)}</td>
              </tr>
            ))}
            {!job.bill_lines.length && <tr><td className="px-4 py-6 text-center italic text-muted-foreground" colSpan={3}>No bill lines yet. Add a menu to price this job.</td></tr>}
          </tbody>
          <tfoot className="border-t bg-muted/30">
            <tr><td className="px-4 py-2 font-semibold" colSpan={2}>Total</td><td className="px-4 py-2 text-right font-bold tabular-nums">{naira(job.total)}</td></tr>
            <tr><td className="px-4 py-1.5 text-muted-foreground" colSpan={2}>Paid</td><td className="px-4 py-1.5 text-right tabular-nums">{naira(job.paid)}</td></tr>
            <tr><td className="px-4 py-1.5 text-muted-foreground" colSpan={2}>Balance</td><td className={cn('px-4 py-1.5 text-right font-semibold tabular-nums', balance > 0 && 'text-orange-600')}>{naira(balance)}</td></tr>
          </tfoot>
        </table>
      </section>

      {customerId && (
        <section className="rounded-md border p-4">
          <h3 className="mb-2 text-sm font-semibold">
            Customer history
            {customer?.total_orders ? <span className="ml-2 font-normal text-muted-foreground">{customer.total_orders} purchases · {naira(customer.total_spent ?? 0)} in Sales</span> : null}
          </h3>
          {history.isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : past.length ? (
            <ul className="divide-y text-sm">
              {past.map((p) => (
                <li key={p._id}>
                  <button type="button" onClick={() => onOpenJob(p._id)} className="flex w-full items-center justify-between gap-2 py-2 text-left hover:text-primary">
                    <span><span className="font-mono text-xs">{p.code}</span> · {new Date(p.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}</span>
                    <span className="flex items-center gap-2"><StageBadge stage={p.stage} /><span className="tabular-nums">{naira(p.total)}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-muted-foreground">No other kitchen jobs for this customer.</p>
          )}
        </section>
      )}
    </>
  );
}

const WARNING_FIX: Record<string, { label: string; filter?: 'no_price' | 'stale' }> = {
  unpriced_ingredients: { label: 'Price ingredients', filter: 'no_price' },
};

function Costing({ job, onShowIngredients }: { job: KitchenJob; onShowIngredients: (filter: 'no_price' | 'stale') => void }) {
  const c = job.costing;
  if (!c) return <p className="text-sm italic text-muted-foreground">This job has not been costed yet.</p>;
  const per = MODE_LABELS[job.mode].per;
  const lines: [string, number | undefined][] = [
    [job.mode === 'chef' ? 'Food (client buys it, not charged)' : 'Food', job.mode === 'chef' ? c.food : c.food_charged],
    ['Packaging & job costs', c.overheads],
    ['Labour', c.labour],
    ['Running costs: utilities', c.utilities],
    ['Running costs: kitchen staff', c.staff],
  ];
  return (
    <>
      {!!c.warnings?.length && (
        <section className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-950/20" aria-live="polite">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300"><AlertTriangle size={15} /> Needs attention</h3>
          <ul className="space-y-1.5 text-sm">
            {c.warnings.map((w) => (
              <li key={w.code} className="flex flex-wrap items-center justify-between gap-2">
                <span>{w.message}{w.items?.length ? <span className="text-muted-foreground"> ({w.items.slice(0, 4).join(', ')}{w.items.length > 4 ? ` +${w.items.length - 4}` : ''})</span> : null}</span>
                {WARNING_FIX[w.code]?.filter && (
                  <button type="button" className="text-xs font-semibold text-primary underline" onClick={() => onShowIngredients(WARNING_FIX[w.code].filter!)}>{WARNING_FIX[w.code].label}</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Cost', naira(c.cost), `${naira(c.cost_per_unit)} ${per}`],
          ['Price', naira(c.price), `${naira(c.price_per_unit)} ${per}`],
          ['Profit', naira(c.profit), pct(c.margin) + ' margin'],
          ['Food cost', pct(c.food_cost_pct), 'of the price'],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-lg font-bold tabular-nums', label === 'Profit' && (c.profit ?? 0) < 0 && 'text-destructive')}>{value}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </section>

      <section className="rounded-md border p-4">
        <h3 className="mb-2 text-sm font-semibold">Cost breakdown</h3>
        <dl className="divide-y">
          {lines.filter(([, v]) => (v ?? 0) > 0 || job.mode !== 'chef').map(([label, v]) => <Row key={label} label={label}>{naira(v ?? 0)}</Row>)}
          {(c.service_charge ?? 0) > 0 && <Row label="Service charge">{naira(c.service_charge)}</Row>}
          <Row label="Total cost">{naira(c.cost)}</Row>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          {c.pricing_method === 'markup' && c.markup_pct != null && `Priced at ${c.markup_pct}% markup on cost. `}
          {c.pricing_method === 'food_cost' && 'Priced by target food cost. '}
          {c.pricing_method === 'test_price' && 'Priced at a test price. '}
          {c.running_costs_source === 'hub' ? 'Running costs from this outlet.' : 'Running costs from company defaults.'}
          {c.computed_at && ` Costed ${new Date(c.computed_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}.`}
        </p>
      </section>

      {!!c.options?.length && c.pricing_method !== 'chef' && (
        <section className="rounded-md border">
          <h3 className="border-b px-4 py-3 text-sm font-semibold">Pricing options</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="px-4 py-2 text-left">Method</th><th className="px-4 py-2 text-right">{per}</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2 text-right">Profit</th><th className="px-4 py-2 text-right">Margin</th></tr></thead>
            <tbody className="divide-y">
              {c.options.filter((o) => o.price_per_unit > 0).map((o) => (
                <tr key={o.method} className={o.method === c.pricing_method ? 'bg-primary/5 font-semibold' : ''}>
                  <td className="px-4 py-2">{o.method === 'markup' ? 'Markup' : o.method === 'food_cost' ? 'Food cost %' : 'Test price'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{naira(o.price_per_unit)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{naira(o.revenue)}</td>
                  <td className={cn('px-4 py-2 text-right tabular-nums', o.profit < 0 && 'text-destructive')}>{naira(o.profit)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{pct(o.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {!!c.shopping_list?.length && (
        <section className="rounded-md border">
          <h3 className="border-b px-4 py-3 text-sm font-semibold">Shopping list</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="px-4 py-2 text-left">Ingredient</th><th className="px-4 py-2 text-right">Needed</th><th className="px-4 py-2 text-right">Packs to buy</th><th className="px-4 py-2 text-right">Cost used</th><th className="px-4 py-2 text-right">Cost to buy</th></tr></thead>
              <tbody className="divide-y">
                {c.shopping_list.map((s) => (
                  <tr key={s.ingredient}>
                    <td className="px-4 py-2">{s.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.qty.toLocaleString('en-NG', { maximumFractionDigits: 2 })} {s.unit}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.packs_to_buy ?? '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.cost_used == null ? <span className="text-amber-600">No price</span> : naira(s.cost_used)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{naira(s.cost_to_buy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function Payments({ job, canManage }: { job: KitchenJob; canManage: boolean }) {
  const record = useRecordKitchenPayment();
  const balance = Math.max(0, Math.round((job.total - job.paid) * 100) / 100);
  const [amount, setAmount] = useState<number>(balance);
  const [method, setMethod] = useState<KitchenPaymentMethod>('Transfer');
  const [note, setNote] = useState('');
  const canPay = canManage && !['draft', 'quoted', 'declined', 'expired'].includes(job.stage) && balance > 0;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[['Total', job.total], ['Paid', job.paid], ['Balance', balance]].map(([l, v]) => (
          <div key={l as string} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className={cn('text-lg font-bold tabular-nums', l === 'Balance' && balance > 0 && 'text-orange-600')}>{naira(v as number)}</p>
          </div>
        ))}
      </div>

      {canPay && (
        <form
          className="space-y-3 rounded-md border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            record.mutate(
              { id: job._id, amount, method, note: note.trim() || undefined },
              {
                onSuccess: (j) => {
                  toast.success(`Recorded ${naira(amount)}`);
                  setAmount(Math.max(0, j.total - j.paid));
                  setNote('');
                },
                onError: (err) => toast.error(err.message),
              },
            );
          }}
        >
          <h3 className="text-sm font-semibold">Record a payment</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="pay-amount" className={labelClass}>Amount</label>
              <MoneyInput id="pay-amount" value={amount} onChange={setAmount} />
            </div>
            <div className="space-y-1.5">
              <span className={labelClass} id="pay-method-label">Method</span>
              <div role="radiogroup" aria-labelledby="pay-method-label" className="flex gap-1">
                {KITCHEN_PAYMENT_METHODS.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)}
                    className={cn('h-9 flex-1 rounded-md border text-sm font-medium', method === m ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent')}>{m}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pay-note" className={labelClass}>Note (optional)</label>
              <input id="pay-note" className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. transfer ref" />
            </div>
          </div>
          <div className="flex gap-2">
            <SubmitButton type="submit" loading={record.isPending} disabled={!(amount > 0) || amount > balance + 0.009} className="h-9 px-4 text-sm">Record payment</SubmitButton>
            {amount !== balance && <button type="button" className={btnSecondary} onClick={() => setAmount(balance)}>Full balance</button>}
          </div>
        </form>
      )}

      <section className="rounded-md border">
        <h3 className="border-b px-4 py-3 text-sm font-semibold">Payment records</h3>
        <ul className="divide-y text-sm">
          {job.payments.map((p) => (
            <li key={p._id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div>
                <p className="font-medium">{naira(p.amount)} · {p.method}</p>
                <p className="text-xs text-muted-foreground">{new Date(p.at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} · {p.by_name || 'Someone'}{p.note ? ` · ${p.note}` : ''}</p>
              </div>
            </li>
          ))}
          {!job.payments.length && <li className="px-4 py-6 text-center italic text-muted-foreground">No payments recorded.</li>}
        </ul>
      </section>
    </>
  );
}

function Timeline({ job, canManage }: { job: KitchenJob; canManage: boolean }) {
  const events = useKitchenJobEvents(job._id);
  const addNote = useAddKitchenNote();
  const [text, setText] = useState('');
  return (
    <>
      {canManage && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addNote.mutate({ id: job._id, text }, { onSuccess: () => setText(''), onError: (err) => toast.error(err.message) });
          }}
        >
          <label htmlFor="job-note" className="sr-only">Add a note</label>
          <input id="job-note" className={inputClass} placeholder="Add a note for the team…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          <SubmitButton type="submit" loading={addNote.isPending} disabled={!text.trim()} className="h-9 px-4 text-sm">Add</SubmitButton>
        </form>
      )}
      {events.isPending ? (
        <p className="text-sm text-muted-foreground">Loading timeline…</p>
      ) : events.isError ? (
        <ErrorPanel message={events.error.message} onRetry={() => void events.refetch()} />
      ) : (
        <ol className="relative space-y-4 border-l pl-5">
          {[...(events.data ?? [])].reverse().map((e) => (
            <li key={e._id} className="relative">
              <span className={cn('absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card', e.type === 'cancel' ? 'bg-destructive' : e.type === 'payment' ? 'bg-green-600' : e.type === 'note' ? 'bg-blue-500' : 'bg-primary')} />
              <p className="text-sm">{e.text}</p>
              {e.type === 'edit_recosted' && e.data && 'before' in e.data && (
                <p className="text-xs text-muted-foreground">
                  Total {naira((e.data.before as { total?: number })?.total)} → {naira((e.data.after as { total?: number })?.total)}
                  {(e.data.after as { cost?: number })?.cost != null && <> · cost {naira((e.data.before as { cost?: number })?.cost)} → {naira((e.data.after as { cost?: number })?.cost)}</>}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{e.by_name || 'System'} · {new Date(e.at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

