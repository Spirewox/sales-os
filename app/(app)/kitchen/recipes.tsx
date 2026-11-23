'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Archive, ChefHat, Plus, Trash2 } from 'lucide-react';
import { PanelSkeleton } from '@/components/ui/loading-skeletons';
import { DataTable, EmptyState, EntityDrawer, FilterBar, FormSection, FormSheet, StatusBadge, type Column } from '@/components/app';
import { usePermissions } from '@/hooks/use-permissions';
import { useArchiveKitchenRecipe, useKitchenIngredients, useKitchenRecipe, useKitchenRecipes, useKitchenSettings, useSaveKitchenRecipe } from '@/hooks/use-kitchen';
import { naira, type KitchenRecipe } from '@/lib/kitchen-types';
import { btnDanger, btnGhost, btnPrimary, btnSecondary, ErrorPanel, Field, inputClass, NumberInput, RowField } from './kitchen-ui';

export function KitchenRecipes({ onShowIngredients }: { onShowIngredients: (filter: 'no_price' | 'stale') => void }) {
  const { can } = usePermissions();
  const canCosts = can('kitchen.view_costs');
  const canEdit = can('kitchen.manage_pricing');
  const [q, setQ] = useState('');
  const recipes = useKitchenRecipes(q.trim() || undefined);
  const [open, setOpen] = useState<string | 'new' | null>(null);
  const rows = recipes.data ?? [];
  const unpriced = rows.filter((r) => r.unpriced_ingredients?.length).length;
  // Price columns follow the configured pricing defaults (company level), not fixed 30% / 100%.
  const settings = useKitchenSettings(undefined, { enabled: canCosts });
  const foodCostPct = settings.data?.defaults.food_cost_pct;
  const packMarkupPct = settings.data?.defaults.markup_packs;
  const hasTargets = foodCostPct != null && foodCostPct > 0 && packMarkupPct != null;
  const priceAtTarget = (r: KitchenRecipe) =>
    hasTargets && r.cost_per_portion != null ? r.cost_per_portion / (foodCostPct / 100) : r.price_at_food_cost;
  const priceAtMarkup = (r: KitchenRecipe) =>
    hasTargets && r.cost_per_portion != null ? r.cost_per_portion * (1 + packMarkupPct / 100) : r.price_at_100_markup;
  const targetLabel = hasTargets ? `At target ${foodCostPct}%` : 'At 30% food cost';
  const markupLabel = hasTargets ? `At pack markup ${packMarkupPct}%` : 'At 100% markup';

  const columns: Column<KitchenRecipe>[] = [
    {
      id: 'name',
      header: 'Recipe',
      mobile: 'title',
      sortValue: (r) => r.name.toLowerCase(),
      cell: (r) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          {r.name}
          {canCosts && !!r.unpriced_ingredients?.length && <StatusBadge tone="warning">Unpriced items</StatusBadge>}
        </span>
      ),
    },
    { id: 'category', header: 'Category', mobile: 'subtitle', sortValue: (r) => r.category || '', cell: (r) => r.category || '-' },
    { id: 'yield', header: 'Yield', align: 'right', mobile: 'meta', cell: (r) => `${r.yield_qty} ${r.yield_unit}` },
    ...(canCosts
      ? ([
          { id: 'cost', header: 'Cost per portion', align: 'right', mobile: 'value', sortValue: (r) => r.cost_per_portion ?? null, cell: (r) => naira(r.cost_per_portion) },
          { id: 'target', header: targetLabel, align: 'right', hideBelow: 'lg', cell: (r) => naira(priceAtTarget(r)) },
          { id: 'markup', header: markupLabel, align: 'right', hideBelow: 'lg', cell: (r) => naira(priceAtMarkup(r)) },
        ] satisfies Column<KitchenRecipe>[])
      : []),
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        search={{ value: q, onChange: setQ, placeholder: 'Search recipes', label: 'Search recipes' }}
        resultLabel={recipes.data ? `${rows.length} recipe${rows.length === 1 ? '' : 's'}` : undefined}
        trailing={canEdit && <button type="button" className={btnPrimary} onClick={() => setOpen('new')}><Plus size={14} aria-hidden /> New recipe</button>}
      />

      {canCosts && unpriced > 0 && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning/5 p-3 text-sm">
          <AlertTriangle size={14} aria-hidden className="text-warning" /> {unpriced} recipe{unpriced === 1 ? ' uses' : 's use'} ingredients without a price, so their cost is too low.
          <button type="button" className="rounded-md font-medium text-primary underline" onClick={() => onShowIngredients('no_price')}>Price ingredients</button>
        </p>
      )}
      {recipes.isError && <ErrorPanel message={recipes.error.message} onRetry={() => void recipes.refetch()} />}

      <DataTable
        label="Recipes"
        columns={columns}
        rows={recipes.data}
        loading={recipes.isPending}
        getRowId={(r) => r._id}
        onRowClick={(r) => setOpen(r._id)}
        defaultSort={{ id: 'name', dir: 'asc' }}
        resetPageKey={q}
        empty={
          q ? (
            <EmptyState size="compact" title="No recipes match" description={`Nothing is called "${q.trim()}". Check the spelling or clear the search.`} />
          ) : (
            <EmptyState
              size="compact"
              icon={<ChefHat />}
              title="No recipes yet"
              description={canEdit ? 'Add your first recipe with its ingredients so jobs can be costed.' : 'Recipes your kitchen lead adds show here.'}
              action={canEdit && <button type="button" className={btnPrimary} onClick={() => setOpen('new')}><Plus size={14} aria-hidden /> New recipe</button>}
            />
          )
        }
      />
      {canCosts && <p className="text-xs text-muted-foreground">Food cost per portion counts only the quantity used, not the whole pack bought. Prices here are before packaging, overheads and running costs.</p>}

      {open && <RecipeDialog id={open === 'new' ? null : open} canEdit={canEdit} canCosts={canCosts} onClose={() => setOpen(null)} />}
    </div>
  );
}

