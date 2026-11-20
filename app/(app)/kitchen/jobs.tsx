'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Download, FileText, Search, TrendingUp, Wallet } from 'lucide-react';
import { FilterSelect } from '@/components/filter-select';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { axiosGet } from '@/lib/api';
import { useKitchenJobs, type KitchenJobFilters } from '@/hooks/use-kitchen';
import { dueState, formatDue, hubNameOf, MODE_LABELS, naira, pct, STAGE_LABELS, type KitchenJob, type KitchenJobList } from '@/lib/kitchen-types';
import { btnSecondary, EmptyRow, ErrorPanel, inputClass, KpiCard, KpiRow, PaymentBadge, StageBadge, td, th, thRight } from './kitchen-ui';

type Period = 'today' | '7' | '30' | 'month' | 'all';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];
const STAGE_FILTERS = [
  { value: 'all', label: 'All stages' },
  { value: 'quotes', label: 'Drafts & quotes' },
  { value: 'board', label: 'On the board' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'declined,expired', label: 'Declined & expired' },
];

/** Lagos-day boundaries for the period, as ISO strings. */
export function periodRange(period: Period, now = new Date()): { from?: string; to?: string } {
  if (period === 'all') return {};
  const lagos = new Date(now.getTime() + 60 * 60_000); // UTC+1, no DST
  const startOfLagosDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 60 * 60_000);
  let from: Date;
  if (period === 'today') from = startOfLagosDay(lagos);
  else if (period === 'month') from = new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), 1) - 60 * 60_000);
  else from = new Date(startOfLagosDay(lagos).getTime() - (Number(period) - 1) * 864e5);
  return { from: from.toISOString() };
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function KitchenJobs({ hubId, dueSoonMinutes, canCosts, onOpenJob }: { hubId?: string; dueSoonMinutes: number; canCosts: boolean; onOpenJob: (id: string) => void }) {
  const [period, setPeriod] = useState<Period>('30');
  const [stage, setStage] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const filters: KitchenJobFilters = useMemo(
    () => ({ ...periodRange(period), stage: stage === 'all' ? undefined : stage, hub_id: hubId, q: q.trim() || undefined, page, limit: 25 }),
    [period, stage, hubId, q, page],
  );
  const jobs = useKitchenJobs(filters);
  const rows = jobs.data?.data ?? [];
  const meta = jobs.data?.pagination;
  const summary = jobs.data?.summary;
  const cols = canCosts ? 9 : 8;

  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rest = { ...filters, page: undefined, limit: undefined };
      const all = await fetchAllPages<KitchenJob>(async (p, limit) => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries({ ...rest, page: p, limit })) if (v !== undefined && v !== '') params.set(k, String(v));
        const res = (await axiosGet(`kitchen/jobs?${params}`, true)) as KitchenJobList;
        return { items: res.data, totalPages: res.pagination.totalPages };
      }, 200);
      const header = ['Code', 'Created', 'Stage', 'Outlet', 'Customer', 'Phone', 'Channel', 'Service', 'Count', 'Due', 'Total', 'Paid', 'Balance', ...(canCosts ? ['Cost', 'Profit', 'Margin'] : []), 'Taken by', 'Cancel reason'];
      const lines = all.map((j) =>
        [
          j.code,
          new Date(j.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
          STAGE_LABELS[j.stage],
          hubNameOf(j.hub),
          j.customer_name,
          j.phone,
          j.channel,
          MODE_LABELS[j.mode].label,
          j.count,
          j.due_at ? new Date(j.due_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }) : '',
          j.total,
          j.paid,
          Math.max(0, j.total - j.paid),
          ...(canCosts ? [j.costing?.cost ?? '', j.costing?.profit ?? '', j.costing?.margin != null ? (j.costing.margin * 100).toFixed(1) + '%' : ''] : []),
          j.created_by_name,
          j.cancel_reason,
        ].map(csvCell).join(','),
      );
      const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kitchen-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} job${all.length === 1 ? '' : 's'}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <KpiRow loading={jobs.isPending} count={canCosts ? 5 : 4}>
        <KpiCard label="Jobs" value={summary?.count ?? 0} icon={<FileText size={14} />} tone="text-primary" hint={summary?.count ? `Average ${naira(summary.average)}` : undefined} />
        <KpiCard label="Job value" value={naira(summary?.value ?? 0)} icon={<Banknote size={14} />} tone="text-blue-600" />
        <KpiCard label="Collected" value={naira(summary?.collected ?? 0)} icon={<Wallet size={14} />} tone="text-green-600" />
        <KpiCard label="Owed" value={naira(summary?.owed ?? 0)} icon={<Wallet size={14} />} tone="text-orange-600" />
        {canCosts && (
          <KpiCard
            label="Profit"
            value={naira(summary?.profit ?? 0)}
            icon={<TrendingUp size={14} />}
            tone="text-emerald-700"
            hint={summary?.costed_jobs ? `On ${summary.costed_jobs} costed job${summary.costed_jobs === 1 ? '' : 's'}` : undefined}
          />
        )}
      </KpiRow>

      <div className="flex flex-col gap-3 rounded-md border bg-card p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search jobs"
            placeholder="Search customer, phone, code or dish…"
            className={`${inputClass} pl-8`}
            value={q}
            onChange={(e) => reset(setQ)(e.target.value)}
          />
        </div>
        <FilterSelect ariaLabel="Period" value={period} onChange={reset((v: string) => setPeriod(v as Period))} options={PERIODS} />
        <FilterSelect ariaLabel="Stage" value={stage} onChange={reset(setStage)} options={STAGE_FILTERS} />
        <button type="button" className={btnSecondary} onClick={() => void exportCsv()} disabled={exporting || !summary?.count}>
          <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {jobs.isError && <ErrorPanel message={jobs.error.message} onRetry={() => void jobs.refetch()} />}

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className={th}>Job</th>
                <th className={th}>Customer</th>
                <th className={th}>Stage</th>
                <th className={th}>Due</th>
                <th className={th}>Service</th>
                <th className={th}>Channel</th>
                <th className={thRight}>Total</th>
                <th className={th}>Payment</th>
                {canCosts && <th className={thRight}>Profit</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.isPending ? (
                <tr><td colSpan={cols} className="p-0"><TableSkeleton rows={8} cols={cols} /></td></tr>
              ) : rows.length ? (
                rows.map((j) => {
                  const due = dueState(j, dueSoonMinutes);
                  return (
                    <tr key={j._id} className="cursor-pointer hover:bg-muted/40" onClick={() => onOpenJob(j._id)}>
                      <td className={td}>
                        <button type="button" className="font-mono text-xs font-semibold text-primary hover:underline" onClick={(e) => { e.stopPropagation(); onOpenJob(j._id); }}>{j.code}</button>
                        <p className="text-xs text-muted-foreground">{new Date(j.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short' })}</p>
                      </td>
                      <td className={td}>
                        <p className="font-medium">{j.customer_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{j.phone}</p>
                      </td>
                      <td className={td}><StageBadge stage={j.stage} /></td>
                      <td className={`${td} whitespace-nowrap ${due?.tone === 'overdue' ? 'font-semibold text-destructive' : ''}`}>{due?.tone === 'overdue' ? due.label : formatDue(j.due_at)}</td>
                      <td className={td}>{MODE_LABELS[j.mode].label}{j.count ? ` · ${j.count}` : ''}</td>
                      <td className={td}>{j.channel}</td>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{naira(j.total)}</td>
                      <td className={td}><PaymentBadge job={j} /></td>
                      {canCosts && (
                        <td className={`${td} text-right tabular-nums`}>
                          {j.costing?.profit != null ? (
                            <>
                              <span className={j.costing.profit < 0 ? 'text-destructive' : ''}>{naira(j.costing.profit)}</span>
                              <p className="text-xs text-muted-foreground">{pct(j.costing.margin)}</p>
                            </>
                          ) : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <EmptyRow colSpan={cols}>No jobs match your filters.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{meta && meta.total ? `Page ${meta.page} of ${meta.totalPages} · ${meta.total} jobs` : 'No jobs to show'}</p>
          {meta && <PaginationControls page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} disabled={jobs.isFetching} />}
        </div>
      </div>
    </div>
  );
}
