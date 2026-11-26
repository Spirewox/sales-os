import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv } from '../export';
import { auditExportColumns, auditListPage } from './audit';
import type { AuditLog } from '@/types';

const log = {
  id: 'a1', timestamp: '2026-11-25T09:30:00Z', userName: 'Tolu Adebayo', location: 'Lagos Hub', entityType: 'Sale', entityId: 'S-1042',
  action: 'UPDATE', details: 'Marked as paid', bulkUpload: { fileName: 'november.xlsx' },
} as unknown as AuditLog;

const AUDIT_EXPORT_COLUMNS = auditExportColumns({ entity: (e) => (e === 'Sale' ? 'Sale' : String(e)), action: (a) => (a === 'UPDATE' ? 'Updated' : String(a)) });

describe('auditExportColumns', () => {
  it('keeps the headers of the page export', () => {
    assert.deepEqual(AUDIT_EXPORT_COLUMNS.map((c) => c.header), ['Time (Lagos)', 'User', 'Location', 'Record type', 'Record ID', 'Action', 'Details']);
  });

  it('writes Lagos time and joins the upload file to the details', () => {
    const cells = buildCsv(AUDIT_EXPORT_COLUMNS, [log]).split('\r\n')[1].split('","');
    assert.equal(cells[0], '"2026-11-25 10:30');
    assert.equal(cells[4], 'S-1042');
    assert.equal(cells[5], 'Updated');
    assert.equal(cells[6], 'november.xlsx: Marked as paid"');
  });
});

describe('auditListPage', () => {
  it('passes the screen filters and the page to the fetcher', async () => {
    const calls: unknown[] = [];
    const fetchList = async (f: Record<string, unknown>) => {
      calls.push(f);
      return { items: [log], meta: { page: 2, limit: 200, total: 201, totalPages: 2 }, summary: {} as never };
    };
    const page = await auditListPage(fetchList, { module: 'sales', search: 'paid', date_from: '2026-11-01' }, 2, 200);
    assert.deepEqual(calls[0], { module: 'sales', search: 'paid', date_from: '2026-11-01', page: 2, limit: 200 });
    assert.deepEqual(page, { items: [log], totalPages: 2 });
  });
});
