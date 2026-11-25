'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/components/app';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { useAuth } from '@/contexts/auth-context';
import { bulkJobStatus, getSalesImportHistory, salesImportHistoryKey } from '@/lib/bulk-jobs';
import { formatDate } from '@/lib/format';

export function SalesImportHistory({ onClose }: Readonly<{ onClose: () => void }>) {
  const { user } = useAuth();
  const history = useQuery({
    queryKey: [...salesImportHistoryKey, user?.id],
    queryFn: getSalesImportHistory,
    refetchInterval: ({ state }) => state.data?.some(job => job.status === 'queued' || job.status === 'running') ? 3000 : false,
    retry: false,
  });

  return (
    <ModalDialog onClose={onClose} labelledBy="sales-import-history-title">
      <div className="relative z-10 flex max-h-[85dvh] w-full max-w-xl flex-col gap-4 rounded-xl border bg-card p-5 shadow-lg">
        <h2 id="sales-import-history-title" className="text-lg font-semibold">Import history</h2>
        {history.isPending && <p role="status" className="text-sm text-muted-foreground">Loading imports…</p>}
        {history.isError && <div className="space-y-2">
          <p role="alert" className="text-sm text-destructive">Import history could not be loaded.</p>
          <Button type="button" variant="outline" onClick={() => void history.refetch()}>Try again</Button>
        </div>}
        {history.data?.length === 0 && <p className="text-sm text-muted-foreground">Your background sales imports will appear here.</p>}
        {!!history.data?.length && <ul className="min-h-0 divide-y overflow-y-auto rounded-lg border" aria-label="Recent sales imports">
          {history.data.map(job => (
            <li key={job.id}>
              <Link href={'/jobs/' + job.id} className="flex items-start justify-between gap-3 px-3 py-3 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                <div className="min-w-0">
                  <p className="break-words font-medium">{job.fileName || 'Sales workbook'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(job.createdAt)}{job.imported !== null ? ' · ' + job.imported + ' imported' : job.total !== null ? ' · ' + job.total + ' rows' : ''}
                  </p>
                </div>
                <StatusBadge tone={bulkJobStatus[job.status].tone}>{bulkJobStatus[job.status].label}</StatusBadge>
              </Link>
            </li>
          ))}
        </ul>}
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </ModalDialog>
  );
}
