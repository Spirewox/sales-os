'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { ModalDialog } from '../sales/modal-dialog';
import { SubmitButton } from '@/components/submit-button';
import { PanelSkeleton } from '@/components/ui/loading-skeletons';
import { usePermissions } from '@/hooks/use-permissions';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import {
  useCreateKitchenCustomer,
  useCreateKitchenJob,
  useKitchenCustomerSearch,
  useKitchenJob,
  useKitchenJobAction,
  useKitchenRecipes,
  useUpdateKitchenJob,
} from '@/hooks/use-kitchen';
import type { KitchenMode, PricingMethod } from '@/lib/kitchen-costing';
import { cn } from '@/lib/utils';
import {
  KITCHEN_CHANNELS,
  isEditableStage,
  MODE_LABELS,
  naira,
  pct,
  type KitchenBillLine,
  type KitchenJob,
  type KitchenJobInput,
  type KitchenLabourLine,
  type KitchenOverheadLine,
} from '@/lib/kitchen-types';
import { btnGhost, btnSecondary, Field, inputClass, labelClass, MoneyInput, NumberInput } from './kitchen-ui';
import { useJobCosting } from './use-job-costing';

export type JobFormMode = 'new' | 'quick' | 'edit';

export function defaultOverheads(mode: KitchenMode): KitchenOverheadLine[] {
  if (mode === 'chef') return [{ name: 'Transport (to & fro)', qty: 2, unit_cost: 0, per: 'job' }];
  const o: KitchenOverheadLine[] = [{ name: 'Market run / transport', qty: 1, unit_cost: 0, per: 'job' }];
  if (mode === 'packs' || mode === 'trays') {
    o.unshift(
      { name: mode === 'packs' ? 'Takeaway pack' : 'Tray / bowl', qty: 1, unit_cost: 0, per: 'unit' },
      { name: 'Branded sticker', qty: 1, unit_cost: 0, per: 'unit' },
      { name: 'Serviette & cutlery', qty: 1, unit_cost: 0, per: 'unit' },
    );
  }
  if (mode === 'packs') o.push({ name: 'Delivery', qty: 1, unit_cost: 0, per: 'job' });
  if (mode === 'buffet') o.push({ name: 'Serviettes & toothpicks', qty: 1, unit_cost: 0, per: 'unit' }, { name: 'Fuel burner / chafing fuel', qty: 1, unit_cost: 0, per: 'job' });
  return o;
}

export function defaultLabour(mode: KitchenMode): KitchenLabourLine[] {
  if (mode === 'chef') return [{ role: 'Head chef', people: 1, days: 1, rate: 25000 }, { role: 'Cook', people: 1, days: 1, rate: 8000 }];
  if (mode === 'buffet') return [{ role: 'Service staff (contract)', people: 3, days: 1, rate: 0 }];
  return [];
}

const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function blankInput(mode: JobFormMode, hubId?: string): KitchenJobInput {
  const due = new Date(Date.now() + 3 * 36e5);
  due.setMinutes(0, 0, 0);
  const service: KitchenMode = 'packs';
  return {
    hub_id: hubId,
    title: '',
    mode: service,
    count: mode === 'quick' ? 0 : 50,
    customer_id: null,
    customer_name: mode === 'quick' ? 'Walk-in customer' : '',
    phone: '',
    channel: mode === 'quick' ? 'Walk-in' : 'WhatsApp',
    fulfilment: 'pickup',
    address: '',
    due_at: (mode === 'quick' ? new Date(Date.now() + 36e5) : due).toISOString(),
    notes: '',
    menu: [],
    overheads: mode === 'quick' ? [] : defaultOverheads(service),
    labour: mode === 'quick' ? [] : defaultLabour(service),
    include_running_costs: mode !== 'quick',
    ops_days: 1,
    pricing_method: 'markup',
    markup_override: null,
    test_price: null,
    custom_bill: mode === 'quick',
    bill_lines: mode === 'quick' ? [{ desc: '', qty: 1, unit_price: 0, recipe: null }] : [],
  };
}

function fromJob(job: KitchenJob): KitchenJobInput {
  return {
    title: job.title,
    mode: job.mode,
    count: job.count,
    customer_id: job.customer ? (typeof job.customer === 'string' ? job.customer : job.customer._id) : null,
    customer_name: job.customer_name,
    phone: job.phone,
    channel: job.channel,
    fulfilment: job.fulfilment,
    address: job.address,
    due_at: job.due_at,
    notes: job.notes,
    menu: job.menu.map((m) => ({ recipe: String(m.recipe), per_unit: m.per_unit })),
    overheads: job.overheads,
    labour: job.labour,
    include_running_costs: job.include_running_costs,
    ops_days: job.ops_days,
    pricing_method: job.pricing_method,
    markup_override: job.markup_override,
    test_price: job.test_price,
    custom_bill: job.custom_bill,
    bill_lines: job.bill_lines.map((b) => ({ ...b, recipe: b.recipe ? String(b.recipe) : null })),
  };
}

