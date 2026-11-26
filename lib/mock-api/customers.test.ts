import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { customerSearchFields, saveCustomer } from './customers';
import type { ApiCustomer } from '@/types/api';

const cust = (id: string, p: Partial<ApiCustomer> = {}) => ({
  _id: id, customer_name: 'Ada Obi', customer_phone: '0803', customer_type: 'B2B', customer_location: 'hub_lagos', company_name: 'Mama Put', ...p,
}) as ApiCustomer;

describe('customerSearchFields', () => {
  it('lets a search find a business by any contact name or phone', () => {
    const fields = customerSearchFields(cust('c1', { contacts: [{ _id: 'k', name: 'Bisi Buyer', phone: '0812', is_primary: false }] }));
    assert.ok(fields.includes('Bisi Buyer'));
    assert.ok(fields.includes('0812'));
    assert.ok(fields.includes('Mama Put'));
  });
});

describe('saveCustomer', () => {
  it('updates a customer and keeps its contacts, giving new ones ids', () => {
    const rows = [cust('c1')];
    const res = saveCustomer(rows, 'c1', {
      customer_name: 'Bisi Buyer', customer_phone: '0812', business_address: '4 Allen Ave',
      contacts: [{ name: 'Bisi Buyer', phone: '0812', is_primary: true }, { _id: 'kept', name: 'Ada Obi', phone: '0803', is_primary: false }],
    });
    assert.equal(res.status, 200);
    assert.equal(rows[0].customer_name, 'Bisi Buyer');
    assert.equal(rows[0].business_address, '4 Allen Ave');
    assert.equal(rows[0].contacts?.length, 2);
    assert.match(rows[0].contacts![0]._id, /^ct_/);
    assert.equal(rows[0].contacts![1]._id, 'kept');
  });
  it('adds a new customer when there is no id', () => {
    const rows: ApiCustomer[] = [];
    const res = saveCustomer(rows, null, { customer_name: 'New Co', customer_phone: '0700', customer_type: 'b2b', contacts: [{ name: 'X', phone: '0700', is_primary: true }] });
    assert.equal(res.status, 200);
    assert.equal(rows.length, 1);
    assert.match(rows[0]._id, /^cust_/);
    assert.equal(rows[0].contacts?.[0].name, 'X');
    assert.ok(rows[0].joined_date, 'a new customer has a joined date, which analytics reads');
  });
  it('answers 404 for an unknown customer', () => {
    assert.equal(saveCustomer([], 'zz', {}).status, 404);
  });
});
