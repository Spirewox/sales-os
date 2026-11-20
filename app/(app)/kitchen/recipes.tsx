'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Archive, Plus, Search, Trash2, X } from 'lucide-react';
import { ModalDialog } from '../sales/modal-dialog';
import { SubmitButton } from '@/components/submit-button';
import { PanelSkeleton, TableSkeleton } from '@/components/ui/loading-skeletons';
import { usePermissions } from '@/hooks/use-permissions';
import { useArchiveKitchenRecipe, useKitchenIngredients, useKitchenRecipe, useKitchenRecipes, useSaveKitchenRecipe } from '@/hooks/use-kitchen';
import { naira, type KitchenRecipe } from '@/lib/kitchen-types';
import { btnDanger, btnGhost, btnPrimary, btnSecondary, EmptyRow, ErrorPanel, Field, inputClass, NumberInput, td, th, thRight } from './kitchen-ui';

export function KitchenRecipes({ onShowIngredients }: { onShowIngredients: (filter: 'no_price' | 'stale') => void }) {
  const { can } = usePermissions();
  const canCosts = can('kitchen.view_costs');
  const canEdit = can('kitchen.manage_pricing');
  const [q, setQ] = useState('');
  const recipes = useKitchenRecipes(q.trim() || undefined);
  const [open, setOpen] = useState<string | 'new' | null>(null);
  const rows = recipes.data ?? [];
  const cols = canCosts ? 6 : 3;
  const unpriced = rows.filter((r) => r.unpriced_ingredients?.length).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" aria-label="Search recipes" placeholder="Search recipes…" className={`${inputClass} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {canEdit && <button type="button" className={btnPrimary} onClick={() => setOpen('new')}><Plus size={14} /> New recipe</button>}
      </div>

      {canCosts && unpriced > 0 && (
        <p className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700/50 dark:bg-amber-950/20">
          <AlertTriangle size={14} className="text-amber-600" /> {unpriced} recipe{unpriced === 1 ? ' uses' : 's use'} ingredients without a price, so their cost is too low.
          <button type="button" className="font-semibold text-primary underline" onClick={() => onShowIngredients('no_price')}>Price ingredients</button>
        </p>
      )}
      {recipes.isError && <ErrorPanel message={recipes.error.message} onRetry={() => void recipes.refetch()} />}

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className={th}>Recipe</th>
                <th className={th}>Category</th>
                <th className={thRight}>Yield</th>
                {canCosts && <><th className={thRight}>Cost per portion</th><th className={thRight}>At 30% food cost</th><th className={thRight}>At 100% markup</th></>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {recipes.isPending ? (
                <tr><td colSpan={cols} className="p-0"><TableSkeleton rows={6} cols={cols} /></td></tr>
              ) : rows.length ? (
                rows.map((r) => (
                  <tr key={r._id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpen(r._id)}>
                    <td className={td}>
                      <button type="button" className="font-medium text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setOpen(r._id); }}>{r.name}</button>
                      {!!r.unpriced_ingredients?.length && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Unpriced items</span>}
                    </td>
                    <td className={td}>{r.category || '—'}</td>
                    <td className={`${td} text-right tabular-nums`}>{r.yield_qty} {r.yield_unit}</td>
                    {canCosts && (
                      <>
                        <td className={`${td} text-right tabular-nums`}>{naira(r.cost_per_portion)}</td>
                        <td className={`${td} text-right tabular-nums`}>{naira(r.price_at_food_cost)}</td>
                        <td className={`${td} text-right tabular-nums`}>{naira(r.price_at_100_markup)}</td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={cols}>{q ? 'No recipes match.' : 'No recipes yet. An admin can add one or import the prototype data in Settings.'}</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {canCosts && <p className="text-xs text-muted-foreground">Food cost per portion counts only the quantity used, not the whole pack bought. Prices here are before packaging, overheads and running costs.</p>}

      {open && <RecipeDialog id={open === 'new' ? null : open} canEdit={canEdit} canCosts={canCosts} onClose={() => setOpen(null)} />}
    </div>
  );
}

type Line = { ingredient: string; qty: number };

function RecipeDialog({ id, canEdit, canCosts, onClose }: { id: string | null; canEdit: boolean; canCosts: boolean; onClose: () => void }) {
  const recipe = useKitchenRecipe(id);
  return (
    <ModalDialog onClose={onClose}>
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border bg-card shadow-xl">
        {id && recipe.isPending ? (
          <PanelSkeleton label="Loading recipe…" />
        ) : id && recipe.isError ? (
          <div className="p-6"><ErrorPanel message={recipe.error.message} /></div>
        ) : (
          <RecipeEditor recipe={recipe.data ?? null} canEdit={canEdit} canCosts={canCosts} onClose={onClose} />
        )}
      </div>
    </ModalDialog>
  );
}

function RecipeEditor({ recipe, canEdit, canCosts, onClose }: { recipe: KitchenRecipe | null; canEdit: boolean; canCosts: boolean; onClose: () => void }) {
  const ingredients = useKitchenIngredients({}, { enabled: canCosts || canEdit });
  const save = useSaveKitchenRecipe();
  const archive = useArchiveKitchenRecipe();
  const [form, setForm] = useState(() => ({
    name: recipe?.name ?? '',
    category: recipe?.category ?? '',
    yield_qty: recipe?.yield_qty ?? 0,
    yield_unit: recipe?.yield_unit ?? 'scoops',
    notes: recipe?.notes ?? '',
    lines: (recipe?.lines ?? []).map((l) => ({ ingredient: typeof l.ingredient === 'string' ? l.ingredient : l.ingredient._id, qty: l.qty })) as Line[],
  }));
  const ingById = useMemo(() => new Map((ingredients.data ?? []).map((i) => [String(i._id), i])), [ingredients.data]);
  const nameOf = (lineId: string) => {
    const populated = recipe?.lines.find((l) => typeof l.ingredient !== 'string' && l.ingredient._id === lineId)?.ingredient;
    return ingById.get(lineId)?.name ?? (populated && typeof populated !== 'string' ? populated.name : 'Unknown item');
  };
  const lineCost = (l: Line) => {
    const i = ingById.get(l.ingredient);
    return i?.unit_cost != null ? i.unit_cost * l.qty : null;
  };
  const batch = form.lines.reduce((s, l) => s + (lineCost(l) ?? 0), 0);
  const perPortion = form.yield_qty > 0 ? batch / form.yield_qty : null;
  const openJobs = recipe?.open_jobs ?? 0;

  const submit = () => {
    if (recipe && openJobs > 0 && !window.confirm(`This recipe is used in ${openJobs} open quote${openJobs === 1 ? '' : 's'} or job${openJobs === 1 ? '' : 's'}. They are re-costed with the new recipe the next time they are saved. Continue?`)) return;
    save.mutate(
      { id: recipe?._id, input: { ...form, lines: form.lines.filter((l) => l.ingredient && l.qty > 0) } },
      { onSuccess: () => { toast.success(recipe ? 'Recipe saved' : 'Recipe added'); onClose(); }, onError: (e) => toast.error(e.message) },
    );
  };

  return (
    <>
      <div className="flex items-start justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">{recipe ? (canEdit ? `Edit ${recipe.name}` : recipe.name) : 'New recipe'}</h2>
          {openJobs > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">Used in {openJobs} open quote{openJobs === 1 ? '' : 's'} or job{openJobs === 1 ? '' : 's'}</p>}
        </div>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close"><X size={20} /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
        {canEdit ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="r-name"><input id="r-name" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} /></Field>
            <Field label="Category" htmlFor="r-cat"><input id="r-cat" className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} placeholder="Rice, protein, swallow…" /></Field>
            <Field label="One batch yields" htmlFor="r-yield"><NumberInput id="r-yield" value={form.yield_qty} onChange={(v) => setForm({ ...form, yield_qty: v })} /></Field>
            <Field label="Portion unit" htmlFor="r-unit"><input id="r-unit" className={inputClass} value={form.yield_unit} onChange={(e) => setForm({ ...form, yield_unit: e.target.value })} maxLength={40} placeholder="scoops, pieces, wraps" /></Field>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{recipe?.category ? `${recipe.category} · ` : ''}One batch yields {recipe?.yield_qty} {recipe?.yield_unit}.</p>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold">Ingredients per batch</h3>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">Ingredient</th><th className="px-3 py-2 text-right">Qty used</th>{canCosts && <><th className="px-3 py-2 text-right">Unit cost</th><th className="px-3 py-2 text-right">Cost</th></>}{canEdit && <th className="w-10" />}</tr>
              </thead>
              <tbody className="divide-y">
                {form.lines.map((l, i) => {
                  const ing = ingById.get(l.ingredient);
                  const cost = lineCost(l);
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        {canEdit ? (
                          <select aria-label="Ingredient" className={inputClass} value={l.ingredient} onChange={(e) => setForm({ ...form, lines: form.lines.map((x, j) => (j === i ? { ...x, ingredient: e.target.value } : x)) })}>
                            {(ingredients.data ?? []).map((o) => <option key={o._id} value={o._id}>{o.name} ({o.unit})</option>)}
                          </select>
                        ) : nameOf(l.ingredient)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canEdit ? <NumberInput ariaLabel="Quantity used" value={l.qty} step={0.1} onChange={(v) => setForm({ ...form, lines: form.lines.map((x, j) => (j === i ? { ...x, qty: v } : x)) })} suffix={ing?.unit} /> : <span className="tabular-nums">{l.qty} {ing?.unit}</span>}
                      </td>
                      {canCosts && (
                        <>
                          <td className="px-3 py-2 text-right tabular-nums">{ing?.unit_cost != null ? `${naira(ing.unit_cost)} / ${ing.unit}` : <span className="text-amber-600">No price</span>}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{cost == null ? '—' : naira(cost)}</td>
                        </>
                      )}
                      {canEdit && <td className="px-1"><button type="button" className={btnGhost} aria-label="Remove ingredient" onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })}><Trash2 size={14} /></button></td>}
                    </tr>
                  );
                })}
                {!form.lines.length && <EmptyRow colSpan={5}>No ingredients yet.</EmptyRow>}
              </tbody>
              {canCosts && (
                <tfoot className="border-t bg-muted/30 text-sm">
                  <tr><td className="px-3 py-2 font-semibold" colSpan={3}>Batch cost</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{naira(batch)}</td>{canEdit && <td />}</tr>
                  <tr><td className="px-3 py-2" colSpan={3}>Food cost per {form.yield_unit.replace(/s$/, '') || 'portion'}</td><td className="px-3 py-2 text-right font-bold tabular-nums">{naira(perPortion)}</td>{canEdit && <td />}</tr>
                </tfoot>
              )}
            </table>
          </div>
          {canEdit && (
            <button type="button" className={`${btnSecondary} mt-2`} disabled={!ingredients.data?.length} onClick={() => setForm({ ...form, lines: [...form.lines, { ingredient: ingredients.data![0]._id, qty: 1 }] })}>
              <Plus size={14} /> Add ingredient
            </button>
          )}
        </section>

        {canEdit ? (
          <Field label="Notes" htmlFor="r-notes"><textarea id="r-notes" className={`${inputClass} h-20 py-2`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} /></Field>
        ) : recipe?.notes ? (
          <p className="whitespace-pre-wrap rounded bg-muted/50 p-3 text-sm">{recipe.notes}</p>
        ) : null}
      </div>
      {canEdit && (
        <div className="flex justify-between gap-2 border-t px-6 py-4">
          {recipe ? (
            <button
              type="button"
              className={btnDanger}
              disabled={archive.isPending}
              onClick={() => {
                if (!window.confirm(`Archive ${recipe.name}? Existing jobs keep their costing; it can no longer be added to new menus.`)) return;
                archive.mutate(recipe._id, { onSuccess: () => { toast.success('Recipe archived'); onClose(); }, onError: (e) => toast.error(e.message) });
              }}
            >
              <Archive size={14} /> Archive
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
            <SubmitButton type="button" loading={save.isPending} disabled={!form.name.trim() || !(form.yield_qty > 0)} onClick={submit} className="h-9 px-4 text-sm">Save recipe</SubmitButton>
          </div>
        </div>
      )}
    </>
  );
}
