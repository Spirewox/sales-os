import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv, collectExportRows, exportTable, filterLabels, csvDate, exportFilename, exportToast, fetchExportRows, fetchExportRowsByCursor, EXPORT_ROW_CAP, type ExportCell } from './export';

describe('buildCsv', () => {
  it('quotes every cell and doubles quotes', () => {
    const csv = buildCsv([{ header: 'Name', value: (r: { n: string }) => r.n }], [{ n: 'Ada "Mama" Put, Ltd' }]);
    assert.equal(csv, '﻿"Name"\r\n"Ada ""Mama"" Put, Ltd"');
  });

  it('neutralises formula cells but not negative numbers', () => {
    const cols = [{ header: 'A', value: (r: { a: ExportCell }) => r.a }];
    assert.equal(buildCsv(cols, [{ a: '=SUM(A1)' }]).split('\r\n')[1], `"'=SUM(A1)"`);
    assert.equal(buildCsv(cols, [{ a: '@cmd' }]).split('\r\n')[1], `"'@cmd"`);
    assert.equal(buildCsv(cols, [{ a: -250 }]).split('\r\n')[1], '"-250"');
  });

  it('leaves phone numbers and dashes as they are', () => {
    const cols = [{ header: 'A', value: (r: { a: ExportCell }) => r.a }];
    assert.equal(buildCsv(cols, [{ a: '+234 803 123 4567' }]).split('\r\n')[1], '"+234 803 123 4567"');
    assert.equal(buildCsv(cols, [{ a: '-' }]).split('\r\n')[1], '"-"');
    assert.equal(buildCsv(cols, [{ a: '-1500.50' }]).split('\r\n')[1], '"-1500.50"');
  });

  it('neutralises cells that start with a tab or carriage return', () => {
    const cols = [{ header: 'A', value: (r: { a: ExportCell }) => r.a }];
    assert.equal(buildCsv(cols, [{ a: '\t=cmd' }]).split('\r\n')[1], `"'\t=cmd"`);
    assert.equal(buildCsv(cols, [{ a: '+1+cmd' }]).split('\r\n')[1], `"'+1+cmd"`);
  });

  it('writes null and undefined as empty cells', () => {
    const cols = [
      { header: 'A', value: () => null },
      { header: 'B', value: () => undefined },
    ];
    assert.equal(buildCsv(cols, [{}]).split('\r\n')[1], '"",""');
  });

  it('keeps line breaks inside one cell', () => {
    const csv = buildCsv([{ header: 'Note', value: (r: { n: string }) => r.n }], [{ n: 'line one\nline two' }]);
    assert.equal(csv.split('\r\n').length, 2);
  });

  it('can leave out the byte order mark', () => {
    assert.equal(buildCsv([{ header: 'A', value: () => 1 }], [{}], { bom: false }), '"A"\r\n"1"');
  });
});

describe('exportFilename', () => {
  it('dates the filename in Lagos', () => {
    assert.equal(exportFilename('suppliers', new Date('2026-11-25T23:30:00Z')), 'fudfarmer-suppliers-2026-11-26.csv');
  });
});

describe('exportFilename formats', () => {
  it('ends in the format', () => {
    assert.equal(exportFilename('suppliers', new Date('2026-11-26T10:00:00Z'), 'xlsx'), 'fudfarmer-suppliers-2026-11-26.xlsx');
    assert.equal(exportFilename('suppliers', new Date('2026-11-26T10:00:00Z'), 'pdf'), 'fudfarmer-suppliers-2026-11-26.pdf');
  });
});

describe('exportTable', () => {
  it('gives headers and cell values', () => {
    const t = exportTable([{ header: 'A', value: (r: { a: number }) => r.a * 2 }], [{ a: 1 }, { a: 2 }]);
    assert.deepEqual(t, { headers: ['A'], cells: [[2], [4]] });
  });
});

describe('filterLabels', () => {
  it('puts location and period first and drops repeats', () => {
    assert.deepEqual(filterLabels({ location: 'Ife Hub', period: 'Last 30 days', chips: [{ label: 'Last 30 days' }, { label: 'Status: Open' }] }), ['Ife Hub', 'Last 30 days', 'Status: Open']);
  });
  it('leaves out All locations', () => {
    assert.deepEqual(filterLabels({ location: 'All', chips: [] }), []);
  });
});

describe('csvDate', () => {
  it('gives the Lagos date', () => {
    assert.equal(csvDate('2026-11-25T23:30:00Z'), '2026-11-26');
  });
  it('gives the Lagos date and time', () => {
    assert.equal(csvDate('2026-11-25T23:30:00Z', true), '2026-11-26 00:30');
  });
  it('is empty for missing or invalid input', () => {
    assert.equal(csvDate('not a date'), '');
    assert.equal(csvDate(null), '');
    assert.equal(csvDate(undefined, true), '');
  });
});

