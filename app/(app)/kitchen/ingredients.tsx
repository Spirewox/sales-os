'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Archive, Pencil, Plus, Search, X } from 'lucide-react';
import { ModalDialog } from '../sales/modal-dialog';
import { FilterSelect } from '@/components/filter-select';
import { SubmitButton } from '@/components/submit-button';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { usePermissions } from '@/hooks/use-permissions';
import { useArchiveKitchenIngredient, useBulkKitchenPrices, useKitchenIngredients, useSaveKitchenIngredient } from '@/hooks/use-kitchen';
import { cn } from '@/lib/utils';
import { naira, type KitchenIngredient } from '@/lib/kitchen-types';
import { btnDanger, btnPrimary, btnSecondary, EmptyRow, ErrorPanel, Field, inputClass, MoneyInput, NumberInput, td, th, thRight } from './kitchen-ui';

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
  const cols = canEdit ? 7 : 6;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" aria-label="Search ingredients" placeholder="Search ingredients…" className={`${inputClass} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <FilterSelect
          ariaLabel="Price filter"
          value={filter || 'all'}
          onChange={(v) => setFilter(v === 'all' ? '' : (v as Filter))}
          options={[{ value: 'all', label: 'All ingredients' }, { value: 'no_price', label: 'No price' }, { value: 'stale', label: 'Price older than 30 days' }]}
        />
        {canEdit && !bulk && (
          <>
            <button type="button" className={btnSecondary} onClick={() => { setBulk(true); setPrices({}); }}>Update prices</button>
            <button type="button" className={btnPrimary} onClick={() => setEditing('new')}><Plus size={14} /> Add ingredient</button>
          </>
        )}
        {bulk && (
          <>
            <button type="button" className={btnSecondary} onClick={() => setBulk(false)}>Cancel</button>
            <SubmitButton
              type="button"
              loading={bulkSave.isPending}
              disabled={!changed.length}
              className="h-9 px-4 text-sm"
              onClick={() =>
                bulkSave.mutate(changed.map(([id, pack_price]) => ({ id, pack_price })), {
                  onSuccess: () => { toast.success(`Updated ${changed.length} price${changed.length === 1 ? '' : 's'}`); setBulk(false); },
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              Save {changed.length || ''} price{changed.length === 1 ? '' : 's'}
            </SubmitButton>
          </>
        )}
      </div>

      {list.isError && <ErrorPanel message={list.error.message} onRetry={() => void list.refetch()} />}

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className={th}>Ingredient</th>
                <th className={th}>Pack</th>
                <th className={thRight}>Pack price</th>
                <th className={thRight}>Unit cost</th>
                <th className={th}>Price date</th>
                <th className={th}>Source</th>
                {canEdit && <th className="w-12" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.isPending ? (
                <tr><td colSpan={cols} className="p-0"><TableSkeleton rows={8} cols={cols} /></td></tr>
              ) : rows.length ? (
                rows.map((i) => {
                  const age = daysSince(i.price_date);
                  return (
                    <tr key={i._id}>
                      <td className={td}>
                        <p className="font-medium">{i.name}</p>
                        <p className="text-xs text-muted-foreground">{i.category || '—'}{i.from_fudfarmer_stock ? ' · Fudfarmer stock' : ''}</p>
                      </td>
                      <td className={td}>{i.pack_label || `${i.pack_qty} ${i.unit}`}</td>
                      <td className={`${td} text-right`}>
                        {bulk ? (
                          <MoneyInput ariaLabel={`Pack price for ${i.name}`} className="ml-auto w-36" value={prices[i._id] ?? i.pack_price} onChange={(v) => setPrices((p) => ({ ...p, [i._id]: v }))} />
                        ) : i.pack_price > 0 ? (
                          <span className="tabular-nums">{naira(i.pack_price)}</span>
                        ) : (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">No price</span>
                        )}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{i.unit_cost != null ? `${naira(i.unit_cost)} / ${i.unit}` : '—'}</td>
                      <td className={cn(td, age != null && age > 30 && 'font-semibold text-amber-700 dark:text-amber-400')}>
                        {i.price_date ? new Date(i.price_date).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' }) : '—'}
                        {age != null && age > 30 && <span className="block text-xs font-normal">{age} days old</span>}
                      </td>
                      <td className={td}>{i.source || '—'}</td>
                      {canEdit && <td className="px-2"><button type="button" className="rounded p-2 hover:bg-accent" aria-label={`Edit ${i.name}`} onClick={() => setEditing(i)}><Pencil size={14} /></button></td>}
                    </tr>
                  );
                })
              ) : (
                <EmptyRow colSpan={cols}>{filter || q ? 'No ingredients match.' : 'No ingredients yet. Add one or import the prototype data in Settings.'}</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </div>
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

  return (
    <ModalDialog onClose={onClose}>
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{ingredient ? `Edit ${ingredient.name}` : 'Add ingredient'}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close"><X size={20} /></button>
        </div>
        <form
          id="ingredient-form"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(
              { id: ingredient?._id, input: { ...form, retail_per_unit: form.from_fudfarmer_stock ? form.retail_per_unit : null } },
              { onSuccess: () => { toast.success(ingredient ? 'Ingredient saved' : 'Ingredient added'); onClose(); }, onError: (err) => toast.error(err.message) },
            );
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="i-name"><input id="i-name" required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} /></Field>
            <Field label="Category" htmlFor="i-cat"><input id="i-cat" className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} /></Field>
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
          <div className="space-y-2 rounded-md border p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.from_fudfarmer_stock} onChange={(e) => setForm({ ...form, from_fudfarmer_stock: e.target.checked })} />
              Comes from Fudfarmer&apos;s own stock (protein)
            </label>
            {form.from_fudfarmer_stock && (
              <Field label={`Fudfarmer retail price per ${form.unit}`} htmlFor="i-retail" hint="Used instead of purchase cost when Settings › protein costing is set to retail." className="max-w-xs">
                <MoneyInput id="i-retail" value={form.retail_per_unit} onChange={(v) => setForm({ ...form, retail_per_unit: v || null })} />
              </Field>
            )}
          </div>
          {!!history.length && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Price history</h3>
              <ul className="divide-y rounded-md border text-sm">
                {history.slice(0, 10).map((h, i) => (
                  <li key={i} className="flex justify-between px-3 py-2">
                    <span>{new Date(h.at).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}{h.source ? ` · ${h.source}` : ''}</span>
                    <span className="tabular-nums">{naira(h.pack_price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </form>
        <div className="flex justify-between gap-2 border-t px-6 py-4">
          {ingredient ? (
            <button
              type="button"
              className={btnDanger}
              disabled={archive.isPending}
              onClick={() => {
                if (!window.confirm(`Archive ${ingredient.name}? Recipes that use it keep the line, but it stops showing in the list.`)) return;
                archive.mutate(ingredient._id, { onSuccess: () => { toast.success('Ingredient archived'); onClose(); }, onError: (e) => toast.error(e.message) });
              }}
            >
              <Archive size={14} /> Archive
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
            <SubmitButton type="submit" form="ingredient-form" loading={save.isPending} disabled={!form.name.trim()} className="h-9 px-4 text-sm">Save</SubmitButton>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
