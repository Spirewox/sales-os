import type { Agent } from '@/types';
import { type ExportColumn } from '@/lib/export';

export const USER_EXPORT_COLUMNS: ExportColumn<Agent>[] = [
  { header: 'Name', value: (a) => a.name },
  { header: 'Email', value: (a) => a.email },
  { header: 'Username', value: (a) => a.username },
  { header: 'Phone', value: (a) => a.phone },
  { header: 'Role', value: (a) => a.role },
  { header: 'Location', value: (a) => (a.hubNames && a.hubNames.length > 1 ? a.hubNames.join('; ') : a.location) },
  { header: 'Status', value: (a) => (a.isActive === false ? 'Inactive' : 'Active') },
  { header: 'Joined', value: (a) => a.joinedDate },
];
