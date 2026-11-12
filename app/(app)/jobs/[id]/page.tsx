'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { bulkJobFailure, downloadBulkExport, getBulkJob } from '@/lib/bulk-jobs';

const titles = { 'sales-import': 'Sales import', 'inventory-import': 'Inventory import', 'sales-export': 'Sales export' };

export default function BulkJobPage() {
  const { id } = useParams<{ id: string }>();
  const status = useQuery({
    queryKey: ['bulkJob', id],
    queryFn: () => getBulkJob(id),
    refetchInterval: ({ state }) => ['queued', 'running'].includes(state.data?.status ?? '') ? 1500 : false,
    retry: false,
  });
  const download = useMutation({ mutationFn: downloadBulkExport });
  const job = status.data;

  return <section className="max-w-xl space-y-4 rounded-md border bg-card p-6" aria-live="polite">
    <h1 className="text-xl font-semibold">{job ? titles[job.kind] : 'Job status'}</h1>
    {status.isPending && <p>Loading job…</p>}
    {status.isError && <p role="alert">This job is unavailable or you no longer have access.</p>}
    {job && <>
      <p className="capitalize">{job.status}</p>
      {job.total !== null && <p>{job.processed} of {job.total} rows processed</p>}
      {job.result && <p>{job.result.imported} rows imported</p>}
      {job.status === 'failed' && <p role="alert">{bulkJobFailure(job)}</p>}
      {job.status === 'complete' && job.kind === 'sales-export' && (
        job.downloadExpiresAt && Date.parse(job.downloadExpiresAt) > Date.now() ?
          <button className="rounded-md border px-4 py-2 font-medium" type="button" disabled={download.isPending} onClick={() => download.mutate(job)}>
            {download.isPending ? 'Downloading…' : 'Download workbook'}
          </button> : <p>The download has expired. Request a new export from Sales.</p>
      )}
      {download.isError && <p role="alert">The workbook could not be downloaded.</p>}
    </>}
  </section>;
}
