import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeCosting,
  recipeCost,
  roundUp,
  unitCost,
  type CostingCatalog,
  type CostingJob,
  type CostingSettings,
  type RunningCosts,
} from './kitchen-costing';

// Golden tests: the worked examples from Okeke's Food Costing (see the kitchen spec).
// The book's figures are un-rounded, so these run with round_to = 0 and buffer_pct = 0,
// then again with the app's rounding (round_to = 100).

const settings = (over: Partial<CostingSettings> = {}): CostingSettings => ({
  markup_packs: 50,
  markup_buffet: 100,
  markup_trays: 60,
  food_cost_pct: 30,
  round_to: 0,
  buffer_pct: 0,
  service_charge_pct: 10,
  protein_basis: 'cost',
  min_profit_job: 0,
  ...over,
});

const noRunning = (over: Partial<RunningCosts> = {}): RunningCosts => ({
  electricity: 0,
  generator: 0,
  gas: 0,
  water: 0,
  rent: 0,
  other: 0,
  staff: [],
  basis: 'portion',
  monthly_portions: 3000,
  kitchen_days: 26,
  ...over,
});

/** A catalog whose one recipe costs exactly `food` naira for `count` portions. */
const catalogFor = (food: number, count: number): CostingCatalog => ({
  ingredients: { base: { id: 'base', name: 'Menu ingredients', pack_qty: 1, pack_price: food, unit: 'pack' } },
  recipes: { dish: { id: 'dish', name: 'Dish', yield_qty: count, lines: [{ ingredient: 'base', qty: 1 }] } },
});

const job = (over: Partial<CostingJob>): CostingJob => ({
  mode: 'packs',
  count: 1,
  menu: [],
  overheads: [],
  labour: [],
  include_running_costs: false,
  ops_days: 1,
  pricing_method: 'markup',
  ...over,
});

const bimbo = (over: Partial<CostingJob> = {}) =>
  job({
    mode: 'packs',
    count: 50,
    menu: [{ recipe: 'dish', per_unit: 1 }],
    overheads: [{ name: 'Packs, stickers, transport', qty: 1, unit_cost: 17790, per: 'job' }],
    ...over,
  });

describe('kitchen costing — book examples (un-rounded)', () => {
  it('Bimbo, 50 coconut rice packs', () => {
    const r = computeCosting(bimbo(), catalogFor(27520, 50), settings(), noRunning());
    assert.equal(r.food, 27520);
    assert.equal(r.cost, 45310);
    assert.equal(r.cost_per_unit, 906.2);
    assert.equal(r.price_per_unit, 1359.3);
    const fc = r.options.find((o) => o.method === 'food_cost')!;
    assert.equal(fc.price_per_unit, 1834.67);
  });

  it('Hauwa, 100-guest buffet at 100% markup', () => {
    const r = computeCosting(
      job({
        mode: 'buffet',
        count: 100,
        menu: [{ recipe: 'dish', per_unit: 1 }],
        overheads: [{ name: 'Overheads', qty: 1, unit_cost: 13310, per: 'job' }],
        labour: [{ role: 'Service staff', people: 1, days: 1, rate: 29000 }],
      }),
      catalogFor(101850, 100),
      settings(),
      noRunning(),
    );
    assert.equal(r.cost_per_unit, 1441.6);
    assert.equal(r.price_per_unit, 2883.2);
    assert.equal(r.price, 288320);
  });

  it('Ifeoma, private chef for 60: food left out, 10% service charge', () => {
    const r = computeCosting(
      job({
        mode: 'chef',
        count: 60,
        menu: [{ recipe: 'dish', per_unit: 1 }],
        overheads: [{ name: 'Transport', qty: 1, unit_cost: 5000, per: 'job' }],
        labour: [
          { role: 'Head chef', people: 1, days: 1, rate: 25000 },
          { role: 'Cook', people: 1, days: 1, rate: 8000 },
        ],
        include_running_costs: true,
      }),
      catalogFor(50000, 60),
      settings(),
      noRunning({ electricity: 700000 }),
    );
    assert.equal(r.food, 50000);
    assert.equal(r.food_charged, 0);
    assert.equal(r.running_costs, 0);
    assert.equal(r.cost, 38000);
    assert.equal(r.service_charge, 3800);
    assert.equal(r.price, 41800);
    assert.equal(r.pricing_method, 'chef');
  });

  it('Bimbo with running costs of ₦700,000 a month over 3,000 portions', () => {
    const r = computeCosting(
      bimbo({ include_running_costs: true }),
      catalogFor(27520, 50),
      settings(),
      noRunning({ electricity: 400000, staff: [{ role: 'Cook', people: 2, monthly: 150000 }] }),
    );
    assert.equal(r.running_costs, 11666.67);
    assert.equal(r.cost_per_unit, 1139.53);
    assert.equal(r.price_per_unit, 1709.3);
  });
});

