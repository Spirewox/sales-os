import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deleteSavedReport, saveReport, updateSavedReport } from './saved-reports';
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

describe('saveReport columns', () => {
  it('keeps the columns and refuses none or too many', () => {
    const list: SavedReport[] = [];
    assert.equal(saveReport(list, { ...body, measures: ['revenue', 'orders'] }, 'now').status, 200);
    assert.deepEqual(list[0].measures, ['revenue', 'orders']);
    assert.equal(list[0].measure, 'revenue');
    assert.equal(saveReport([], { ...body, measures: [] }, 'now').status, 400);
    assert.equal(saveReport([], { ...body, measures: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, 'now').status, 400);
  });
});

describe('updateSavedReport', () => {
  it('changes a report and keeps its id and date', () => {
    const list: SavedReport[] = [];
    saveReport(list, body, '2026-11-26T10:00:00Z');
    const id = list[0].id;
    const res = updateSavedReport(list, id, { ...body, name: 'Sales by location', measures: ['revenue', 'orders'], measure: 'revenue' });
    assert.equal(res.status, 200);
    assert.equal(list[0].id, id);
    assert.equal(list[0].createdAt, '2026-11-26T10:00:00Z');
    assert.equal(list[0].name, 'Sales by location');
    assert.deepEqual(list[0].measures, ['revenue', 'orders']);
  });
  it('keeps its own name but refuses another report\'s', () => {
    const list: SavedReport[] = [];
    saveReport(list, body, 'now');
    saveReport(list, { ...body, name: 'Other' }, 'now');
    const mine = list.find((r) => r.name === 'Revenue by location')!;
    assert.equal(updateSavedReport(list, mine.id, body).status, 200);
    assert.equal(updateSavedReport(list, mine.id, { ...body, name: 'other' }).status, 409);
    assert.equal(updateSavedReport(list, 'zz', body).status, 404);
  });
});
