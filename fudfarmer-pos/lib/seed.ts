/**
 * First-run seed — catalog, cashiers, customers, store profile.
 *
 * For Owned/Franchise stores this data would be pulled from FudFarmer inventory
 * on first sync; the seed stands in for that until the backend seam is wired.
 */

import { getStore, saveStore, saveCatalog, getCashiers, saveCashiers, saveCustomers, getCatalog } from './db';
import { PosProduct, Cashier, PosCustomer, StoreProfile } from './types';
import { toKobo } from './money';
import { normaliseRole } from './permissions';

const p = (id: string, sku: string, name: string, category: string, naira: number, unit: string, stock: number, costNaira: number): PosProduct =>
  ({ id, sku, name, category, price: toKobo(naira), cost: toKobo(costNaira), unit, stock, trackStock: true, isActive: true });

export const SEED_CATALOG: PosProduct[] = [
  p('inv-f01', 'FF-FISH-01', 'Titus (Mackerel)', 'Fish', 4200, 'Kg', 120, 3200),
  p('inv-f02', 'FF-FISH-02', 'Croaker', 'Fish', 5000, 'Kg', 60, 3800),
  p('inv-f03', 'FF-FISH-03', 'Smoked Catfish', 'Fish', 4500, 'Kg', 80, 2500),
  p('inv-c01', 'FF-CHKN-01', 'Whole Chicken (Frozen)', 'Chicken', 5000, 'Kg', 90, 3800),
  p('inv-c02', 'FF-CHKN-02', 'Chicken Laps', 'Chicken', 4800, 'Kg', 75, 3600),
  p('inv-c03', 'FF-CHKN-03', 'Chicken Wings', 'Chicken', 4600, 'Kg', 40, 3400),
  p('inv-t01', 'FF-TRKY-01', 'Whole Turkey (Frozen)', 'Turkey', 6500, 'Kg', 50, 5000),
  p('inv-t02', 'FF-TRKY-02', 'Turkey Wings', 'Turkey', 6000, 'Kg', 35, 4600),
  p('inv-b01', 'FF-BEEF-01', 'Beef (Boneless)', 'Beef & Exotic', 7000, 'Kg', 45, 5200),
  p('inv-b02', 'FF-BEEF-02', 'Goat Meat', 'Beef & Exotic', 6000, 'Kg', 30, 3500),
  p('inv-s01', 'FF-SAUS-01', 'Beef Sausage (Pack)', 'Sausage', 3500, 'Units', 60, 2400),
  p('inv-p01', 'FF-PALM-01', 'Palm Oil (25L Jerrycan)', 'Palm Oil', 35000, 'Units', 12, 28000),
  p('inv-p02', 'FF-PALM-02', 'Palm Oil (5L)', 'Palm Oil', 8000, 'Units', 25, 6200),
  p('inv-g01', 'FF-RICE-01', 'Rice (50kg bag)', 'Grains & Staples', 78000, 'Units', 20, 65000),
  p('inv-g02', 'FF-BEAN-01', 'Beans (Paint Bucket)', 'Grains & Staples', 9000, 'Units', 30, 7000),
  p('inv-h01', 'FF-HNEY-01', 'Pure Honey (500ml)', 'Honey', 5000, 'Units', 18, 3500),
  p('inv-h02', 'FF-HNEY-02', 'Pure Honey (1L)', 'Honey', 8500, 'Units', 20, 6000),
];

export const SEED_CASHIERS: Cashier[] = [
  { id: 'csh-01', name: 'Aisha (Cashier)', pin: '1234', role: 'cashier', isActive: true },
  { id: 'csh-02', name: 'Tunde (Cashier)', pin: '2345', role: 'cashier', isActive: true },
  { id: 'csh-03', name: 'M-Favour (Manager)', pin: '9999', role: 'manager', isActive: true },
  { id: 'csh-04', name: 'M-Daniel (Finance)', pin: '4444', role: 'finance', isActive: true },
  { id: 'csh-05', name: 'Admin', pin: '0000', role: 'admin', isActive: true },
];

export const SEED_CUSTOMERS: PosCustomer[] = [
  { id: 'cust-01', name: 'Mama Nkechi Kitchen', phone: '08051234001' },
  { id: 'cust-02', name: 'Alhaji Musa Stores', phone: '08051234002' },
  { id: 'cust-05', name: 'Palace Hotel Nasarawa', phone: '08051234005' },
  { id: 'cust-09', name: 'De Choice Restaurant', phone: '08051234009' },
];

const genDeviceId = () => 'dev-' + Math.random().toString(36).slice(2, 10);

export const DEFAULT_STORE: StoreProfile = {
  id: 'store',
  storeName: 'FudFarmer Retail — Nasarawa',
  storeType: 'Owned',
  hubId: 'hub-nasarawa',
  currency: 'NGN',
  receiptFooter: 'Thank you for shopping with FudFarmer!',
  deviceId: genDeviceId(),
  deviceLabel: 'Till 1',
  allowNegativeStock: true,
  setupComplete: false,
  // Shelf prices already include VAT, so enabling this breaks the tax out on the
  // receipt without changing what anyone pays.
  taxRatePct: 7.5,
  taxInclusive: true,
  taxLabel: 'VAT',
  discountApprovalThresholdPct: 10,
  maxDiscountPct: 50,
};

/** Idempotent first-run seeding. */
export async function ensureSeeded(): Promise<StoreProfile> {
  let store = await getStore();
  if (!store) {
    store = { ...DEFAULT_STORE, deviceId: genDeviceId() };
    await saveStore(store);
  } else {
    // Backfill settings added after this till was first set up, so an existing
    // install never runs with tax/discount policy undefined.
    const patched: StoreProfile = {
      ...store,
      taxRatePct: store.taxRatePct ?? DEFAULT_STORE.taxRatePct,
      taxInclusive: store.taxInclusive ?? DEFAULT_STORE.taxInclusive,
      taxLabel: store.taxLabel ?? DEFAULT_STORE.taxLabel,
      discountApprovalThresholdPct: store.discountApprovalThresholdPct ?? DEFAULT_STORE.discountApprovalThresholdPct,
      maxDiscountPct: store.maxDiscountPct ?? DEFAULT_STORE.maxDiscountPct,
    };
    if (JSON.stringify(patched) !== JSON.stringify(store)) { store = patched; await saveStore(store); }
  }

  // Staff migration (§21): map the legacy 'supervisor' role onto Store Manager,
  // and add any seeded role this till predates — otherwise an existing install
  // could never gain Finance/Admin and the settings screen stays unreachable.
  const existingCashiers = await getCashiers();
  if (existingCashiers.length) {
    const fixes = existingCashiers
      .filter((c) => (c.role as string) === 'supervisor')
      .map((c) => ({ ...c, role: normaliseRole(c.role as string) }));
    const haveIds = new Set(existingCashiers.map((c) => c.id));
    const missing = SEED_CASHIERS.filter((c) => !haveIds.has(c.id));
    if (fixes.length || missing.length) await saveCashiers([...fixes, ...missing]);
  }

  const catalog = await getCatalog();
  if (catalog.length === 0) {
    await saveCatalog(SEED_CATALOG);
    await saveCashiers(SEED_CASHIERS);
    await saveCustomers(SEED_CUSTOMERS);
  }
  return store;
}
