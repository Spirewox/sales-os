import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv } from '../export';
import { USER_EXPORT_COLUMNS } from './users';
import type { Agent } from '@/types';

const agent: Agent = {
  id: 'u1', name: 'Kunle Oyewole', email: 'kunle@fudfarmer.com', username: 'kunle', phone: '08031234567', role: 'Hub Manager',
  location: 'Ife Hub', joinedDate: '2025-08-14', isActive: false,
};

describe('USER_EXPORT_COLUMNS', () => {
  it('has the agreed headers', () => {
    assert.deepEqual(USER_EXPORT_COLUMNS.map((c) => c.header), ['Name', 'Email', 'Username', 'Phone', 'Role', 'Location', 'Status', 'Joined']);
  });

  it('writes a row with status in words', () => {
    assert.equal(buildCsv(USER_EXPORT_COLUMNS, [agent]).split('\r\n')[1],
      ['Kunle Oyewole', 'kunle@fudfarmer.com', 'kunle', '08031234567', 'Hub Manager', 'Ife Hub', 'Inactive', '2025-08-14'].map((v) => `"${v}"`).join(','));
  });

  it('lists every location of a user who works at several', () => {
    assert.match(buildCsv(USER_EXPORT_COLUMNS, [{ ...agent, hubNames: ['Ife Hub', 'Nasarawa Hub'] }]), /"Ife Hub; Nasarawa Hub"/);
  });

  it('counts a user with no flag as active', () => {
    assert.match(buildCsv(USER_EXPORT_COLUMNS, [{ ...agent, isActive: undefined }]), /"Active"/);
  });
});
