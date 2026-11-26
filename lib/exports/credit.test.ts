import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv } from '../export';
import { creditExportColumns, daysOverdue } from './credit';
import type { CreditCustomerSummary } from '@/types/credits';

const row: CreditCustomerSummary = {
  customerId: 'c1', customerName: 'Mama Put Ventures', phone: '08031234567', hubName: 'Ife Hub',
  totalOutstanding: 185000, openCreditCount: 3, overdueCount: 1, overdueAmount: 60000.25, oldestDueDate: '2026-11-10',
  flaggedCount: 1, dueThisWeekCount: 1, dueThisWeekAmount: 40000, lastPaymentDate: '2026-11-18T10:00:00Z',
};
const now = new Date('2026-11-26T08:00:00Z');

describe('creditExportColumns', () => {
  it('has the agreed headers in order', () => {
    assert.deepEqual(creditExportColumns(now).map((c) => c.header), [
      'Customer', 'Phone', 'Location', 'Outstanding', 'Open credits', 'Overdue credits', 'Overdue amount',
      'Oldest due date', 'Days overdue', 'Due this week', 'Due this week amount', 'Last payment', 'Flagged',
    ]);
  });

  it('writes plain numbers and Lagos dates', () => {
    const line = buildCsv(creditExportColumns(now), [row]).split('\r\n')[1];
    assert.equal(line, [
      'Mama Put Ventures', '08031234567', 'Ife Hub', '185000', '3', '1', '60000.25', '2026-11-10', '16', '1', '40000', '2026-11-18', 'Yes',
    ].map((v) => `"${v}"`).join(','));
  });
});

describe('daysOverdue', () => {
  it('counts Lagos days past the due date', () => { assert.equal(daysOverdue('2026-11-10', now), 16); });
  it('is 0 when not yet due', () => { assert.equal(daysOverdue('2026-12-01', now), 0); });
  it('is empty with no due date', () => { assert.equal(daysOverdue(null, now), null); });
  it('uses the Lagos day just after midnight', () => {
    // 23:30 UTC on the 25th is already the 26th in Lagos.
    assert.equal(daysOverdue('2026-11-25', new Date('2026-11-25T23:30:00Z')), 1);
  });
});
