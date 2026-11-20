'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { FilterSelect } from '@/components/filter-select';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { useUrlState } from '@/hooks/use-url-state';
import { DataTable, EmptyState, FilterBar, KpiStrip, LocationSelect, OverflowMenu, type Column, type FilterChip } from '@/components/app';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { axiosGet } from '@/lib/api';
import { useKitchenJobs, type KitchenJobFilters } from '@/hooks/use-kitchen';
import { dueState, formatDue, hubNameOf, MODE_LABELS, naira, pct, STAGE_LABELS, type KitchenJob, type KitchenJobList } from '@/lib/kitchen-types';
import { ErrorPanel, PaymentBadge, StageBadge } from './kitchen-ui';

type Period = 'today' | '7' | '30' | 'month' | 'all';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];
const isPeriod = (v: string | null): v is Period => PERIODS.some((p) => p.value === v);
const filterClass = 'h-9 w-auto min-w-40 data-[size=default]:h-9';
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

export function KitchenJobs({ hubId, hubScope, dueSoonMinutes, canCosts, onOpenJob }: { hubId?: string; hubScope?: HubScopeFilter; dueSoonMinutes: number; canCosts: boolean; onOpenJob: (id: string) => void }) {
  // Period and stage live in the URL so Board > Done today can link straight to them.
  const { get, set: setUrl } = useUrlState();
  const rawPeriod = get('period');
  const period: Period = isPeriod(rawPeriod) ? rawPeriod : '30';
  const stage = STAGE_FILTERS.some((f) => f.value === get('stage')) ? get('stage')! : 'all';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const setPeriod = (v: string) => { setUrl({ period: v === '30' ? null : v }); setPage(1); };
  const setStage = (v: string) => { setUrl({ stage: v === 'all' ? null : v }); setPage(1); };

  const filters: KitchenJobFilters = useMemo(
    () => ({ ...periodRange(period), stage: stage === 'all' ? undefined : stage, hub_id: hubId, q: q.trim() || undefined, page, limit: 25 }),
    [period, stage, hubId, q, page],
  );
  const jobs = useKitchenJobs(filters);
  const rows = jobs.data?.data ?? [];
  const meta = jobs.data?.pagination;
  const summary = jobs.data?.summary;

  const chips: FilterChip[] = [
    ...(stage !== 'all' ? [{ key: 'stage', label: STAGE_FILTERS.find((f) => f.value === stage)!.label, onRemove: () => setStage('all') }] : []),
    ...(q.trim() ? [{ key: 'q', label: `"${q.trim()}"`, onRemove: () => { setQ(''); setPage(1); } }] : []),
  ];

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

  const columns: Column<KitchenJob>[] = [
    {
      id: 'job',
      header: 'Job',
      mobile: 'title',
      cell: (j) => (
        <span className="flex flex-col">
          <span className="font-mono text-xs font-medium">{j.code}</span>
          <span className="text-xs font-normal text-muted-foreground">{new Date(j.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short' })}</span>
        </span>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      mobile: 'subtitle',
      cell: (j) => (
        <span className="block min-w-0">
          <span className="block font-medium text-foreground">{j.customer_name || 'Walk-in customer'}</span>
          {j.phone && <span className="block text-xs text-muted-foreground">{j.phone}</span>}
        </span>
      ),
    },
    { id: 'stage', header: 'Stage', mobile: 'meta', cell: (j) => <StageBadge stage={j.stage} /> },
    {
      id: 'due',
      header: 'Due',
      mobile: 'meta',
      cell: (j) => {
        const due = dueState(j, dueSoonMinutes);
        return <span className={`whitespace-nowrap tabular-nums ${due?.tone === 'overdue' ? 'font-semibold text-destructive' : ''}`}>{due?.tone === 'overdue' ? due.label : formatDue(j.due_at)}</span>;
      },
    },
    { id: 'service', header: 'Service', hideBelow: 'xl', cell: (j) => <span className="tabular-nums">{MODE_LABELS[j.mode].label}{j.count ? `, ${j.count}` : ''}</span> },
    { id: 'channel', header: 'Channel', hideBelow: 'xl', cell: (j) => j.channel },
    { id: 'total', header: 'Total', align: 'right', mobile: 'value', cell: (j) => <span className="font-semibold">{naira(j.total)}</span> },
    { id: 'payment', header: 'Payment', mobile: 'meta', cell: (j) => <PaymentBadge job={j} /> },
    ...(canCosts
      ? [{
          id: 'profit',
          header: 'Profit',
          align: 'right' as const,
          hideBelow: 'lg' as const,
          cell: (j: KitchenJob) =>
            j.costing?.profit != null ? (
              <span className="flex flex-col items-end">
                <span className={j.costing.profit < 0 ? 'text-destructive' : ''}>{naira(j.costing.profit)}</span>
                <span className="text-xs text-muted-foreground">{pct(j.costing.margin)}</span>
              </span>
            ) : '-',
        }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <KpiStrip
        label="Jobs in this period"
        loading={jobs.isPending}
        cells={[
          { label: 'Job value', value: naira(summary?.value ?? 0), detail: summary?.count ? `${summary.count} job${summary.count === 1 ? '' : 's'}, average ${naira(summary.average)}` : 'No jobs' },
          { label: 'Collected', value: naira(summary?.collected ?? 0) },
          { label: 'Owed', value: naira(summary?.owed ?? 0), tone: (summary?.owed ?? 0) > 0 ? 'warning' : 'default' },
          {
            label: 'Profit',
            hidden: !canCosts,
            value: naira(summary?.profit ?? 0),
            tone: (summary?.profit ?? 0) < 0 ? 'danger' : 'default',
            detail: summary?.costed_jobs ? `On ${summary.costed_jobs} costed job${summary.costed_jobs === 1 ? '' : 's'}` : undefined,
          },
        ]}
      />

      <FilterBar
        search={{ value: q, onChange: (v) => { setQ(v); setPage(1); }, placeholder: 'Search customer, phone, code or dish', label: 'Search jobs' }}
        filters={
          <>
            {hubScope && <LocationSelect scope={hubScope} />}
            <FilterSelect ariaLabel="Period" value={period} onChange={setPeriod} options={PERIODS} className={filterClass} />
            <FilterSelect ariaLabel="Stage" value={stage} onChange={setStage} options={STAGE_FILTERS} className={filterClass} />
          </>
        }
        chips={chips}
        onClearAll={() => { setQ(''); setStage('all'); }}
        resultLabel={meta ? `${meta.total} job${meta.total === 1 ? '' : 's'}` : undefined}
        trailing={
          <OverflowMenu
            label="More job actions"
            items={[{ label: exporting ? 'Exporting…' : 'Export CSV', icon: <Download />, onSelect: () => void exportCsv(), disabled: exporting || !summary?.count }]}
          />
        }
      />

      {jobs.isError && <ErrorPanel message={jobs.error.message} onRetry={() => void jobs.refetch()} />}

      <DataTable
        label="Kitchen jobs"
        columns={columns}
        rows={jobs.data ? rows : undefined}
        loading={jobs.isPending}
        getRowId={(j) => j._id}
        onRowClick={(j) => onOpenJob(j._id)}
        manualSort
        pagination={meta ? { page: meta.page, totalPages: meta.totalPages, onPageChange: setPage } : undefined}
        empty={
          <EmptyState
            size="compact"
            title={chips.length ? 'No jobs match these filters' : 'No jobs in this period'}
            description={chips.length ? 'Clear the filters or widen the period.' : 'Jobs taken in the kitchen show here. Pick a longer period to see older ones.'}
          />
        }
      />
    </div>
  );
}
