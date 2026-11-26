import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv } from '../export';
import { MOVEMENT_EXPORT_COLUMNS, REQUEST_EXPORT_COLUMNS, requestExportRows } from './inventory';
import type { StockLog } from '@/types';
import type { ApiInventoryRequest } from '@/types/api';

const line = (csv: string, n = 1) => csv.split('\r\n')[n];
const cells = (...v: string[]) => v.map((x) => `"${x}"`).join(',');

describe('MOVEMENT_EXPORT_COLUMNS', () => {
  const log = {
    id: 'l1', date: '2026-11-25T14:00:00Z', itemId: 'p1', itemName: 'Chicken wings', itemSku: 'CHK-WNG', type: 'TRANSFER',
    quantity: -12, uom: 'Cartons', unitCost: 41500.5, unitPrice: 52000, referenceId: 'TR-0091', notes: 'Weekend top-up',
    agentId: 'u1', agentName: 'Tolu Adebayo', batchNumber: 'B4821', expiryDate: '2027-01-15', supplier: 'Ogun Poultry',
    fromLocation: 'Lagos Hub', toLocation: 'Lekki RSP', reason: 'Restock',
  } as unknown as StockLog;

  it('has the agreed headers', () => {
    assert.deepEqual(MOVEMENT_EXPORT_COLUMNS.map((c) => c.header), [
      'Date', 'Product', 'SKU', 'Type', 'Quantity', 'Unit', 'Unit cost', 'Value', 'Batch', 'Expiry', 'Supplier', 'From', 'To', 'Reason', 'Notes', 'Reference', 'By',
    ]);
  });

  it('keeps the sign on quantity and values at cost', () => {
    assert.equal(line(buildCsv(MOVEMENT_EXPORT_COLUMNS, [log])), cells(
      '2026-11-25 15:00', 'Chicken wings', 'CHK-WNG', 'Transfer', '-12', 'Cartons', '41500.5', '498006', 'B4821', '2027-01-15', 'Ogun Poultry', 'Lagos Hub', 'Lekki RSP', 'Restock', 'Weekend top-up', 'TR-0091', 'Tolu Adebayo',
    ));
  });
});

describe('requestExportRows', () => {
  const request: ApiInventoryRequest = {
    _id: 'r1', requesting_location: { _id: 'rsp_lekki', hub_name: 'Lekki RSP' }, fulfilling_hub: { _id: 'hub_lagos', hub_name: 'Lagos Hub' },
    status: 'submitted', requested_by: 'u7', requested_by_name: 'Chidi Okafor', notes: 'Before Friday', createdAt: '2026-11-24T09:30:00Z',
    lines: [
      { product_name: 'Chicken wings', sku: 'CHK-WNG', quantity: 5, uom: 'Carton' },
      { product_name: 'Titus fish', quantity: 20, uom: 'Kg' },
    ],
  };

  it('gives one row per product line', () => {
    assert.equal(requestExportRows([request]).length, 2);
  });

  it('has the agreed headers', () => {
    assert.deepEqual(REQUEST_EXPORT_COLUMNS.map((c) => c.header), [
      'Requested on', 'From', 'To', 'Product', 'SKU', 'Quantity', 'Unit', 'Status', 'Requested by', 'Reviewed by', 'Fulfilled by', 'Notes', 'Rejection reason',
    ]);
  });

  it('repeats the request details on each line and labels the status', () => {
    const csv = buildCsv(REQUEST_EXPORT_COLUMNS, requestExportRows([request]));
    assert.equal(line(csv, 2), cells('2026-11-24 10:30', 'Lekki RSP', 'Lagos Hub', 'Titus fish', '', '20', 'Kg', 'Pending', 'Chidi Okafor', '', '', 'Before Friday', ''));
  });

  it('keeps a request with no lines as one row', () => {
    assert.equal(requestExportRows([{ ...request, lines: [] }]).length, 1);
  });
});
