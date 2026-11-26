import type { InventoryItem } from '@/types';
import { formatInventoryStockDisplay } from '@/lib/format-carton-stock';
import { formatMoney } from '@/lib/format';

/** Which products a list shows: the stock list defaults to active; history views ask for all. */
export type ArchiveStatus = 'active' | 'archived' | 'all';

/** An archived product is one the API marks inactive. A product with no flag is active. */
export const isArchived = (item: Pick<InventoryItem, 'isActive'>) => item.isActive === false;

/** Float noise from carton-to-kg maths should not block archiving. */
const STOCK_EPSILON = 1e-6;

/**
 * Why a product cannot be archived yet, or null when it can: open stock requests, which someone is
 * waiting on. Stock on hand does not block; the confirm warns about it (archiveStockWarning).
 */
export function archiveBlocker(_item: InventoryItem, openRequestCount: number): string | null {
  if (openRequestCount > 0) return `Close the ${openRequestCount} open ${openRequestCount === 1 ? 'request' : 'requests'} first.`;
  return null;
}

/** The stock a product still holds, as the drawer shows it ("40 cartons", "12 Units"), or null at zero. */
export function stockOnHand(item: InventoryItem): string | null {
  return Math.abs(item.currentStock) > STOCK_EPSILON ? formatInventoryStockDisplay(item) : null;
}

/** What archiving does to stock still on hand, for the confirm dialog; null when nothing is in stock. */
export function archiveStockWarning(item: InventoryItem): string | null {
  const onHand = stockOnHand(item);
  if (!onHand) return null;
  return `Still in stock: ${onHand}, worth ${formatMoney(item.currentStock * item.avgUnitCost)} at cost. `
    + 'Archiving takes this stock out of the stock list, the stock value and the product pickers, so it cannot be sold, transferred or adjusted. '
    + 'The stock stays recorded and comes back when you restore the product.';
}

export function filterByArchiveStatus<T extends Pick<InventoryItem, 'isActive'>>(items: T[], status: ArchiveStatus): T[] {
  if (status === 'all') return items;
  return items.filter((i) => isArchived(i) === (status === 'archived'));
}

export function parseArchiveStatus(value: string | null | undefined): ArchiveStatus {
  return value === 'archived' || value === 'all' ? value : 'active';
}

/** The server refused a sale or transfer because its product was archived meanwhile. */
export function isArchivedProductError(message: string | null | undefined): boolean {
  return /\barchived\b/i.test(message ?? '');
}

/** The products whose stock may change: archived ones take no purchases, adjustments or bulk updates. */
export function stockEditable<T extends Pick<InventoryItem, 'isActive'>>(items: T[]): T[] {
  return items.filter((i) => !isArchived(i));
}
