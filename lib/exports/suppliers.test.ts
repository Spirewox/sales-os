import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv } from '../export';
import { SUPPLIER_EXPORT_COLUMNS, type SupplierExportRow } from './suppliers';

const row: SupplierExportRow = {
  supplier: {
    id: 's1', code: 'SUP-004', name: 'Ogun Poultry', businessName: 'Ogun Poultry Ltd', businessType: 'Manufacturer' as never,
    location: 'Lagos Hub', contactPerson: 'Bayo Ade', phone: '08031234567', email: 'bayo@ogun.ng',
    categories: ['Chicken', 'Turkey'] as never, paymentTerms: 'Net 30' as never, leadTimeDays: 3, rating: 4.5,
    totalSpend: 900000, isActive: false, createdDate: '2026-03-01',
  },
  spend: 1250000.5,
  lastPurchase: '2026-11-20T09:15:00Z',
  openIssues: 2,
};

describe('SUPPLIER_EXPORT_COLUMNS', () => {
  it('has the agreed headers in order', () => {
    assert.deepEqual(SUPPLIER_EXPORT_COLUMNS.map((c) => c.header), [
      'Code', 'Name', 'Business name', 'Business type', 'Contact person', 'Phone', 'Email', 'Location', 'Categories',
      'Payment terms', 'Lead time (days)', 'Rating', 'Status', 'Spend', 'Last purchase', 'Open issues',
    ]);
  });

  it('writes money as a plain number, dates in Lagos and status in words', () => {
    const line = buildCsv(SUPPLIER_EXPORT_COLUMNS, [row]).split('\r\n')[1];
    assert.equal(line, [
      'SUP-004', 'Ogun Poultry', 'Ogun Poultry Ltd', 'Manufacturer', 'Bayo Ade', '08031234567', 'bayo@ogun.ng', 'Lagos Hub',
      'Chicken; Turkey', 'Net 30', '3', '4.5', 'Inactive', '1250000.5', '2026-11-20', '2',
    ].map((v) => `"${v}"`).join(','));
  });

  it('leaves unknown open issues empty', () => {
    const line = buildCsv(SUPPLIER_EXPORT_COLUMNS, [{ ...row, openIssues: null, lastPurchase: null }]).split('\r\n')[1];
    assert.ok(line.endsWith('"",""'));
  });
});
