import type { AuditLog, AuditLogListResult } from '@/types';
import { csvDate, type ExportColumn } from '@/lib/export';

/** The labels the audit screen already uses for record types and actions (lib/api-mappers). */
export type AuditExportLabels = {
  entity: (entityType: AuditLog['entityType']) => string;
  action: (action: AuditLog['action']) => string;
};

export function auditExportColumns(l: AuditExportLabels): ExportColumn<AuditLog>[] {
  return [
    { header: 'Time (Lagos)', value: (a) => csvDate(a.timestamp, true) || a.timestamp },
    { header: 'User', value: (a) => a.userName },
    { header: 'Location', value: (a) => a.location },
    { header: 'Record type', value: (a) => l.entity(a.entityType) },
    { header: 'Record ID', value: (a) => a.entityId },
    { header: 'Action', value: (a) => l.action(a.action) },
    { header: 'Details', value: (a) => (a.bulkUpload?.fileName ? `${a.bulkUpload.fileName}${a.details ? `: ${a.details}` : ''}` : a.details) },
  ];
}

/** One page of the audit list with the screen's filters, shaped for fetchExportRows. */
export async function auditListPage<F extends object>(
  fetchList: (filters: F & { page: number; limit: number }) => Promise<AuditLogListResult>,
  filters: F,
  page: number,
  limit: number,
): Promise<{ items: AuditLog[]; totalPages: number }> {
  const res = await fetchList({ ...filters, page, limit });
  return { items: res.items, totalPages: res.meta.totalPages };
}
