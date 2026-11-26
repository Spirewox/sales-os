import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv } from '../export';
import { SALE_EXPORT_COLUMNS } from './sales';
import type { Sale } from '@/types';

const sale = {
  id: 's1', clientSaleId: 'S-1042', date: '2026-11-25T14:30:00Z', customerName: 'Ada Obi', customerPhone: '08031234567', hubName: 'Lagos Hub',
  agentName: 'Tolu Adebayo', channel: 'Walk-In', source: 'crm',
  item: { productName: 'Chicken wings', category: 'Chicken', quantity: 2, saleUnit: 'Carton', unitPrice: 52000 },
  amount: 104000, discount: 4000, amountPaid: 50000, profitAmount: 21000.25, profitMargin: 20.19, status: 'Approved',
  paymentMode: 'Transfer', isCredit: true, dueDate: '2026-12-10', deliveryStatus: 'N/A',
} as unknown as Sale;

describe('SALE_EXPORT_COLUMNS', () => {
  it('has the agreed headers', () => {
    assert.deepEqual(SALE_EXPORT_COLUMNS.map((c) => c.header), [
      'Date', 'Reference', 'Customer', 'Phone', 'Location', 'Recorded by', 'Channel', 'Product', 'Category', 'Quantity', 'Unit', 'Unit price',
      'Discount', 'Amount', 'Paid', 'Balance', 'Profit', 'Margin %', 'Status', 'Payment', 'Credit', 'Due date', 'Delivery',
    ]);
  });
  it('writes a credit sale with its balance and margin', () => {
    assert.equal(buildCsv(SALE_EXPORT_COLUMNS, [sale]).split('\r\n')[1], [
      '2026-11-25 15:30', 'S-1042', 'Ada Obi', '08031234567', 'Lagos Hub', 'Tolu Adebayo', 'Walk-In', 'Chicken wings', 'Chicken', '2', 'Carton', '52000',
      '4000', '104000', '50000', '54000', '21000.25', '20.2', 'Approved', 'Transfer', 'Yes', '2026-12-10', 'N/A',
    ].map((v) => `"${v}"`).join(','));
  });
  it('treats a voided sale as owing nothing', () => {
    const line = buildCsv(SALE_EXPORT_COLUMNS, [{ ...sale, status: 'Voided' } as Sale]).split('\r\n')[1].split('","');
    assert.equal(line[15], '0');
  });
});
