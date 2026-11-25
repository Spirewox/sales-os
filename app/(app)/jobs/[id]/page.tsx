'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, StatusBadge } from '@/components/app';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { bulkJobFailure, bulkJobStatus, downloadBulkExport, getBulkJob, type BulkJob, type SalesImportJobRow } from '@/lib/bulk-jobs';
import { formatDateTime } from '@/lib/format';
import { ImportRowsTable, type ImportRow } from '@/app/(app)/sales/import-rows-table';

const titles = { 'sales-import': 'Sales import', 'inventory-import': 'Inventory import', 'sales-export': 'Sales export' };

function SalesImportOutcome({ job }: Readonly<{ job: BulkJob }>) {
  const status = bulkJobStatus[job.status];
  const active = job.status === 'queued' || job.status === 'running';
  const archived = job.salesImport?.rows;
  const skipped = archived?.filter(row => !row.valid).length;
  const results = new Map(job.result?.results.map(row => [row.lineNo, row]));
  const rows: ImportRow[] = (archived ?? [...results.keys()].map((lineNo): SalesImportJobRow => ({
    lineNo, product: null, customer: null, hub: null, date: null, quantity: null, amount: null, valid: true, errors: [],
  }))).map(row => {
    const result = results.get(row.lineNo);
    if (!row.valid) return { ...row, status: 'Skipped', message: row.errors.join('; ') || 'This row did not pass validation.' };
    if (job.status === 'failed' && row.lineNo === job.failure?.lineNo) {
      return { ...row, status: 'Failed', message: job.failure.reason ?? 'This row could not be saved.' };
    }
    if (job.status === 'complete' && result?.success) return { ...row, status: 'Imported' };
    if (job.status === 'complete' && result) return { ...row, status: 'Failed', message: result.error };
    return { ...row, status: 'Not imported' };
  });

  return (
    <div className="max-w-[1400px] space-y-6">
      <PageHeader
        title="Sales import"
        description={job.salesImport?.fileName && <span className="break-all">{job.salesImport.fileName}</span>}
        actions={<Link href="/sales?importHistory=1" className={buttonVariants({ variant: 'outline' })}>Back to import history</Link>}
      />
      <section aria-label="Import status" className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
        <div role="status" className="space-y-2">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          {job.status === 'queued' && <p className="text-sm">Waiting for a worker. You can leave this page while the import runs.</p>}
          {job.status === 'running' && <p className="text-sm">Saving sales in the background{job.total !== null ? `. ${job.processed} of ${job.total} submitted rows processed` : ''}.</p>}
          {job.status === 'complete' && job.result && <p className="text-sm">
            {job.result.imported} {job.result.imported === 1 ? 'sale was' : 'sales were'} added to Sales OS.
          </p>}
        </div>
        {job.status === 'failed' && <div role="alert" className="space-y-1 text-sm">
          <p className="font-medium text-destructive">No sales from this import were saved.</p>
          <p>{bulkJobFailure(job)}</p>
          {job.failure?.lineNo != null && <p className="text-muted-foreground">Correct the row in Excel and upload the workbook again.</p>}
        </div>}
        <dl className="grid grid-cols-2 gap-3 text-sm sm:flex sm:flex-wrap sm:gap-x-8">
          <div><dt className="text-muted-foreground">Submitted at</dt><dd>{formatDateTime(job.createdAt)}</dd></div>
          {job.total !== null && <div><dt className="text-muted-foreground">Submitted rows</dt><dd className="tabular-nums">{job.total}</dd></div>}
          {skipped !== undefined && <div><dt className="text-muted-foreground">Skipped rows</dt><dd className="tabular-nums">{skipped}</dd></div>}
          {!active && <div><dt className="text-muted-foreground">Finished at</dt><dd>{formatDateTime(job.updatedAt)}</dd></div>}
        </dl>
      </section>
      {!active && rows.length > 0 && (
        <section aria-labelledby="sales-import-results-title" className="space-y-3">
          <h2 id="sales-import-results-title" className="text-base font-semibold">Workbook rows</h2>
          <ImportRowsTable rows={rows} label="Sales import row results" />
        </section>
      )}
      {!active && archived == null && <p className="text-sm text-muted-foreground">The original workbook details are unavailable for this import.</p>}
    </div>
  );
}

export default function BulkJobPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const status = useQuery({
    queryKey: ['bulkJob', user?.id, id],
    queryFn: () => getBulkJob(id),
    refetchInterval: ({ state }) => ['queued', 'running'].includes(state.data?.status ?? '') ? 1500 : false,
    retry: false,
  });
  const download = useMutation({ mutationFn: downloadBulkExport });
  const job = status.data;
  // Read the clock once per mount so render stays pure.
  const [now] = useState(() => Date.now());

  if (job?.kind === 'sales-import') return <SalesImportOutcome job={job} />;

  return <section className="max-w-xl space-y-4 rounded-xl border bg-card p-6" aria-live="polite">
    <h1 className="text-xl font-semibold">{job ? titles[job.kind] : 'Job status'}</h1>
    {status.isPending && <p className="text-sm text-muted-foreground">Loading job…</p>}
    {status.isError && <p role="alert" className="text-sm text-destructive">This job is unavailable or you no longer have access.</p>}
    {job && <>
      <StatusBadge tone={bulkJobStatus[job.status].tone}>{bulkJobStatus[job.status].label}</StatusBadge>
      {job.total !== null && <p className="text-sm tabular-nums text-muted-foreground">{job.processed} of {job.total} rows processed</p>}
      {job.status === 'complete' && job.kind !== 'sales-export' && job.result &&
        <p className="text-sm tabular-nums text-muted-foreground">{job.result.imported} rows imported{job.result.failed > 0 ? ` · ${job.result.failed} failed` : ''}</p>}
      {job.status === 'failed' && <p role="alert" className="text-sm text-destructive">{bulkJobFailure(job)}</p>}
      {job.status === 'complete' && job.kind === 'sales-export' && (
        job.downloadExpiresAt && Date.parse(job.downloadExpiresAt) > now ?
          <button className="inline-flex h-9 items-center rounded-md border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50" type="button" disabled={download.isPending} onClick={() => download.mutate(job)}>
            {download.isPending ? 'Downloading…' : 'Download workbook'}
          </button> : <p className="text-sm text-muted-foreground">The download has expired. Request a new export from Sales.</p>
      )}
      {download.isError && <p role="alert" className="text-sm text-destructive">The workbook could not be downloaded.</p>}
    </>}
  </section>;
}
