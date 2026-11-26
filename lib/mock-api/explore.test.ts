import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as db from './data';
import { runMockExplore } from './explore';

const all = { inRange: () => true, inScope: () => true };
const live = db.sales.filter((s) => s.status !== 'Voided');

describe('runMockExplore', () => {
  it('sums revenue by location over the live sales in scope', () => {
    const res = runMockExplore(db, { dataset: 'sales', measure: 'revenue', groupBy: 'Location', filters: [] }, all);
    const expected = live.reduce((n, s) => n + s.amount, 0);
    assert.equal(res.measureKind, 'money');
    assert.equal(res.total, expected);
    assert.equal(res.rows.reduce((n, r) => n + r.value, 0), expected);
    assert.ok(res.rows.some((r) => r.label === 'Lagos Hub'));
    // Largest first.
    for (let i = 1; i < res.rows.length; i++) assert.ok(res.rows[i - 1].value >= res.rows[i].value);
  });

  it('counts orders and keeps to the location scope', () => {
    const inScope = (h: string | null | undefined) => h === 'hub_lagos';
    const res = runMockExplore(db, { dataset: 'sales', measure: 'orders', groupBy: 'Location', filters: [] }, { ...all, inScope });
    assert.equal(res.measureKind, 'number');
    assert.deepEqual(res.rows.map((r) => r.label), ['Lagos Hub']);
    assert.equal(res.rows[0].value, live.filter((s) => s.hub === 'hub_lagos').length);
  });

  it('applies a filter on another field', () => {
    const res = runMockExplore(db, { dataset: 'sales', measure: 'orders', groupBy: 'Location', filters: [{ field: 'PaymentType', multi: false, values: ['Cash'] }] }, all);
    assert.equal(res.total, live.filter((s) => s.payment_type === 'Cash').length);
  });

  it('orders days of the week from Sunday', () => {
    const res = runMockExplore(db, { dataset: 'sales', measure: 'orders', groupBy: 'DayOfWeek', filters: [] }, all);
    const order = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const idx = res.rows.map((r) => order.indexOf(r.key));
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  });

  it('answers no rows for a dataset the mock does not model', () => {
    const res = runMockExplore(db, { dataset: 'inventory', measure: 'stock', groupBy: 'Category', filters: [] }, all);
    assert.deepEqual(res.rows, []);
    assert.equal(res.total, 0);
  });
});
