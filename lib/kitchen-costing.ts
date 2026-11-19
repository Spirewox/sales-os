/**
 * Kitchen costing engine (Okeke, Food Costing and Catering Measurement Guide,
 * plus Fudfarmer's shared running costs).
 *
 * Pure TypeScript with no framework imports. The same file lives in fud-farmer-crm-be
 * (src/kitchen/costing/costing.ts) and sales-os (lib/kitchen-costing.ts): keep them identical.
 * The server always recalculates with it; client numbers are never trusted.
 *
 * Money is in naira. Values are computed at full precision and rounded to 2 dp on output.
 */

export type KitchenMode = 'packs' | 'buffet' | 'trays' | 'chef';
export type PricingMethod = 'markup' | 'food_cost' | 'test_price';
export type OverheadPer = 'unit' | 'job';
export type RunningCostBasis = 'portion' | 'day';
export type ProteinBasis = 'cost' | 'retail';

export const KITCHEN_MODES: KitchenMode[] = ['packs', 'buffet', 'trays', 'chef'];
export const PRICING_METHODS: PricingMethod[] = ['markup', 'food_cost', 'test_price'];

export interface CostingIngredient {
  id: string;
  name: string;
  /** Size of the pack bought, in `unit` (e.g. 25 for a 25 kg bag). */
  pack_qty: number;
  pack_price: number;
  unit?: string;
  from_fudfarmer_stock?: boolean;
  /** Fudfarmer retail price per `unit`, used when protein_basis is "retail". */
  retail_per_unit?: number | null;
}

export interface CostingRecipeLine {
  ingredient: string;
  /** Quantity used per batch, in the ingredient's unit. */
  qty: number;
}

export interface CostingRecipe {
  id: string;
  name: string;
  /** Portions (scoops, pieces, wraps) one batch yields. */
  yield_qty: number;
  yield_unit?: string;
  lines: CostingRecipeLine[];
}

export interface CostingSettings {
  markup_packs: number;
  markup_buffet: number;
  markup_trays: number;
  /** Target food cost, as a percentage (30 = 30%). */
  food_cost_pct: number;
  /** Prices round up to this step (0 = no rounding). */
  round_to: number;
  /** Cooking buffer added to ingredient quantities, as a percentage. */
  buffer_pct: number;
  service_charge_pct: number;
  protein_basis: ProteinBasis;
  /** Warn when a job's profit is below this figure (0 = off). */
  min_profit_job: number;
}

export interface RunningCostStaff {
  role: string;
  people: number;
  monthly: number;
}

export interface RunningCosts {
  electricity: number;
  generator: number;
  gas: number;
  water: number;
  rent: number;
  other: number;
  staff: RunningCostStaff[];
  basis: RunningCostBasis;
  monthly_portions: number;
  kitchen_days: number;
}

export interface CostingMenuLine {
  recipe: string;
  /** Portions of this recipe per pack or guest. */
  per_unit: number;
}

export interface CostingOverhead {
  name: string;
  qty: number;
  unit_cost: number;
  /** "unit" multiplies by the job count; "job" is charged once. */
  per: OverheadPer;
}

export interface CostingLabour {
  role: string;
  people: number;
  days: number;
  rate: number;
}

export interface CostingJob {
  mode: KitchenMode;
  /** Packs, guests or trays. */
  count: number;
  menu: CostingMenuLine[];
  overheads: CostingOverhead[];
  labour: CostingLabour[];
  include_running_costs: boolean;
  /** Kitchen days charged when running costs are shared per day. */
  ops_days: number;
  pricing_method: PricingMethod;
  markup_override?: number | null;
  test_price?: number | null;
}

export interface CostingCatalog {
  ingredients: Record<string, CostingIngredient>;
  recipes: Record<string, CostingRecipe>;
}

export type CostingWarningCode =
  | 'loss'
  | 'high_food_cost'
  | 'unpriced_ingredients'
  | 'unknown_recipes'
  | 'unpriced_overheads'
  | 'unpriced_labour'
  | 'running_costs_unset'
  | 'below_min_profit'
  | 'no_count';

export interface CostingWarning {
  code: CostingWarningCode;
  message: string;
  /** Names of the items concerned, when relevant. */
  items?: string[];
}

export interface CostingMenuResult {
  recipe: string;
  name: string;
  portions: number;
  batches: number;
  cost: number;
  cost_per_unit: number;
}

