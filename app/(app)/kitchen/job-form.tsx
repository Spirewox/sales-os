'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PanelSkeleton } from '@/components/ui/loading-skeletons';
import { EntityDrawer, FormSection, FormSheet } from '@/components/app';
import { usePermissions } from '@/hooks/use-permissions';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { useCreateKitchenJob, useKitchenJob, useKitchenJobAction, useUpdateKitchenJob } from '@/hooks/use-kitchen';
import type { KitchenMode } from '@/lib/kitchen-costing';
import { isEditableStage, MODE_LABELS, type KitchenJob, type KitchenJobInput, type KitchenLabourLine, type KitchenOverheadLine } from '@/lib/kitchen-types';
import { btnGhost, btnSecondary } from './kitchen-ui';
import { useJobCosting } from './use-job-costing';
import { BillPreview, CostingWarnings, CostsFields, CustomerFields, DishesFields, MenuFields, PriceFields, ServiceFields, TicketLine } from './job-form-sections';

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
      <EntityDrawer title={existing.isError ? 'Job unavailable' : 'Loading job…'} onClose={onClose}>
        {existing.isError ? <p className="text-sm text-destructive">{existing.error.message}</p> : <PanelSkeleton label="Loading job…" />}
      </EntityDrawer>
    );
  }
  return <JobFormInner mode={mode} job={existing.data} hubScope={hubScope} onClose={onClose} onSaved={onSaved} />;
}

function JobFormInner({ mode, job, hubScope, onClose, onSaved }: { mode: JobFormMode; job?: KitchenJob; hubScope: HubScopeFilter; onClose: () => void; onSaved: (id: string) => void }) {
  const { can } = usePermissions();
  const canCosts = can('kitchen.view_costs');
  const quick = mode === 'quick' || (mode === 'edit' && !!job?.custom_bill && !job.menu.length);
  // In the kitchen or ready: the menu and prices are locked, but customer and delivery details can still change.
  const detailsOnly = mode === 'edit' && !!job && !isEditableStage(job.stage);
  const [input, setInput] = useState<KitchenJobInput>(() => (job ? fromJob(job) : blankInput(mode, hubScope.defaultHubId)));
  const [touchedCosts, setTouchedCosts] = useState(!!job);
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
  const title = detailsOnly ? `Edit details: ${job?.code}` : mode === 'edit' ? `Edit ${job?.code}` : quick ? 'Quick order' : 'New job';
  const description = detailsOnly
    ? 'The menu and price are locked once cooking starts. Customer and delivery details can still change.'
    : quick
    ? 'Type what the customer is buying and confirm it to the board.'
    : 'Choose the service, then the customer, menu and price.';

  // The primary action confirms to the board; editing a job already in the kitchen just saves.
  const primary: { label: string; then: 'draft' | 'confirm'; blocker: string | null } =
    mode === 'edit' && !isDraftish ? { label: 'Save changes', then: 'draft', blocker: null } : { label: mode === 'edit' ? 'Save and confirm order' : 'Confirm order', then: 'confirm', blocker: confirmBlocker };

  // FormSheet has one submit button; the other saves sit beside the price in its footer line.
  const secondary = (
    <span className="flex flex-wrap items-center gap-2">
      {mode === 'edit' ? (
        isDraftish && <button type="button" className={btnSecondary} disabled={saving} onClick={() => void save('draft')}>Save changes</button>
      ) : (
        <>
          <button type="button" className={btnGhost} disabled={saving || noOutlet} onClick={() => void save('draft')}>Save draft</button>
          {!quick && <button type="button" className={btnSecondary} disabled={saving || noOutlet || !(ticket.total > 0)} onClick={() => void save('quote')}>Save as quote</button>}
        </>
      )}
    </span>
  );

  return (
    <FormSheet
      title={title}
      description={description}
      onClose={onClose}
      onSubmit={() => void save(primary.then)}
      submitLabel={primary.label}
      submitting={saving}
      disabledReason={primary.blocker}
      width="lg"
      preview={
        <span className="flex flex-wrap items-center justify-between gap-2">
          {detailsOnly ? <span /> : <TicketLine ticket={ticket} input={input} canCosts={canCosts} />}
          {secondary}
        </span>
      }
    >
      {!quick && !detailsOnly && (
        <FormSection title="Service" description="How the job is priced. Packaging and labour defaults follow the service.">
          <ServiceFields input={input} set={set} setMode={setMode} />
        </FormSection>
      )}

      <FormSection title={quick || detailsOnly ? 'Customer and delivery' : 'Customer'}>
        <CustomerFields input={input} set={set} hubScope={hubScope} lockedHub={!!job} />
      </FormSection>

      {!detailsOnly && (quick ? (
        <FormSection title="Dishes" description="Add what the customer is buying. Link a dish to a recipe so its cost is tracked.">
          <DishesFields input={input} set={set} canCosts={canCosts} />
        </FormSection>
      ) : (
        <FormSection title="Menu" description={`Pick each dish and how many portions (scoops, pieces, wraps) go ${MODE_LABELS[input.mode ?? 'packs'].per}.`}>
          <MenuFields input={input} set={set} />
        </FormSection>
      ))}

      {!detailsOnly && !quick && canCosts && (
        <FormSection title="Packaging and costs" optional description="Defaults for the service are filled in. Add unit costs to price the job fully.">
          <CostsFields input={input} set={(p) => { setTouchedCosts(true); set(p); }} />
        </FormSection>
      )}

      {!detailsOnly && !quick && (
        <FormSection title="Price">
          <PriceFields input={input} set={set} ticket={ticket} canCosts={canCosts} />
        </FormSection>
      )}

      {!detailsOnly && (
        <FormSection title="Bill">
          <CostingWarnings ticket={ticket} />
          <BillPreview input={input} ticket={ticket} />
        </FormSection>
      )}
    </FormSheet>
  );
}
