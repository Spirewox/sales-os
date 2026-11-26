import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  REPORTS, MAX_REPORT_COLUMNS, customReportName, mergeMeasureRows, reportDraftError, savedReportMeasures, reportExportColumns, reportKpiColumns, reportQueryKey, reportRowsWithTotal, resolveReportParam, savedReportRunnable, summableColumns, visibleReports,
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
  it('has nine ready-made reports, each with a unique key, and no Sales by staff', () => {
    assert.equal(REPORTS.length, 9);
    assert.equal(new Set(REPORTS.map((r) => r.key)).size, 9);
    assert.ok(!REPORTS.some((r) => r.key === 'sales-by-agent'));
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

describe('custom reports with several columns', () => {
  it('allows up to eight columns', () => {
    assert.equal(MAX_REPORT_COLUMNS, 8);
  });

  it('reads the columns, falling back to the single measure of an older report', () => {
    assert.deepEqual(savedReportMeasures(saved('a')), ['revenue']);
    assert.deepEqual(savedReportMeasures(saved('b', { measures: ['revenue', 'orders'] })), ['revenue', 'orders']);
  });

  it('merges one result per column into rows, in the first column\'s order', () => {
    const rows = mergeMeasureRows([
      { measure: 'revenue', rows: [{ key: 'Lagos', label: 'Lagos', value: 300 }, { key: 'Ife', label: 'Ife', value: 100 }] },
      { measure: 'orders', rows: [{ key: 'Ife', label: 'Ife', value: 4 }, { key: 'Kano', label: 'Kano', value: 1 }] },
    ]);
    assert.deepEqual(rows, [
      { key: 'Lagos', label: 'Lagos', values: { revenue: 300, orders: 0 } },
      { key: 'Ife', label: 'Ife', values: { revenue: 100, orders: 4 } },
      { key: 'Kano', label: 'Kano', values: { revenue: 0, orders: 1 } },
    ]);
  });

  it('runs only while every column, the grouping and each filter still exist', () => {
    const ds = [{ key: 'sales', measures: [{ key: 'revenue' }, { key: 'orders' }], fields: [{ key: 'Location' }, { key: 'Product' }] }];
    assert.equal(savedReportRunnable(saved('a', { measures: ['revenue', 'orders'] }), ds), true);
    assert.equal(savedReportRunnable(saved('b', { measures: ['revenue', 'gone'] }), ds), false);
    assert.equal(savedReportRunnable(saved('c', { filters: [{ field: 'Gone', multi: false, values: ['x'] }] }), ds), false);
  });

  it('needs at least one column and at most the limit', () => {
    assert.equal(reportDraftError({ measures: [] }), 'Pick at least one column.');
    assert.equal(reportDraftError({ measures: Array.from({ length: MAX_REPORT_COLUMNS + 1 }, (_, i) => `m${i}`) }), `Pick up to ${MAX_REPORT_COLUMNS} columns.`);
    assert.equal(reportDraftError({ measures: ['revenue'] }), null);
  });

  it('suggests a sentence-case name from the columns and grouping', () => {
    assert.equal(customReportName(['Revenue'], 'Location'), 'Revenue by location');
    assert.equal(customReportName(['Revenue', 'Orders'], 'Location'), 'Revenue and orders by location');
    assert.equal(customReportName(['Revenue', 'Orders', 'Avg Order Value'], 'Product'), 'Revenue, orders and avg order value by product');
    assert.equal(customReportName(['Revenue', 'Orders', 'Credit Sales', 'Cash Sales', 'Gross Margin %'], 'Location'), 'Revenue, orders and 3 more by location');
    const long = customReportName(['Retail Profit per ₦ Spent', 'Avg Spend per Supplier', 'Procurement Spend', 'Open Issues'], 'Category Supplied');
    assert.ok(long.length <= 60, long);
    assert.match(long, / by category supplied$/);
  });
});

describe('resolveReportParam for building', () => {
  it('opens the builder for a new report or to edit one of theirs', () => {
    const list = [saved('a')];
    assert.deepEqual(resolveReportParam('new', all, list), { kind: 'new' });
    assert.deepEqual(resolveReportParam('edit:a', all, list), { kind: 'edit', report: list[0] });
    assert.deepEqual(resolveReportParam('edit:zz', all, list), { kind: 'library' });
  });
});
