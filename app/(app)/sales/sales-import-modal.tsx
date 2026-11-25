'use client';

import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import type { BulkJob } from '@/lib/bulk-jobs';
import { formatMoney } from '@/lib/format';
import { enablePush, pushStatus } from '@/lib/push';
import type { SalesImportPreviewRow } from '@/types/api';
import { ImportRowsTable, type ImportRow } from './import-rows-table';

type Preview = {
  rows: SalesImportPreviewRow[];
  summary: { total: number; valid: number; invalid: number };
};

const saleCount = (count: number) => count + (count === 1 ? ' sale' : ' sales');

export function SalesImportModal({ fileName, onClose, preview, phase, validating, error, onConfirm }: Readonly<{
  fileName: string;
  onClose: () => void;
  preview?: Preview;
  phase: 'submitting' | 'direct' | null;
  validating: boolean;
  error?: string | null;
  onConfirm: () => void;
}>) {
  const busy = validating || phase !== null;
  const valid = preview?.summary.valid ?? 0;
  const invalid = preview?.summary.invalid ?? 0;
  const title = validating ? 'Checking workbook' : phase === 'direct' ? 'Importing sales' : phase ? 'Submitting import' : 'Review sales import';
  const total = preview?.rows.reduce((amount, row) => amount + (row.valid ? row.resolved?.amount ?? row.amount ?? 0 : 0), 0) ?? 0;

  const rows: ImportRow[] = preview?.rows.map(row => ({
    lineNo: row.lineNo,
    product: row.product_description || row.product_name || null,
    customer: row.customer_name,
    hub: row.hub_name,
    date: row.date_sold,
    quantity: row.quantity,
    amount: row.resolved?.amount ?? row.amount ?? null,
    status: row.valid ? 'Ready' : 'Needs correction',
    message: row.valid ? undefined : row.errors.join('; ') || 'Review this row in the workbook.',
  })) ?? [];

  return (
    <ModalDialog onClose={onClose} dismissible={!busy} labelledBy="sales-import-title">
      <div className={'relative z-10 flex max-h-[85dvh] w-full flex-col gap-4 rounded-xl border bg-card p-5 shadow-lg ' + (!busy && preview ? 'max-w-5xl' : 'max-w-lg')}>
        <div className="space-y-1">
          <h2 id="sales-import-title" className="text-lg font-semibold">{title}</h2>
          <p className="break-all text-sm text-muted-foreground">{fileName}</p>
        </div>
        <div className="min-h-0 space-y-3 overflow-y-auto">
          {busy && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {phase === 'direct' ? 'Keep this page open until the import finishes.' : phase ? 'Waiting for the server to accept your import.' : 'Validating spreadsheet rows.'}
            </p>
          )}
          {!busy && preview && <>
            {valid > 0 && <>
              <p className="text-sm font-medium">{saleCount(valid)} ready to import <span className="text-muted-foreground">· {formatMoney(total)}</span></p>
              <p className="text-sm text-muted-foreground">If any submitted row fails during import, none of those sales are saved.</p>
            </>}
            {invalid > 0 && <p className="text-sm text-destructive">{invalid} {invalid === 1 ? 'row needs' : 'rows need'} correction. Only ready rows will be submitted.</p>}
            {preview.rows.length > 0 && <ImportRowsTable rows={rows} label="Sales import preview rows" />}
          </>}
          {error && <p role="alert" className="rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>
        {!busy && <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{valid ? 'Cancel' : 'Close'}</Button>
          {valid > 0 && <Button type="button" onClick={onConfirm}>Import {saleCount(valid)}</Button>}
        </div>}
      </div>
    </ModalDialog>
  );
}

export function SalesImportReceipt({ job, onClose }: Readonly<{ job: BulkJob; onClose: () => void }>) {
  const device = useQuery({ queryKey: ['import-device-push'], queryFn: pushStatus, retry: false });
  const enable = useMutation({ mutationFn: enablePush });
  const push = enable.data ?? device.data;
  const active = job.status === 'queued' || job.status === 'running';
  const title = job.status === 'complete' ? 'Import completed' : job.status === 'failed' ? 'Import failed' : job.status === 'running' ? 'Import processing' : 'Import queued';

  return (
    <ModalDialog onClose={onClose} labelledBy="import-receipt-title">
      <div className="relative z-10 max-h-[85dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border bg-card p-5 shadow-lg">
        <h2 id="import-receipt-title" className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {active ? 'Your import runs in the background. You can close this and keep working. Look for the result in Import history or in your Sales OS notifications.'
            : job.status === 'complete' && job.result ? saleCount(job.result.imported) + ' imported.'
              : 'Open the import to see the result.'}
        </p>
        {active && push === 'off' && (
          <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
            <p className="text-sm">Get a browser notification on this device when your import finishes.</p>
            <Button variant="outline" type="button" onClick={() => enable.mutate()} loading={enable.isPending}>
              <Bell aria-hidden /> Enable browser notifications
            </Button>
          </div>
        )}
        {active && push === 'denied' && <p className="text-sm text-muted-foreground">Browser notifications are blocked. You can allow them in your browser’s site settings.</p>}
        {active && push === 'ios-install' && <p className="text-sm text-muted-foreground">On this device, add Sales OS to your Home Screen to turn on browser notifications.</p>}
        {active && push === 'on' && enable.isSuccess && <p role="status" className="text-sm text-muted-foreground">Browser notifications are enabled on this device.</p>}
        {active && enable.isError && <p role="alert" className="text-sm text-destructive">Browser notifications couldn’t be enabled. You can still check Import history.</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={'/jobs/' + job.id} className={buttonVariants({ variant: 'outline' })}>View import</Link>
          <Button type="button" onClick={onClose}>Done</Button>
        </div>
      </div>
    </ModalDialog>
  );
}
