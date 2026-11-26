/**
 * Deterministic sample data for the dev-only mock API (see lib/mock-api/handler.ts).
 * Shapes follow the backend's snake_case API types in types/api.ts.
 */
import type {
  ApiAgentUser,
  ApiAuditLog,
  ApiCompensation,
  ApiCreditRecord,
  ApiCustomer,
  ApiEnquiry,
  ApiFeedback,
  ApiHub,
  ApiInventoryRequest,
  ApiProduct,
  ApiRole,
  ApiSale,
  ApiSegment,
  ApiStockLog,
  ApiSupplier,
  ApiSupplierIssue,
  ApiTask,
} from '@/types/api';
import type { CrmNotification } from '@/lib/kitchen-types';
import { PRODUCT_CATEGORY_COLORS } from '@/lib/product-categories';

// ── Seeded RNG so the data is stable across reloads ─────────────────────────
let seed = 20261120;
function rand(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;
const round = (n: number, step = 50) => Math.round(n / step) * step;

const NOW = new Date();
const DAY = 86_400_000;
const daysAgo = (d: number, hour = int(8, 19)) => {
  const date = new Date(NOW.getTime() - d * DAY);
  date.setHours(hour, int(0, 59), 0, 0);
  return date.toISOString();
};
const daysAhead = (d: number) => new Date(NOW.getTime() + d * DAY).toISOString();

let idCounter = 0;
export const newId = (prefix: string) => `${prefix}_${(++idCounter).toString(36).padStart(5, '0')}`;

// ── Hubs ────────────────────────────────────────────────────────────────────
export const hubs: ApiHub[] = [
  { _id: 'hub_lagos', hub_name: 'Lagos Hub', code: 'LAG', hub_address: '14 Adeniyi Jones Ave, Ikeja', hub_phone: '0803 456 7812', manager_name: 'Tolu Adebayo', is_active: true, location_type: 'hub', child_rsp_count: 2, ownership_type: 'RO', createdAt: daysAgo(540) },
  { _id: 'hub_ife', hub_name: 'Ife Hub', code: 'IFE', hub_address: '3 Mayfair Rd, Ile-Ife', hub_phone: '0806 221 9034', manager_name: 'Kunle Oyewole', is_active: true, location_type: 'hub', child_rsp_count: 1, ownership_type: 'RO', createdAt: daysAgo(480) },
  { _id: 'hub_nasarawa', hub_name: 'Nasarawa Hub', code: 'NAS', hub_address: 'Shendam Rd, Lafia', hub_phone: '0809 874 1123', manager_name: 'Aisha Bello', is_active: true, location_type: 'hub', child_rsp_count: 0, ownership_type: 'RO', createdAt: daysAgo(300) },
  { _id: 'rsp_lekki', hub_name: 'Lekki RSP', code: 'LEK', hub_address: 'Admiralty Way, Lekki Phase 1', manager_name: 'Chidi Okafor', is_active: true, location_type: 'rsp', parent_hub: 'hub_lagos', parent_hub_name: 'Lagos Hub', ownership_type: 'RF', createdAt: daysAgo(200) },
  { _id: 'rsp_yaba', hub_name: 'Yaba RSP', code: 'YAB', hub_address: 'Herbert Macaulay Way, Yaba', manager_name: 'Ngozi Eze', is_active: true, location_type: 'rsp', parent_hub: 'hub_lagos', parent_hub_name: 'Lagos Hub', ownership_type: 'RF', createdAt: daysAgo(150) },
  { _id: 'rsp_modakeke', hub_name: 'Modakeke RSP', code: 'MOD', hub_address: 'Modakeke Rd, Ife', manager_name: 'Bisi Akande', is_active: true, location_type: 'rsp', parent_hub: 'hub_ife', parent_hub_name: 'Ife Hub', ownership_type: 'RF', createdAt: daysAgo(90) },
];
const hubWeights = ['hub_lagos', 'hub_lagos', 'hub_lagos', 'rsp_lekki', 'rsp_yaba', 'hub_ife', 'hub_ife', 'rsp_modakeke', 'hub_nasarawa'];
const hubName = (id: string) => hubs.find((h) => h._id === id)?.hub_name ?? '';

// ── Roles & users ───────────────────────────────────────────────────────────
export const roles: ApiRole[] = [
  { _id: 'role_admin', name: 'company_admin', label: 'Company Admin', description: 'Full access across all hubs', is_system: true, permissions: [] },
  { _id: 'role_hub', name: 'hub_manager', label: 'Hub Manager', description: 'Runs a hub and its RSPs', is_system: true, permissions: [] },
  { _id: 'role_finance', name: 'finance', label: 'Finance', description: 'Credits, payments and reporting', is_system: true, permissions: [] },
  { _id: 'role_cs', name: 'customer_success', label: 'Customer Success', description: 'Customers and engagement', is_system: true, permissions: [] },
  { _id: 'role_cashier', name: 'cashier', label: 'Cashier', description: 'POS only', is_system: true, permissions: [] },
  { _id: 'role_kitchen', name: 'kitchen_manager', label: 'Kitchen Manager', description: 'Kitchen jobs and costing', is_system: true, permissions: [] },
];
const roleRef = (id: string) => {
  const r = roles.find((x) => x._id === id)!;
  return { label: r.label, name: r.name };
};

export const users: ApiAgentUser[] = [
  ['Tolu Adebayo', 'role_hub', 'hub_lagos'],
  ['Kunle Oyewole', 'role_hub', 'hub_ife'],
  ['Aisha Bello', 'role_hub', 'hub_nasarawa'],
  ['Funmi Balogun', 'role_finance', null],
  ['Emeka Nwosu', 'role_cs', 'hub_lagos'],
  ['Zainab Musa', 'role_cs', 'hub_nasarawa'],
  ['Chidi Okafor', 'role_cashier', 'rsp_lekki'],
  ['Ngozi Eze', 'role_cashier', 'rsp_yaba'],
  ['Segun Alade', 'role_kitchen', 'hub_lagos'],
  ['Design Preview', 'role_admin', null],
].map(([name, role, hub], i) => ({
  _id: i === 9 ? 'mock-user' : `user_${i + 1}`,
  full_name: name as string,
  email: `${(name as string).split(' ')[0].toLowerCase()}@fudfarmer.com`,
  username: (name as string).split(' ')[0].toLowerCase(),
  phone: `080${int(10000000, 99999999)}`,
  is_active: true,
  createdAt: daysAgo(int(60, 500)),
  role: roleRef(role as string),
  hub: hub ? { _id: hub as string, hub_name: hubName(hub as string) } : null,
  // Kunle Oyewole (user_2) manages Ife Hub and Nasarawa Hub; Zainab Musa (user_6) covers Nasarawa and
  // Lagos, so a manager of Nasarawa sees Lagos locked as outside their locations. The rest hold one.
  hubs: i === 1
    ? [{ _id: 'hub_ife', hub_name: hubName('hub_ife') }, { _id: 'hub_nasarawa', hub_name: hubName('hub_nasarawa') }]
    : i === 5
      ? [{ _id: 'hub_nasarawa', hub_name: hubName('hub_nasarawa') }, { _id: 'hub_lagos', hub_name: hubName('hub_lagos') }]
      : hub ? [{ _id: hub as string, hub_name: hubName(hub as string) }] : [],
}));
const salesAgents = users.filter((u) => ['role_hub', 'role_cs', 'role_cashier'].includes(roles.find((r) => r.label === (u.role as { label: string }).label)!._id));

// ── Segments ────────────────────────────────────────────────────────────────
export const segments: ApiSegment[] = [
  { _id: 'seg_vip', name: 'VIP', slug: 'vip' },
  { _id: 'seg_wholesale', name: 'Wholesale', slug: 'wholesale' },
  { _id: 'seg_restaurants', name: 'Restaurant Partners', slug: 'restaurant-partners' },
  { _id: 'seg_weekend', name: 'Weekend Buyers', slug: 'weekend-buyers' },
  { _id: 'seg_new', name: 'New This Quarter', slug: 'new-this-quarter' },
];

// ── Products ────────────────────────────────────────────────────────────────
type ProductSeed = [name: string, category: string, uom: string, cost: number, margin: number];
const PRODUCT_SEEDS: ProductSeed[] = [
  ['Titus Mackerel', 'Fish', 'Cartons', 38_000, 0.18],
  ['Croaker Fish', 'Fish', 'Kg', 3_600, 0.22],
  ['Hake Fish', 'Fish', 'Cartons', 41_500, 0.17],
  ['Catfish (Live)', 'Fish', 'Kg', 2_800, 0.25],
  ['Tiger Prawns', 'Seafood', 'Kg', 9_500, 0.24],
  ['Calamari Rings', 'Seafood', 'Kg', 7_200, 0.26],
  ['Whole Chicken', 'Chicken', 'Cartons', 46_000, 0.16],
  ['Chicken Laps', 'Chicken', 'Cartons', 52_000, 0.15],
  ['Chicken Wings', 'Chicken', 'Kg', 3_900, 0.22],
  ['Gizzard', 'Chicken', 'Kg', 3_300, 0.24],
  ['Turkey Wings', 'Turkey', 'Cartons', 61_000, 0.15],
  ['Turkey Drumsticks', 'Turkey', 'Kg', 4_700, 0.2],
  ['Goat Meat', 'Goat', 'Kg', 6_400, 0.2],
  ['Beef (Boneless)', 'Cow', 'Kg', 5_800, 0.18],
  ['Cow Tail', 'Cow', 'Kg', 6_900, 0.21],
  ['Ram Meat', 'Ram', 'Kg', 6_700, 0.19],
  ['Snail (Jumbo)', 'Beef & Exotic', 'Units', 1_300, 0.3],
  ['Beef Sausage', 'Sausage', 'Cartons', 24_000, 0.2],
  ['Chicken Frankfurters', 'Sausage', 'Cartons', 21_500, 0.22],
  ['Red Palm Oil', 'Palm Oil', 'Liters', 2_100, 0.2],
  ['Groundnut Oil', 'Oil and Spice', 'Liters', 2_600, 0.16],
  ['Suya Spice Mix', 'Oil and Spice', 'Units', 900, 0.4],
  ['Ofada Rice', 'Grain', 'Kg', 1_700, 0.22],
  ['Parboiled Rice (50kg)', 'Grains & Staples', 'Units', 72_000, 0.1],
  ['Yam Flour (Elubo)', 'Flour', 'Kg', 1_400, 0.25],
  ['Plantain Flour', 'Flour', 'Kg', 1_900, 0.28],
  ['Yam Tubers', 'Tuber', 'Units', 2_500, 0.2],
  ['Raw Honey', 'Honey', 'Liters', 6_500, 0.3],
  ['Plantain Chips', 'Snacks', 'Units', 600, 0.45],
  ['Chin Chin (500g)', 'Snacks', 'Units', 1_100, 0.4],
];

export const products: ApiProduct[] = PRODUCT_SEEDS.map(([name, category, uom, cost, margin], i) => {
  const price = round(cost * (1 + margin));
  const min = uom === 'Cartons' ? 10 : uom === 'Units' ? 40 : 25;
  // Mostly healthy stock; a few low, a couple out.
  const stock = i % 11 === 4 ? 0 : i % 7 === 3 ? int(1, min - 1) : int(min + 5, min * 6);
  const hub = pick(['hub_lagos', 'hub_lagos', 'hub_ife', 'hub_nasarawa']);
  return {
    _id: `prod_${i + 1}`,
    sku: `${category.slice(0, 3).toUpperCase()}-${String(100 + i)}`,
    name,
    category,
    unit_of_measure: uom,
    min_stock_level: min,
    current_stock: stock,
    avg_unit_cost: cost,
    base_selling_price: price,
    carton_price: uom === 'Cartons' ? price : undefined,
    carton_cost: uom === 'Cartons' ? cost : undefined,
    carton_weight: uom === 'Cartons' ? pick([10, 12, 20]) : undefined,
    last_stock_update: daysAgo(int(0, 12)),
    hub: { _id: hub, hub_name: hubName(hub) },
    is_active: true,
    last_purchase_price: cost,
    price_history: [
      { date: daysAgo(150), cost: round(cost * 0.9), price: round(price * 0.92) },
      { date: daysAgo(75), cost: round(cost * 0.96), price: round(price * 0.97) },
      { date: daysAgo(10), cost, price },
    ],
  };
});

// ── Customers ───────────────────────────────────────────────────────────────
const FIRST = ['Adaeze', 'Babatunde', 'Chiamaka', 'Damilola', 'Efosa', 'Folake', 'Gbenga', 'Halima', 'Ifeoma', 'Jide', 'Kemi', 'Lanre', 'Maryam', 'Nnamdi', 'Obinna', 'Precious', 'Rukayat', 'Sola', 'Temitope', 'Uche', 'Victoria', 'Wale', 'Yetunde', 'Zainab', 'Ibrahim', 'Esther', 'Musa', 'Bukola', 'Chinedu', 'Hauwa'];
const LAST = ['Okonkwo', 'Adeyemi', 'Ibrahim', 'Eze', 'Ogunleye', 'Bello', 'Nwachukwu', 'Afolabi', 'Danjuma', 'Okeke', 'Olatunji', 'Abubakar', 'Onyekachi', 'Fashola', 'Garba', 'Ojo'];
const BUSINESSES: [string, string][] = [
  ['Mama Put Kitchen', 'Roadside Business & Food Vendors'],
  ['Eko Grill House', 'Restaurants & Bars'],
  ['Sunrise Suites', 'Hotels'],
  ['Grace Catering Co.', 'Catering Services'],
  ['Prime Mart Supermarket', 'Supermarkets'],
  ['Redeemed Parish Canteen', 'Religious Bodies'],
  ['Kings College Kitchen', 'Schools'],
  ['Party Palace Events', 'Event Planners'],
  ['Bukka Republic', 'Restaurants & Bars'],
  ['Lafia Fresh Stores', 'Retailers'],
  ['Ife Varsity Cafeteria', 'Education Institutions'],
  ['Zenith Towers Canteen', 'Corporate / Offices'],
  ['Spice Route Restaurant', 'Restaurants & Bars'],
  ['Harbour View Hotel', 'Hospitality'],
];

export const customers: ApiCustomer[] = [];
for (let i = 0; i < 64; i++) {
  const isB2B = i < BUSINESSES.length;
  const first = pick(FIRST);
  const last = pick(LAST);
  const hub = pick(hubWeights);
  const agent = pick(salesAgents);
  const segs: string[] = [];
  if (isB2B) segs.push(chance(0.5) ? 'seg_wholesale' : 'seg_restaurants');
  if (chance(0.15)) segs.push('seg_vip');
  if (!isB2B && chance(0.25)) segs.push('seg_weekend');
  const joinedDaysAgo = i > 54 ? int(0, 25) : int(30, 420);
  if (joinedDaysAgo < 90) segs.push('seg_new');
  customers.push({
    _id: `cust_${i + 1}`,
    customer_name: isB2B ? `${first} ${last}` : `${first} ${last}`,
    company_name: isB2B ? BUSINESSES[i][0] : undefined,
    business_category: isB2B ? BUSINESSES[i][1] : undefined,
    customer_email: chance(0.7) ? `${first.toLowerCase()}.${last.toLowerCase()}@gmail.com` : undefined,
    customer_phone: `0${pick(['803', '805', '806', '807', '808', '809', '810', '813', '816', '903'])}${int(1000000, 9999999)}`,
    customer_type: isB2B ? 'B2B' : 'B2C',
    customer_location: { _id: hub, hub_name: hubName(hub) },
    joined_date: daysAgo(joinedDaysAgo),
    segments: segs.map((id) => segments.find((s) => s._id === id)!),
    assigned_agent: { _id: agent._id, full_name: agent.full_name },
    added_by: { _id: agent._id, full_name: agent.full_name },
    gender: isB2B ? undefined : pick(['Male', 'Female']),
    age_group: isB2B ? undefined : pick(['18-25', '26-35', '26-35', '36-45', '46-60']),
    marital_status: isB2B ? undefined : pick(['Single', 'Married', 'Married']),
    employment_status: isB2B ? undefined : pick(['Privately Employed', 'Business Owner', 'Civil Servant', 'Self-Employed']),
    total_orders: 0,
    total_spent: 0,
  });
}

// Three businesses with several contacts; the fourth keeps none, to show how older records look.
const CONTACT_ROLES: [string, string][] = [['Buyer', 'Bisi Lawal'], ['Accounts', 'Femi Ojo'], ['Manager', 'Halima Sani']];
customers.slice(0, 3).forEach((c, i) => {
  c.contacts = [
    { _id: `ct_${c._id}_owner`, name: c.customer_name, role: 'Owner', phone: c.customer_phone, email: c.customer_email, is_primary: true },
    ...CONTACT_ROLES.slice(0, i + 1).map(([role, name], j) => ({
      _id: `ct_${c._id}_${j}`, name, role, phone: `0${['812', '815', '909'][j]}${int(1000000, 9999999)}`, is_primary: false,
    })),
  ];
  c.business_address = ['14 Allen Avenue, Ikeja', '3 Admiralty Way, Lekki', '22 Ring Road, Ibadan'][i];
});
const customerLabel = (c: ApiCustomer) => c.company_name ?? c.customer_name;

// ── Sales ───────────────────────────────────────────────────────────────────
export const sales: ApiSale[] = [];
export const credits: ApiCreditRecord[] = [];
const PAYMENT_TYPES = ['Transfer', 'Transfer', 'Cash', 'POS'];

for (let i = 0; i < 340; i++) {
  // Skew towards recent days so "today/this week" has activity.
  const d = i < 12 ? 0 : i < 40 ? int(1, 6) : Math.floor(Math.pow(rand(), 1.3) * 180);
  const cust = customers[Math.min(customers.length - 1, Math.floor(Math.pow(rand(), 1.6) * customers.length))];
  const product = pick(products);
  const isB2B = cust.customer_type === 'B2B';
  const qty = product.unit_of_measure === 'Cartons' ? int(1, isB2B ? 12 : 3) : int(2, isB2B ? 60 : 12);
  const gross = qty * product.base_selling_price;
  const discount = chance(0.15) ? round(gross * 0.05) : 0;
  const amount = gross - discount;
  const profit = amount - qty * product.avg_unit_cost;
  const isCredit = isB2B ? chance(0.4) : chance(0.08);
  const voided = chance(0.02);
  const channel = pick(['Walk-In', 'Walk-In', 'Delivery', 'Delivery', 'POS', 'Pre-Order']);
  const hubRef = (cust.customer_location as { _id: string })._id;
  const agent = pick(salesAgents);
  const id = `sale_${i + 1}`;
  const date = daysAgo(d);
  const paid = isCredit ? (chance(0.4) ? round(amount * 0.4) : 0) : amount;
  const sale: ApiSale = {
    _id: id,
    customer: cust._id,
    customer_name: customerLabel(cust),
    amount,
    discount,
    profit_amount: profit,
    profit_margin: Math.round((profit / amount) * 1000) / 10,
    date,
    agent: agent._id,
    agent_name: agent.full_name,
    hub: hubRef,
    hub_name: hubName(hubRef),
    status: voided ? 'Voided' : isCredit ? (paid > 0 ? 'Approved' : 'Pending') : 'Paid',
    product_details: `${qty} ${product.unit_of_measure} ${product.name}`,
    payment_mode: isCredit ? (paid > 0 ? 'Partial Credit' : 'Full Credit') : 'Full Payment',
    payment_type: pick(PAYMENT_TYPES),
    payment_terms: isCredit ? pick(['Net 7 Days', 'Net 14 Days', 'Net 30 Days']) : undefined,
    amount_paid: paid,
    channel,
    source: channel === 'POS' ? 'pos' : 'crm',
    delivery_status: channel === 'Delivery' ? (d > 2 ? 'Confirmed by Customer' : pick(['Pending Dispatch', 'In Transit', 'Delivered'])) : 'N/A',
    delivery_address: channel === 'Delivery' ? `${int(2, 40)} ${pick(['Allen Ave', 'Awolowo Rd', 'Opebi Rd', 'Bode Thomas St', 'Ozumba Mbadiwe'])}` : undefined,
    item: {
      product_id: product._id,
      product_name: product.name,
      quantity: qty,
      unit: product.unit_of_measure,
      category: product.category,
      unit_cost: product.avg_unit_cost,
      unit_price: product.base_selling_price,
    },
    createdAt: date,
    updatedAt: date,
  };
  sales.push(sale);

  if (!voided) {
    cust.total_orders = (cust.total_orders ?? 0) + 1;
    cust.total_spent = (cust.total_spent ?? 0) + amount;
  }

  if (isCredit && !voided) {
    const termDays = sale.payment_terms === 'Net 7 Days' ? 7 : sale.payment_terms === 'Net 14 Days' ? 14 : 30;
    const due = new Date(new Date(date).getTime() + termDays * DAY);
    const cleared = d > 25 && chance(0.85);
    const owed = cleared ? 0 : amount - paid;
    const payments = paid > 0 || cleared
      ? [{ id: newId('pay'), date: daysAgo(Math.max(0, d - int(1, 10))), amount: cleared ? amount - paid : paid, method: 'Transfer', recorded_by_name: 'Funmi Balogun', balance_after: owed }]
      : [];
    credits.push({
      id: `credit_${i + 1}`,
      customer_id: cust._id,
      customer_name: customerLabel(cust),
      sale: { id, date, amount, payment_mode: 'Credit', product_details: sale.product_details, item: { product_name: product.name, quantity: qty, unit: product.unit_of_measure } },
      original_amount: amount,
      amount_owed: owed,
      date_issued: date,
      due_date: due.toISOString(),
      last_payment_date: payments[0]?.date,
      status: cleared ? 'Clear' : due < NOW ? 'Overdue' : 'Pending',
      payment_terms: sale.payment_terms,
      extension_count: 0,
      flagged: !cleared && due < NOW && chance(0.3),
      payments,
      due_date_extensions: [],
    });
    sale.credit_record = `credit_${i + 1}`;
    sale.due_date = due.toISOString();
    sale.amount_paid = amount - owed;
  }
}
sales.sort((a, b) => b.date.localeCompare(a.date));

// ── Interactions ────────────────────────────────────────────────────────────
const FEEDBACK_SEEDS: [string, string, string][] = [
  ['Complaint', 'Delivery arrived two hours late and the chicken had started thawing.', 'Negative'],
  ['Complaint', 'The croaker fish was smaller than what we ordered last week.', 'Negative'],
  ['Appreciation', 'Your rider was very polite and the prawns were super fresh. Thank you!', 'Positive'],
  ['Suggestion', 'Please add smaller 5kg packs of turkey for families.', 'Neutral'],
  ['Appreciation', 'Best goat meat in Ikeja, our customers keep asking for it.', 'Positive'],
  ['Complaint', 'Was charged twice on POS for one order.', 'Negative'],
  ['Suggestion', 'A WhatsApp order line would make restocking much easier.', 'Neutral'],
  ['Appreciation', 'Thanks for the quick turnaround on our event order.', 'Positive'],
  ['Complaint', 'Palm oil container was leaking on arrival.', 'Negative'],
  ['Suggestion', 'Could you deliver on Sundays for church events?', 'Neutral'],
  ['Appreciation', 'The new suya spice mix is a hit at our grill.', 'Positive'],
  ['Complaint', 'Sausages were close to expiry date.', 'Negative'],
];
export const feedbacks: ApiFeedback[] = FEEDBACK_SEEDS.map(([type, content, sentiment], i) => {
  const cust = customers[int(0, 40)];
  const resolved = i > 4 && chance(0.6);
  return {
    _id: `fb_${i + 1}`,
    customer: cust,
    type,
    content,
    sentiment,
    status: resolved ? 'Resolved' : 'Open',
    priority: type === 'Complaint' ? pick(['High', 'Medium', 'Urgent']) : 'Low',
    resolution: resolved ? 'Called the customer and issued a replacement.' : undefined,
    resolution_date: resolved ? daysAgo(int(0, 5)) : undefined,
    resolved_by_name: resolved ? 'Emeka Nwosu' : undefined,
    createdAt: daysAgo(i * 3 + int(0, 2)),
  };
});

const ENQUIRY_SEEDS: [string, string, string][] = [
  ['Bulk pricing for hotel', 'Do you offer discounts for weekly orders above 20 cartons?', 'Pricing'],
  ['Delivery to Ajah', 'Do you deliver to Ajah and what is the fee?', 'Delivery'],
  ['Halal certification', 'Is your chicken halal certified?', 'Product'],
  ['Opening hours', 'What time does the Yaba RSP open on Saturdays?', 'General'],
  ['Event catering', 'Can you supply 200 portions of goat meat for a wedding in December?', 'Orders'],
  ['Payment options', 'Can we pay in two instalments for a large order?', 'Payments'],
  ['Stock availability', 'When will hake fish be back in stock?', 'Product'],
  ['Partnership', 'We run a chain of canteens and want to partner with you.', 'Partnership'],
];
export const enquiries: ApiEnquiry[] = ENQUIRY_SEEDS.map(([subject, message, category], i) => {
  const cust = customers[int(10, 63)];
  const closed = i > 3;
  return {
    _id: `enq_${i + 1}`,
    customer_name: customerLabel(cust),
    email: cust.customer_email,
    subject,
    message,
    category,
    status: closed ? 'Closed' : 'Open',
    resolution: closed ? 'Shared details by phone.' : undefined,
    managed_by_agent_name: pick(['Emeka Nwosu', 'Zainab Musa']),
    date: daysAgo(i * 4),
    createdAt: daysAgo(i * 4),
  };
});

export const compensations: ApiCompensation[] = [
  ['Replacement for thawed chicken', 46_000, 'Product', 'Paid'],
  ['Refund for double POS charge', 18_500, 'Refund', 'Approved'],
  ['Voucher for late delivery', 5_000, 'Voucher', 'Pending'],
  ['Branded apron for loyal customer', 3_500, 'Merch', 'Paid'],
].map(([reason, amount, category, status], i) => {
  const cust = customers[i * 5];
  return {
    _id: `comp_${i + 1}`,
    customer: cust,
    customer_name: customerLabel(cust),
    reason: reason as string,
    amount: amount as number,
    category: category as string,
    status: status as string,
    recorded_by_agent_name: 'Emeka Nwosu',
    date: daysAgo(i * 6 + 1),
    createdAt: daysAgo(i * 6 + 1),
  };
});

export const tasks: ApiTask[] = [
  ['Call Eko Grill House about overdue credit', 'High', 'To Do', 2],
  ['Restock hake fish at Lagos Hub', 'High', 'In Progress', 1],
  ['Follow up on palm oil leak complaint', 'Medium', 'To Do', 3],
  ['Send December price list to B2B customers', 'Medium', 'In Progress', 6],
  ['Onboard Modakeke RSP cashier', 'Low', 'Done', -2],
  ['Reconcile POS transfers for last week', 'Medium', 'Done', -1],
  ['Visit Sunrise Suites for contract renewal', 'High', 'To Do', 5],
].map(([title, priority, status, due], i) => {
  const who = users[i % 6];
  return {
    _id: `task_${i + 1}`,
    title: title as string,
    priority: priority as string,
    status: status as string,
    assigned_to: who._id,
    assigned_to_name: who.full_name,
    due_date: daysAhead(due as number),
    created_by: 'mock-user',
  };
});

// ── Suppliers ───────────────────────────────────────────────────────────────
export const suppliers: ApiSupplier[] = [
  ['Atlantic Cold Stores', 'Importer', ['Fish', 'Seafood'], 4.6],
  ['Obasanjo Farms', 'Farm', ['Chicken', 'Turkey'], 4.3],
  ['Sahel Livestock Co.', 'Abattoir', ['Goat', 'Cow', 'Ram'], 4.1],
  ['Delta Palm Mills', 'Processor', ['Palm Oil', 'Oil and Spice'], 3.8],
  ['Kebbi Grains Ltd', 'Distributor', ['Grain', 'Grains & Staples', 'Flour'], 4.4],
  ['Sweet Hive Apiaries', 'Producer', ['Honey'], 4.8],
].map(([name, type, cats, rating], i) => ({
  _id: `sup_${i + 1}`,
  code: `SUP-${String(i + 1).padStart(3, '0')}`,
  name: name as string,
  business_name: name as string,
  business_type: type as string,
  categories: cats as string[],
  rating: rating as number,
  contact_person: `${pick(FIRST)} ${pick(LAST)}`,
  phone: `0803${int(1000000, 9999999)}`,
  email: `sales@${(name as string).toLowerCase().replace(/[^a-z]/g, '')}.ng`,
  address: pick(['Apapa Wharf, Lagos', 'Ota, Ogun', 'Kano', 'Warri, Delta', 'Birnin Kebbi', 'Jos, Plateau']),
  payment_terms: pick(['Net 14 Days', 'Net 30 Days', 'Cash on Delivery']),
  lead_time_days: int(2, 10),
  is_active: i !== 3,
  total_spend: int(4, 40) * 1_000_000,
  hub: { _id: 'hub_lagos', hub_name: 'Lagos Hub' },
  createdAt: daysAgo(int(100, 500)),
}));

export const supplierIssues: ApiSupplierIssue[] = [
  ['sup_1', 'Quality', 'High', 'Batch of mackerel arrived partially thawed.', 'Open'],
  ['sup_4', 'Delivery', 'Medium', 'Order arrived 3 days late.', 'Resolved'],
  ['sup_2', 'Quantity', 'Low', 'Two cartons short on invoice #4471.', 'Open'],
].map(([sup, type, severity, description, status], i) => ({
  _id: `issue_${i + 1}`,
  supplier: sup,
  supplier_name: suppliers.find((s) => s._id === sup)!.name,
  type,
  severity,
  description,
  status,
  date: daysAgo(i * 9 + 2),
  reported_by_name: 'Tolu Adebayo',
  resolution_note: status === 'Resolved' ? 'Supplier credited the delay fee.' : undefined,
}));

// ── Stock logs & inventory requests ─────────────────────────────────────────
export const stockLogs: ApiStockLog[] = Array.from({ length: 48 }, (_, i) => {
  const p = pick(products);
  const type = pick(['Purchase', 'Purchase', 'Sale', 'Sale', 'Sale', 'Transfer', 'Adjustment', 'Spoilage']);
  const agent = pick(users);
  return {
    _id: `log_${i + 1}`,
    item: { _id: p._id, sku: p.sku, name: p.name, category: p.category, unit_of_measure: p.unit_of_measure },
    item_name: p.name,
    type,
    quantity: type === 'Purchase' ? int(10, 80) : int(1, 15),
    uom: p.unit_of_measure,
    unit_cost: p.avg_unit_cost,
    unit_price: p.base_selling_price,
    agent: { _id: agent._id, full_name: agent.full_name },
    batch_number: `B${int(1000, 9999)}`,
    supplier: type === 'Purchase' ? pick(suppliers).name : undefined,
    from_hub: type === 'Transfer' ? 'Lagos Hub' : undefined,
    to_hub: type === 'Transfer' ? pick(['Lekki RSP', 'Yaba RSP']) : undefined,
    reason: type === 'Spoilage' ? 'Freezer power outage' : undefined,
    date: daysAgo(Math.floor(i * 1.8)),
  };
});

export const inventoryRequests: ApiInventoryRequest[] = [
  ['rsp_lekki', 'submitted'],
  ['rsp_yaba', 'approved'],
  ['rsp_modakeke', 'fulfilled'],
  ['rsp_lekki', 'rejected'],
].map(([loc, status], i) => {
  const parent = hubs.find((h) => h._id === loc)!.parent_hub as string;
  return {
    _id: `req_${i + 1}`,
    requesting_location: { _id: loc, hub_name: hubName(loc), location_type: 'rsp' },
    fulfilling_hub: { _id: parent, hub_name: hubName(parent), location_type: 'hub' },
    status: status as ApiInventoryRequest['status'],
    lines: [products[i * 3], products[i * 3 + 1]].map((p) => ({ product_id: p._id, product_name: p.name, sku: p.sku, quantity: int(2, 12), uom: p.unit_of_measure })),
    requested_by: 'user_7',
    requested_by_name: 'Chidi Okafor',
    reviewed_by_name: status !== 'submitted' ? 'Tolu Adebayo' : undefined,
    rejection_reason: status === 'rejected' ? 'Hub stock too low this week' : undefined,
    createdAt: daysAgo(i * 2 + 1),
    updatedAt: daysAgo(i * 2),
  };
});

// ── Audit trail ─────────────────────────────────────────────────────────────
export const auditLogs: ApiAuditLog[] = sales.slice(0, 30).map((s, i) => ({
  _id: `audit_${i + 1}`,
  timestamp: s.date,
  user: s.agent,
  user_name: s.agent_name,
  action: i % 6 === 0 ? 'UPDATE' : 'CREATE',
  entity_type: i % 6 === 0 ? 'Customer' : 'Sale',
  entity_id: i % 6 === 0 ? s.customer : s._id,
  details: i % 6 === 0 ? `Updated phone number for ${s.customer_name}` : `Recorded sale of ${s.product_details} to ${s.customer_name}`,
  category: i % 6 === 0 ? 'customers' : 'sales',
  hub: { hub_name: s.hub_name },
}));

// ── Notifications ───────────────────────────────────────────────────────────
export const notifications: CrmNotification[] = [
  ['credit.overdue', 'Credit overdue', 'Eko Grill House is 6 days past due on ₦412,000.', '/credits', true],
  ['inventory.low', 'Low stock: Hake Fish', 'Lagos Hub has 3 cartons left (min 10).', '/inventory', true],
  ['inventory.request', 'New stock request', 'Lekki RSP requested 2 products from Lagos Hub.', '/inventory', false],
  ['feedback.new', 'New complaint', 'Palm oil container leaking on arrival.', '/engagement', false],
  ['sale.large', 'Large sale recorded', 'Sunrise Suites ordered ₦1.2m of poultry.', '/sales', false],
  ['kitchen.job', 'Kitchen job ready', 'Party Palace Events order is ready for pickup.', '/kitchen', false],
].map(([type, title, body, link, critical], i) => ({
  _id: `notif_${i + 1}`,
  type: type as string,
  title: title as string,
  body: body as string,
  link: link as string,
  critical: critical as boolean,
  readAt: i > 2 ? daysAgo(i) : null,
  createdAt: daysAgo(i * 0.4),
}));

export const categoryColor = (name: string) => PRODUCT_CATEGORY_COLORS[name] ?? '#64748b';
export { NOW, DAY };