export function JobForm({ mode, jobId, hubScope, onClose, onSaved }: { mode: JobFormMode; jobId?: string; hubScope: HubScopeFilter; onClose: () => void; onSaved: (id: string) => void }) {
  const existing = useKitchenJob(mode === 'edit' ? jobId ?? null : null);
  if (mode === 'edit' && !existing.data) {
    return (
      <ModalDialog onClose={onClose}>
        <div className="relative z-10 w-full max-w-lg rounded-lg border bg-card p-6 shadow-xl">
          {existing.isError ? <p className="text-sm text-destructive">{existing.error.message}</p> : <PanelSkeleton label="Loading job…" />}
        </div>
      </ModalDialog>
    );
  }
  return <JobFormInner mode={mode} job={existing.data} hubScope={hubScope} onClose={onClose} onSaved={onSaved} />;
}

type Step = 'customer' | 'menu' | 'costs' | 'price' | 'review';

function JobFormInner({ mode, job, hubScope, onClose, onSaved }: { mode: JobFormMode; job?: KitchenJob; hubScope: HubScopeFilter; onClose: () => void; onSaved: (id: string) => void }) {
  const { can } = usePermissions();
  const canCosts = can('kitchen.view_costs');
  const quick = mode === 'quick' || (mode === 'edit' && !!job?.custom_bill && !job.menu.length);
  // In the kitchen or ready: the menu and prices are locked, but customer and delivery details can still change.
  const detailsOnly = mode === 'edit' && !!job && !isEditableStage(job.stage);
  const [input, setInput] = useState<KitchenJobInput>(() => (job ? fromJob(job) : blankInput(mode, hubScope.defaultHubId)));
  const [touchedCosts, setTouchedCosts] = useState(!!job);
  const steps: { id: Step; label: string }[] = detailsOnly
    ? [{ id: 'customer', label: 'Customer & delivery' }]
    : quick
    ? [{ id: 'customer', label: 'Customer' }, { id: 'menu', label: 'Dishes' }, { id: 'review', label: 'Review' }]
    : [
        { id: 'customer', label: 'Customer & service' },
        { id: 'menu', label: 'Menu' },
        ...(canCosts ? [{ id: 'costs' as const, label: 'Packaging & costs' }] : []),
        { id: 'price', label: 'Price' },
        { id: 'review', label: 'Review' },
      ];
  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[Math.min(stepIdx, steps.length - 1)].id;
  // Hubs can load after the form opens, so fall back to the default outlet at use time.
  const hubId = job ? (typeof job.hub === 'string' ? job.hub : job.hub._id) : input.hub_id || hubScope.defaultHubId;
  const noOutlet = !job && !hubId;

  const set = (patch: Partial<KitchenJobInput>) => setInput((prev) => ({ ...prev, ...patch }));
  const setMode = (m: KitchenMode) =>
    setInput((prev) => ({
      ...prev,
      mode: m,
      ...(touchedCosts ? {} : { overheads: defaultOverheads(m), labour: defaultLabour(m) }),
      include_running_costs: m === 'chef' ? false : prev.include_running_costs,
    }));

  const ticket = useJobCosting(input, { canCosts, hubId });
  const create = useCreateKitchenJob();
  const update = useUpdateKitchenJob();
  const action = useKitchenJobAction();
  const saving = create.isPending || update.isPending || action.isPending;

  const payload = (): KitchenJobInput => {
    if (detailsOnly) {
      const { customer_id, customer_name, phone, channel, fulfilment, address, notes } = input;
      return { customer_id, customer_name, phone, channel, fulfilment, address, notes, due_at: input.due_at || null };
    }
    const rest: KitchenJobInput = { ...input };
    delete rest.hub_id;
    const out: KitchenJobInput = { ...rest, due_at: input.due_at || null };
    if (!canCosts) {
      // Without cost access the API keeps stored unit costs and rates; never send blanks over them.
      out.overheads = input.overheads?.map((o) => ({ name: o.name, qty: o.qty, per: o.per }));
      out.labour = input.labour?.map((l) => ({ role: l.role, people: l.people, days: l.days }));
    }
    if (quick) out.bill_lines = (input.bill_lines ?? []).filter((b) => b.desc.trim() && b.qty > 0);
    return mode === 'edit' ? out : { ...out, hub_id: hubId };
  };

  const confirmBlocker = noOutlet
    ? 'Add an outlet (Settings › Hubs) before taking kitchen jobs.'
    : !(ticket.total > 0) ? 'Add a menu or dishes with a price first.' : !input.customer_name?.trim() && !input.customer_id ? 'Add the customer first.' : null;

  const save = async (then: 'draft' | 'quote' | 'confirm') => {
    try {
      let saved: KitchenJob;
      if (mode === 'edit' && job) {
        saved = await update.mutateAsync({ id: job._id, input: payload() });
        if (then === 'confirm' && (saved.stage === 'draft' || saved.stage === 'quoted')) saved = await action.mutateAsync({ id: saved._id, action: 'confirm' });
        if (then === 'quote' && saved.stage === 'draft') saved = await action.mutateAsync({ id: saved._id, action: 'quote' });
      } else {
        saved = await create.mutateAsync({ ...payload(), confirm: then === 'confirm' });
        if (then === 'quote') saved = await action.mutateAsync({ id: saved._id, action: 'quote' });
      }
      toast.success(then === 'confirm' ? `${saved.code} is on the board` : then === 'quote' ? `Quote ${saved.code} saved` : `${saved.code} saved`);
      onSaved(saved._id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the job');
    }
  };

  const isDraftish = !job || job.stage === 'draft' || job.stage === 'quoted';
  const last = stepIdx >= steps.length - 1;
  const title = detailsOnly ? `Edit details: ${job?.code}` : mode === 'edit' ? `Edit ${job?.code}` : quick ? 'Quick order' : 'New job';

  return (
    <ModalDialog onClose={onClose}>
      <div className="relative z-10 flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border bg-card shadow-xl animate-in zoom-in-95 duration-150" role="document" aria-labelledby="job-form-title">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 id="job-form-title" className="text-lg font-semibold">{title}</h2>
            <ol className="mt-2 flex flex-wrap gap-1 text-xs" aria-label="Steps">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStepIdx(i)}
                    aria-current={i === stepIdx ? 'step' : undefined}
                    className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 font-medium', i === stepIdx ? 'bg-primary text-primary-foreground' : i < stepIdx ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}
                  >
                    {i < stepIdx ? <Check size={11} /> : <span className="tabular-nums">{i + 1}</span>} {s.label}
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {step === 'customer' && <CustomerStep input={input} set={set} setMode={setMode} quick={quick || detailsOnly} hubScope={hubScope} lockedHub={!!job} />}
            {step === 'menu' && (quick ? <DishesStep input={input} set={set} canCosts={canCosts} /> : <MenuStep input={input} set={set} />)}
            {step === 'costs' && <CostsStep input={input} set={(p) => { setTouchedCosts(true); set(p); }} />}
            {step === 'price' && <PriceStep input={input} set={set} ticket={ticket} canCosts={canCosts} />}
            {step === 'review' && <ReviewStep input={input} set={set} ticket={ticket} quick={quick} />}
          </div>
          {!detailsOnly && <PriceTicket ticket={ticket} input={input} canCosts={canCosts} />}
        </div>

        <div className="flex flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={() => setStepIdx((i) => Math.max(0, i - 1))} disabled={stepIdx === 0}><ChevronLeft size={14} /> Back</button>
            {!last && <button type="button" className={btnSecondary} onClick={() => setStepIdx((i) => i + 1)}>Next <ChevronRight size={14} /></button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {confirmBlocker && (last || noOutlet) && isDraftish && <span className="text-xs text-muted-foreground">{confirmBlocker}</span>}
            {mode === 'edit' ? (
              <>
                {isDraftish ? (
                  <button type="button" className={btnSecondary} disabled={saving} onClick={() => void save('draft')}>Save changes</button>
                ) : (
                  <SubmitButton type="button" loading={saving} onClick={() => void save('draft')} className="h-9 px-4 text-sm">Save changes</SubmitButton>
                )}
                {isDraftish && <SubmitButton type="button" loading={saving} disabled={!!confirmBlocker} onClick={() => void save('confirm')} className="h-9 px-4 text-sm">Save & confirm order</SubmitButton>}
              </>
            ) : (
              <>
                <button type="button" className={btnGhost} disabled={saving || noOutlet} onClick={() => void save('draft')}>Save draft</button>
                {!quick && <button type="button" className={btnSecondary} disabled={saving || noOutlet || !(ticket.total > 0)} onClick={() => void save('quote')}>Save as quote</button>}
                <SubmitButton type="button" loading={saving} disabled={!!confirmBlocker} onClick={() => void save('confirm')} className="h-9 px-4 text-sm">Confirm order</SubmitButton>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}

// ---- steps --------------------------------------------------------------------

function CustomerStep({ input, set, setMode, quick, hubScope, lockedHub }: {
  input: KitchenJobInput; set: (p: Partial<KitchenJobInput>) => void; setMode: (m: KitchenMode) => void; quick: boolean; hubScope: HubScopeFilter; lockedHub: boolean;
}) {
  const [search, setSearch] = useState('');
  const results = useKitchenCustomerSearch(search);
  const createCustomer = useCreateKitchenCustomer();
  const linked = !!input.customer_id;
  const quickDue = (hours: number | 'tomorrow') => {
    const d = new Date();
    if (hours === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      d.setHours(12, 0, 0, 0);
    } else {
      d.setTime(d.getTime() + hours * 36e5);
      d.setSeconds(0, 0);
    }
    set({ due_at: d.toISOString() });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Customer</h3>
        {linked ? (
          <div className="flex items-center justify-between rounded-md border bg-primary/5 p-3 text-sm">
            <span><span className="font-semibold">{input.customer_name}</span> · {input.phone} <span className="ml-1 text-xs text-muted-foreground">(linked to Customers)</span></span>
            <button type="button" className={btnGhost} onClick={() => set({ customer_id: null })}>Unlink</button>
          </div>
        ) : (
          <div className="relative">
            <label htmlFor="cust-search" className={labelClass}>Find an existing customer</label>
            <input id="cust-search" className={cn(inputClass, 'mt-1.5')} placeholder="Name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
            {search.trim().length >= 2 && (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-card text-sm shadow-lg" role="listbox">
                {results.isPending && <li className="px-3 py-2 text-muted-foreground">Searching…</li>}
                {results.data?.map((c) => (
                  <li key={c._id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="w-full px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        set({ customer_id: c._id, customer_name: c.customer_name, phone: c.customer_phone });
                        setSearch('');
                      }}
                    >
                      <span className="font-medium">{c.customer_name}</span> · <span className="text-muted-foreground">{c.customer_phone}{c.company_name ? ` · ${c.company_name}` : ''}</span>
                    </button>
                  </li>
                ))}
                {results.data && !results.data.length && <li className="px-3 py-2 text-muted-foreground">No match. Type the name and phone below.</li>}
              </ul>
            )}
          </div>
        )}
        {!linked && (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Customer name" htmlFor="cust-name"><input id="cust-name" className={inputClass} value={input.customer_name ?? ''} onChange={(e) => set({ customer_name: e.target.value })} maxLength={160} /></Field>
            <Field label="Phone" htmlFor="cust-phone"><input id="cust-phone" type="tel" className={inputClass} value={input.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} maxLength={40} /></Field>
            <button
              type="button"
              className={btnSecondary}
              disabled={!input.customer_name?.trim() || !input.phone?.trim() || createCustomer.isPending}
              onClick={() =>
                createCustomer.mutate(
                  { customer_name: input.customer_name!.trim(), customer_phone: input.phone!.trim(), hub_id: input.hub_id },
                  {
                    onSuccess: (r) => {
                      set({ customer_id: r.data._id, customer_name: r.data.customer_name, phone: r.data.customer_phone });
                      toast.success(r.existing ? `Linked to existing customer ${r.data.customer_name}` : 'Customer added');
                    },
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
            >
              <UserPlus size={14} /> Save to Customers
            </button>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Channel">
          <div className="flex flex-wrap gap-1">
            {KITCHEN_CHANNELS.map((c) => (
              <button key={c} type="button" aria-pressed={input.channel === c} onClick={() => set({ channel: c })}
                className={cn('h-8 rounded-md border px-2.5 text-xs font-medium', input.channel === c ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent')}>{c}</button>
            ))}
          </div>
        </Field>
        <Field label="Pickup or delivery">
          <div className="flex gap-1">
            {(['pickup', 'delivery'] as const).map((f) => (
              <button key={f} type="button" aria-pressed={input.fulfilment === f} onClick={() => set({ fulfilment: f })}
                className={cn('h-8 flex-1 rounded-md border text-xs font-medium', input.fulfilment === f ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent')}>{f === 'pickup' ? 'Pickup' : 'Delivery'}</button>
            ))}
          </div>
        </Field>
        {input.fulfilment === 'delivery' && (
          <Field label="Delivery address" htmlFor="addr" className="sm:col-span-2"><input id="addr" className={inputClass} value={input.address ?? ''} onChange={(e) => set({ address: e.target.value })} maxLength={400} /></Field>
        )}
        <Field label="Due" htmlFor="due">
          <input id="due" type="datetime-local" className={inputClass} value={toLocalInput(input.due_at)} onChange={(e) => set({ due_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {([['In 1h', 1], ['In 3h', 3], ['Tomorrow 12:00', 'tomorrow']] as const).map(([label, h]) => (
              <button key={label} type="button" className="rounded border px-2 py-0.5 text-xs hover:bg-accent" onClick={() => quickDue(h)}>{label}</button>
            ))}
          </div>
        </Field>
        {hubScope.canSwitchHubs && !lockedHub && (
          <Field label="Outlet" htmlFor="outlet">
            <select id="outlet" className={inputClass} value={input.hub_id || hubScope.defaultHubId || ''} onChange={(e) => set({ hub_id: e.target.value })}>
              {hubScope.activeHubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </Field>
        )}
      </section>

      {!quick && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Service</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(MODE_LABELS) as KitchenMode[]).map((m) => (
              <button key={m} type="button" aria-pressed={input.mode === m} onClick={() => setMode(m)}
                className={cn('rounded-md border p-3 text-left text-sm', input.mode === m ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent')}>
                <span className="font-semibold">{MODE_LABELS[m].label}</span>
                <span className="block text-xs text-muted-foreground">Priced {MODE_LABELS[m].per}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`How many ${MODE_LABELS[input.mode ?? 'packs'].unit.toLowerCase()}?`} htmlFor="count"><NumberInput id="count" value={input.count} onChange={(v) => set({ count: Math.max(0, Math.round(v)) })} /></Field>
            <Field label="Job name (shown on the bill)" htmlFor="title" hint="e.g. 100 office lunch packs"><input id="title" className={inputClass} value={input.title ?? ''} onChange={(e) => set({ title: e.target.value })} maxLength={160} /></Field>
          </div>
        </section>
      )}

      <Field label="Kitchen notes" htmlFor="notes"><textarea id="notes" className={cn(inputClass, 'h-20 py-2')} value={input.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} maxLength={2000} placeholder="Allergies, packaging, timing…" /></Field>
    </div>
  );
}

function MenuStep({ input, set }: { input: KitchenJobInput; set: (p: Partial<KitchenJobInput>) => void }) {
  const recipes = useKitchenRecipes();
  const menu = input.menu ?? [];
  const per = MODE_LABELS[input.mode ?? 'packs'].per;
  const options = recipes.data ?? [];
  const update = (i: number, patch: Partial<(typeof menu)[number]>) => set({ menu: menu.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Pick each dish and how many portions (scoops, pieces, wraps) go {per}.</p>
      {recipes.isPending && <p className="text-sm text-muted-foreground">Loading recipes…</p>}
      {recipes.data && !options.length && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">No recipes yet. An admin can add them or import the prototype data in Settings.</p>}
      <div className="space-y-2">
        {menu.map((m, i) => {
          const r = options.find((o) => String(o._id) === m.recipe);
          return (
            <div key={i} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
              <Field label={i === 0 ? 'Dish' : ''} htmlFor={`dish-${i}`}>
                <select id={`dish-${i}`} className={inputClass} value={m.recipe} onChange={(e) => update(i, { recipe: e.target.value })}>
                  {options.map((o) => <option key={o._id} value={o._id}>{o.name}{o.yield_unit ? ` (${o.yield_unit})` : ''}</option>)}
                </select>
              </Field>
              <Field label={i === 0 ? `Amount ${per}` : ''} htmlFor={`per-${i}`}>
                <NumberInput id={`per-${i}`} value={m.per_unit} step={0.5} onChange={(v) => update(i, { per_unit: v })} suffix={r?.yield_unit?.slice(0, 6)} />
              </Field>
              <button type="button" className={btnGhost} aria-label={`Remove ${r?.name ?? 'dish'}`} onClick={() => set({ menu: menu.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>
      <button type="button" className={btnSecondary} disabled={!options.length} onClick={() => set({ menu: [...menu, { recipe: options[0]._id, per_unit: 1 }] })}><Plus size={14} /> Add dish</button>
    </div>
  );
}

function DishesStep({ input, set, canCosts }: { input: KitchenJobInput; set: (p: Partial<KitchenJobInput>) => void; canCosts: boolean }) {
  const recipes = useKitchenRecipes();
  const lines = input.bill_lines ?? [];
  const options = recipes.data ?? [];
  const update = (i: number, patch: Partial<KitchenBillLine>) => set({ bill_lines: lines.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Add what the customer is buying. Link a dish to a recipe so its cost is tracked.</p>
      {lines.map((b, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_5rem_8rem_auto] sm:items-end sm:border-0 sm:p-0">
          <Field label={i === 0 ? 'Recipe' : ''} htmlFor={`rec-${i}`}>
            <select
              id={`rec-${i}`}
              className={inputClass}
              value={b.recipe ?? ''}
              onChange={(e) => {
                const r = options.find((o) => o._id === e.target.value);
                const suggested = canCosts && r?.price_at_100_markup ? Math.ceil(r.price_at_100_markup / 50) * 50 : undefined;
                update(i, { recipe: e.target.value || null, desc: b.desc || r?.name || '', ...(suggested && !b.unit_price ? { unit_price: suggested } : {}) });
              }}
            >
              <option value="">Not linked</option>
              {options.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label={i === 0 ? 'Name on the bill' : ''} htmlFor={`desc-${i}`}><input id={`desc-${i}`} className={inputClass} value={b.desc} onChange={(e) => update(i, { desc: e.target.value })} maxLength={200} /></Field>
          <Field label={i === 0 ? 'Qty' : ''} htmlFor={`qty-${i}`}><NumberInput id={`qty-${i}`} value={b.qty} onChange={(v) => update(i, { qty: Math.max(0, v) })} /></Field>
          <Field label={i === 0 ? 'Unit price' : ''} htmlFor={`up-${i}`}><MoneyInput id={`up-${i}`} value={b.unit_price} onChange={(v) => update(i, { unit_price: v })} /></Field>
          <button type="button" className={btnGhost} aria-label="Remove line" onClick={() => set({ bill_lines: lines.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" className={btnSecondary} onClick={() => set({ bill_lines: [...lines, { desc: '', qty: 1, unit_price: 0, recipe: null }] })}><Plus size={14} /> Add item</button>
    </div>
  );
}

function CostsStep({ input, set }: { input: KitchenJobInput; set: (p: Partial<KitchenJobInput>) => void }) {
  const overheads = input.overheads ?? [];
  const labour = input.labour ?? [];
  const per = MODE_LABELS[input.mode ?? 'packs'].per;
  const chef = input.mode === 'chef';
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Packaging & job costs</h3>
        {overheads.map((o, i) => (
          <div key={i} className="grid grid-cols-[1fr_5rem_7rem_8rem_auto] items-end gap-2">
            <Field label={i === 0 ? 'Item' : ''} htmlFor={`oh-${i}`}><input id={`oh-${i}`} className={inputClass} value={o.name} onChange={(e) => set({ overheads: overheads.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} /></Field>
            <Field label={i === 0 ? 'Qty' : ''} htmlFor={`ohq-${i}`}><NumberInput id={`ohq-${i}`} value={o.qty} step={0.5} onChange={(v) => set({ overheads: overheads.map((x, j) => (j === i ? { ...x, qty: v } : x)) })} /></Field>
            <Field label={i === 0 ? 'Charged' : ''} htmlFor={`ohp-${i}`}>
              <select id={`ohp-${i}`} className={inputClass} value={o.per} onChange={(e) => set({ overheads: overheads.map((x, j) => (j === i ? { ...x, per: e.target.value as 'unit' | 'job' } : x)) })}>
                <option value="unit">{per}</option>
                <option value="job">per job</option>
              </select>
            </Field>
            <Field label={i === 0 ? 'Unit cost' : ''} htmlFor={`ohc-${i}`}><MoneyInput id={`ohc-${i}`} value={o.unit_cost} onChange={(v) => set({ overheads: overheads.map((x, j) => (j === i ? { ...x, unit_cost: v } : x)) })} /></Field>
            <button type="button" className={btnGhost} aria-label={`Remove ${o.name}`} onClick={() => set({ overheads: overheads.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className={btnSecondary} onClick={() => set({ overheads: [...overheads, { name: '', qty: 1, unit_cost: 0, per: 'job' }] })}><Plus size={14} /> Add cost</button>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{chef ? 'Chef fees' : 'Extra contract labour'}</h3>
        {labour.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_5rem_5rem_8rem_auto] items-end gap-2">
            <Field label={i === 0 ? 'Role' : ''} htmlFor={`lb-${i}`}><input id={`lb-${i}`} className={inputClass} value={l.role} onChange={(e) => set({ labour: labour.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) })} /></Field>
            <Field label={i === 0 ? 'People' : ''} htmlFor={`lbp-${i}`}><NumberInput id={`lbp-${i}`} value={l.people} onChange={(v) => set({ labour: labour.map((x, j) => (j === i ? { ...x, people: v } : x)) })} /></Field>
            <Field label={i === 0 ? 'Days' : ''} htmlFor={`lbd-${i}`}><NumberInput id={`lbd-${i}`} value={l.days} step={0.5} onChange={(v) => set({ labour: labour.map((x, j) => (j === i ? { ...x, days: v } : x)) })} /></Field>
            <Field label={i === 0 ? 'Rate per day' : ''} htmlFor={`lbr-${i}`}><MoneyInput id={`lbr-${i}`} value={l.rate} onChange={(v) => set({ labour: labour.map((x, j) => (j === i ? { ...x, rate: v } : x)) })} /></Field>
            <button type="button" className={btnGhost} aria-label={`Remove ${l.role}`} onClick={() => set({ labour: labour.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className={btnSecondary} onClick={() => set({ labour: [...labour, { role: '', people: 1, days: 1, rate: 0 }] })}><Plus size={14} /> Add {chef ? 'fee' : 'labour'}</button>
      </section>

      {!chef && (
        <section className="space-y-2 rounded-md border p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={input.include_running_costs ?? true} onChange={(e) => set({ include_running_costs: e.target.checked })} />
            Include the outlet&apos;s running costs (power, gas, water, rent, salaries)
          </label>
          <Field label="Kitchen days (when running costs are shared per day)" htmlFor="ops-days" className="max-w-xs">
            <NumberInput id="ops-days" value={input.ops_days} step={0.5} onChange={(v) => set({ ops_days: v })} />
          </Field>
        </section>
      )}
    </div>
  );
}

type Ticket = ReturnType<typeof useJobCosting>;

function PriceStep({ input, set, ticket, canCosts }: { input: KitchenJobInput; set: (p: Partial<KitchenJobInput>) => void; ticket: Ticket; canCosts: boolean }) {
  const c = ticket.costing;
  const per = MODE_LABELS[input.mode ?? 'packs'].per;
  if (input.mode === 'chef') {
    return <p className="text-sm text-muted-foreground">Private chef jobs leave out food (the client buys it) and add the service charge to fees and transport. The price is {naira(c?.price)}.</p>;
  }
  const options = c?.options ?? [];
  const cards: { method: PricingMethod; label: string; hint: string }[] = [
    { method: 'markup', label: 'Markup on cost', hint: `${c?.markup_pct ?? '—'}% on top of full cost` },
    { method: 'food_cost', label: 'Food cost %', hint: 'Food is the target share of the price' },
    { method: 'test_price', label: 'Test a price', hint: 'Try your own price and see the profit' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => {
          const o = options?.find((x) => x.method === card.method);
          const active = (input.pricing_method ?? 'markup') === card.method;
          return (
            <div key={card.method} className={cn('rounded-md border p-4', active && 'border-primary ring-1 ring-primary')}>
              <button type="button" className="w-full text-left" aria-pressed={active} onClick={() => set({ pricing_method: card.method })}>
                <span className="flex items-center justify-between text-sm font-semibold">{card.label} {active && <Check size={14} className="text-primary" />}</span>
                <span className="block text-xs text-muted-foreground">{card.hint}</span>
                {card.method !== 'test_price' && <span className="mt-2 block text-xl font-bold tabular-nums">{naira(o?.price_per_unit)} <span className="text-xs font-normal text-muted-foreground">{per}</span></span>}
              </button>
              {card.method === 'markup' && (
                <Field label="Markup for this job (blank = default)" htmlFor="mk" className="mt-2">
                  <NumberInput id="mk" value={input.markup_override ?? undefined} onChange={(v) => set({ markup_override: v || null })} suffix="%" />
                </Field>
              )}
              {card.method === 'test_price' && (
                <Field label={`Price ${per}`} htmlFor="tp" className="mt-2">
                  <MoneyInput id="tp" value={input.test_price} onChange={(v) => set({ test_price: v || null, pricing_method: 'test_price' })} />
                </Field>
              )}
              {canCosts && o && o.price_per_unit > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-1 text-xs">
                  <dt className="text-muted-foreground">Total</dt><dd className="text-right tabular-nums">{naira(o.revenue)}</dd>
                  <dt className="text-muted-foreground">Profit</dt><dd className={cn('text-right tabular-nums', o.profit < 0 && 'text-destructive')}>{naira(o.profit)}</dd>
                  <dt className="text-muted-foreground">Margin</dt><dd className="text-right tabular-nums">{pct(o.margin)}</dd>
                  <dt className="text-muted-foreground">Food cost</dt><dd className="text-right tabular-nums">{pct(o.food_cost_pct)}</dd>
                </dl>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Prices round up to the nearest step set in Settings. The server re-checks every price when you save.</p>
    </div>
  );
}

function ReviewStep({ input, set, ticket, quick }: { input: KitchenJobInput; set: (p: Partial<KitchenJobInput>) => void; ticket: Ticket; quick: boolean }) {
  return (
    <div className="space-y-4">
      {!quick && (
        <Field label="Name on the bill" htmlFor="bill-name" hint="Renames the bill line, e.g. “100 lunch packs”.">
          <input id="bill-name" className={inputClass} value={input.title ?? ''} onChange={(e) => set({ title: e.target.value })} maxLength={160} />
        </Field>
      )}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-2 text-left">Item</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-right">Price</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
          <tbody className="divide-y">
            {ticket.bill.map((b, i) => (
              <tr key={i}><td className="px-4 py-2">{b.desc || <span className="italic text-muted-foreground">Unnamed</span>}</td><td className="px-4 py-2 text-right tabular-nums">{b.qty}</td><td className="px-4 py-2 text-right tabular-nums">{naira(b.unit_price)}</td><td className="px-4 py-2 text-right tabular-nums">{naira(b.qty * b.unit_price)}</td></tr>
            ))}
            {!ticket.bill.length && <tr><td colSpan={4} className="px-4 py-6 text-center italic text-muted-foreground">Nothing priced yet.</td></tr>}
          </tbody>
          <tfoot className="border-t"><tr><td colSpan={3} className="px-4 py-2 font-semibold">Total</td><td className="px-4 py-2 text-right font-bold tabular-nums">{naira(ticket.total)}</td></tr></tfoot>
        </table>
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between"><dt className="text-muted-foreground">Customer</dt><dd>{input.customer_name || '—'}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd>{input.phone || '—'}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Channel</dt><dd>{input.channel}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Due</dt><dd>{input.due_at ? new Date(input.due_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }) : '—'}</dd></div>
      </dl>
    </div>
  );
}

function PriceTicket({ ticket, input, canCosts }: { ticket: Ticket; input: KitchenJobInput; canCosts: boolean }) {
  const c = ticket.costing;
  const per = MODE_LABELS[input.mode ?? 'packs'].per;
  const warnings = c?.warnings ?? [];
  const content = (
      <>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Price</p>
        <p className="text-3xl font-bold tabular-nums" aria-live="polite">{naira(ticket.total)}</p>
        {!!c?.price_per_unit && !input.custom_bill && <p className="text-sm text-muted-foreground">{naira(c.price_per_unit)} {per}</p>}
        {canCosts && c?.cost != null && (
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Cost</dt><dd className="tabular-nums">{naira(c.cost)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Profit</dt><dd className={cn('tabular-nums', (c.profit ?? 0) < 0 && 'text-destructive')}>{naira(c.profit)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Margin</dt><dd className="tabular-nums">{pct(c.margin)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Food cost</dt><dd className="tabular-nums">{pct(c.food_cost_pct)}</dd></div>
          </dl>
        )}
        {!!warnings.length && (
          <ul className="mt-3 space-y-1 text-xs text-amber-700 dark:text-amber-400" aria-live="polite">
            {warnings.map((w) => <li key={w.code} className="flex gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {w.message}</li>)}
          </ul>
        )}
        {ticket.loading && <p className="mt-2 text-xs text-muted-foreground">Updating…</p>}
      </>
  );
  return (
    <>
      <aside className="hidden w-72 shrink-0 border-l bg-muted/20 p-5 lg:block" aria-label="Price ticket">{content}</aside>
      <div className="flex items-center justify-between border-t bg-muted/20 px-6 py-3 lg:hidden" aria-label="Price">
        <span className="text-sm text-muted-foreground">Price{c?.price_per_unit && !input.custom_bill ? ` · ${naira(c.price_per_unit)} ${per}` : ''}</span>
        <span className="text-lg font-bold tabular-nums">{naira(ticket.total)}</span>
      </div>
    </>
  );
}

