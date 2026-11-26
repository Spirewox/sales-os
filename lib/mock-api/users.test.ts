import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterUsers, saveUser } from './users';
import type { ApiAgentUser } from '@/types/api';

const HUBS = [{ _id: 'hub_lagos', hub_name: 'Lagos Hub' }, { _id: 'hub_ife', hub_name: 'Ife Hub' }, { _id: 'hub_nasarawa', hub_name: 'Nasarawa Hub' }];
const user = (id: string, hubs: string[]) => ({
  _id: id, full_name: id, email: `${id}@x.ng`, phone: '0', hub: hubs[0] ? { _id: hubs[0], hub_name: hubs[0] } : null,
  hubs: hubs.map((h) => ({ _id: h, hub_name: h })),
}) as ApiAgentUser;

describe('filterUsers', () => {
  const rows = [user('a', ['hub_lagos']), user('b', ['hub_ife', 'hub_nasarawa']), user('c', [])];
  it('matches a location against any of a user\'s locations', () => {
    assert.deepEqual(filterUsers(rows, new URLSearchParams('hub_id=hub_nasarawa')).map((u) => u._id), ['b']);
  });
  it('limits to the visible locations when none is asked for, keeping users with none', () => {
    assert.deepEqual(filterUsers(rows, new URLSearchParams(), ['hub_ife']).map((u) => u._id), ['b', 'c']);
  });
});

describe('saveUser', () => {
  it('stores several locations with the primary first', () => {
    const rows = [user('a', ['hub_lagos'])];
    assert.equal(saveUser(rows, HUBS, 'a', { hub_ids: ['hub_ife', 'hub_nasarawa'], hub_id: 'hub_nasarawa' }).status, 200);
    assert.equal(rows[0].hub && typeof rows[0].hub === 'object' ? rows[0].hub._id : null, 'hub_nasarawa');
    assert.deepEqual(rows[0].hubs?.map((h) => h.hub_name), ['Nasarawa Hub', 'Ife Hub']);
  });
  it('refuses a cashier with two locations', () => {
    const rows = [user('a', ['hub_lagos'])];
    const res = saveUser(rows, HUBS, 'a', { hub_ids: ['hub_ife', 'hub_lagos'], hub_id: 'hub_ife', role_id: 'role_cashier' }, (id) => id === 'role_cashier');
    assert.equal(res.status, 400);
  });
  it('adds a user', () => {
    const rows: ApiAgentUser[] = [];
    assert.equal(saveUser(rows, HUBS, null, { full_name: 'New', email: 'n@x.ng', hub_ids: ['hub_ife'], hub_id: 'hub_ife' }).status, 200);
    assert.equal(rows[0].hubs?.[0].hub_name, 'Ife Hub');
  });
});
