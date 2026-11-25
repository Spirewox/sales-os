'use client';

import { DataTable, StatusBadge, type Column } from '@/components/app';
import { formatMoney } from '@/lib/format';
import type { SalesImportJobRow } from '@/lib/bulk-jobs';

export type ImportRow = Omit<SalesImportJobRow, 'valid' | 'errors'> & {
  status: 'Ready' | 'Needs correction' | 'Imported' | 'Skipped' | 'Failed' | 'Not imported';
  message?: string;
};

const tones = {
  Ready: 'good',
  'Needs correction': 'danger',
  Imported: 'good',
  Skipped: 'warning',
  Failed: 'danger',
  'Not imported': 'neutral',
} as const;

const columns: Column<ImportRow>[] = [
  { id: 'row', header: 'Row', mobile: 'meta', cell: row => <span className="tabular-nums"><span className="md:sr-only">Row </span>{row.lineNo}</span> },
  { id: 'product', header: 'Product', mobile: 'title', cell: row => row.product || '—' },
  { id: 'customer', header: 'Customer', mobile: 'subtitle', cell: row => row.customer || '—' },
  { id: 'hub', header: 'Hub', mobile: 'meta', cell: row => row.hub || '—' },
  { id: 'date', header: 'Sale date', mobile: 'meta', cell: row => <span className="whitespace-nowrap">{row.date || '—'}</span> },
  { id: 'quantity', header: 'Qty', align: 'right', cell: row => row.quantity ?? '—' },
  { id: 'amount', header: 'Amount', align: 'right', mobile: 'value', cell: row => row.amount == null ? '—' : formatMoney(row.amount) },
  { id: 'status', header: 'Status', mobile: 'meta', cell: row => (
    <span className="block min-w-0">
      <StatusBadge tone={tones[row.status]}>{row.status}</StatusBadge>
      {row.message && <span className="mt-1 block break-words text-xs text-muted-foreground">{row.message}</span>}
    </span>
  ) },
];

export function ImportRowsTable({ rows, label }: Readonly<{ rows: ImportRow[]; label: string }>) {
  return <DataTable label={label} rows={rows} columns={columns} getRowId={row => String(row.lineNo)} fixedPageSize pageSize={10} />;
}
