import type { InventoryItem } from '@/types';
import { type ExportColumn } from '@/lib/export';

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
