import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv } from '../export';
import { customerExportColumns } from './customers';
import type { Customer } from '@/types';

const c = {
  id: 'c1', name: 'Bisi Ade', email: 'bisi@x.ng', phone: '08031234567', type: 'B2B', location: 'Lagos Hub', companyName: 'Mama Put Ventures',
  joinedDate: '2025-02-01', segments: ['Wholesale', 'Weekly'], totalOrders: 14, totalSpent: 1850000.5, lastPurchaseDate: '2026-11-20',
  addedByAgentName: 'Emeka Nwosu', businessCategory: 'Restaurant',
} as unknown as Customer;

describe('customerExportColumns', () => {
  const cols = customerExportColumns((id) => (id === 'c1' ? 60000 : undefined));
  it('has the agreed headers', () => {
    assert.deepEqual(cols.map((x) => x.header), [
      'Name', 'Company', 'Type', 'Business category', 'Phone', 'Email', 'Location', 'Segments', 'Orders', 'Total spent', 'Outstanding credit', 'Last purchase', 'Joined', 'Added by',
    ]);
  });
  it('writes a business customer', () => {
    assert.equal(buildCsv(cols, [c]).split('\r\n')[1], [
      'Bisi Ade', 'Mama Put Ventures', 'Business', 'Restaurant', '08031234567', 'bisi@x.ng', 'Lagos Hub', 'Wholesale; Weekly', '14', '1850000.5', '60000', '2026-11-20', '2025-02-01', 'Emeka Nwosu',
    ].map((v) => `"${v}"`).join(','));
  });
  it('leaves outstanding empty when credit is unknown', () => {
    const line = buildCsv(customerExportColumns(() => undefined), [{ ...c, type: 'B2C' } as Customer]).split('\r\n')[1];
    assert.match(line, /"Individual"/);
    assert.match(line, /"1850000.5","","2026-11-20"/);
  });
});
