import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  REPORTS, reportExportColumns, reportKpiColumns, savedReportTotal, scopedResult, reportQueryKey, reportRowsWithTotal, resolveReportParam, savedReportRunnable, summableColumns, visibleReports,
  type ReportResult, type SavedReport,
} from './reports';
import { buildCsv } from './export';

const all = () => true;
const saved = (id: string, p: Partial<SavedReport> = {}): SavedReport => ({
  id, name: `Report ${id}`, dataset: 'sales', measure: 'revenue', groupBy: 'Location', filters: [], chart: 'column', createdAt: '2026-11-26T10:00:00Z', ...p,
});
const RESULT: ReportResult = {
  columns: [
    { key: 'date', label: 'Date', kind: 'date' }, { key: 'orders', label: 'Orders', kind: 'number' },
    { key: 'revenue', label: 'Revenue', kind: 'money' }, { key: 'avg', label: 'Avg order', kind: 'money' }, { key: 'share', label: 'Share %', kind: 'percent' },
  ],
  rows: [{ date: '2026-11-25', orders: 4, revenue: 120000, avg: 30000, share: 60.04 }, { date: '2026-11-26', orders: 2, revenue: 80000, avg: 40000, share: 39.96 }],
  totals: { orders: 6, revenue: 200000 },
  capped: false,
  generatedAt: '2026-11-26T10:00:00Z',
};

describe('REPORTS', () => {
  it('has the ten reports of the first set, each with a unique key', () => {
    assert.equal(REPORTS.length, 10);
    assert.equal(new Set(REPORTS.map((r) => r.key)).size, 10);
    assert.deepEqual(REPORTS.filter((r) => !r.usesPeriod).map((r) => r.key), ['credit-aging', 'stock-valuation']);
  });
});

describe('visibleReports', () => {
  it('hides reports without permission', () => {
    const keys = visibleReports((p) => p !== 'inventory.view').map((r) => r.key);
    assert.ok(!keys.includes('stock-valuation') && keys.includes('sales-daily'));
  });
});

describe('resolveReportParam', () => {
  it('resolves params', () => {
    assert.deepEqual(resolveReportParam(null, all, []), { kind: 'library' });
    assert.equal(resolveReportParam('stock-valuation', (p) => p !== 'inventory.view', []).kind, 'denied');
    assert.equal(resolveReportParam('saved:r1', all, [saved('r1')]).kind, 'saved');
    assert.equal(resolveReportParam('saved:gone', all, []).kind, 'library');
    assert.equal(resolveReportParam('nonsense', all, []).kind, 'library');
    assert.equal(resolveReportParam('sales-daily', all, []).kind, 'builtin');
  });
});

describe('summableColumns', () => {
  it('sums only money and number columns that have totals', () => {
    assert.deepEqual(summableColumns(RESULT).map((c) => c.key), ['orders', 'revenue']);
  });
});

describe('report export', () => {
  it('writes the rows and a Total row with only the summable figures', () => {
    const csv = buildCsv(reportExportColumns(RESULT), reportRowsWithTotal(RESULT)).split('\r\n');
    assert.equal(csv[0], '﻿"Date","Orders","Revenue","Avg order","Share %"');
    assert.equal(csv[1], '"2026-11-25","4","120000","30000","60"');
    assert.equal(csv[3], '"Total","6","200000","",""');
  });
  it('adds no Total row without totals', () => {
    assert.equal(reportRowsWithTotal({ ...RESULT, totals: {} }).length, 2);
  });
});

describe('savedReportRunnable', () => {
  const datasets = [{ key: 'sales', measures: [{ key: 'revenue' }], fields: [{ key: 'Location' }] }];
  it('runs a saved report whose dataset, measure and grouping exist', () => {
    assert.equal(savedReportRunnable(saved('r1'), datasets), true);
  });
  it('flags one whose dataset or field is gone', () => {
    assert.equal(savedReportRunnable(saved('r1', { dataset: 'nope' }), datasets), false);
    assert.equal(savedReportRunnable(saved('r1', { groupBy: 'Gone' }), datasets), false);
  });
});

describe('reportQueryKey', () => {
  it('changes with the scope', () => {
    assert.notDeepEqual(reportQueryKey('x', { period: 'month' }), reportQueryKey('x', { period: 'year' }));
  });
});

describe('reportKpiColumns', () => {
  it('keeps every summable total, so no aging bucket is hidden', () => {
    const keys = ['outstanding', 'notDue', 'd30', 'd60', 'd90', 'over90'];
    const aging: ReportResult = {
      ...RESULT,
      columns: [{ key: 'customer', label: 'Customer', kind: 'text' }, ...keys.map((k) => ({ key: k, label: k, kind: 'money' as const }))],
      rows: [], totals: Object.fromEntries(keys.map((k) => [k, 1])),
    };
    assert.deepEqual(reportKpiColumns(aging).map((c) => c.key), keys);
  });

  it('labels a total once', () => {
    const spend: ReportResult = { ...RESULT, columns: [{ key: 's', label: 'Supplier', kind: 'text' }, { key: 'spend', label: 'Total spend', kind: 'money' }, { key: 'orders', label: 'Orders', kind: 'number' }], totals: { spend: 5, orders: 2 } };
    assert.deepEqual(reportKpiColumns(spend).map((c) => c.label), ['Total spend', 'Total orders']);
  });
});

describe('savedReportTotal', () => {
  it('uses the total from the server for a measure that adds up', () => {
    assert.equal(savedReportTotal({ rows: [{ value: 1 }, { value: 2 }], total: 3 }, true), 3);
  });
  it('gives no total for averages and distinct counts', () => {
    assert.equal(savedReportTotal({ rows: [{ value: 10 }, { value: 20 }], total: 15 }, false), null);
  });
});

describe('scopedResult', () => {
  it('shows a result only for the scope it was fetched for', () => {
    const stored = { key: 'a', data: 1 };
    assert.equal(scopedResult(stored, 'a'), 1);
    assert.equal(scopedResult(stored, 'b'), null);
    assert.equal(scopedResult(null, 'a'), null);
  });
});