describe('fetchExportRows', () => {
  it('stops at the cap and reports it', async () => {
    const calls: number[] = [];
    const page = async (p: number, limit: number) => {
      calls.push(p);
      return { items: Array(limit).fill(p), totalPages: 100 };
    };
    const { rows, capped } = await fetchExportRows(page, 450);
    assert.equal(rows.length, 450);
    assert.equal(capped, true);
    assert.deepEqual(calls, [1, 2, 3]);
  });

  it('is not capped when the list ends first', async () => {
    const page = async (p: number, limit: number) => ({ items: Array(p === 1 ? limit : 7).fill(p), totalPages: 2 });
    const { rows, capped } = await fetchExportRows(page);
    assert.equal(rows.length, 207);
    assert.equal(capped, false);
  });

  it('stops at totalPages even when pages are full', async () => {
    const calls: number[] = [];
    const page = async (p: number, limit: number) => { calls.push(p); return { items: Array(limit).fill(p), totalPages: 2 }; };
    const { rows, capped } = await fetchExportRows(page);
    assert.deepEqual(calls, [1, 2]);
    assert.equal(rows.length, 400);
    assert.equal(capped, false);
  });

  it('keeps going past a short page while totalPages says there are more', async () => {
    const calls: number[] = [];
    const page = async (p: number) => { calls.push(p); return { items: Array(100).fill(p), totalPages: 3 }; };
    const { rows } = await fetchExportRows(page);
    assert.deepEqual(calls, [1, 2, 3]);
    assert.equal(rows.length, 300);
  });

  it('stops on an empty page', async () => {
    const calls: number[] = [];
    const page = async (p: number) => { calls.push(p); return { items: p === 1 ? [1] : [], totalPages: 50 }; };
    await fetchExportRows(page);
    assert.deepEqual(calls, [1, 2]);
  });

  it('asks for the page size it is given', async () => {
    const limits: number[] = [];
    await fetchExportRows(async (_p, limit) => { limits.push(limit); return { items: [], totalPages: 1 }; }, EXPORT_ROW_CAP, 100);
    assert.deepEqual(limits, [100]);
  });

  it('defaults the cap to 10,000', () => {
    assert.equal(EXPORT_ROW_CAP, 10_000);
  });
});

describe('fetchExportRowsByCursor', () => {
  it('follows the cursor until there is none', async () => {
    const seen: (string | undefined)[] = [];
    const page = async (cursor?: string) => {
      seen.push(cursor);
      return cursor === undefined ? { items: [1, 2], nextCursor: 'a' } : cursor === 'a' ? { items: [3], nextCursor: 'b' } : { items: [4], nextCursor: null };
    };
    const { rows, capped } = await fetchExportRowsByCursor(page);
    assert.deepEqual(rows, [1, 2, 3, 4]);
    assert.deepEqual(seen, [undefined, 'a', 'b']);
    assert.equal(capped, false);
  });

  it('stops at the cap', async () => {
    let n = 0;
    const page = async () => ({ items: Array(100).fill(0), nextCursor: `c${++n}` });
    const { rows, capped } = await fetchExportRowsByCursor(page, 250);
    assert.equal(rows.length, 250);
    assert.equal(capped, true);
    assert.equal(n, 3);
  });

  it('stops when the API repeats a cursor', async () => {
    let calls = 0;
    const page = async () => { calls += 1; return { items: [calls], nextCursor: 'same' }; };
    const { rows } = await fetchExportRowsByCursor(page);
    assert.equal(calls, 2);
    assert.deepEqual(rows, [1, 2]);
  });
});

describe('collectExportRows', () => {
  it('filters after every page is fetched, not page by page', async () => {
    const calls: number[] = [];
    const fetchPage = async (p: number) => { calls.push(p); return { items: p === 1 ? ['a', 'b'] : ['match'], totalPages: 2 }; };
    const { rows } = await collectExportRows({ fetchPage, select: (all) => all.filter((x) => x === 'match') });
    assert.deepEqual(calls, [1, 2]);
    assert.deepEqual(rows, ['match']);
  });

  it('uses the cursor fetcher when given one', async () => {
    const fetchCursor = async (c?: string) => (c ? { items: [2], nextCursor: null } : { items: [1], nextCursor: 'n' });
    assert.deepEqual((await collectExportRows({ fetchCursor })).rows, [1, 2]);
  });

  it('reports the cap from the fetched rows', async () => {
    const fetchPage = async (_p: number, limit: number) => ({ items: Array(limit).fill(0), totalPages: 99 });
    const { capped } = await collectExportRows({ fetchPage, cap: 300, select: (r) => r.slice(0, 5) });
    assert.equal(capped, true);
  });
});

describe('exportToast', () => {
  const noun = { one: 'movement', many: 'movements' };
  it('names one row in the singular', () => { assert.equal(exportToast(1, noun, false), 'Exported 1 movement.'); });
  it('counts with separators', () => { assert.equal(exportToast(2400, noun, false), 'Exported 2,400 movements.'); });
  it('explains the cap', () => {
    assert.equal(exportToast(10_000, noun, true), 'Exported the first 10,000 rows. Narrow the filters to get the rest.');
  });
});
