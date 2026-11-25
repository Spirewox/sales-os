'use client';

import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import type { BulkJob } from '@/lib/bulk-jobs';
import { formatMoney } from '@/lib/format';
import { enablePush, pushStatus } from '@/lib/push';
import type { SalesImportPreviewRow } from '@/types/api';

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
  const [showRows, setShowRows] = useState(false);
  const busy = validating || phase !== null;
  const valid = preview?.summary.valid ?? 0;
  const invalid = preview?.summary.invalid ?? 0;
  const title = validating ? 'Checking workbook' : phase === 'direct' ? 'Importing sales' : phase ? 'Submitting import' : 'Review sales import';
  const total = preview?.rows.reduce((amount, row) => amount + (row.valid ? row.resolved?.amount ?? row.amount ?? 0 : 0), 0) ?? 0;

  return (
    <ModalDialog onClose={onClose} dismissible={!busy} labelledBy="sales-import-title">
      <div className="relative z-10 max-h-[85dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border bg-card p-5 shadow-lg">
        <div className="space-y-1">
          <h2 id="sales-import-title" className="text-lg font-semibold">{title}</h2>
          <p className="break-all text-sm text-muted-foreground">{fileName}</p>
        </div>
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
          {invalid > 0 && <section aria-label="Validation errors" className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">{invalid} {invalid === 1 ? 'row has' : 'rows have'} errors and will be skipped.</p>
            <ul className="max-h-36 space-y-1 overflow-y-auto">
              {preview.rows.filter(row => !row.valid).map(row => (
                <li key={row.lineNo}><span className="font-medium">Row {row.lineNo}</span> {row.errors.join('; ') || 'Invalid row'}</li>
              ))}
            </ul>
          </section>}
          {valid > 0 && <div className="rounded-lg border">
            <Button type="button" variant="ghost" className="w-full justify-start" aria-expanded={showRows}
              aria-controls="sales-import-rows" onClick={() => setShowRows(open => !open)}>
              <ChevronDown aria-hidden className={showRows ? 'rotate-180' : undefined} /> {showRows ? 'Hide valid rows' : 'View valid rows'}
            </Button>
            <ul id="sales-import-rows" hidden={!showRows} className="max-h-48 divide-y overflow-y-auto border-t">
              {preview.rows.filter(row => row.valid).map(row => (
                <li key={row.lineNo} className="flex justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{row.product_description || row.product_name || 'Sale'}</p>
                    <p className="break-words text-xs text-muted-foreground">Row {row.lineNo} · {row.customer_name} · {row.hub_name} · {row.date_sold}</p>
                  </div>
                  {typeof row.amount === 'number' && <span className="shrink-0 tabular-nums">{formatMoney(row.amount)}</span>}
                </li>
              ))}
            </ul>
          </div>}
        </>}
        {error && <p role="alert" className="rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
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