export interface ShoppingListItem {
  ingredient: string;
  name: string;
  unit: string;
  qty: number;
  packs_to_buy: number | null;
  cost_used: number | null;
  cost_to_buy: number | null;
}

export interface PricingOption {
  method: PricingMethod | 'chef';
  price_per_unit: number;
  revenue: number;
  profit: number;
  margin: number;
  food_cost_pct: number;
}

export interface CostingResult {
  mode: KitchenMode;
  count: number;
  /** Food cost of the menu (shown for chef jobs, but not charged). */
  food: number;
  /** Food cost charged to the job (0 for private chef). */
  food_charged: number;
  overheads: number;
  labour: number;
  utilities: number;
  staff: number;
  running_costs: number;
  cost: number;
  cost_per_unit: number;
  food_per_unit: number;
  markup_pct: number | null;
  service_charge: number;
  pricing_method: PricingMethod | 'chef';
  price_per_unit: number;
  price: number;
  profit: number;
  margin: number;
  food_cost_pct: number;
  options: PricingOption[];
  menu: CostingMenuResult[];
  overhead_rows: number[];
  labour_rows: number[];
  running_cost_rows: { label: string; amount: number }[];
  shopping_list: ShoppingListItem[];
  warnings: CostingWarning[];
}

export const RUNNING_COST_ITEMS: [keyof RunningCosts, string][] = [
  ['electricity', 'Electricity (grid / prepaid)'],
  ['generator', 'Generator fuel (diesel / petrol)'],
  ['gas', 'Cooking gas'],
  ['water', 'Water'],
  ['rent', 'Kitchen rent (monthly share)'],
  ['other', 'Other running costs'],
];

export const HIGH_FOOD_COST_PCT = 40;

const MARKUP_KEY: Record<Exclude<KitchenMode, 'chef'>, keyof CostingSettings> = {
  packs: 'markup_packs',
  buffet: 'markup_buffet',
  trays: 'markup_trays',
};

