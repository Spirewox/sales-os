'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge } from '@/components/app';
import { useAuth } from '@/contexts/auth-context';
import { bulkJobFailure, bulkJobStatus, downloadBulkExport, getBulkJob } from '@/lib/bulk-jobs';

const titles = { 'sales-import': 'Sales import', 'inventory-import': 'Inventory import', 'sales-export': 'Sales export' };

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
      {job.kind === 'sales-import' && <Link className="inline-block text-sm font-medium text-primary hover:underline" href="/sales?importHistory=1">Back to import history</Link>}
    </>}
  </section>;
}
