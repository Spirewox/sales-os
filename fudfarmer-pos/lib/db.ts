/**
 * IndexedDB layer — the till's local database.
 *
 * Every write in the app goes through here; components never touch IDB directly.
 * A sale is written to `sales` AND enqueued in `outbox` inside ONE transaction,
 * so a sale can never be recorded without also being queued for sync.
 */

import { PosProduct, PosCustomer, PosSale, OutboxItem, StoreProfile, Cashier, Shift, SyncState, HeldSale, StockCount, AssistRequest } from './types';

const DB_NAME = 'fudfarmer-pos';
const DB_VERSION = 4;

export const STORES = {
  settings: 'settings',
  catalog: 'catalog',
  customers: 'customers',
  sales: 'sales',
  outbox: 'outbox',
  cashiers: 'cashiers',
  shifts: 'shifts',
  held: 'held',
  stockCounts: 'stockCounts',
  assists: 'assists',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') return Promise.reject(new Error('IndexedDB unavailable on server'));
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.settings)) db.createObjectStore(STORES.settings, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.catalog)) {
        const s = db.createObjectStore(STORES.catalog, { keyPath: 'id' });
        s.createIndex('category', 'category');
      }
      if (!db.objectStoreNames.contains(STORES.customers)) db.createObjectStore(STORES.customers, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.sales)) {
        const s = db.createObjectStore(STORES.sales, { keyPath: 'id' });
        s.createIndex('createdAt', 'createdAt');
        s.createIndex('syncState', 'syncState');
      }
      if (!db.objectStoreNames.contains(STORES.outbox)) {
        const s = db.createObjectStore(STORES.outbox, { keyPath: 'id' });
        s.createIndex('state', 'state');
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains(STORES.cashiers)) db.createObjectStore(STORES.cashiers, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.shifts)) db.createObjectStore(STORES.shifts, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.held)) db.createObjectStore(STORES.held, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.stockCounts)) db.createObjectStore(STORES.stockCounts, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.assists)) db.createObjectStore(STORES.assists, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// ── generic helpers ──
async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export const getAll = <T>(store: string) => tx<T[]>(store, 'readonly', (s) => s.getAll());
export const getOne = <T>(store: string, key: string) => tx<T | undefined>(store, 'readonly', (s) => s.get(key));
export const put = <T>(store: string, value: T) => tx<IDBValidKey>(store, 'readwrite', (s) => s.put(value));
export const del = (store: string, key: string) => tx<undefined>(store, 'readwrite', (s) => s.delete(key));

export async function putMany<T>(store: string, values: T[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    const os = t.objectStore(store);
    values.forEach((v) => os.put(v));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// ── domain accessors ──
export const getStore = () => getOne<StoreProfile>(STORES.settings, 'store');
export const saveStore = (p: StoreProfile) => put(STORES.settings, p);

export const getCatalog = () => getAll<PosProduct>(STORES.catalog);
export const saveCatalog = (items: PosProduct[]) => putMany(STORES.catalog, items);
export const saveProduct = (p: PosProduct) => put(STORES.catalog, p);

export const getCustomers = () => getAll<PosCustomer>(STORES.customers);
export const saveCustomers = (items: PosCustomer[]) => putMany(STORES.customers, items);

export const getCashiers = () => getAll<Cashier>(STORES.cashiers);
export const saveCashiers = (items: Cashier[]) => putMany(STORES.cashiers, items);

export const getSales = () => getAll<PosSale>(STORES.sales);
export const getShifts = () => getAll<Shift>(STORES.shifts);

export const getAssists = () => getAll<AssistRequest>(STORES.assists);
export const saveAssist = (a: AssistRequest) => put(STORES.assists, a);

export const getStockCounts = () => getAll<StockCount>(STORES.stockCounts);
export const saveStockCount = (c: StockCount) => put(STORES.stockCounts, c);

export const getHeld = () => getAll<HeldSale>(STORES.held);
export const saveHeld = (h: HeldSale) => put(STORES.held, h);
export const deleteHeld = (id: string) => del(STORES.held, id);

export const getOutbox = () => getAll<OutboxItem>(STORES.outbox);

/** Persist a shift AND queue it for sync in one transaction. */
export async function saveShift(shift: Shift): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction([STORES.shifts, STORES.outbox], 'readwrite');
    t.objectStore(STORES.shifts).put(shift);
    t.objectStore(STORES.outbox).put({
      id: `ob-shift-${shift.id}-${shift.status}`,
      type: 'shift',
      refId: `${shift.id}:${shift.status}`,
      payload: shift,
      attempts: 0,
      createdAt: new Date().toISOString(),
      state: 'pending' as SyncState,
    } satisfies OutboxItem);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

/**
 * Record a sale: writes the sale AND its outbox entry atomically.
 * If the transaction fails, neither lands — never a sale without a queue entry.
 */
export async function recordSale(sale: PosSale): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction([STORES.sales, STORES.outbox, STORES.catalog], 'readwrite');
    t.objectStore(STORES.sales).put(sale);
    t.objectStore(STORES.outbox).put({
      id: `ob-${sale.id}`,
      type: 'sale',
      refId: sale.id,
      payload: sale,
      attempts: 0,
      createdAt: sale.createdAt,
      state: 'pending' as SyncState,
    } satisfies OutboxItem);

    // decrement local stock estimate (server remains the truth)
    const cat = t.objectStore(STORES.catalog);
    sale.lines.forEach((l) => {
      const req = cat.get(l.productId);
      req.onsuccess = () => {
        const p = req.result as PosProduct | undefined;
        if (p && p.trackStock && typeof p.stock === 'number') {
          cat.put({ ...p, stock: p.stock - l.qty });
        }
      };
    });

    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

/**
 * Reverse a sale — fully or partially (§11, §12).
 *
 * `lines` names the quantity being returned per product; omit it for a full
 * reversal. The original is never deleted: it is stamped with the cumulative
 * returned quantities so repeat partial returns can't exceed what was sold,
 * and is only marked refunded/voided once everything has come back.
 */
export async function reverseSale(
  original: PosSale,
  opts: {
    mode: 'refunded' | 'voided';
    by: string;
    reason: string;
    /** productId → qty being returned now. Omit for a full reversal. */
    lines?: Record<string, number>;
  },
): Promise<PosSale> {
  const db = await openDb();
  const at = new Date().toISOString();
  const alreadyReturned = original.returnedQty || {};

  // Work out what is actually coming back, clamped to what remains returnable.
  const returning: Record<string, number> = {};
  original.lines.forEach((l) => {
    const remaining = l.qty - (alreadyReturned[l.productId] || 0);
    const want = opts.lines ? (opts.lines[l.productId] || 0) : remaining;
    returning[l.productId] = Math.max(0, Math.min(want, remaining));
  });

  const revLines = original.lines
    .filter((l) => returning[l.productId] > 0)
    .map((l) => {
      const q = returning[l.productId];
      const unitNet = l.qty > 0 ? l.lineTotal / l.qty : 0;   // discount shared pro-rata
      return { ...l, qty: -q, lineTotal: -Math.round(unitNet * q), discount: -Math.round((l.discount / (l.qty || 1)) * q) };
    });

  const refundNet = -revLines.reduce((a, l) => a + l.lineTotal, 0);       // positive magnitude
  const soldNet = original.lines.reduce((a, l) => a + l.lineTotal, 0);
  // Proportion of the original sale coming back — scale the real charged figures
  // by it so tax (inclusive or exclusive) and cart discounts fall out correctly.
  const share = soldNet > 0 ? refundNet / soldNet : 0;
  const taxShare = Math.round((original.tax || 0) * share);
  const refundTotal = Math.round(original.total * share);

  // Cumulative returns after this one, and whether anything is still outstanding.
  const nextReturned: Record<string, number> = { ...alreadyReturned };
  Object.entries(returning).forEach(([id, q]) => { if (q > 0) nextReturned[id] = (nextReturned[id] || 0) + q; });
  const fullyReturned = original.lines.every((l) => (nextReturned[l.productId] || 0) >= l.qty);

  const reversal: PosSale = {
    ...original,
    id: `${original.id}-rev-${Date.now().toString(36)}`,
    reversalOf: original.id,
    status: opts.mode,
    partial: !fullyReturned,
    createdAt: at,
    syncState: 'pending',
    lines: revLines,
    subtotal: -refundNet,
    discount: -revLines.reduce((a, l) => a + Math.abs(l.discount), 0),
    orderDiscount: undefined,
    tax: taxShare ? -taxShare : undefined,
    total: -refundTotal,
    payments: original.payments.length
      ? [{ ...original.payments[0], amount: -refundTotal }]
      : [{ method: 'Cash' as const, amount: -refundTotal }],
    change: 0,
    returnedQty: undefined,
    refundedAt: at, refundedBy: opts.by, refundReason: opts.reason,
  };

  return new Promise((resolve, reject) => {
    const t = db.transaction([STORES.sales, STORES.outbox, STORES.catalog], 'readwrite');
    const salesStore = t.objectStore(STORES.sales);
    // Stamp the original: only flip its status once everything has been returned.
    salesStore.put({
      ...original,
      status: fullyReturned ? opts.mode : original.status,
      returnedQty: nextReturned,
      refundedAt: at, refundedBy: opts.by, refundReason: opts.reason,
    });
    salesStore.put(reversal);
    t.objectStore(STORES.outbox).put({
      id: `ob-${reversal.id}`,
      type: opts.mode === 'voided' ? 'void' : 'refund',
      refId: reversal.id,
      payload: reversal,
      attempts: 0,
      createdAt: at,
      state: 'pending' as SyncState,
    } satisfies OutboxItem);

    // put the returned units back
    const cat = t.objectStore(STORES.catalog);
    Object.entries(returning).forEach(([productId, q]) => {
      if (q <= 0) return;
      const req = cat.get(productId);
      req.onsuccess = () => {
        const p = req.result as PosProduct | undefined;
        if (p && p.trackStock && typeof p.stock === 'number') cat.put({ ...p, stock: p.stock + q });
      };
    });

    t.oncomplete = () => resolve(reversal);
    t.onerror = () => reject(t.error);
  });
}

/** Mark an outbox item + its sale after a sync attempt. */
export async function markSynced(item: OutboxItem, state: SyncState, error?: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction([STORES.outbox, STORES.sales], 'readwrite');
    const ob = t.objectStore(STORES.outbox);
    if (state === 'synced') {
      ob.delete(item.id); // drained
    } else {
      ob.put({ ...item, state, attempts: item.attempts + 1, lastError: error });
    }
    if (item.type === 'sale' || item.type === 'refund' || item.type === 'void') {
      const sreq = t.objectStore(STORES.sales).get(item.refId);
      sreq.onsuccess = () => {
        const sale = sreq.result as PosSale | undefined;
        if (sale) t.objectStore(STORES.sales).put({ ...sale, syncState: state });
      };
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

/** Wipe everything (dev/demo reset). */
export async function resetDb(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const names = Array.from(db.objectStoreNames);
    const t = db.transaction(names, 'readwrite');
    names.forEach((n) => t.objectStore(n).clear());
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
