'use client';

import { DataTable, StatusBadge, type Column } from '@/components/app';
import { formatCount, formatMoney } from '@/lib/format';
import type { AuditLog } from '@/types';

type BulkUpload = NonNullable<AuditLog['bulkUpload']>;
type Row = Record<string, unknown>;
type AuditRow = { key: number; line?: number; item: string; customer?: string; location?: string; date?: string; amount?: number; quantity?: number; unit?: string; status?: keyof typeof statuses; notes: string[] };

const statuses = {
  ready: { label: 'Ready', tone: 'good' },
  invalid: { label: 'Needs correction', tone: 'danger' },
  imported: { label: 'Imported', tone: 'good' },
  skipped: { label: 'Skipped', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
} as const;

const objectRows = (value: unknown): Row[] => Array.isArray(value)
  ? value.filter((row): row is Row => row !== null && typeof row === 'object' && !Array.isArray(row))
  : [];
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const messages = (value: unknown) => Array.isArray(value) ? value.flatMap(entry => text(entry) ?? []) : [];

export function uploadDomain(domain?: string) {
  return domain === 'sales' ? 'Sales' : domain === 'inventory' ? 'Inventory' : domain === 'customers' ? 'Customers' : 'Workbook';
}

export function uploadTemplate(type?: string) {
  const templates: Record<string, string> = { catalog: 'Catalog', custom: 'Custom products', name_only: 'Customer names', movements: 'Stock movements' };
  return type ? templates[type] ?? 'Standard' : undefined;
}

export function uploadStage(stage?: string) {
  return stage === 'validate' ? 'Validation' : stage === 'import' ? 'Import' : 'Upload';
}

export function BulkUploadSummary({ upload, details }: Readonly<{ upload: BulkUpload; details: string }>) {
  const summary = upload.summary;
  const entries = [
    { label: 'Rows in workbook', value: number(summary?.total) ?? upload.rowCount },
    { label: 'Ready at validation', value: number(summary?.valid) },
    { label: 'Needs correction', value: number(summary?.invalid) },
    { label: 'Rows with warnings', value: number(summary?.warnings) },
    { label: 'Imported', value: upload.importProgress?.imported ?? number(summary?.imported) },
    { label: 'Skipped', value: number(summary?.skipped) },
    { label: 'Failed', value: upload.importProgress?.failed ?? number(summary?.failed) },
  ].filter(entry => entry.value !== undefined);

  if (!entries.length) return <p className="break-words text-sm text-muted-foreground">{details || 'No summary was recorded for this upload.'}</p>;

  return (
    <dl className="divide-y rounded-lg border">
      {entries.map(entry => <div key={entry.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
        <dt className="text-muted-foreground">{entry.label}</dt>
        <dd className="font-medium tabular-nums">{formatCount(entry.value)}</dd>
      </div>)}
    </dl>
  );
}

export function BulkUploadRows({ upload, results }: Readonly<{ upload: BulkUpload; results: boolean }>) {
  const byLine = new Map(objectRows(upload.rows).map(row => [number(row.lineNo), row]));
  const source = objectRows(results ? upload.results : upload.rows);
  const rows: AuditRow[] = source.map((entry, index) => {
    const line = number(entry.lineNo);
    const row = results ? byLine.get(line) ?? entry : entry;
    const customer = text(row.customer_name);
    const product = text(row.product_description) ?? text(row.product_name);
    const error = text(entry.error);
    return {
      key: index, line,
      item: product ?? customer ?? (line == null ? 'Workbook entry' : 'Row ' + line),
      customer: product ? customer : undefined,
      location: text(row.hub_name),
      date: text(row.date_sold) ?? text(row.movement_date) ?? text(row.date),
      amount: number(row.amount) ?? number(row.unit_cost),
      quantity: number(row.quantity), unit: text(row.unit),
      status: results
        ? entry.skipped === true ? 'skipped' : entry.success === true ? 'imported' : entry.success === false ? 'failed' : undefined
        : row.valid === true ? 'ready' : row.valid === false ? 'invalid' : undefined,
      notes: results ? error ? [error] : [] : [...messages(row.errors), ...messages(row.warnings)],
    };
  });
  const columns: Column<AuditRow>[] = [
    { id: 'row', header: 'Row', mobile: 'meta', cell: row => row.line == null ? '—' : <><span className="md:sr-only">Row </span>{row.line}</> },
    { id: 'item', header: 'Workbook entry', mobile: 'title', cell: row => (
      <span className="block min-w-0 break-words">
        <span className="font-medium">{row.item}</span>
        {row.customer && <span className="block text-xs text-muted-foreground">{row.customer}</span>}
        {(row.location || row.date) && <span className="block text-xs text-muted-foreground">{[row.location, row.date].filter(Boolean).join(' · ')}</span>}
      </span>
    ) },
    { id: 'quantity', header: 'Quantity', align: 'right', mobile: 'meta', cell: row => row.quantity == null ? '—' : [row.quantity.toLocaleString('en-NG', { maximumFractionDigits: 6 }), row.unit].filter(Boolean).join(' ') },
    { id: 'amount', header: upload.domain === 'inventory' ? 'Unit cost' : 'Amount', align: 'right', mobile: 'value', cell: row => row.amount == null ? '—' : formatMoney(row.amount) },
    { id: 'status', header: results ? 'Outcome' : 'Validation', mobile: 'meta', cell: row => (
      <span className="block min-w-0">
        {row.status && <StatusBadge tone={statuses[row.status].tone}>{statuses[row.status].label}</StatusBadge>}
        {row.notes.map((note, index) => <span key={index} className="mt-1 block break-words text-xs text-muted-foreground">{note}</span>)}
      </span>
    ) },
  ];
  const displayColumns = upload.domain === 'customers' ? columns.filter(column => column.id !== 'quantity' && column.id !== 'amount') : columns;

  return <div className="space-y-3">
    {(results ? upload.resultsTruncated : upload.rowsTruncated) && <p className="text-sm text-muted-foreground">The audit log contains only the first {formatCount(rows.length)} entries.</p>}
    {rows.length ? <DataTable label={results ? 'Upload results' : 'Workbook rows'} rows={rows} columns={displayColumns} getRowId={row => String(row.key)} pageSize={10} fixedPageSize />
      : results && upload.importProgress ? <BulkUploadSummary upload={upload} details="" />
      : <p className="text-sm text-muted-foreground">{results ? 'No individual results were recorded.' : 'No workbook rows were recorded.'}</p>}
  </div>;
}
