import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv } from '../export';
import { kitchenJobExportColumns } from './kitchen';
import type { KitchenJob } from '@/lib/kitchen-types';

const job = {
  _id: 'j1', code: 'KJ-0091', createdAt: '2026-11-25T09:00:00Z', stage: 'confirmed', hub: { _id: 'h', hub_name: 'Lagos Hub' }, customer_name: 'Ada Obi',
  phone: '08031234567', channel: 'WhatsApp', mode: 'packs', count: 40, due_at: '2026-11-28T11:00:00Z', total: 180000, paid: 100000,
  costing: { cost: 120000, profit: 60000, margin: 0.3333 }, created_by_name: 'Segun Alade', cancel_reason: '',
} as unknown as KitchenJob;

describe('kitchenJobExportColumns', () => {
  it('leaves out cost, profit and margin without permission', () => {
    assert.ok(!kitchenJobExportColumns(false).some((c) => c.header === 'Cost'));
  });
  it('has the headers of the earlier export', () => {
    assert.deepEqual(kitchenJobExportColumns(true).map((c) => c.header), [
      'Code', 'Created', 'Stage', 'Outlet', 'Customer', 'Phone', 'Channel', 'Service', 'Count', 'Due', 'Total', 'Paid', 'Balance', 'Cost', 'Profit', 'Margin %', 'Taken by', 'Cancel reason',
    ]);
  });
  it('writes Lagos times, the balance and margin as a number', () => {
    const cells = buildCsv(kitchenJobExportColumns(true), [job]).split('\r\n')[1].split('","');
    assert.equal(cells[1], '2026-11-25 10:00');
    assert.equal(cells[3], 'Lagos Hub');
    assert.equal(cells[9], '2026-11-28 12:00');
    assert.equal(cells[12], '80000');
    assert.equal(cells[15], '33.3');
  });
});