describe('kitchen costing — app rounding (round_to = 100)', () => {
  it('rounds Bimbo prices up to the next ₦100', () => {
    const r = computeCosting(bimbo(), catalogFor(27520, 50), settings({ round_to: 100 }), noRunning());
    assert.equal(r.cost_per_unit, 906.2);
    assert.equal(r.price_per_unit, 1400);
    assert.equal(r.price, 70000);
    assert.equal(r.options.find((o) => o.method === 'food_cost')!.price_per_unit, 1900);
  });

  it('rounds Hauwa up to ₦2,900 a guest', () => {
    const r = computeCosting(
      job({
        mode: 'buffet',
        count: 100,
        menu: [{ recipe: 'dish', per_unit: 1 }],
        overheads: [{ name: 'Overheads', qty: 1, unit_cost: 13310, per: 'job' }],
        labour: [{ role: 'Service staff', people: 1, days: 1, rate: 29000 }],
      }),
      catalogFor(101850, 100),
      settings({ round_to: 100 }),
      noRunning(),
    );
    assert.equal(r.price_per_unit, 2900);
  });

  it('does not round chef jobs', () => {
    const r = computeCosting(
      job({ mode: 'chef', count: 60, labour: [{ role: 'Chef', people: 1, days: 1, rate: 33000 }], overheads: [{ name: 'Transport', qty: 1, unit_cost: 5000, per: 'job' }] }),
      { ingredients: {}, recipes: {} },
      settings({ round_to: 100 }),
      noRunning(),
    );
    assert.equal(r.price, 41800);
  });

  it('ignores floating-point noise when rounding', () => {
    assert.equal(roundUp(1400.0000000001, 100), 1400);
    assert.equal(roundUp(1400.01, 100), 1500);
    assert.equal(roundUp(1359.3, 0), 1359.3);
  });
});

describe('kitchen costing — engine details', () => {
  const catalog: CostingCatalog = {
    ingredients: {
      rice: { id: 'rice', name: 'Rice', pack_qty: 50, pack_price: 80000, unit: 'kg' },
      chicken: { id: 'chicken', name: 'Chicken', pack_qty: 10, pack_price: 40000, unit: 'kg', from_fudfarmer_stock: true, retail_per_unit: 5000 },
      salt: { id: 'salt', name: 'Salt', pack_qty: 1, pack_price: 0, unit: 'kg' },
    },
    recipes: {
      jollof: { id: 'jollof', name: 'Jollof', yield_qty: 100, lines: [{ ingredient: 'rice', qty: 10 }, { ingredient: 'salt', qty: 0.2 }] },
      chicken: { id: 'chicken', name: 'Chicken', yield_qty: 20, lines: [{ ingredient: 'chicken', qty: 4 }] },
    },
  };

  it('costs only the quantity used and flags unpriced ingredients', () => {
    assert.equal(unitCost(catalog.ingredients.rice, 'cost'), 1600);
    const rc = recipeCost(catalog.recipes.jollof, catalog.ingredients, 'cost');
    assert.equal(rc.total, 16000);
    assert.equal(rc.per_portion, 160);
    assert.deepEqual(rc.missing, ['Salt']);
  });

  it('uses retail price for Fudfarmer stock when protein_basis is retail', () => {
    assert.equal(unitCost(catalog.ingredients.chicken, 'cost'), 4000);
    assert.equal(unitCost(catalog.ingredients.chicken, 'retail'), 5000);
    assert.equal(unitCost(catalog.ingredients.rice, 'retail'), 1600);
  });

  it('applies the cooking buffer and builds the shopping list', () => {
    const r = computeCosting(
      job({ count: 100, menu: [{ recipe: 'jollof', per_unit: 2 }] }),
      catalog,
      settings({ buffer_pct: 5 }),
      noRunning(),
    );
    // 200 scoops = 2 batches, 16,000 each, plus 5%
    assert.equal(r.food, 33600);
    const rice = r.shopping_list.find((s) => s.ingredient === 'rice')!;
    assert.equal(rice.qty, 21);
    assert.equal(rice.packs_to_buy, 1);
    assert.equal(rice.cost_used, 33600);
    assert.equal(rice.cost_to_buy, 80000);
    assert.ok((r.warnings.map((w) => w.code)).includes('unpriced_ingredients'));
  });

  it('shares running costs per kitchen day when the basis is day', () => {
    const r = computeCosting(
      job({ count: 100, include_running_costs: true, ops_days: 2 }),
      catalog,
      settings(),
      noRunning({ basis: 'day', kitchen_days: 25, gas: 250000 }),
    );
    assert.equal(r.running_costs, 20000);
  });

  it('falls back to markup when test_price is chosen without a price', () => {
    const r = computeCosting(job({ count: 10, pricing_method: 'test_price', test_price: 0 }), catalog, settings(), noRunning());
    assert.equal(r.pricing_method, 'markup');
  });

  it('uses the test price and warns on a loss', () => {
    const r = computeCosting(
      job({ count: 10, overheads: [{ name: 'Pack', qty: 1, unit_cost: 500, per: 'unit' }], pricing_method: 'test_price', test_price: 400 }),
      catalog,
      settings(),
      noRunning(),
    );
    assert.equal(r.price, 4000);
    assert.equal(r.profit, -1000);
    assert.ok((r.warnings.map((w) => w.code)).includes('loss'));
  });

  it('honours a markup override and warns about high food cost', () => {
    const r = computeCosting(
      job({ count: 100, menu: [{ recipe: 'jollof', per_unit: 1 }], markup_override: 10 }),
      catalog,
      settings(),
      noRunning(),
    );
    assert.equal(r.markup_pct, 10);
    assert.equal(r.price_per_unit, 176);
    assert.ok((r.warnings.map((w) => w.code)).includes('high_food_cost'));
  });

  it('warns when running costs are included but not set', () => {
    const r = computeCosting(job({ count: 10, include_running_costs: true }), catalog, settings(), noRunning());
    assert.ok((r.warnings.map((w) => w.code)).includes('running_costs_unset'));
  });
});
