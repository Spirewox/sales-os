import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as db from './data';
import { buildReport } from './reports';
import { REPORTS } from '../reports';

const NOW = new Date('2026-11-26T12:00:00Z');
const all = { inRange: () => true, inScope: () => true, now: NOW };

describe('buildReport', () => {
  it('builds every report in the registry', () => {
    for (const r of REPORTS) {
      const res = buildReport(r.key, db, all);
      assert.ok(res, r.key);
      assert.ok(res!.columns.length > 1, `${r.key} columns`);
      for (const row of res!.rows) for (const c of res!.columns) assert.ok(c.key in row, `${r.key}: ${c.key}`);
    }
  });

  it('answers null for an unknown report', () => {
    assert.equal(buildReport('nope', db, all), null);
  });

  it('daily sales total the live sales in range', () => {
    const inRange = (d: string) => d >= '2026-11-01';
    const res = buildReport('sales-daily', db, { ...all, inRange })!;
    const expected = db.sales.filter((s) => s.status !== 'Voided' && inRange(s.date)).reduce((n, s) => n + s.amount, 0);
    assert.equal(res.totals.revenue, expected);
    assert.equal(res.rows.reduce((n, r) => n + Number(r.revenue), 0), expected);
  });

  it('credit aging buckets add up to what is outstanding', () => {
    const res = buildReport('credit-aging', db, all)!;
    assert.ok(res.rows.length > 0);
    for (const r of res.rows) {
      const buckets = ['notDue', 'd30', 'd60', 'd90', 'over90'].reduce((n, k) => n + Number(r[k]), 0);
      assert.equal(Math.round(buckets), Math.round(Number(r.outstanding)));
    }
  });

  it('stock valuation values stock at average cost', () => {
    const res = buildReport('stock-valuation', db, all)!;
    const p = db.products.find((x) => x.is_active !== false)!;
    const row = res.rows.find((r) => r.sku === p.sku)!;
    assert.equal(row.value, Math.round(p.current_stock * p.avg_unit_cost * 100) / 100);
  });

  it('limits rows to the scoped locations', () => {
    const res = buildReport('sales-by-location', db, { ...all, inScope: (hub) => hub === 'hub_ife' })!;
    assert.deepEqual(res.rows.map((r) => r.location), ['Ife Hub']);
  });
});
