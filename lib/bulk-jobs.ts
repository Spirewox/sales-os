import { toast } from 'sonner';
import { axiosGet, axiosGetBlob, axiosPost } from '@/lib/api';

export type BulkJobKind = 'sales-import' | 'inventory-import' | 'sales-export';
export type BulkJob = {
  id: string; kind: BulkJobKind; status: 'queued' | 'running' | 'complete' | 'failed';
  total: number | null; processed: number;
  result: { imported: number; failed: number; results: { lineNo: number; success: boolean }[] } | null;
  failure: { code: string; lineNo?: number; reason?: string } | null;
  downloadExpiresAt: string | null; createdAt: string; updatedAt: string;
};

export function bulkJobFailure(job: BulkJob) {
  const lineNo = job.failure?.lineNo;
  if (lineNo != null) return job.failure?.reason
    ? `Import rolled back. Line ${lineNo}: ${job.failure.reason}`
    : `Import rolled back. Line ${lineNo} could not be imported. Refresh the preview before retrying.`;
  if (job.failure?.code === 'access_changed') return 'Your access changed while this job was queued. Submit a new request with your current access.';
  if (job.failure?.code === 'request_unavailable') return 'The request could not be processed. Check the preview or narrow the export filters.';
  return 'The job failed. Submit a new request if you still need it.';
}

export async function submitBulkJob(kind: BulkJobKind, body: object) {
  const response = await axiosPost(`bulk-jobs/${kind}`, body, true) as { enabled: false } | { enabled: true; job: BulkJob };
  if (response.enabled === false) return null;
  if (!response.job?.id) throw new Error('No job reference was returned.');
  return response.job;
}

export async function getBulkJob(id: string) {
  const response = await axiosGet(`bulk-jobs/${encodeURIComponent(id)}`, true) as { data: BulkJob };
  return response.data;
}

export async function waitForBulkJob(initial: BulkJob, onProgress?: (job: BulkJob) => void) {
  let job = initial;
  if (job.status === 'queued' || job.status === 'running') {
    toast.info('Request queued', { action: { label: 'View job', onClick: () => window.location.assign(`/jobs/${job.id}`) } });
  }
  const deadline = Date.now() + 10 * 60_000;
  while (job.status === 'queued' || job.status === 'running') {
    onProgress?.(job);
    if (Date.now() >= deadline) throw new Error(`The job is still running. Check job ${job.id} for its result.`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    job = await getBulkJob(job.id);
  }
  onProgress?.(job);
  if (job.status === 'failed') throw new Error(bulkJobFailure(job));
  return job;
}

export async function downloadBulkExport(job: BulkJob) {
  const buffer = await axiosGetBlob(`bulk-jobs/${encodeURIComponent(job.id)}/download`, true);
  saveSalesWorkbook(buffer, job.createdAt.slice(0, 10));
}

export function saveSalesWorkbook(buffer: BlobPart, date = new Date().toISOString().slice(0, 10)) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fudfarmer-sales-${date}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function bulkJobReference(reference?: string) {
  return /^bulk-job:[a-f\d]{24}$/i.test(reference ?? '') ? reference?.slice('bulk-job:'.length) : undefined;
}