type Line = { ingredient: string; qty: number };

function RecipeDialog({ id, canEdit, canCosts, onClose }: { id: string | null; canEdit: boolean; canCosts: boolean; onClose: () => void }) {
  const recipe = useKitchenRecipe(id);
  if (id && (recipe.isPending || recipe.isError)) {
    return (
      <EntityDrawer title={recipe.isError ? 'Recipe unavailable' : 'Loading recipe…'} onClose={onClose}>
        {recipe.isError ? <ErrorPanel message={recipe.error.message} onRetry={() => void recipe.refetch()} /> : <PanelSkeleton label="Loading recipe…" />}
      </EntityDrawer>
    );
  }
  if (!canEdit && recipe.data) return <RecipeView recipe={recipe.data} canCosts={canCosts} onClose={onClose} />;
  return <RecipeEditor recipe={recipe.data ?? null} canCosts={canCosts} onClose={onClose} />;
}

function useRecipeLines(recipe: KitchenRecipe | null, enabled: boolean) {
  const ingredients = useKitchenIngredients({}, { enabled });
  const ingById = useMemo(() => new Map((ingredients.data ?? []).map((i) => [String(i._id), i])), [ingredients.data]);
  const nameOf = (lineId: string) => {
    const populated = recipe?.lines.find((l) => typeof l.ingredient !== 'string' && l.ingredient._id === lineId)?.ingredient;
    return ingById.get(lineId)?.name ?? (populated && typeof populated !== 'string' ? populated.name : 'Unknown item');
  };
  const lineCost = (l: Line) => {
    const i = ingById.get(l.ingredient);
    return i?.unit_cost != null ? i.unit_cost * l.qty : null;
  };
  return { ingredients, ingById, nameOf, lineCost };
}

const toLines = (recipe: KitchenRecipe | null): Line[] =>
  (recipe?.lines ?? []).map((l) => ({ ingredient: typeof l.ingredient === 'string' ? l.ingredient : l.ingredient._id, qty: l.qty }));

