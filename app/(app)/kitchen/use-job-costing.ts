'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeCosting, type CostingCatalog, type CostingResult, type CostingSettings } from '@/lib/kitchen-costing';
import { useKitchenIngredients, useKitchenPreview, useKitchenRecipes, useKitchenSettings } from '@/hooks/use-kitchen';
import type { KitchenBillLine, KitchenJobInput, KitchenRecipe } from '@/lib/kitchen-types';

/** Bill lines the server will generate (mirrors generatedBillLines in kitchen-jobs.service.ts). */
export function previewBillLines(input: KitchenJobInput, costing: Pick<CostingResult, 'count' | 'price' | 'price_per_unit'> | null): KitchenBillLine[] {
  if (input.custom_bill) return input.bill_lines ?? [];
  if (!costing || !(costing.count > 0) || !(costing.price > 0)) return [];
  if (input.mode === 'chef') {
    return [{ desc: `Private chef for ${costing.count} guests (fees, transport and service charge)`, qty: 1, unit_price: costing.price }];
  }
  const words = { packs: 'Food packs', buffet: 'Buffet (per guest)', trays: 'Trays & bowls', chef: 'Private chef' } as const;
  return [{ desc: input.title?.trim() || words[input.mode ?? 'packs'], qty: costing.count, unit_price: costing.price_per_unit }];
}

export function catalogFrom(recipes: KitchenRecipe[], ingredients: { _id: string; name: string; pack_qty: number; pack_price: number; unit: string; from_fudfarmer_stock: boolean; retail_per_unit: number | null }[]): CostingCatalog {
  return {
    ingredients: Object.fromEntries(ingredients.map((i) => [String(i._id), { id: String(i._id), name: i.name, pack_qty: i.pack_qty, pack_price: i.pack_price, unit: i.unit, from_fudfarmer_stock: i.from_fudfarmer_stock, retail_per_unit: i.retail_per_unit }])),
    recipes: Object.fromEntries(
      recipes.map((r) => [
        String(r._id),
        { id: String(r._id), name: r.name, yield_qty: r.yield_qty, yield_unit: r.yield_unit, lines: r.lines.map((l) => ({ ingredient: typeof l.ingredient === 'string' ? l.ingredient : l.ingredient._id, qty: l.qty })) },
      ]),
    ),
  };
}

/**
 * Live price ticket for the job form. Uses the shared engine in the browser when the user can see
 * costs (instant), otherwise a debounced server preview. Saving always re-costs on the server.
 */
export function useJobCosting(input: KitchenJobInput, opts: { canCosts: boolean; hubId?: string }) {
  const recipes = useKitchenRecipes();
  const ingredients = useKitchenIngredients({}, { enabled: opts.canCosts });
  const settings = useKitchenSettings(opts.hubId, { enabled: opts.canCosts });
  const preview = useKitchenPreview();
  const [serverResult, setServerResult] = useState<{ costing: Partial<CostingResult>; total: number; bill: KitchenBillLine[] } | null>(null);

  const local = useMemo(() => {
    if (!opts.canCosts || !recipes.data || !ingredients.data || !settings.data?.running_costs) return null;
    const d = settings.data.defaults;
    const costingSettings: CostingSettings = {
      markup_packs: d.markup_packs,
      markup_buffet: d.markup_buffet,
      markup_trays: d.markup_trays,
      food_cost_pct: d.food_cost_pct,
      round_to: d.round_to,
      buffer_pct: d.buffer_pct,
      service_charge_pct: d.service_charge_pct,
      protein_basis: d.protein_basis,
      min_profit_job: d.min_profit_job,
    };
    const dishes = input.custom_bill && !input.menu?.length ? (input.bill_lines ?? []).filter((b) => b.recipe) : [];
    const result = computeCosting(
      {
        mode: input.mode ?? 'packs',
        count: dishes.length ? 1 : input.count ?? 0,
        menu: dishes.length ? dishes.map((b) => ({ recipe: String(b.recipe), per_unit: b.qty })) : input.menu ?? [],
        overheads: (input.overheads ?? []).map((o) => ({ ...o, unit_cost: o.unit_cost ?? 0 })),
        labour: (input.labour ?? []).map((l) => ({ ...l, rate: l.rate ?? 0 })),
        include_running_costs: input.include_running_costs ?? true,
        ops_days: input.ops_days ?? 1,
        pricing_method: input.pricing_method ?? 'markup',
        markup_override: input.markup_override,
        test_price: input.test_price,
      },
      catalogFrom(recipes.data, ingredients.data),
      costingSettings,
      settings.data.running_costs,
    );
    const bill = previewBillLines(input, result);
    return { costing: result, bill, total: Math.round(bill.reduce((s, b) => s + b.qty * b.unit_price, 0) * 100) / 100 };
  }, [opts.canCosts, recipes.data, ingredients.data, settings.data, input]);

  const key = JSON.stringify({ ...input, hub_id: opts.hubId });
  const { mutate } = preview;
  useEffect(() => {
    if (local || opts.canCosts) return;
    const t = setTimeout(() => {
      mutate(
        { ...JSON.parse(key) },
        { onSuccess: (r) => setServerResult({ costing: r.costing as Partial<CostingResult>, total: r.total, bill: r.bill_lines }) },
      );
    }, 400);
    return () => clearTimeout(t);
  }, [key, local, opts.canCosts, mutate]);

  if (local) return { costing: local.costing as Partial<CostingResult>, bill: local.bill, total: local.total, loading: false, source: 'local' as const };
  return {
    costing: serverResult?.costing ?? null,
    bill: serverResult?.bill ?? [],
    total: serverResult?.total ?? 0,
    loading: preview.isPending || (opts.canCosts && (recipes.isPending || ingredients.isPending || settings.isPending)),
    source: 'server' as const,
  };
}
