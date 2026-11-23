'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';
import { whatsAppHref } from '@/components/credits/credit-utils';
import { SubmitButton } from '@/components/submit-button';
import { EmptyState } from '@/components/app';
import { useAddKitchenNote, useKitchenJobEvents, useKitchenJobs, useRecordKitchenPayment } from '@/hooks/use-kitchen';
import { cn } from '@/lib/utils';
import { formatDue, KITCHEN_PAYMENT_METHODS, MODE_LABELS, naira, pct, type KitchenJob, type KitchenPaymentMethod } from '@/lib/kitchen-types';
import { btnSecondary, ErrorPanel, inputClass, labelClass, MoneyInput, StageBadge } from './kitchen-ui';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export function SummaryTab({ job, onOpenJob }: { job: KitchenJob; onOpenJob: (id: string) => void }) {
  const customerId = job.customer ? (typeof job.customer === 'string' ? job.customer : job.customer._id) : undefined;
  const history = useKitchenJobs({ customer_id: customerId, limit: 6 }, { enabled: !!customerId });
  const past = (history.data?.data ?? []).filter((h) => h._id !== job._id);
  const customer = job.customer && typeof job.customer === 'object' ? job.customer : null;
  const balance = Math.max(0, job.total - job.paid);

  return (
    <>
      <section className="rounded-xl border p-4">
        <h3 className="mb-2 text-sm font-semibold">Customer & service</h3>
        <dl className="divide-y">
          <Row label="Customer">{customerId ? <Link href={`/customers?customer=${customerId}`} className="text-primary hover:underline">{job.customer_name || 'Customer'}</Link> : job.customer_name || '-'}</Row>
          <Row label="Phone">{job.phone ? <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1"><span className="tabular-nums">{job.phone}</span>{whatsAppHref(job.phone) && <a href={whatsAppHref(job.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><MessageCircle size={14} aria-hidden /> WhatsApp</a>}</span> : '-'}</Row>
          <Row label="Channel">{job.channel}</Row>
          <Row label="Fulfilment">{job.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}</Row>
          {job.fulfilment === 'delivery' && <Row label="Address">{job.address || '-'}</Row>}
          <Row label="Due">{formatDue(job.due_at)}</Row>
          <Row label="Taken by">{job.created_by_name || '-'}</Row>
          {job.expires_at && job.stage === 'quoted' && <Row label="Quote expires">{formatDue(job.expires_at)}</Row>}
          {job.cancel_reason && <Row label={job.stage === 'cancelled' ? 'Cancel reason' : 'Reason'}>{job.cancel_reason}</Row>}
          {job.sale && <Row label="Sales"><Link href={`/sales?sale=${job.sale}`} className="text-primary hover:underline">Posted on completion</Link>{balance > 0 && <>, <Link href={customerId ? `/credits?customer=${customerId}` : '/credits'} className="text-primary hover:underline">{naira(balance)} in Credits</Link></>}</Row>}
        </dl>
        {job.notes && <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm"><span className="font-medium">Kitchen notes: </span>{job.notes}</p>}
      </section>

      <section className="rounded-xl border">
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
            {!job.bill_lines.length && <tr><td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={3}>No bill lines yet. Add a menu to price this job.</td></tr>}
          </tbody>
          <tfoot className="border-t bg-muted/30">
            <tr><td className="px-4 py-2 font-semibold" colSpan={2}>Total</td><td className="px-4 py-2 text-right font-semibold tabular-nums">{naira(job.total)}</td></tr>
          </tfoot>
        </table>
      </section>

      {customerId && (
        <section className="rounded-xl border p-4">
          <h3 className="mb-2 text-sm font-semibold">
            Customer history
            {customer?.total_orders ? <span className="ml-2 font-normal text-muted-foreground">{customer.total_orders} purchases, {naira(customer.total_spent ?? 0)} in Sales</span> : null}
          </h3>
          {history.isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : past.length ? (
            <ul className="divide-y text-sm">
              {past.map((p) => (
                <li key={p._id}>
                  <button type="button" onClick={() => onOpenJob(p._id)} className="flex w-full items-center justify-between gap-2 py-2 text-left hover:text-primary">
                    <span><span className="font-mono text-xs">{p.code}</span>, {new Date(p.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}</span>
                    <span className="flex items-center gap-2"><StageBadge stage={p.stage} /><span className="tabular-nums">{naira(p.total)}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No other kitchen jobs for this customer.</p>
          )}
        </section>
      )}
    </>
  );
}

export function CostingTab({ job }: { job: KitchenJob }) {
  const c = job.costing;
  if (!c) return <p className="text-sm text-muted-foreground">This job has not been costed yet.</p>;
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
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Cost', naira(c.cost), `${naira(c.cost_per_unit)} ${per}`],
          ['Price', naira(c.price), `${naira(c.price_per_unit)} ${per}`],
          ['Profit', naira(c.profit), pct(c.margin) + ' margin'],
          ['Food cost', pct(c.food_cost_pct), 'of the price'],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-lg font-semibold tabular-nums', label === 'Profit' && (c.profit ?? 0) < 0 && 'text-destructive')}>{value}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border p-4">
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
        <section className="rounded-xl border">
          <h3 className="border-b px-4 py-3 text-sm font-semibold">Pricing options</h3>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="px-4 py-2 text-left font-medium">Method</th><th className="px-4 py-2 text-right font-medium">{per.charAt(0).toUpperCase() + per.slice(1)}</th><th className="px-4 py-2 text-right font-medium">Total</th><th className="px-4 py-2 text-right font-medium">Profit</th><th className="px-4 py-2 text-right font-medium">Margin</th></tr></thead>
            <tbody className="divide-y">
              {c.options.filter((o) => o.price_per_unit > 0).map((o) => (
                <tr key={o.method} className={o.method === c.pricing_method ? 'bg-primary/5 font-medium' : ''}>
                  <td className="px-4 py-2">{o.method === 'markup' ? 'Markup' : o.method === 'food_cost' ? 'Food cost %' : 'Test price'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{naira(o.price_per_unit)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{naira(o.revenue)}</td>
                  <td className={cn('px-4 py-2 text-right tabular-nums', o.profit < 0 && 'text-destructive')}>{naira(o.profit)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{pct(o.margin)}</td>
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

export function PaymentsTab({ job, canManage }: { job: KitchenJob; canManage: boolean }) {
  const record = useRecordKitchenPayment();
  const balance = Math.max(0, Math.round((job.total - job.paid) * 100) / 100);
  const [amount, setAmount] = useState<number>(balance);
  const [method, setMethod] = useState<KitchenPaymentMethod>('Transfer');
  const [note, setNote] = useState('');
  const canPay = canManage && !['draft', 'quoted', 'declined', 'expired'].includes(job.stage) && balance > 0;

  return (
    <>
      {canPay && (
        <form
          className="space-y-3 rounded-xl border p-4"
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
                    className={cn('h-9 flex-1 rounded-md border text-sm font-medium', method === m ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:bg-muted')}>{m}</button>
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

      <section className="rounded-xl border">
        <h3 className="border-b px-4 py-3 text-sm font-semibold">Payment records</h3>
        <ul className="divide-y text-sm">
          {job.payments.map((p) => (
            <li key={p._id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div>
                <p className="font-medium tabular-nums">{naira(p.amount)}, {p.method}</p>
                <p className="text-xs text-muted-foreground">{new Date(p.at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}, {p.by_name || 'Someone'}{p.note ? `, ${p.note}` : ''}</p>
              </div>
            </li>
          ))}
          {!job.payments.length && <li className="px-4 py-6 text-center text-muted-foreground">No payments recorded yet.</li>}
        </ul>
      </section>
    </>
  );
}

export function TimelineTab({ job, canManage }: { job: KitchenJob; canManage: boolean }) {
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
              <span className={cn('absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card', e.type === 'cancel' ? 'bg-destructive' : e.type === 'payment' ? 'bg-primary' : 'bg-muted-foreground/60')} />
              <p className="text-sm">{e.text}</p>
              {e.type === 'edit_recosted' && e.data && 'before' in e.data && (
                <p className="text-xs text-muted-foreground">
                  Total {naira((e.data.before as { total?: number })?.total)} → {naira((e.data.after as { total?: number })?.total)}
                  {(e.data.after as { cost?: number })?.cost != null && <>, cost {naira((e.data.before as { cost?: number })?.cost)} → {naira((e.data.after as { cost?: number })?.cost)}</>}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{e.by_name || 'System'}, {new Date(e.at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export function ShoppingTab({ job }: { job: KitchenJob }) {
  const list = job.costing?.shopping_list ?? [];
  if (!list.length) return <EmptyState size="compact" title="No shopping list yet" description="Add dishes linked to recipes and the ingredients to buy show here." />;
  const toBuy = list.reduce((s, x) => s + (x.cost_to_buy ?? 0), 0);
  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">What to buy for this job, rounded up to whole packs. <span className="font-medium text-foreground tabular-nums">{naira(toBuy)}</span> to buy in all.</p>
      <ul className="divide-y rounded-xl border text-sm">
        {list.map((s) => (
          <li key={s.ingredient} className="flex items-start justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                Needs {s.qty.toLocaleString('en-NG', { maximumFractionDigits: 2 })} {s.unit}
                {s.packs_to_buy != null && `, ${s.packs_to_buy} pack${s.packs_to_buy === 1 ? '' : 's'} to buy`}
              </p>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <p className="font-medium">{naira(s.cost_to_buy)}</p>
              <p className="text-xs text-muted-foreground">{s.cost_used == null ? <span className="text-warning">No price</span> : `${naira(s.cost_used)} used`}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