/** Parses numbers, accepting "1,500" style strings; anything else becomes 0. */
export function num(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function round2(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** Rounds up to the next `step`, ignoring floating-point noise (1400.0000001 stays 1400). */
export function roundUp(v: number, step: number): number {
  const clean = round2(v);
  if (!(step > 0)) return clean;
  return Math.ceil(clean / step - 1e-9) * step;
}

/** Cost per ingredient unit (kg, L, piece...). Null when the ingredient has no usable price. */
export function unitCost(
  ing: CostingIngredient | undefined | null,
  proteinBasis: ProteinBasis,
): number | null {
  if (!ing) return null;
  if (proteinBasis === 'retail' && ing.from_fudfarmer_stock && num(ing.retail_per_unit) > 0) {
    return num(ing.retail_per_unit);
  }
  const price = num(ing.pack_price);
  const qty = num(ing.pack_qty);
  if (!(price > 0) || !(qty > 0)) return null;
  return price / qty;
}

export interface RecipeCostResult {
  /** Cost of one batch, from priced ingredients only. */
  total: number;
  /** Food cost per portion, or null when the yield is not set. */
  per_portion: number | null;
  /** Names of ingredients used in the recipe that have no price. */
  missing: string[];
}

export function recipeCost(
  recipe: CostingRecipe | undefined | null,
  ingredients: Record<string, CostingIngredient>,
  proteinBasis: ProteinBasis,
): RecipeCostResult {
  let total = 0;
  const missing: string[] = [];
  for (const line of recipe?.lines ?? []) {
    const ing = ingredients[line.ingredient];
    const uc = unitCost(ing, proteinBasis);
    if (uc == null) {
      if (num(line.qty) > 0) missing.push(ing?.name ?? 'Unknown item');
      continue;
    }
    total += uc * num(line.qty);
  }
  const y = num(recipe?.yield_qty);
  return { total, per_portion: y > 0 ? total / y : null, missing };
}

export interface RunningCostRates {
  utilities: { label: string; amount: number }[];
  utilities_total: number;
  staff_total: number;
  total: number;
  basis: RunningCostBasis;
  divisor: number;
  per_utilities: number;
  per_staff: number;
}

export function runningCostRates(rc: RunningCosts): RunningCostRates {
  const utilities = RUNNING_COST_ITEMS.map(([key, label]) => ({ label, amount: num(rc[key]) }));
  const utilitiesTotal = utilities.reduce((a, u) => a + u.amount, 0);
  const staffTotal = (rc.staff ?? []).reduce((a, s) => a + num(s.people) * num(s.monthly), 0);
  const basis: RunningCostBasis = rc.basis === 'day' ? 'day' : 'portion';
  const divisor = basis === 'day' ? num(rc.kitchen_days) : num(rc.monthly_portions);
  return {
    utilities,
    utilities_total: utilitiesTotal,
    staff_total: staffTotal,
    total: utilitiesTotal + staffTotal,
    basis,
    divisor,
    per_utilities: divisor > 0 ? utilitiesTotal / divisor : 0,
    per_staff: divisor > 0 ? staffTotal / divisor : 0,
  };
}

export function computeCosting(
  job: CostingJob,
  catalog: CostingCatalog,
  settings: CostingSettings,
  running: RunningCosts,
): CostingResult {
  const mode = job.mode;
  const chef = mode === 'chef';
  const N = Math.max(0, num(job.count));
  const buffer = num(settings.buffer_pct) / 100;
  const basis = settings.protein_basis === 'retail' ? 'retail' : 'cost';

  const warnings: CostingWarning[] = [];
  const missing = new Set<string>();
  const unknownRecipes: string[] = [];
  const shop: Record<string, number> = {};
  const menu: CostingMenuResult[] = [];
  let food = 0;

  for (const line of job.menu ?? []) {
    const recipe = catalog.recipes[line.recipe];
    if (!recipe) {
      unknownRecipes.push(line.recipe);
      continue;
    }
    const rc = recipeCost(recipe, catalog.ingredients, basis);
    rc.missing.forEach((m) => missing.add(m));
    const portions = N * num(line.per_unit);
    const y = num(recipe.yield_qty);
    const batches = y > 0 ? portions / y : 0;
    const cost = batches * rc.total * (1 + buffer);
    food += cost;
    for (const rl of recipe.lines ?? []) {
      const q = num(rl.qty) * batches * (1 + buffer);
      if (q > 0) shop[rl.ingredient] = (shop[rl.ingredient] ?? 0) + q;
    }
    menu.push({
      recipe: line.recipe,
      name: recipe.name,
      portions: round2(portions),
      batches: Math.round(batches * 10000) / 10000,
      cost: round2(cost),
      cost_per_unit: round2(N > 0 ? cost / N : 0),
    });
  }

  let overheads = 0;
  const overheadRows = (job.overheads ?? []).map((o) => {
    const c = (o.per === 'unit' ? num(o.qty) * N : num(o.qty)) * num(o.unit_cost);
    overheads += c;
    return round2(c);
  });
  let labour = 0;
  const labourRows = (job.labour ?? []).map((x) => {
    const c = num(x.people) * num(x.days) * num(x.rate);
    labour += c;
    return round2(c);
  });

  const foodCharged = chef ? 0 : food;
  const rates = runningCostRates(running);
  const useRunning = !chef && job.include_running_costs !== false;
  const runningUnits = useRunning ? (rates.basis === 'day' ? num(job.ops_days) : N) : 0;
  const utilities = rates.per_utilities * runningUnits;
  const staff = rates.per_staff * runningUnits;
  const runningRows = rates.utilities
    .filter((u) => u.amount > 0)
    .map((u) => ({
      label: u.label,
      amount: round2(rates.divisor > 0 ? (u.amount / rates.divisor) * runningUnits : 0),
    }));
  if (useRunning && staff > 0) runningRows.push({ label: 'Kitchen salaries', amount: round2(staff) });

  const cost = foodCharged + overheads + labour + utilities + staff;
  const costPer = N > 0 ? cost / N : 0;
  const foodPer = N > 0 ? foodCharged / N : 0;

  const option = (method: PricingOption['method'], perUnit: number, revenue: number): PricingOption => ({
    method,
    price_per_unit: round2(perUnit),
    revenue: round2(revenue),
    profit: round2(revenue - cost),
    margin: revenue > 0 ? (revenue - cost) / revenue : 0,
    food_cost_pct: revenue > 0 ? foodCharged / revenue : 0,
  });

  let options: PricingOption[];
  let chosen: PricingOption;
  let markupPct: number | null = null;
  let serviceCharge = 0;

  if (chef) {
    serviceCharge = cost * (num(settings.service_charge_pct) / 100);
    const price = cost + serviceCharge;
    chosen = option('chef', N > 0 ? price / N : 0, price);
    options = [chosen];
  } else {
    const override = job.markup_override;
    markupPct =
      override !== null && override !== undefined && String(override) !== ''
        ? num(override)
        : num(settings[MARKUP_KEY[mode]]);
    const step = num(settings.round_to);
    const fc = num(settings.food_cost_pct) / 100;
    const markupPer = roundUp(costPer * (1 + markupPct / 100), step);
    const foodCostPer = fc > 0 ? roundUp(foodPer / fc, step) : 0;
    const testPer = num(job.test_price);
    options = [
      option('markup', markupPer, markupPer * N),
      option('food_cost', foodCostPer, foodCostPer * N),
      option('test_price', testPer, testPer * N),
    ];
    const pick: PricingMethod =
      job.pricing_method === 'test_price' && !(testPer > 0)
        ? 'markup'
        : PRICING_METHODS.includes(job.pricing_method)
          ? job.pricing_method
          : 'markup';
    chosen = options.find((o) => o.method === pick)!;
  }

  const price = chosen.revenue;
  const profit = price - cost;
  const margin = price > 0 ? profit / price : 0;
  const foodCostShare = price > 0 ? foodCharged / price : 0;

  if (N <= 0) warnings.push({ code: 'no_count', message: 'Set how many packs, guests or trays.' });
  if (unknownRecipes.length)
    warnings.push({ code: 'unknown_recipes', message: 'Some menu items are no longer in the recipe list.', items: unknownRecipes });
  if (missing.size)
    warnings.push({ code: 'unpriced_ingredients', message: 'Some ingredients have no price, so food cost is too low.', items: [...missing] });
  const unpricedOver = (job.overheads ?? []).filter((o) => num(o.qty) > 0 && !(num(o.unit_cost) > 0)).map((o) => o.name);
  if (unpricedOver.length)
    warnings.push({ code: 'unpriced_overheads', message: 'Some packaging or job costs have no price.', items: unpricedOver });
  const unpricedLab = (job.labour ?? []).filter((x) => num(x.people) > 0 && !(num(x.rate) > 0)).map((x) => x.role);
  if (unpricedLab.length)
    warnings.push({ code: 'unpriced_labour', message: 'Some labour has no rate.', items: unpricedLab });
  if (useRunning && (rates.total <= 0 || rates.divisor <= 0))
    warnings.push({ code: 'running_costs_unset', message: 'Running costs are not set for this outlet.' });
  if (price > 0 && profit < 0) warnings.push({ code: 'loss', message: 'This price is below cost.' });
  if (!chef && price > 0 && foodCostShare * 100 > HIGH_FOOD_COST_PCT)
    warnings.push({ code: 'high_food_cost', message: `Food cost is above ${HIGH_FOOD_COST_PCT}% of the price.` });
  const minProfit = num(settings.min_profit_job);
  if (minProfit > 0 && price > 0 && profit >= 0 && profit < minProfit)
    warnings.push({ code: 'below_min_profit', message: 'Profit is below the minimum for a job.' });

  const shoppingList: ShoppingListItem[] = Object.entries(shop)
    .map(([id, qty]) => {
      const ing = catalog.ingredients[id];
      const uc = unitCost(ing, basis);
      const packQty = num(ing?.pack_qty);
      const packs = packQty > 0 ? Math.ceil(qty / packQty - 1e-9) : null;
      return {
        ingredient: id,
        name: ing?.name ?? 'Unknown item',
        unit: ing?.unit ?? '',
        qty: Math.round(qty * 1000) / 1000,
        packs_to_buy: packs,
        cost_used: uc == null ? null : round2(uc * qty),
        cost_to_buy: packs != null && num(ing?.pack_price) > 0 ? round2(packs * num(ing!.pack_price)) : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    mode,
    count: N,
    food: round2(food),
    food_charged: round2(foodCharged),
    overheads: round2(overheads),
    labour: round2(labour),
    utilities: round2(utilities),
    staff: round2(staff),
    running_costs: round2(utilities + staff),
    cost: round2(cost),
    cost_per_unit: round2(costPer),
    food_per_unit: round2(foodPer),
    markup_pct: markupPct,
    service_charge: round2(serviceCharge),
    pricing_method: chosen.method,
    price_per_unit: chosen.price_per_unit,
    price: round2(price),
    profit: round2(profit),
    margin,
    food_cost_pct: foodCostShare,
    options,
    menu,
    overhead_rows: overheadRows,
    labour_rows: labourRows,
    running_cost_rows: runningRows,
    shopping_list: shoppingList,
    warnings,
  };
}
