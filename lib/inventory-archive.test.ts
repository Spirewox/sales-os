import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { archiveBlocker, archiveStockWarning, filterByArchiveStatus, isArchived, isArchivedProductError, parseArchiveStatus, stockEditable, stockOnHand } from './inventory-archive';
import type { InventoryItem } from '@/types';

const item = (p: Partial<InventoryItem>) => ({ id: 'p', name: 'Wings', currentStock: 0, unitOfMeasure: 'Units', isActive: true, ...p }) as InventoryItem;

describe('archiveBlocker', () => {
  it('lets a product with stock on hand be archived (the confirm warns instead)', () => {
    assert.equal(archiveBlocker(item({ currentStock: 12, unitOfMeasure: 'Units' }), 0), null);
  });
  it('blocks archiving with open requests', () => {
    assert.equal(archiveBlocker(item({ currentStock: 0 }), 2), 'Close the 2 open requests first.');
    assert.equal(archiveBlocker(item({ currentStock: 40 }), 1), 'Close the 1 open request first.');
  });
  it('allows archiving with no requests', () => {
    assert.equal(archiveBlocker(item({ currentStock: 0 }), 0), null);
  });
});

describe('stockOnHand', () => {
  it('names the stock left, in the product unit', () => {
    assert.equal(stockOnHand(item({ currentStock: 12, unitOfMeasure: 'Units' })), '12 Units');
  });
  it('is null at zero, float noise included', () => {
    assert.equal(stockOnHand(item({ currentStock: 0 })), null);
    assert.equal(stockOnHand(item({ currentStock: 0.0000001 })), null);
  });
  it('still names negative stock', () => {
    assert.equal(stockOnHand(item({ currentStock: -3, unitOfMeasure: 'Units' })), '-3 Units');
  });
});

describe('archiveStockWarning', () => {
  it('says what leaves, what stops and that restore brings it back', () => {
    assert.equal(
      archiveStockWarning(item({ currentStock: 12, unitOfMeasure: 'Units', avgUnitCost: 2500 })),
      'Still in stock: 12 Units, worth ₦30,000 at cost. Archiving takes this stock out of the stock list, the stock value and the product pickers, so it cannot be sold, transferred or adjusted. The stock stays recorded and comes back when you restore the product.',
    );
  });
  it('is null when nothing is in stock', () => {
    assert.equal(archiveStockWarning(item({ currentStock: 0 })), null);
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
