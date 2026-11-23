import { InventoryItem, StockLog, StockMovementType } from '@/types';
import { isVolumeUom, volumeEnteredQtyToStock, volumeUnitOptions } from '@/lib/volume-units';
import type { ConfirmPreviewRow } from '@/components/confirm-preview-modal';

export type ProductCategory = InventoryItem['category'];
export const ALL_UOMS: InventoryItem['unitOfMeasure'][] = ['Cartons', 'Units', 'Kg', 'Liters', 'ml'];

/** A review step shown in ConfirmPreviewModal before a write runs. */
export type ConfirmState = {
  title: string;
  subtitle?: string;
  rows: ConfirmPreviewRow[];
  warning?: string;
  confirmLabel?: string;
  run: () => void;
};
export type RequestConfirm = (state: ConfirmState) => void;

/* ────────────────── Money and quantity input ────────────────── */

export const roundMoney2 = (n: number | undefined | null) => Math.round((Number(n) || 0) * 100) / 100;

/** ₦-less 2dp amount used in review rows (kept from the original screens). */
export const fmtMoney = (n: number | undefined | null) =>
  roundMoney2(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const parseMoneyInput = (raw: string) => {
  if (raw.trim() === '') return 0;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

export const roundQty2 = (n: number | undefined | null) => Math.round((Number(n) || 0) * 100) / 100;

const parseKgQtyInput = (raw: string) => {
  if (raw.trim() === '') return 0;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  return roundQty2(n);
};

/** Allow typing intermediate Kg values like "0." / "0.5" in controlled inputs. */
export const acceptDecimal2 = (raw: string) => raw.trim() === '' || /^\d*\.?\d{0,2}$/.test(raw.trim());

export const sanitizeKgQtyDraft = (raw: string): string | null => {
  const t = raw.trim();
  if (t === '') return '';
  if (!/^\d*\.?\d{0,2}$/.test(t)) return null;
  return t;
};

export const kgQtyDraftToNumber = (raw: string) => parseKgQtyInput(raw);

/* ────────────────── Units ────────────────── */

export function isCartonsUom(uom?: string) {
  return (uom ?? '').trim().toLowerCase() === 'cartons';
}

export function defaultPurchaseUom(item?: InventoryItem | null): string {
  if (!item) return '';
  if (isCartonsUom(item.unitOfMeasure)) return 'Carton';
  return item.unitOfMeasure || 'Units';
}

export function purchaseUnitOptions(item?: InventoryItem | null): string[] {
  if (!item) return [];
  if (isCartonsUom(item.unitOfMeasure)) return ['Carton', 'Kg'];
  if (item.unitOfMeasure === 'Kg') return ['Kg', 'Carton'];
  if (isVolumeUom(item.unitOfMeasure)) return volumeUnitOptions(item.unitOfMeasure);
  return [item.unitOfMeasure || 'Units'];
}

/** Convert entered purchase qty+unit into catalog stock quantity. */
export function purchaseQtyToStockQty(item: InventoryItem, enteredQty: number, purchaseUom: string): number {
  const qty = Math.abs(enteredQty);
  if (!(qty > 0)) return 0;
  const weight = Number(item.cartonWeight ?? 0);

  if (isCartonsUom(item.unitOfMeasure)) {
    if (purchaseUom === 'Kg') {
      if (!(weight > 0)) return 0;
      return roundQty2(qty / weight);
    }
    return roundQty2(qty);
  }

  if (item.unitOfMeasure === 'Kg') {
    if (purchaseUom === 'Carton') {
      if (!(weight > 0)) return 0;
      return roundQty2(qty * weight);
    }
    return roundQty2(qty);
  }

  if (isVolumeUom(item.unitOfMeasure)) return volumeEnteredQtyToStock(item.unitOfMeasure, qty, purchaseUom);

  return qty;
}

export function needsPurchaseCartonWeight(item: InventoryItem | null | undefined, purchaseUom: string): boolean {
  if (!item || !purchaseUom) return false;
  if (isCartonsUom(item.unitOfMeasure)) return true;
  if (item.unitOfMeasure === 'Kg' && purchaseUom === 'Carton') return true;
  return false;
}

/* ────────────────── FIFO / FEFO batches from the hub ledger ────────────────── */

export interface FifoBatch {
  logId: string;
  batchNumber?: string;
  date: string;
  expiryDate?: string;
  quantityRemaining: number;
  unitCost: number;
  unitPrice: number;
  supplier?: string;
}

export function buildFifoBatches(allLogs: StockLog[], itemId: string, options?: { includeDepleted?: boolean }): FifoBatch[] {
  const itemLogs = allLogs
    .filter((l) => l.itemId === itemId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const batches: FifoBatch[] = [];

  const openBatch = (log: StockLog) => {
    batches.push({
      logId: log.id,
      batchNumber: log.batchNumber,
      date: log.date,
      expiryDate: log.expiryDate,
      quantityRemaining: Math.abs(log.quantity),
      unitCost: log.unitCost,
      unitPrice: log.unitPrice ?? 0,
      supplier: log.supplier,
    });
  };

  /** Credit qty back onto an existing batch code (void RETURN); else open a new batch. */
  const creditToBatch = (log: StockLog) => {
    const code = (log.batchNumber || '').trim();
    if (code) {
      const existing = batches.find((b) => (b.batchNumber || '').trim() === code);
      if (existing) {
        existing.quantityRemaining += Math.abs(log.quantity);
        return;
      }
    }
    openBatch(log);
  };

  const deductFromBatches = (log: StockLog) => {
    let toDeduct = Math.abs(log.quantity);
    const targetBatch = (log.batchNumber || '').trim();
    const sortedBatches = [...batches].sort((a, b) => a.date.localeCompare(b.date));
    const pool = targetBatch ? sortedBatches.filter((b) => (b.batchNumber || '').trim() === targetBatch) : sortedBatches;
    for (const batch of pool) {
      if (toDeduct <= 0) break;
      if (batch.quantityRemaining <= 0) continue;
      const take = Math.min(batch.quantityRemaining, toDeduct);
      batch.quantityRemaining -= take;
      toDeduct -= take;
    }
  };

  for (const log of itemLogs) {
    if (
      log.type === StockMovementType.PURCHASE ||
      (log.type === StockMovementType.TRANSFER && log.quantity > 0) ||
      (log.type === StockMovementType.ADJUSTMENT && log.quantity > 0)
    ) {
      openBatch(log);
    } else if (log.type === StockMovementType.RETURN) {
      creditToBatch(log);
    } else if (
      log.type === StockMovementType.SALE ||
      (log.type === StockMovementType.TRANSFER && log.quantity < 0) ||
      (log.type === StockMovementType.ADJUSTMENT && log.quantity < 0)
    ) {
      deductFromBatches(log);
    }
  }

  return batches.filter((b) => {
    if ((b.batchNumber || '').startsWith('UNLABELED-')) return false;
    if (options?.includeDepleted) return true;
    return b.quantityRemaining > 0;
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(expiryDate: string, now = Date.now()) {
  return Math.ceil((new Date(expiryDate).getTime() - now) / DAY_MS);
}

/** Open batches that are already expired or expire within 30 days. */
export function expiringOpenBatches(batches: FifoBatch[], now = Date.now()): FifoBatch[] {
  const cutoff = now + 30 * DAY_MS;
  return batches.filter((batch) => {
    if (!batch.expiryDate || batch.quantityRemaining <= 0) return false;
    return new Date(batch.expiryDate).getTime() <= cutoff;
  });
}

/** Expiry tone: expired = danger, within 30 days = warning. */
export function expiryTone(expiryDate?: string): 'danger' | 'warning' | 'neutral' {
  if (!expiryDate) return 'neutral';
  const d = daysUntil(expiryDate);
  if (d < 0) return 'danger';
  if (d <= 30) return 'warning';
  return 'neutral';
}

export function getExpiryLabel(expiryDate?: string): string {
  if (!expiryDate) return '';
  const d = daysUntil(expiryDate);
  if (d < 0) return `Expired ${Math.abs(d)}d ago`;
  if (d === 0) return 'Expires today';
  return `${d}d left`;
}

/* ────────────────── Product figures ────────────────── */

/** Carton products sell by the carton; everything else by base price. */
export function sellingPriceForMargin(item: { unitOfMeasure?: string; baseSellingPrice?: number; cartonPrice?: number }) {
  if (item.unitOfMeasure === 'Cartons' && item.cartonPrice != null && item.cartonPrice > 0) return item.cartonPrice;
  return item.baseSellingPrice ?? 0;
}

export function marginPct(item: InventoryItem) {
  const sell = sellingPriceForMargin(item);
  return sell > 0 ? ((sell - item.avgUnitCost) / sell) * 100 : 0;
}

export type StockState = 'In stock' | 'Low' | 'Out';

/** Out at or below zero; Low at or below the minimum level. */
export function stockState(item: Pick<InventoryItem, 'currentStock' | 'minStockLevel'>): StockState {
  if (item.currentStock <= 0) return 'Out';
  if (item.currentStock <= item.minStockLevel) return 'Low';
  return 'In stock';
}

/** Above the minimum but within 1.5x of it (the old "Low" level, before "Critical"). */
export function nearMinimum(item: Pick<InventoryItem, 'currentStock' | 'minStockLevel'>): boolean {
  return item.minStockLevel > 0 && item.currentStock > item.minStockLevel && item.currentStock <= item.minStockLevel * 1.5;
}

const UOM_SHORT: Record<string, string> = { Kg: 'kg', Units: 'units', Cartons: 'cartons', Liters: 'L', ml: 'ml' };

/**
 * Stock position of a list of products: value at average cost, retail value, units by unit of measure.
 * Negative stock counts as zero; retail uses the carton price for carton products (the old screen
 * multiplied cartons by the per-kg price).
 */
export function stockPosition(items: InventoryItem[]) {
  let cost = 0;
  let retail = 0;
  const byUom = new Map<string, number>();
  const categories = new Set<string>();
  for (const i of items) {
    const onHand = Math.max(0, i.currentStock || 0);
    cost += onHand * i.avgUnitCost;
    retail += onHand * sellingPriceForMargin(i);
    const uom = i.unitOfMeasure || 'Units';
    byUom.set(uom, (byUom.get(uom) ?? 0) + onHand);
    categories.add(i.category);
  }
  const units = [...byUom.values()].reduce((a, b) => a + b, 0);
  const uomBreakdown = [...byUom.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([u, n]) => ({ uom: UOM_SHORT[u] ?? u, qty: n }));
  return { cost, retail, units, uomBreakdown, categoryCount: categories.size };
}

export { downloadCsv } from '@/lib/csv';
