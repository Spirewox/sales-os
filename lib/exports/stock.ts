import type { InventoryItem } from '@/types';
import { csvDate, type ExportColumn } from '@/lib/export';
import { isArchived } from '@/lib/inventory-archive';

const kobo = (n: number) => Math.round(n * 100) / 100;

/** The stock list, with the headers the earlier "Export stock (CSV)" wrote. */
export const STOCK_EXPORT_COLUMNS: ExportColumn<InventoryItem>[] = [
  { header: 'SKU', value: (i) => i.sku },
  { header: 'Name', value: (i) => i.name },
  { header: 'Category', value: (i) => i.category },
  { header: 'Location', value: (i) => i.location },
  { header: 'Stock', value: (i) => i.currentStock },
  { header: 'Unit', value: (i) => i.unitOfMeasure },
  { header: 'Min Stock', value: (i) => i.minStockLevel },
  { header: 'Cost Price', value: (i) => kobo(i.avgUnitCost) },
  { header: 'Selling Price', value: (i) => kobo(i.baseSellingPrice) },
];

/** The stock columns, plus Status and Archived on when the list can hold archived products. */
export function stockExportColumns(withStatus: boolean): ExportColumn<InventoryItem>[] {
  if (!withStatus) return STOCK_EXPORT_COLUMNS;
  return [
    ...STOCK_EXPORT_COLUMNS,
    { header: 'Status', value: (i) => (isArchived(i) ? 'Archived' : 'Active') },
    { header: 'Archived on', value: (i) => (isArchived(i) ? csvDate(i.archivedAt) : '') },
  ];
}
