import type { InventoryItem } from '@/types';

/** Product count and stock value at average unit cost, for the Dashboard's second KPI strip. */
export function stockTotals(items: InventoryItem[]) {
  return { skus: items.length, value: items.reduce((a, i) => a + i.currentStock * i.avgUnitCost, 0) };
}
