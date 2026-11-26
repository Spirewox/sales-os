import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv, csvDate, exportFilename, exportToast, fetchExportRows, EXPORT_ROW_CAP, type ExportCell } from './export';

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

  it('defaults the cap to 10,000', () => {
    assert.equal(EXPORT_ROW_CAP, 10_000);
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
