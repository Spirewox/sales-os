import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deleteSavedReport, saveReport } from './saved-reports';
import type { SavedReport } from '../reports';

const body = { name: 'Revenue by location', dataset: 'sales', measure: 'revenue', groupBy: 'Location', filters: [], chart: 'column' as const };

describe('saveReport', () => {
  it('stores a report with an id and date', () => {
    const list: SavedReport[] = [];
    const res = saveReport(list, body, '2026-11-26T10:00:00Z');
    assert.equal(res.status, 200);
    assert.equal(list.length, 1);
    assert.match(list[0].id, /^rep_/);
    assert.equal(list[0].createdAt, '2026-11-26T10:00:00Z');
  });
  it('refuses a name already used, whatever its case', () => {
    const list: SavedReport[] = [];
    saveReport(list, body, 'now');
    const res = saveReport(list, { ...body, name: ' revenue BY location ' }, 'now');
    assert.equal(res.status, 409);
    assert.deepEqual(res.data, { message: 'You already have a report with that name.' });
  });
  it('refuses an empty or over-long name', () => {
    assert.equal(saveReport([], { ...body, name: '  ' }, 'now').status, 400);
    assert.equal(saveReport([], { ...body, name: 'x'.repeat(61) }, 'now').status, 400);
  });
});

describe('deleteSavedReport', () => {
  it('removes one report and answers 404 for an unknown id', () => {
    const list: SavedReport[] = [];
    saveReport(list, body, 'now');
    assert.equal(deleteSavedReport(list, list[0].id).status, 200);
    assert.equal(list.length, 0);
    assert.equal(deleteSavedReport(list, 'zz').status, 404);
  });
});
