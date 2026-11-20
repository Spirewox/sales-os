'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Archive, Carrot, Plus } from 'lucide-react';
import { FilterSelect } from '@/components/filter-select';
import { SubmitButton } from '@/components/submit-button';
import { DataTable, EmptyState, FilterBar, FormSection, FormSheet, StatusBadge, type Column, type FilterChip } from '@/components/app';
import { usePermissions } from '@/hooks/use-permissions';
import { useArchiveKitchenIngredient, useBulkKitchenPrices, useKitchenIngredients, useSaveKitchenIngredient } from '@/hooks/use-kitchen';
import { cn } from '@/lib/utils';
import { naira, type KitchenIngredient } from '@/lib/kitchen-types';
import { btnDanger, btnPrimary, btnSecondary, ErrorPanel, Field, inputClass, MoneyInput, NumberInput } from './kitchen-ui';

const FILTER_OPTIONS = [{ value: 'all', label: 'All ingredients' }, { value: 'no_price', label: 'No price' }, { value: 'stale', label: 'Price older than 30 days' }];

type Filter = '' | 'no_price' | 'stale';
const UNITS = ['kg', 'L', 'pc', 'pack', 'g', 'ml'] as const;
const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / 864e5) : null);

export function KitchenIngredients({ initialFilter = '' }: { initialFilter?: Filter }) {
  const { can } = usePermissions();
  const canEdit = can('kitchen.manage_pricing');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const list = useKitchenIngredients({ q: q.trim() || undefined, filter });
  const rows = useMemo(() => list.data ?? [], [list.data]);
  const [editing, setEditing] = useState<KitchenIngredient | 'new' | null>(null);
  const [bulk, setBulk] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const bulkSave = useBulkKitchenPrices();
  const changed = useMemo(() => Object.entries(prices).filter(([id, p]) => rows.find((r) => r._id === id)?.pack_price !== p), [prices, rows]);
  const filterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label;
  const chips: FilterChip[] = [
    ...(filter ? [{ key: 'filter', label: filterLabel ?? filter, onRemove: () => setFilter('') }] : []),
    ...(q.trim() ? [{ key: 'q', label: `"${q.trim()}"`, onRemove: () => setQ('') }] : []),
  ];

  const columns: Column<KitchenIngredient>[] = [
    {
      id: 'name',
      header: 'Ingredient',
      mobile: 'title',
      sortValue: (i) => i.name.toLowerCase(),
      cell: (i) => (
        <span className="block">
          <span className="block font-medium">{i.name}</span>
          <span className="block text-xs font-normal text-muted-foreground">{i.category || '-'}{i.from_fudfarmer_stock ? ', Fudfarmer stock' : ''}</span>
        </span>
      ),
    },
    { id: 'pack', header: 'Pack', mobile: 'subtitle', cell: (i) => <span className="tabular-nums">{i.pack_label || `${i.pack_qty} ${i.unit}`}</span> },
    {
      id: 'price',
      header: 'Pack price',
      align: 'right',
      mobile: 'value',
      sortValue: (i) => i.pack_price,
      cell: (i) =>
        bulk ? (
          <MoneyInput ariaLabel={`Pack price for ${i.name}`} className="ml-auto w-36" value={prices[i._id] ?? i.pack_price} onChange={(v) => setPrices((p) => ({ ...p, [i._id]: v }))} />
        ) : i.pack_price > 0 ? (
          naira(i.pack_price)
        ) : (
          <StatusBadge tone="warning">No price</StatusBadge>
        ),
    },
    { id: 'unit', header: 'Unit cost', align: 'right', mobile: 'meta', sortValue: (i) => i.unit_cost ?? null, cell: (i) => (i.unit_cost != null ? `${naira(i.unit_cost)} / ${i.unit}` : '-') },
    {
      id: 'date',
      header: 'Price date',
      mobile: 'meta',
      sortValue: (i) => i.price_date ?? '',
      cell: (i) => {
        const age = daysSince(i.price_date);
        const stale = age != null && age > 30;
        return (
          <span className={cn('whitespace-nowrap', stale && 'font-medium text-warning')}>
            {i.price_date ? new Date(i.price_date).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' }) : '-'}
            {stale && <span className="ml-1 text-xs font-normal">({age} days old)</span>}
          </span>
        );
      },
    },
    { id: 'source', header: 'Source', hideBelow: 'xl', cell: (i) => i.source || '-' },
  ];

  const saveBulk = () =>
    bulkSave.mutate(changed.map(([id, pack_price]) => ({ id, pack_price })), {
      onSuccess: () => { toast.success(`Updated ${changed.length} price${changed.length === 1 ? '' : 's'}`); setBulk(false); },
      onError: (e) => toast.error(e.message),
    });

  return (
    <div className="space-y-4">
      <FilterBar
        search={{ value: q, onChange: setQ, placeholder: 'Search ingredients', label: 'Search ingredients' }}
        filters={<FilterSelect ariaLabel="Price filter" value={filter || 'all'} onChange={(v) => setFilter(v === 'all' ? '' : (v as Filter))} options={FILTER_OPTIONS} className="h-9 w-auto min-w-40 data-[size=default]:h-9" />}
        chips={chips}
        onClearAll={() => { setQ(''); setFilter(''); }}
        resultLabel={list.data ? `${rows.length} ingredient${rows.length === 1 ? '' : 's'}` : undefined}
        trailing={
          canEdit &&
          (bulk ? (
            <>
              <button type="button" className={btnSecondary} onClick={() => setBulk(false)}>Cancel</button>
              <SubmitButton type="button" loading={bulkSave.isPending} disabled={!changed.length} className="h-9 px-4 text-sm" onClick={saveBulk}>
                Save {changed.length || ''} price{changed.length === 1 ? '' : 's'}
              </SubmitButton>
            </>
          ) : (
            <>
              <button type="button" className={btnSecondary} onClick={() => { setBulk(true); setPrices({}); }}>Update prices</button>
              <button type="button" className={btnPrimary} onClick={() => setEditing('new')}><Plus size={14} aria-hidden /> Add ingredient</button>
            </>
          ))
        }
      />
      {bulk && <p className="text-sm text-muted-foreground" aria-live="polite">Type the new pack prices, then save them together.</p>}

      {list.isError && <ErrorPanel message={list.error.message} onRetry={() => void list.refetch()} />}

      <DataTable
        label="Ingredients"
        columns={columns}
        rows={list.data}
        loading={list.isPending}
        getRowId={(i) => i._id}
        onRowClick={canEdit && !bulk ? (i) => setEditing(i) : undefined}
        defaultSort={{ id: 'name', dir: 'asc' }}
        pageSize={bulk ? 500 : 25}
        resetPageKey={`${q}|${filter}`}
        empty={
          chips.length ? (
            <EmptyState size="compact" title="No ingredients match" description="Clear the filters to see every ingredient." />
          ) : (
            <EmptyState
              size="compact"
              icon={<Carrot />}
              title="No ingredients yet"
              description={canEdit ? 'Add what you buy (a 50kg bag of rice, a carton of eggs) with its pack price, so recipes can be costed.' : 'Ingredients your kitchen lead adds show here.'}
              action={canEdit && <button type="button" className={btnPrimary} onClick={() => setEditing('new')}><Plus size={14} aria-hidden /> Add ingredient</button>}
            />
          )
        }
      />
      <p className="text-xs text-muted-foreground">Unit cost = pack price ÷ pack size. Prices older than 30 days are flagged. Changing a price re-costs open jobs the next time they are saved.</p>

      {editing && <IngredientDialog ingredient={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function IngredientDialog({ ingredient, onClose }: { ingredient: KitchenIngredient | null; onClose: () => void }) {
  const save = useSaveKitchenIngredient();
  const archive = useArchiveKitchenIngredient();
  const [form, setForm] = useState({
    name: ingredient?.name ?? '',
    category: ingredient?.category ?? '',
    pack_label: ingredient?.pack_label ?? '',
    pack_qty: ingredient?.pack_qty ?? 1,
    unit: ingredient?.unit ?? ('kg' as KitchenIngredient['unit']),
    pack_price: ingredient?.pack_price ?? 0,
    source: ingredient?.source ?? '',
    from_fudfarmer_stock: ingredient?.from_fudfarmer_stock ?? false,
    retail_per_unit: ingredient?.retail_per_unit ?? null,
  });
  const unitCost = form.pack_qty > 0 && form.pack_price > 0 ? form.pack_price / form.pack_qty : null;
  const history = [...(ingredient?.price_history ?? [])].reverse();

  const submit = () =>
    save.mutate(
      { id: ingredient?._id, input: { ...form, retail_per_unit: form.from_fudfarmer_stock ? form.retail_per_unit : null } },
      { onSuccess: () => { toast.success(ingredient ? 'Ingredient saved' : 'Ingredient added'); onClose(); }, onError: (err) => toast.error(err.message) },
    );

  return (
    <FormSheet
      title={ingredient ? `Edit ${ingredient.name}` : 'Add ingredient'}
      description="What you buy, its pack size and price."
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Save"
      submitting={save.isPending}
      disabledReason={!form.name.trim() ? 'Name the ingredient' : null}
      preview={unitCost != null ? <>Unit cost {naira(unitCost)} per {form.unit}</> : undefined}
    >
      <FormSection title="Ingredient">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="i-name"><input id="i-name" required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} /></Field>
          <Field label="Category" htmlFor="i-cat"><input id="i-cat" className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} /></Field>
        </div>
      </FormSection>
      <FormSection title="Pack and price">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="What you buy" htmlFor="i-pack" hint="e.g. 50kg bag, carton, 25L keg"><input id="i-pack" className={inputClass} value={form.pack_label} onChange={(e) => setForm({ ...form, pack_label: e.target.value })} maxLength={60} /></Field>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <Field label="Pack size" htmlFor="i-qty"><NumberInput id="i-qty" value={form.pack_qty} step={0.1} onChange={(v) => setForm({ ...form, pack_qty: v })} /></Field>
            <Field label="Unit" htmlFor="i-unit">
              <select id="i-unit" className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as KitchenIngredient['unit'] })}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Pack price" htmlFor="i-price" hint={unitCost != null ? `${naira(unitCost)} per ${form.unit}` : 'Set a price to cost recipes'}><MoneyInput id="i-price" value={form.pack_price} onChange={(v) => setForm({ ...form, pack_price: v })} /></Field>
          <Field label="Price source" htmlFor="i-src" hint="e.g. Price Tracker, Mile 12 market"><input id="i-src" className={inputClass} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} maxLength={120} /></Field>
        </div>
      </FormSection>
      <FormSection title="Own stock" optional defaultOpen={form.from_fudfarmer_stock} description="For protein that comes from Fudfarmer's own stock.">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.from_fudfarmer_stock} onChange={(e) => setForm({ ...form, from_fudfarmer_stock: e.target.checked })} />
          Comes from Fudfarmer&apos;s own stock (protein)
        </label>
        {form.from_fudfarmer_stock && (
          <Field label={`Fudfarmer retail price per ${form.unit}`} htmlFor="i-retail" hint="Used instead of purchase cost when Settings › protein costing is set to retail." className="max-w-xs">
            <MoneyInput id="i-retail" value={form.retail_per_unit} onChange={(v) => setForm({ ...form, retail_per_unit: v || null })} />
          </Field>
        )}
      </FormSection>
      {!!history.length && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Price history</h3>
          <ul className="divide-y rounded-lg border text-sm">
            {history.slice(0, 10).map((h, i) => (
              <li key={i} className="flex justify-between px-3 py-2">
                <span>{new Date(h.at).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}{h.source ? `, ${h.source}` : ''}</span>
                <span className="tabular-nums">{naira(h.pack_price)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {ingredient && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 p-4">
          <p className="text-sm text-muted-foreground">Recipes that use it keep the line, but it stops showing in the list.</p>
          <button
            type="button"
            className={btnDanger}
            disabled={archive.isPending}
            onClick={() => {
              if (!window.confirm(`Archive ${ingredient.name}? Recipes that use it keep the line, but it stops showing in the list.`)) return;
              archive.mutate(ingredient._id, { onSuccess: () => { toast.success('Ingredient archived'); onClose(); }, onError: (e) => toast.error(e.message) });
            }}
          >
            <Archive size={14} aria-hidden /> Archive ingredient
          </button>
        </section>
      )}
    </FormSheet>
  );
}