function CostTotals({ batch, perPortion, unit }: { batch: number; perPortion: number | null; unit: string }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border text-sm">
      <div className="bg-background px-3 py-2"><dt className="text-xs text-muted-foreground">Batch cost</dt><dd className="font-semibold tabular-nums">{naira(batch)}</dd></div>
      <div className="bg-background px-3 py-2"><dt className="text-xs text-muted-foreground">Food cost per {unit.replace(/s$/, '') || 'portion'}</dt><dd className="font-semibold tabular-nums">{naira(perPortion)}</dd></div>
    </dl>
  );
}

/** Read-only recipe for people who can't edit pricing. */
function RecipeView({ recipe, canCosts, onClose }: { recipe: KitchenRecipe; canCosts: boolean; onClose: () => void }) {
  const { ingById, nameOf, lineCost } = useRecipeLines(recipe, canCosts);
  const lines = toLines(recipe);
  const batch = lines.reduce((s, l) => s + (lineCost(l) ?? 0), 0);
  return (
    <EntityDrawer title={recipe.name} subtitle={`${recipe.category ? `${recipe.category}, ` : ''}one batch yields ${recipe.yield_qty} ${recipe.yield_unit}`} onClose={onClose}>
      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Ingredients per batch</h3>
          <ul className="divide-y rounded-lg border text-sm">
            {lines.map((l, i) => {
              const ing = ingById.get(l.ingredient);
              const cost = lineCost(l);
              return (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span>{nameOf(l.ingredient)}</span>
                  <span className="text-right tabular-nums">
                    {l.qty} {ing?.unit}
                    {canCosts && <span className="block text-xs text-muted-foreground">{cost == null ? 'No price' : naira(cost)}</span>}
                  </span>
                </li>
              );
            })}
            {!lines.length && <li className="px-3 py-6 text-center text-muted-foreground">No ingredients on this recipe.</li>}
          </ul>
        </section>
        {canCosts && <CostTotals batch={batch} perPortion={recipe.yield_qty > 0 ? batch / recipe.yield_qty : null} unit={recipe.yield_unit} />}
        {recipe.notes && <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{recipe.notes}</p>}
      </div>
    </EntityDrawer>
  );
}

