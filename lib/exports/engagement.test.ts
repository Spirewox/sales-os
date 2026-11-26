import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv } from '../export';
import { COMPENSATION_EXPORT_COLUMNS, ENQUIRY_EXPORT_COLUMNS, FEEDBACK_EXPORT_COLUMNS } from './engagement';
import type { Compensation, Enquiry, Feedback } from '@/types';

const line = (csv: string) => csv.split('\r\n')[1];
const cells = (...v: string[]) => v.map((x) => `"${x}"`).join(',');

describe('ENQUIRY_EXPORT_COLUMNS', () => {
  const e: Enquiry = {
    id: 'e1', customerName: 'Tunde Bakare', email: 'tunde@x.ng', subject: 'Bulk turkey', message: 'Price for 40 cartons?',
    date: '2026-11-24T16:05:00Z', status: 'Closed', category: 'Pricing', resolution: 'Sent the price list', managedByAgentName: 'Emeka Nwosu',
  };
  it('has the agreed headers', () => {
    assert.deepEqual(ENQUIRY_EXPORT_COLUMNS.map((c) => c.header), ['Date', 'Customer', 'Email', 'Category', 'Subject', 'Message', 'Status', 'Resolution', 'Handled by']);
  });
  it('writes a row', () => {
    assert.equal(line(buildCsv(ENQUIRY_EXPORT_COLUMNS, [e])), cells('2026-11-24 17:05', 'Tunde Bakare', 'tunde@x.ng', 'Pricing', 'Bulk turkey', 'Price for 40 cartons?', 'Closed', 'Sent the price list', 'Emeka Nwosu'));
  });
});

describe('FEEDBACK_EXPORT_COLUMNS', () => {
  const f = {
    id: 'f1', customerId: 'c1', customerName: 'Ada Obi', type: 'Complaint', content: 'Late delivery', date: '2026-11-20T08:00:00Z',
    status: 'Resolved', sentiment: 'Negative', priority: 'High', resolutionNote: 'Refunded delivery', resolvedDate: '2026-11-22T09:00:00Z', resolvedByAgentName: 'Zainab Musa',
  } as unknown as Feedback;
  it('has the agreed headers', () => {
    assert.deepEqual(FEEDBACK_EXPORT_COLUMNS.map((c) => c.header), ['Date', 'Customer', 'Type', 'Priority', 'Sentiment', 'Feedback', 'Status', 'Resolution', 'Resolved on', 'Resolved by']);
  });
  it('writes a row', () => {
    assert.equal(line(buildCsv(FEEDBACK_EXPORT_COLUMNS, [f])), cells('2026-11-20 09:00', 'Ada Obi', 'Complaint', 'High', 'Negative', 'Late delivery', 'Resolved', 'Refunded delivery', '2026-11-22', 'Zainab Musa'));
  });
});

describe('COMPENSATION_EXPORT_COLUMNS', () => {
  const c = {
    id: 'k1', customerId: 'c1', customerName: 'Ada Obi', reason: 'Spoilt fish', amount: 12500, date: '2026-11-21T10:00:00Z',
    status: 'Paid', category: 'Refund', recordedByAgentName: 'Emeka Nwosu',
  } as unknown as Compensation;
  it('has the agreed headers', () => {
    assert.deepEqual(COMPENSATION_EXPORT_COLUMNS.map((x) => x.header), ['Date', 'Customer', 'Category', 'Reason', 'Amount', 'Status', 'Recorded by']);
  });
  it('writes the amount as a plain number', () => {
    assert.equal(line(buildCsv(COMPENSATION_EXPORT_COLUMNS, [c])), cells('2026-11-21', 'Ada Obi', 'Refund', 'Spoilt fish', '12500', 'Paid', 'Emeka Nwosu'));
  });
});
