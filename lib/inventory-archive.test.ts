import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { archiveBlocker, filterByArchiveStatus, isArchived, isArchivedProductError, parseArchiveStatus, stockEditable } from './inventory-archive';
import type { InventoryItem } from '@/types';

const item = (p: Partial<InventoryItem>) => ({ id: 'p', name: 'Wings', currentStock: 0, unitOfMeasure: 'Units', isActive: true, ...p }) as InventoryItem;

describe('archiveBlocker', () => {
  it('blocks archiving with stock on hand', () => {
    assert.equal(archiveBlocker(item({ currentStock: 12, unitOfMeasure: 'Units' }), 0), 'Stock must be 0 first. 12 Units on hand.');
  });
  it('blocks archiving with open requests', () => {
    assert.equal(archiveBlocker(item({ currentStock: 0 }), 2), 'Close the 2 open requests first.');
    assert.equal(archiveBlocker(item({ currentStock: 0 }), 1), 'Close the 1 open request first.');
  });
  it('allows archiving at zero stock and no requests', () => {
    assert.equal(archiveBlocker(item({ currentStock: 0 }), 0), null);
  });
  it('treats tiny float stock as zero', () => {
    assert.equal(archiveBlocker(item({ currentStock: 0.0000001 }), 0), null);
  });
  it('treats negative stock as stock to sort out first', () => {
    assert.match(archiveBlocker(item({ currentStock: -3 }), 0) ?? '', /^Stock must be 0 first\./);
  });
});

describe('filterByArchiveStatus', () => {
  const rows = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c', isActive: false })];
  it('filters by status', () => {
    assert.deepEqual(filterByArchiveStatus(rows, 'active').map((r) => r.id), ['a', 'b']);
    assert.deepEqual(filterByArchiveStatus(rows, 'archived').map((r) => r.id), ['c']);
    assert.equal(filterByArchiveStatus(rows, 'all').length, 3);
  });
  it('counts a product with no flag as active', () => {
    assert.equal(isArchived({ isActive: undefined }), false);
  });
});

describe('parseArchiveStatus', () => {
  it('parses known values and falls back to active', () => {
    assert.equal(parseArchiveStatus('archived'), 'archived');
    assert.equal(parseArchiveStatus('all'), 'all');
    assert.equal(parseArchiveStatus('x'), 'active');
    assert.equal(parseArchiveStatus(null), 'active');
  });
});

describe('isArchivedProductError', () => {
  it('spots the server refusing an archived product', () => {
    assert.equal(isArchivedProductError('This product is archived.'), true);
    assert.equal(isArchivedProductError('Chicken wings is archived and cannot be sold'), true);
  });
  it('ignores other errors', () => {
    assert.equal(isArchivedProductError('Insufficient stock'), false);
    assert.equal(isArchivedProductError(undefined), false);
  });
});

describe('stockEditable', () => {
  it('keeps only products whose stock may change', () => {
    const rows = [item({ id: 'a' }), item({ id: 'b', isActive: false }), item({ id: 'c' })];
    assert.deepEqual(stockEditable(rows).map((r) => r.id), ['a', 'c']);
  });
});