function RecipeEditor({ recipe, canCosts, onClose }: { recipe: KitchenRecipe | null; canCosts: boolean; onClose: () => void }) {
  const { ingredients, ingById, lineCost } = useRecipeLines(recipe, true);
  const save = useSaveKitchenRecipe();
  const archive = useArchiveKitchenRecipe();
  const [form, setForm] = useState(() => ({
    name: recipe?.name ?? '',
    category: recipe?.category ?? '',
    yield_qty: recipe?.yield_qty ?? 0,
    yield_unit: recipe?.yield_unit ?? 'scoops',
    notes: recipe?.notes ?? '',
    lines: toLines(recipe),
  }));
  const batch = form.lines.reduce((s, l) => s + (lineCost(l) ?? 0), 0);
  const perPortion = form.yield_qty > 0 ? batch / form.yield_qty : null;
  const openJobs = recipe?.open_jobs ?? 0;
  const setLine = (i: number, patch: Partial<Line>) => setForm({ ...form, lines: form.lines.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const submit = () => {
    if (recipe && openJobs > 0 && !window.confirm(`This recipe is used in ${openJobs} open quote${openJobs === 1 ? '' : 's'} or job${openJobs === 1 ? '' : 's'}. They are re-costed with the new recipe the next time they are saved. Continue?`)) return;
    save.mutate(
      { id: recipe?._id, input: { ...form, lines: form.lines.filter((l) => l.ingredient && l.qty > 0) } },
      { onSuccess: () => { toast.success(recipe ? 'Recipe saved' : 'Recipe added'); onClose(); }, onError: (e) => toast.error(e.message) },
    );
  };

  return (
    <FormSheet
      title={recipe ? `Edit ${recipe.name}` : 'New recipe'}
      description={openJobs > 0 ? `Used in ${openJobs} open quote${openJobs === 1 ? '' : 's'} or job${openJobs === 1 ? '' : 's'}` : 'Ingredients for one batch and how many portions it makes.'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Save recipe"
      submitting={save.isPending}
      disabledReason={!form.name.trim() ? 'Name the recipe' : !(form.yield_qty > 0) ? 'Set how much one batch yields' : null}
      preview={canCosts && form.lines.length > 0 ? <>Batch cost {naira(batch)}, {naira(perPortion)} per {form.yield_unit.replace(/s$/, '') || 'portion'}</> : undefined}
      width="lg"
    >
      <FormSection title="Recipe">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="r-name"><input id="r-name" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} /></Field>
          <Field label="Category" htmlFor="r-cat"><input id="r-cat" className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} placeholder="Rice, protein, swallow…" /></Field>
          <Field label="One batch yields" htmlFor="r-yield"><NumberInput id="r-yield" value={form.yield_qty} onChange={(v) => setForm({ ...form, yield_qty: v })} /></Field>
          <Field label="Portion unit" htmlFor="r-unit"><input id="r-unit" className={inputClass} value={form.yield_unit} onChange={(e) => setForm({ ...form, yield_unit: e.target.value })} maxLength={40} placeholder="scoops, pieces, wraps" /></Field>
        </div>
      </FormSection>

      <FormSection title="Ingredients per batch" description="Only the quantity used counts, not the whole pack bought.">
        {ingredients.data && !ingredients.data.length && (
          <EmptyState size="compact" title="No ingredients yet" description="Add ingredients with their pack prices in the Ingredients tab, then come back to build this recipe." />
        )}
        <div className="space-y-3">
          {form.lines.map((l, i) => {
            const ing = ingById.get(l.ingredient);
            const cost = lineCost(l);
            return (
              <div key={i} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
                <RowField index={i} noun="Ingredient" label="Ingredient" htmlFor={`r-ing-${i}`}>
                  <select id={`r-ing-${i}`} className={inputClass} value={l.ingredient} onChange={(e) => setLine(i, { ingredient: e.target.value })}>
                    {(ingredients.data ?? []).map((o) => <option key={o._id} value={o._id}>{o.name} ({o.unit})</option>)}
                  </select>
                </RowField>
                <RowField index={i} noun="Ingredient" label="Qty used" htmlFor={`r-qty-${i}`}>
                  <NumberInput id={`r-qty-${i}`} value={l.qty} step={0.1} onChange={(v) => setLine(i, { qty: v })} suffix={ing?.unit} />
                </RowField>
                <button type="button" className={btnGhost} aria-label={`Remove ingredient ${i + 1}${ing ? `, ${ing.name}` : ''}`} onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })}><Trash2 size={14} aria-hidden /></button>
                {canCosts && (
                  <p className="col-span-3 -mt-1 text-xs text-muted-foreground tabular-nums">
                    {ing?.unit_cost != null ? `${naira(ing.unit_cost)} / ${ing.unit}, ${cost == null ? '-' : naira(cost)} for this recipe` : <span className="text-warning">No price yet</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" className={btnSecondary} disabled={!ingredients.data?.length} onClick={() => setForm({ ...form, lines: [...form.lines, { ingredient: ingredients.data![0]._id, qty: 1 }] })}>
          <Plus size={14} aria-hidden /> Add ingredient
        </button>
        {canCosts && form.lines.length > 0 && <CostTotals batch={batch} perPortion={perPortion} unit={form.yield_unit} />}
      </FormSection>

      <FormSection title="Notes" optional defaultOpen={!!form.notes}>
        <Field label="Method or notes" htmlFor="r-notes"><textarea id="r-notes" className={`${inputClass} h-20 py-2`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} /></Field>
      </FormSection>

      {recipe && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 p-4">
          <p className="text-sm text-muted-foreground">Archived recipes keep their costing on existing jobs but can&apos;t be added to new menus.</p>
          <button
            type="button"
            className={btnDanger}
            disabled={archive.isPending}
            onClick={() => {
              if (!window.confirm(`Archive ${recipe.name}? Existing jobs keep their costing; it can no longer be added to new menus.`)) return;
              archive.mutate(recipe._id, { onSuccess: () => { toast.success('Recipe archived'); onClose(); }, onError: (e) => toast.error(e.message) });
            }}
          >
            <Archive size={14} aria-hidden /> Archive recipe
          </button>
        </section>
      )}
    </FormSheet>
  );
}
