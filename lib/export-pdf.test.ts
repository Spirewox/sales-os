import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPdf, pdfHeaderLines, pdfTable } from './export-pdf';

describe('pdfTable', () => {
  const t = pdfTable(['Name', 'Spend', 'Last purchase'], [['Ada', 1250000.5, '2026-11-20'], ['Obi', null, ''], ['Eze', -20, '₦ owed']]);

  it('right-aligns columns that hold only numbers', () => {
    assert.deepEqual(t.numeric, [false, true, false]);
  });

  it('formats numbers with separators and up to two decimals', () => {
    assert.deepEqual(t.body.map((r) => r[1]), ['1,250,000.5', '', '-20']);
  });

  it('spells out the naira sign, which the PDF font cannot draw', () => {
    assert.equal(t.body[2][2], 'NGN owed');
  });
});

describe('pdfHeaderLines', () => {
  const at = new Date('2026-11-26T13:05:00Z');
  it('lists the filters and when it was exported', () => {
    assert.deepEqual(pdfHeaderLines({ filters: ['Lagos Hub', 'Last 30 days', 'Status: Open'], exportedAt: at, count: 24, noun: { one: 'supplier', many: 'suppliers' } }), [
      'Filters: Lagos Hub, Last 30 days, Status: Open',
      '24 suppliers. Exported 26 Nov 2026, 14:05 Lagos time.',
    ]);
  });
  it('says when nothing is filtered', () => {
    assert.equal(pdfHeaderLines({ filters: [], exportedAt: at, count: 1, noun: { one: 'user', many: 'users' } })[0], 'Filters: none');
  });
});

describe('buildPdf', () => {
  it('writes a PDF with the title, filters and rows', async () => {
    const bytes = await buildPdf({
      title: 'Suppliers', filters: ['Lagos Hub'], exportedAt: new Date('2026-11-26T13:05:00Z'), noun: { one: 'supplier', many: 'suppliers' },
      headers: ['Name', 'Spend'], rows: [['Ogun Poultry', 900000]],
    });
    const text = new TextDecoder('latin1').decode(bytes);
    assert.ok(text.startsWith('%PDF-'));
    assert.match(text, /Suppliers/);
    assert.match(text, /Filters: Lagos Hub/);
    assert.match(text, /Ogun Poultry/);
    assert.match(text, /900,000/);
  });
});
