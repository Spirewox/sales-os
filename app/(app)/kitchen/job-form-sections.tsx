'use client';

import { useId, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, ChefHat, Plus, Trash2, UserPlus } from 'lucide-react';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { useCreateKitchenCustomer, useKitchenCustomerSearch, useKitchenRecipes } from '@/hooks/use-kitchen';
import { EmptyState } from '@/components/app';
import type { KitchenMode, PricingMethod } from '@/lib/kitchen-costing';
import { cn } from '@/lib/utils';
import { KITCHEN_CHANNELS, MODE_LABELS, naira, pct, type KitchenBillLine, type KitchenJobInput } from '@/lib/kitchen-types';
import { btnGhost, btnSecondary, Field, inputClass, labelClass, MoneyInput, NumberInput, RowField } from './kitchen-ui';
import type { useJobCosting } from './use-job-costing';

export type Ticket = ReturnType<typeof useJobCosting>;
type SetInput = (p: Partial<KitchenJobInput>) => void;

const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** A labelled row of toggle buttons (channel, pickup or delivery). */
function ChoiceGroup({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      <span id={id} className={cn(labelClass, 'block')}>{label}</span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

const choice = (active: boolean) => cn('h-8 rounded-md border px-2.5 text-xs font-medium', active ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:bg-muted');

export function ServiceFields({ input, set, setMode }: { input: KitchenJobInput; set: SetInput; setMode: (m: KitchenMode) => void }) {
  return (
    <>
      <div role="group" aria-label="Service" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(MODE_LABELS) as KitchenMode[]).map((m) => (
          <button key={m} type="button" aria-pressed={input.mode === m} onClick={() => setMode(m)}
            className={cn('rounded-md border p-3 text-left text-sm', input.mode === m ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card hover:bg-muted')}>
            <span className="font-medium">{MODE_LABELS[m].label}</span>
            <span className="block text-xs text-muted-foreground">Priced {MODE_LABELS[m].per}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`How many ${MODE_LABELS[input.mode ?? 'packs'].unit.toLowerCase()}?`} htmlFor="count"><NumberInput id="count" value={input.count} onChange={(v) => set({ count: Math.max(0, Math.round(v)) })} /></Field>
        <Field label="Job name (shown on the bill)" htmlFor="title" hint="e.g. 100 office lunch packs"><input id="title" className={inputClass} value={input.title ?? ''} onChange={(e) => set({ title: e.target.value })} maxLength={160} /></Field>
      </div>
    </>
  );
}

export function CustomerFields({ input, set, hubScope, lockedHub }: { input: KitchenJobInput; set: SetInput; hubScope: HubScopeFilter; lockedHub: boolean }) {
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
    <>
      {linked ? (
        <div className="flex items-center justify-between rounded-md border bg-primary/5 p-3 text-sm">
          <span><span className="font-medium">{input.customer_name}</span>, {input.phone} <span className="ml-1 text-xs text-muted-foreground">(linked to Customers)</span></span>
          <button type="button" className={btnGhost} onClick={() => set({ customer_id: null })}>Unlink</button>
        </div>
      ) : (
        <div className="relative">
          <label htmlFor="cust-search" className={labelClass}>Find an existing customer</label>
          <input id="cust-search" className={cn(inputClass, 'mt-1.5')} placeholder="Name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
          {search.trim().length >= 2 && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-card text-sm shadow-lg" role="listbox" aria-label="Matching customers">
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
                    <span className="font-medium">{c.customer_name}</span>, <span className="text-muted-foreground">{c.customer_phone}{c.company_name ? `, ${c.company_name}` : ''}</span>
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
            <UserPlus size={14} aria-hidden /> Save to Customers
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ChoiceGroup label="Channel">
          {KITCHEN_CHANNELS.map((c) => (
            <button key={c} type="button" aria-pressed={input.channel === c} onClick={() => set({ channel: c })} className={choice(input.channel === c)}>{c}</button>
          ))}
        </ChoiceGroup>
        <ChoiceGroup label="Pickup or delivery">
          {(['pickup', 'delivery'] as const).map((f) => (
            <button key={f} type="button" aria-pressed={input.fulfilment === f} onClick={() => set({ fulfilment: f })} className={cn(choice(input.fulfilment === f), 'flex-1')}>{f === 'pickup' ? 'Pickup' : 'Delivery'}</button>
          ))}
        </ChoiceGroup>
        {input.fulfilment === 'delivery' && (
          <Field label="Delivery address" htmlFor="addr" className="sm:col-span-2"><input id="addr" className={inputClass} value={input.address ?? ''} onChange={(e) => set({ address: e.target.value })} maxLength={400} /></Field>
        )}
        <Field label="Due" htmlFor="due">
          <input id="due" type="datetime-local" className={inputClass} value={toLocalInput(input.due_at)} onChange={(e) => set({ due_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {([['In 1h', 1], ['In 3h', 3], ['Tomorrow 12:00', 'tomorrow']] as const).map(([label, h]) => (
              <button key={label} type="button" className="rounded-md border bg-card px-2 py-0.5 text-xs hover:bg-muted" onClick={() => quickDue(h)}>{label}</button>
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
      </div>

      <Field label="Kitchen notes" htmlFor="notes"><textarea id="notes" className={cn(inputClass, 'h-20 py-2')} value={input.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} maxLength={2000} placeholder="Allergies, packaging, timing…" /></Field>
    </>
  );
}

function NoRecipes() {
  return (
    <EmptyState
      size="compact"
      icon={<ChefHat />}
      title="No recipes yet"
      description="Add recipes in the Recipes tab so dishes can be costed. For a one-off order, use Quick order and type the dishes with their prices."
    />
  );
}

export function MenuFields({ input, set }: { input: KitchenJobInput; set: SetInput }) {
  const recipes = useKitchenRecipes();
  const menu = input.menu ?? [];
  const per = MODE_LABELS[input.mode ?? 'packs'].per;
  const options = recipes.data ?? [];
  const update = (i: number, patch: Partial<(typeof menu)[number]>) => set({ menu: menu.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  return (
    <>
      {recipes.isPending && <p className="text-sm text-muted-foreground">Loading recipes…</p>}
      {recipes.data && !options.length && <NoRecipes />}
      <div className="space-y-2">
        {menu.map((m, i) => {
          const r = options.find((o) => String(o._id) === m.recipe);
          return (
            <div key={i} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
              <RowField index={i} noun="Dish" label="Dish" htmlFor={`dish-${i}`}>
                <select id={`dish-${i}`} className={inputClass} value={m.recipe} onChange={(e) => update(i, { recipe: e.target.value })}>
                  {options.map((o) => <option key={o._id} value={o._id}>{o.name}{o.yield_unit ? ` (${o.yield_unit})` : ''}</option>)}
                </select>
              </RowField>
              <RowField index={i} noun="Dish" label={`Amount ${per}`} htmlFor={`per-${i}`}>
                <NumberInput id={`per-${i}`} value={m.per_unit} step={0.5} onChange={(v) => update(i, { per_unit: v })} suffix={r?.yield_unit?.slice(0, 6)} />
              </RowField>
              <button type="button" className={btnGhost} aria-label={`Remove dish ${i + 1}${r ? `, ${r.name}` : ''}`} onClick={() => set({ menu: menu.filter((_, j) => j !== i) })}><Trash2 size={14} aria-hidden /></button>
            </div>
          );
        })}
      </div>
      <button type="button" className={btnSecondary} disabled={!options.length} onClick={() => set({ menu: [...menu, { recipe: options[0]._id, per_unit: 1 }] })}><Plus size={14} aria-hidden /> Add dish</button>
    </>
  );
}

export function DishesFields({ input, set, canCosts }: { input: KitchenJobInput; set: SetInput; canCosts: boolean }) {
  const recipes = useKitchenRecipes();
  const lines = input.bill_lines ?? [];
  const options = recipes.data ?? [];
  const update = (i: number, patch: Partial<KitchenBillLine>) => set({ bill_lines: lines.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  return (
    <>
      {lines.map((b, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_5rem_8rem_auto] sm:items-end sm:border-0 sm:p-0">
          <RowField index={i} stacked noun="Item" label="Recipe" htmlFor={`rec-${i}`}>
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
          </RowField>
          <RowField index={i} stacked noun="Item" label="Name on the bill" htmlFor={`desc-${i}`}><input id={`desc-${i}`} className={inputClass} value={b.desc} onChange={(e) => update(i, { desc: e.target.value })} maxLength={200} /></RowField>
          <RowField index={i} stacked noun="Item" label="Qty" htmlFor={`qty-${i}`}><NumberInput id={`qty-${i}`} value={b.qty} onChange={(v) => update(i, { qty: Math.max(0, v) })} /></RowField>
          <RowField index={i} stacked noun="Item" label="Unit price" htmlFor={`up-${i}`}><MoneyInput id={`up-${i}`} value={b.unit_price} onChange={(v) => update(i, { unit_price: v })} /></RowField>
          <button type="button" className={cn(btnGhost, 'justify-self-end')} aria-label={`Remove item ${i + 1}`} onClick={() => set({ bill_lines: lines.filter((_, j) => j !== i) })}><Trash2 size={14} aria-hidden /></button>
        </div>
      ))}
      <button type="button" className={btnSecondary} onClick={() => set({ bill_lines: [...lines, { desc: '', qty: 1, unit_price: 0, recipe: null }] })}><Plus size={14} aria-hidden /> Add item</button>
    </>
  );
}

const lineRow = 'grid grid-cols-2 gap-2 rounded-md border p-3 sm:items-end sm:border-0 sm:p-0';

export function CostsFields({ input, set }: { input: KitchenJobInput; set: SetInput }) {
  const overheads = input.overheads ?? [];
  const labour = input.labour ?? [];
  const per = MODE_LABELS[input.mode ?? 'packs'].per;
  const chef = input.mode === 'chef';
  const setOh = (i: number, patch: Partial<(typeof overheads)[number]>) => set({ overheads: overheads.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const setLb = (i: number, patch: Partial<(typeof labour)[number]>) => set({ labour: labour.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const lbNoun = chef ? 'Fee' : 'Labour line';
  return (
    <>
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Packaging and job costs</h4>
        {overheads.map((o, i) => (
          <div key={i} className={cn(lineRow, 'sm:grid-cols-[1fr_5rem_7rem_8rem_auto]')}>
            <RowField index={i} stacked noun="Cost" label="Item" htmlFor={`oh-${i}`} className="col-span-2 sm:col-span-1"><input id={`oh-${i}`} className={inputClass} value={o.name} onChange={(e) => setOh(i, { name: e.target.value })} /></RowField>
            <RowField index={i} stacked noun="Cost" label="Qty" htmlFor={`ohq-${i}`}><NumberInput id={`ohq-${i}`} value={o.qty} step={0.5} onChange={(v) => setOh(i, { qty: v })} /></RowField>
            <RowField index={i} stacked noun="Cost" label="Charged" htmlFor={`ohp-${i}`}>
              <select id={`ohp-${i}`} className={inputClass} value={o.per} onChange={(e) => setOh(i, { per: e.target.value as 'unit' | 'job' })}>
                <option value="unit">{per}</option>
                <option value="job">per job</option>
              </select>
            </RowField>
            <RowField index={i} stacked noun="Cost" label="Unit cost" htmlFor={`ohc-${i}`}><MoneyInput id={`ohc-${i}`} value={o.unit_cost} onChange={(v) => setOh(i, { unit_cost: v })} /></RowField>
            <button type="button" className={cn(btnGhost, 'justify-self-end')} aria-label={`Remove cost ${i + 1}${o.name ? `, ${o.name}` : ''}`} onClick={() => set({ overheads: overheads.filter((_, j) => j !== i) })}><Trash2 size={14} aria-hidden /></button>
          </div>
        ))}
        <button type="button" className={btnSecondary} onClick={() => set({ overheads: [...overheads, { name: '', qty: 1, unit_cost: 0, per: 'job' }] })}><Plus size={14} aria-hidden /> Add cost</button>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">{chef ? 'Chef fees' : 'Extra contract labour'}</h4>
        {labour.map((l, i) => (
          <div key={i} className={cn(lineRow, 'sm:grid-cols-[1fr_5rem_5rem_8rem_auto]')}>
            <RowField index={i} stacked noun={lbNoun} label="Role" htmlFor={`lb-${i}`} className="col-span-2 sm:col-span-1"><input id={`lb-${i}`} className={inputClass} value={l.role} onChange={(e) => setLb(i, { role: e.target.value })} /></RowField>
            <RowField index={i} stacked noun={lbNoun} label="People" htmlFor={`lbp-${i}`}><NumberInput id={`lbp-${i}`} value={l.people} onChange={(v) => setLb(i, { people: v })} /></RowField>
            <RowField index={i} stacked noun={lbNoun} label="Days" htmlFor={`lbd-${i}`}><NumberInput id={`lbd-${i}`} value={l.days} step={0.5} onChange={(v) => setLb(i, { days: v })} /></RowField>
            <RowField index={i} stacked noun={lbNoun} label="Rate per day" htmlFor={`lbr-${i}`}><MoneyInput id={`lbr-${i}`} value={l.rate} onChange={(v) => setLb(i, { rate: v })} /></RowField>
            <button type="button" className={cn(btnGhost, 'justify-self-end')} aria-label={`Remove ${lbNoun.toLowerCase()} ${i + 1}${l.role ? `, ${l.role}` : ''}`} onClick={() => set({ labour: labour.filter((_, j) => j !== i) })}><Trash2 size={14} aria-hidden /></button>
          </div>
        ))}
        <button type="button" className={btnSecondary} onClick={() => set({ labour: [...labour, { role: '', people: 1, days: 1, rate: 0 }] })}><Plus size={14} aria-hidden /> Add {chef ? 'fee' : 'labour'}</button>
      </div>

      {!chef && (
        <div className="space-y-2 rounded-lg border p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={input.include_running_costs ?? true} onChange={(e) => set({ include_running_costs: e.target.checked })} />
            Include the outlet&apos;s running costs (power, gas, water, rent, salaries)
          </label>
          <Field label="Kitchen days (when running costs are shared per day)" htmlFor="ops-days" className="max-w-xs">
            <NumberInput id="ops-days" value={input.ops_days} step={0.5} onChange={(v) => set({ ops_days: v })} />
          </Field>
        </div>
      )}
    </>
  );
}

export function PriceFields({ input, set, ticket, canCosts }: { input: KitchenJobInput; set: SetInput; ticket: Ticket; canCosts: boolean }) {
  const c = ticket.costing;
  const per = MODE_LABELS[input.mode ?? 'packs'].per;
  if (input.mode === 'chef') {
    return <p className="text-sm text-muted-foreground">Private chef jobs leave out food (the client buys it) and add the service charge to fees and transport. The price is {naira(c?.price)}.</p>;
  }
  const options = c?.options ?? [];
  const cards: { method: PricingMethod; label: string; hint: string }[] = [
    { method: 'markup', label: 'Markup on cost', hint: `${c?.markup_pct ?? '-'}% on top of full cost` },
    { method: 'food_cost', label: 'Food cost %', hint: 'Food is the target share of the price' },
    { method: 'test_price', label: 'Test a price', hint: 'Try your own price and see the profit' },
  ];
  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => {
          const o = options?.find((x) => x.method === card.method);
          const active = (input.pricing_method ?? 'markup') === card.method;
          return (
            <div key={card.method} className={cn('rounded-xl border p-4', active && 'border-primary ring-1 ring-primary')}>
              <button type="button" className="w-full rounded-md text-left" aria-pressed={active} onClick={() => set({ pricing_method: card.method })}>
                <span className="flex items-center justify-between text-sm font-semibold">{card.label} {active && <Check size={14} aria-hidden className="text-primary" />}</span>
                <span className="block text-xs text-muted-foreground">{card.hint}</span>
                {card.method !== 'test_price' && <span className="mt-2 block text-xl font-semibold tabular-nums">{naira(o?.price_per_unit)} <span className="text-xs font-normal text-muted-foreground">{per}</span></span>}
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
    </>
  );
}

export function CostingWarnings({ ticket }: { ticket: Ticket }) {
  const warnings = ticket.costing?.warnings ?? [];
  if (!warnings.length) return null;
  return (
    <ul className="space-y-1 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm text-warning" aria-live="polite">
      {warnings.map((w) => <li key={w.code} className="flex gap-1.5"><AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0" /> {w.message}</li>)}
    </ul>
  );
}

export function BillPreview({ input, ticket }: { input: KitchenJobInput; ticket: Ticket }) {
  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-2 text-left font-medium">Item</th><th className="px-4 py-2 text-right font-medium">Qty</th><th className="px-4 py-2 text-right font-medium">Price</th><th className="px-4 py-2 text-right font-medium">Amount</th></tr></thead>
          <tbody className="divide-y">
            {ticket.bill.map((b, i) => (
              <tr key={i}><td className="px-4 py-2">{b.desc || <span className="text-muted-foreground">Unnamed</span>}</td><td className="px-4 py-2 text-right tabular-nums">{b.qty}</td><td className="px-4 py-2 text-right tabular-nums">{naira(b.unit_price)}</td><td className="px-4 py-2 text-right tabular-nums">{naira(b.qty * b.unit_price)}</td></tr>
            ))}
            {!ticket.bill.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Nothing priced yet. Add dishes above to build the bill.</td></tr>}
          </tbody>
          <tfoot className="border-t"><tr><td colSpan={3} className="px-4 py-2 font-semibold">Total</td><td className="px-4 py-2 text-right font-semibold tabular-nums">{naira(ticket.total)}</td></tr></tfoot>
        </table>
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Customer</dt><dd className="truncate">{input.customer_name || '-'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Phone</dt><dd>{input.phone || '-'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Channel</dt><dd>{input.channel}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Due</dt><dd>{input.due_at ? new Date(input.due_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }) : '-'}</dd></div>
      </dl>
    </>
  );
}

/** One line for the sticky footer: price, and cost and profit for people who can see them. */
export function TicketLine({ ticket, input, canCosts }: { ticket: Ticket; input: KitchenJobInput; canCosts: boolean }) {
  const c = ticket.costing;
  const per = MODE_LABELS[input.mode ?? 'packs'].per;
  return (
    <span aria-live="polite" className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <span>Price <span className="text-base font-semibold text-foreground">{naira(ticket.total)}</span></span>
      {!!c?.price_per_unit && !input.custom_bill && <span>{naira(c.price_per_unit)} {per}</span>}
      {canCosts && c?.cost != null && (
        <>
          <span>Cost {naira(c.cost)}</span>
          <span className={cn((c.profit ?? 0) < 0 && 'text-destructive')}>Profit {naira(c.profit)} ({pct(c.margin)})</span>
        </>
      )}
      {ticket.loading && <span>Updating…</span>}
    </span>
  );
}
