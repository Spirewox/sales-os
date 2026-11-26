import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv } from '../export';
import { STOCK_EXPORT_COLUMNS, stockExportColumns } from './stock';
import type { InventoryItem } from '@/types';

const item = {
  id: 'p1', sku: 'CHK-WNG', name: 'Chicken wings', category: 'Chicken', location: 'Lagos Hub', currentStock: 12.5, unitOfMeasure: 'Cartons',
  minStockLevel: 4, avgUnitCost: 41500.456, baseSellingPrice: 52000.004,
} as unknown as InventoryItem;

describe('STOCK_EXPORT_COLUMNS', () => {
  it('keeps the headers of the earlier stock export', () => {
    assert.deepEqual(STOCK_EXPORT_COLUMNS.map((c) => c.header), ['SKU', 'Name', 'Category', 'Location', 'Stock', 'Unit', 'Min Stock', 'Cost Price', 'Selling Price']);
  });
  it('rounds prices to kobo', () => {
    assert.equal(buildCsv(STOCK_EXPORT_COLUMNS, [item]).split('\r\n')[1],
      ['CHK-WNG', 'Chicken wings', 'Chicken', 'Lagos Hub', '12.5', 'Cartons', '4', '41500.46', '52000'].map((v) => `"${v}"`).join(','));
  });
});

describe('stockExportColumns with status', () => {
  const cols = stockExportColumns(true);
  it('adds Status and Archived on after the earlier columns', () => {
    assert.deepEqual(cols.map((c) => c.header).slice(-2), ['Status', 'Archived on']);
    assert.equal(cols.length, STOCK_EXPORT_COLUMNS.length + 2);
  });
  it('writes Archived with its Lagos date, and Active with none', () => {
    const archived = { ...item, isActive: false, archivedAt: '2026-11-25T23:30:00Z' } as InventoryItem;
    const lines = buildCsv(cols, [archived, item]).split('\r\n');
    assert.ok(lines[1].endsWith('"Archived","2026-11-26"'));
    assert.ok(lines[2].endsWith('"Active",""'));
  });
  it('leaves the columns out for the active list', () => {
    assert.deepEqual(stockExportColumns(false), STOCK_EXPORT_COLUMNS);
  });
});
