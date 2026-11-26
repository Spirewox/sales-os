import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { archiveProduct, filterProducts, restoreProduct } from './products';
import type { ApiInventoryRequest, ApiProduct } from '@/types/api';

const product = (id: string, p: Partial<ApiProduct> = {}) => ({
  _id: id, sku: id.toUpperCase(), name: `Product ${id}`, category: 'Chicken', unit_of_measure: 'Units', current_stock: 0, min_stock_level: 5, hub: 'hub_lagos', is_active: true, ...p,
}) as ApiProduct;
const q = (s = '') => new URLSearchParams(s);

describe('filterProducts', () => {
  const rows = [product('a'), product('b', { is_active: false }), product('c', { current_stock: 2 })];
  it('lists active products by default', () => {
    assert.deepEqual(filterProducts(rows, q()).map((p) => p._id), ['a', 'c']);
  });
  it('lists archived or all on request', () => {
    assert.deepEqual(filterProducts(rows, q('status=archived')).map((p) => p._id), ['b']);
    assert.equal(filterProducts(rows, q('status=all')).length, 3);
  });
  it('still applies the other filters', () => {
    assert.deepEqual(filterProducts(rows, q('status=all&low_stock=true')).map((p) => p._id), ['a', 'b', 'c']);
    assert.deepEqual(filterProducts(rows, q('search=product c')).map((p) => p._id), ['c']);
  });
});

describe('archiveProduct', () => {
  const user = { _id: 'u1', full_name: 'Design Preview' };
  const openRequest = { _id: 'r1', status: 'submitted', lines: [{ product_id: 'a', product_name: 'A', quantity: 1, uom: 'Units' }] } as unknown as ApiInventoryRequest;

  it('archives a product with no stock and stamps who and when', () => {
    const rows = [product('a')];
    const res = archiveProduct(rows, [], 'a', user, '2026-11-26T10:00:00.000Z');
    assert.equal(res.status, 200);
    assert.equal(rows[0].is_active, false);
    assert.equal(rows[0].archived_at, '2026-11-26T10:00:00.000Z');
    assert.deepEqual(rows[0].archived_by, user);
  });
  it('refuses while stock is on hand', () => {
    const res = archiveProduct([product('a', { current_stock: 3 })], [], 'a', user, 'now');
    assert.equal(res.status, 409);
    assert.match(String((res.data as { message: string }).message), /stock/i);
  });
  it('refuses while an open request names it', () => {
    const res = archiveProduct([product('a')], [openRequest], 'a', user, 'now');
    assert.equal(res.status, 409);
  });
  it('ignores requests that are already closed', () => {
    const closed = { ...openRequest, status: 'fulfilled' } as ApiInventoryRequest;
    assert.equal(archiveProduct([product('a')], [closed], 'a', user, 'now').status, 200);
  });
  it('answers 404 for an unknown product', () => {
    assert.equal(archiveProduct([], [], 'zz', user, 'now').status, 404);
  });
});

describe('restoreProduct', () => {
  it('makes it active and clears the stamp', () => {
    const rows = [product('a', { is_active: false, archived_at: 'x', archived_by: { _id: 'u', full_name: 'U' } })];
    assert.equal(restoreProduct(rows, 'a').status, 200);
    assert.equal(rows[0].is_active, true);
    assert.equal(rows[0].archived_at, undefined);
    assert.equal(rows[0].archived_by, undefined);
  });
});
