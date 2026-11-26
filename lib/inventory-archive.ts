import type { InventoryItem } from '@/types';
import { formatInventoryStockDisplay } from '@/lib/format-carton-stock';

/** Which products a list shows: the stock list defaults to active; history views ask for all. */
export type ArchiveStatus = 'active' | 'archived' | 'all';

/** An archived product is one the API marks inactive. A product with no flag is active. */
export const isArchived = (item: Pick<InventoryItem, 'isActive'>) => item.isActive === false;

/** Float noise from carton-to-kg maths should not block archiving. */
const STOCK_EPSILON = 1e-6;

/**
 * Why a product cannot be archived yet, or null when it can. The server's 409 is the final word;
 * this is the hint the menu shows before anyone tries.
 */
export function archiveBlocker(item: InventoryItem, openRequestCount: number): string | null {
  if (Math.abs(item.currentStock) > STOCK_EPSILON) return `Stock must be 0 first. ${formatInventoryStockDisplay(item)} on hand.`;
  if (openRequestCount > 0) return `Close the ${openRequestCount} open ${openRequestCount === 1 ? 'request' : 'requests'} first.`;
  return null;
}

export function filterByArchiveStatus<T extends Pick<InventoryItem, 'isActive'>>(items: T[], status: ArchiveStatus): T[] {
  if (status === 'all') return items;
  return items.filter((i) => isArchived(i) === (status === 'archived'));
}

export function parseArchiveStatus(value: string | null | undefined): ArchiveStatus {
  return value === 'archived' || value === 'all' ? value : 'active';
}
