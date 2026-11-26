import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv } from '../export';
import { posTransactionExportColumns } from './pos';
import type { PosRow } from '@/lib/pos-rows';

const labels = {
  hubName: (id: string) => ({ rsp_lekki: 'Lekki RSP' } as Record<string, string>)[id] ?? id,
  tillLabel: (id?: string) => (id === 'dev-1' ? 'Front till' : id ?? ''),
  statusLabel: (s?: string) => (s === 'completed' ? 'Completed' : s ?? ''),
};

const row: PosRow = {
  _id: 't1', hub: 'rsp_lekki', device_id: 'dev-1', client_sale_id: 'LEK-00412', cashier_name: 'Chidi Okafor', kind: 'sale', status: 'completed',
  total_kobo: 1_850_050, createdAt: '2026-11-25T18:42:00Z',
  receipt: { lines: [{ name: 'Wings', qty: 2, lineTotal: 9000 }, { name: 'Fish', qty: 1, lineTotal: 9500.5 }], receiptPayment: { actualMethod: 'Transfer' } },
};

describe('posTransactionExportColumns', () => {
  it('has the agreed headers', () => {
    assert.deepEqual(posTransactionExportColumns(labels).map((c) => c.header), [
      'Date and time', 'Reference', 'Type', 'Location', 'Till', 'Cashier', 'Items', 'Payment method', 'Status', 'Amount',
    ]);
  });

  it('writes naira from kobo and names the labels', () => {
    assert.equal(buildCsv(posTransactionExportColumns(labels), [row]).split('\r\n')[1], [
      '2026-11-25 19:42', 'LEK-00412', 'Sale', 'Lekki RSP', 'Front till', 'Chidi Okafor', '3', 'Transfer', 'Completed', '18500.5',
    ].map((v) => `"${v}"`).join(','));
  });

  it('leaves a missing amount and method empty', () => {
    const line = buildCsv(posTransactionExportColumns(labels), [{ _id: 't2', hub: 'x' }]).split('\r\n')[1];
    assert.ok(line.endsWith('"","",""'));
  });
});
