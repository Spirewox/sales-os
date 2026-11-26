import type { StockLog } from '@/types';
import type { ApiInventoryRequest, ApiInventoryRequestLine } from '@/types/api';
import { csvDate, type ExportColumn } from '@/lib/export';
import { REQUEST_STATUS_LABEL, hubRefName } from '@/lib/inventory-requests';

const sentence = (s: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : s);

export const MOVEMENT_EXPORT_COLUMNS: ExportColumn<StockLog>[] = [
  { header: 'Date', value: (l) => csvDate(l.date, true) },
  { header: 'Product', value: (l) => l.itemName },
  { header: 'SKU', value: (l) => l.itemSku },
  { header: 'Type', value: (l) => sentence(l.type) },
  { header: 'Quantity', value: (l) => l.quantity },
  { header: 'Unit', value: (l) => l.uom },
  { header: 'Unit cost', value: (l) => l.unitCost },
  { header: 'Value', value: (l) => Math.abs(l.quantity) * l.unitCost },
  { header: 'Batch', value: (l) => l.batchNumber },
  { header: 'Expiry', value: (l) => csvDate(l.expiryDate) },
  { header: 'Supplier', value: (l) => l.supplier },
  { header: 'From', value: (l) => l.fromLocation },
  { header: 'To', value: (l) => l.toLocation },
  { header: 'Reason', value: (l) => l.reason },
  { header: 'Notes', value: (l) => l.notes },
  { header: 'Reference', value: (l) => l.referenceId },
  { header: 'By', value: (l) => l.agentName },
];

/** One spreadsheet row per product line, so quantities can be sorted and added up. */
export type RequestExportRow = { request: ApiInventoryRequest; line: ApiInventoryRequestLine | null };

export function requestExportRows(requests: ApiInventoryRequest[]): RequestExportRow[] {
  return requests.flatMap((request): RequestExportRow[] => (request.lines.length ? request.lines.map((line) => ({ request, line })) : [{ request, line: null }]));
}

export const REQUEST_EXPORT_COLUMNS: ExportColumn<RequestExportRow>[] = [
  { header: 'Requested on', value: (r) => csvDate(r.request.createdAt, true) },
  { header: 'From', value: (r) => hubRefName(r.request.requesting_location) },
  { header: 'To', value: (r) => hubRefName(r.request.fulfilling_hub) },
  { header: 'Product', value: (r) => r.line?.product_name },
  { header: 'SKU', value: (r) => r.line?.sku },
  { header: 'Quantity', value: (r) => r.line?.quantity },
  { header: 'Unit', value: (r) => r.line?.uom },
  { header: 'Status', value: (r) => REQUEST_STATUS_LABEL[r.request.status] ?? r.request.status },
  { header: 'Requested by', value: (r) => r.request.requested_by_name },
  { header: 'Reviewed by', value: (r) => r.request.reviewed_by_name },
  { header: 'Fulfilled by', value: (r) => r.request.fulfilled_by_name },
  { header: 'Notes', value: (r) => r.request.notes },
  { header: 'Rejection reason', value: (r) => r.request.rejection_reason },
];
