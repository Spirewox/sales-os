'use client';

import Link from 'next/link';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateSupplierIssue } from '@/hooks/use-queries';
import type { InventoryItem, SupplierIssue } from '@/types';
import { formatDate } from '@/lib/format';
import { EmptyState, StatusBadge, fieldClass } from '@/components/app';
import { cn } from '@/lib/utils';

const SEVERITY_TONE = { High: 'danger', Medium: 'warning', Low: 'neutral' } as const;

export type ResolveState = { issueId: string | null; note: string };

/** Issues, open first. Open ones can be resolved inline with an optional note. */
export function SupplierIssuesTab({ issues, loading, inventory, canResolve, resolve, setResolve, action }: Readonly<{
  issues: SupplierIssue[];
  loading: boolean;
  inventory: InventoryItem[];
  canResolve: boolean;
  /** Held by the drawer so it can't be dismissed while a note is being typed. */
  resolve: ResolveState;
  setResolve: (s: ResolveState) => void;
  action?: React.ReactNode;
}>) {
  const updateIssue = useUpdateSupplierIssue();
  const sorted = [...issues].sort((a, b) => (a.status === b.status ? b.date.localeCompare(a.date) : a.status === 'Open' ? -1 : 1));

  const handleResolve = (issue: SupplierIssue) => {
    updateIssue.mutate({
      supplierId: issue.supplierId,
      issueId: issue.id,
      status: 'Resolved',
      ...(resolve.note.trim() ? { resolution_note: resolve.note.trim() } : {}),
    }, {
      onSuccess: () => { setResolve({ issueId: null, note: '' }); toast.success('Issue resolved.'); },
      onError: () => toast.error('Unable to resolve issue.'),
    });
  };

  if (loading) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">Loading issues…</p>;

  return (
    <div className="space-y-3">
      {action && issues.length > 0 && <div className="flex justify-end">{action}</div>}
      {issues.length === 0 ? (
        <EmptyState size="compact" icon={<ClipboardList />} title="No issues logged" description="This supplier has a clean record." action={action} />
      ) : (
        <ul className="space-y-2">
          {sorted.map((issue) => {
            const item = issue.relatedItemId ? inventory.find((i) => i.id === issue.relatedItemId) : null;
            const resolving = resolve.issueId === issue.id;
            const noteId = `resolve-${issue.id}`;
            return (
              <li key={issue.id} className={cn('rounded-xl border p-3', issue.status === 'Open' && issue.severity === 'High' && 'border-destructive/30')}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{issue.type}</span>
                  <StatusBadge tone={SEVERITY_TONE[issue.severity]}>{issue.severity}</StatusBadge>
                  <StatusBadge domain="work" status={issue.status} />
                </div>
                <p className="mt-1.5 text-sm">{issue.description}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatDate(issue.date)}</span>
                  {issue.reportedByAgentName && <span>by {issue.reportedByAgentName}</span>}
                  {issue.relatedItemId && (
                    <Link href={`/inventory?product=${issue.relatedItemId}`} className="text-primary hover:underline">{item?.name ?? 'Related product'}</Link>
                  )}
                </p>
                {issue.status === 'Resolved' && issue.resolutionNote && (
                  <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Resolution{issue.resolvedDate ? ` (${formatDate(issue.resolvedDate)})` : ''}:</span> {issue.resolutionNote}
                  </p>
                )}
                {issue.status === 'Open' && canResolve && (
                  resolving ? (
                    <div className="mt-2 space-y-2 border-t pt-2">
                      <label htmlFor={noteId} className="text-xs font-medium text-muted-foreground">Resolution note (optional)</label>
                      <textarea id={noteId} value={resolve.note} onChange={(e) => setResolve({ issueId: issue.id, note: e.target.value })} rows={2} className={cn(fieldClass, 'h-auto py-2')} autoFocus />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setResolve({ issueId: null, note: '' })} className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted">Cancel</button>
                        <button type="button" onClick={() => handleResolve(issue)} disabled={updateIssue.isPending} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                          <CheckCircle2 size={14} aria-hidden /> {updateIssue.isPending ? 'Saving…' : 'Mark resolved'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex justify-end">
                      <button type="button" onClick={() => setResolve({ issueId: issue.id, note: '' })} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted">
                        <CheckCircle2 size={14} aria-hidden className="text-muted-foreground" /> Resolve
                      </button>
                    </div>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
