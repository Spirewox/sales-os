/** A few kitchen jobs so the mock board, job list and job drawer have something to show. */
import type { KitchenJob, KitchenJobList, KitchenStage } from '@/lib/kitchen-types';

const at = (minutesFromNow: number) => new Date(Date.now() + minutesFromNow * 60_000).toISOString();

const base = (over: Partial<KitchenJob>): KitchenJob => ({
  _id: 'kj-0',
  code: 'KJ-0000',
  hub: { _id: 'hub-1', hub_name: 'Lagos Hub' },
  stage: 'new',
  title: '',
  mode: 'packs',
  count: 0,
  customer: null,
  customer_name: 'Walk-in customer',
  phone: '',
  channel: 'Walk-in',
  fulfilment: 'pickup',
  address: '',
  due_at: at(60),
  notes: '',
  menu: [],
  overheads: [],
  labour: [],
  include_running_costs: false,
  ops_days: 1,
  pricing_method: 'markup',
  markup_override: null,
  test_price: null,
  custom_bill: true,
  bill_lines: [],
  total: 0,
  payments: [],
  paid: 0,
  costing: null,
  quoted_at: null,
  confirmed_at: at(-30),
  accepted_at: null,
  completed_at: null,
  cancelled_at: null,
  cancel_reason: '',
  expires_at: null,
  created_by: 'u-1',
  created_by_name: 'Ada',
  archived: false,
  sale: null,
  createdAt: at(-45),
  updatedAt: at(-5),
  ...over,
});

export function kitchenJobs(): KitchenJob[] {
  return [
    base({
      _id: 'kj-1', code: 'KJ-1041', stage: 'new', customer_name: 'Tolu Bakare', phone: '08031234567', channel: 'WhatsApp', due_at: at(-20),
      bill_lines: [{ desc: 'Jollof rice and chicken', qty: 4, unit_price: 3500 }], total: 14000,
    }),
    base({
      _id: 'kj-2', code: 'KJ-1042', stage: 'cooking', customer_name: 'Brightway Ltd', phone: '08099887766', channel: 'Corporate', fulfilment: 'delivery', address: '12 Admiralty Way, Lekki',
      mode: 'packs', count: 60, title: 'Office lunch packs', custom_bill: false, due_at: at(45),
      bill_lines: [{ desc: 'Office lunch packs', qty: 60, unit_price: 4000 }], total: 240000, paid: 120000,
      payments: [{ _id: 'kp-1', amount: 120000, method: 'Transfer', at: at(-120), by: 'u-1', by_name: 'Ada', note: 'Deposit' }],
      costing: {
        cost: 150000, cost_per_unit: 2500, price: 240000, price_per_unit: 4000, profit: 90000, margin: 0.375, food_cost_pct: 0.31,
        food: 74400, food_charged: 74400, overheads: 30000, labour: 20000, utilities: 15600, staff: 10000, pricing_method: 'markup', markup_pct: 60,
        running_costs_source: 'company', computed_at: at(-60),
        warnings: [{ code: 'unpriced_ingredients', message: '2 ingredients have no price, so the cost is too low.', items: ['Scotch bonnet', 'Bay leaves'] }],
        shopping_list: [
          { ingredient: 'ing-1', name: 'Long grain rice', qty: 12, unit: 'kg', packs_to_buy: 1, cost_used: 18000, cost_to_buy: 75000 },
          { ingredient: 'ing-2', name: 'Chicken thighs', qty: 9, unit: 'kg', packs_to_buy: 1, cost_used: 31500, cost_to_buy: 35000 },
          { ingredient: 'ing-3', name: 'Scotch bonnet', qty: 0.4, unit: 'kg', packs_to_buy: null, cost_used: null, cost_to_buy: 0 },
        ],
      } as KitchenJob['costing'],
    }),
    base({
      _id: 'kj-3', code: 'KJ-1043', stage: 'quoted', customer_name: 'Mrs Okafor', phone: '08122223333', channel: 'Phone', mode: 'buffet', count: 80, custom_bill: false,
      title: 'Birthday buffet', due_at: at(3 * 24 * 60), quoted_at: at(-60 * 24), confirmed_at: null, expires_at: at(6 * 24 * 60),
      bill_lines: [{ desc: 'Birthday buffet', qty: 80, unit_price: 6500 }], total: 520000,
    }),
    base({
      _id: 'kj-4', code: 'KJ-1039', stage: 'completed', customer_name: 'Chidi Eze', phone: '07055554444', due_at: at(-180), completed_at: at(-90),
      bill_lines: [{ desc: 'Ofada rice', qty: 2, unit_price: 4500 }], total: 9000, paid: 9000,
      payments: [{ _id: 'kp-2', amount: 9000, method: 'Cash', at: at(-90), by: 'u-1', by_name: 'Ada' }],
    }),
  ];
}

const STAGE_GROUPS: Record<string, KitchenStage[]> = {
  board: ['new', 'accepted', 'cooking', 'ready'],
  quotes: ['draft', 'quoted'],
};

export function kitchenJobList(q: URLSearchParams): KitchenJobList {
  const all = kitchenJobs();
  const stage = q.get('stage');
  const wanted = stage ? STAGE_GROUPS[stage] ?? (stage.split(',') as KitchenStage[]) : null;
  const term = q.get('q')?.toLowerCase();
  const rows = all.filter((j) => (!wanted || wanted.includes(j.stage)) && (!term || `${j.code} ${j.customer_name} ${j.phone}`.toLowerCase().includes(term)));
  const counts: KitchenJobList['counts'] = { completed_today: all.filter((j) => j.stage === 'completed').length };
  for (const j of all) counts[j.stage] = (counts[j.stage] ?? 0) + 1;
  const value = rows.reduce((s, j) => s + j.total, 0);
  const collected = rows.reduce((s, j) => s + j.paid, 0);
  return {
    data: rows,
    pagination: { page: 1, limit: 25, total: rows.length, totalPages: 1 },
    counts,
    summary: { count: rows.length, value, average: rows.length ? value / rows.length : 0, collected, owed: value - collected, profit: 90000, costed_jobs: 1 },
  };
}
