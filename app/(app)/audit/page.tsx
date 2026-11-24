'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Box, Banknote, User, Shield, Upload, ScrollText, Download } from 'lucide-react';
import { useAuditLogs, useAgents } from '@/hooks/use-queries';
import { useDebouncedUrlField, useUrlState } from '@/hooks/use-url-state';
import type { AuditLog } from '@/types';
import { formatAuditAction, formatAuditEntity } from '@/lib/api-mappers';
import { formatDate } from '@/lib/format';
import { parsePeriod, periodLabel, periodRange, periodToParams } from '@/lib/period';
import { FilterSelect } from '@/components/filter-select';
import { usePageSize } from '@/hooks/use-page-size';
import {
  DataTable, EmptyState, FilterBar, MoreFilterField, OverflowMenu, PageHeader, PeriodSelect, SectionErrorBoundary,
  SectionTabs, StatusBadge, useSectionTab, type Column, type FilterChip, type SectionTab,
} from '@/components/app';
import { auditDetailsSummary, auditRecordHref, downloadAuditCsv } from './audit-details';
import { AuditDrawer, timeOf } from './audit-drawer';

type AuditTab = 'all' | 'bulk' | 'sales' | 'inventory' | 'customers';
const ENTITIES = ['Inventory', 'Sale', 'Customer', 'System'] as const;
const MODULES = [{ value: 'sales', label: 'Sales' }, { value: 'inventory', label: 'Inventory' }, { value: 'customers', label: 'Customers' }, { value: 'system', label: 'System' }] as const;
const PAGE_SIZE = 25;


const ENTITY_ICON: Record<string, React.ReactNode> = {
  Inventory: <Box size={16} aria-hidden className="text-muted-foreground" />,
  Sale: <Banknote size={16} aria-hidden className="text-muted-foreground" />,
  Customer: <User size={16} aria-hidden className="text-muted-foreground" />,
  BulkUpload: <Upload size={16} aria-hidden className="text-muted-foreground" />,
};
const entityIcon = (type: string) => ENTITY_ICON[type] ?? <Shield size={16} aria-hidden className="text-muted-foreground" />;

/** Record type, linked to the record's page where one exists. */
function RecordCell({ log }: Readonly<{ log: AuditLog }>) {
  const href = auditRecordHref(log);
  const body = <>{entityIcon(log.entityType)}{formatAuditEntity(log.entityType)}</>;
  if (!href) return <span className="inline-flex items-center gap-1.5 whitespace-nowrap">{body}</span>;
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      title={`Open this ${formatAuditEntity(log.entityType).toLowerCase()}`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-primary hover:underline [&_svg]:text-primary"
    >
      {body}
    </Link>
  );
}

function When({ ts }: Readonly<{ ts: string }>) {
  return (
    <span className="whitespace-nowrap tabular-nums">
      <span className="font-medium">{formatDate(ts, { day: 'numeric', month: 'short' })}</span>
      <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{timeOf(ts)}</span>
    </span>
  );
}

export default function AuditTrailPage() {
  return (
    <Suspense fallback={null}>
      <AuditTrail />
    </Suspense>
  );
}

function AuditTrail() {
  const { get, set, params } = useUrlState();
  const period = parsePeriod(params, 'all');
  const entity = get('entity') ?? 'All';
  const agent = get('agent') ?? 'All';
  const moduleParam = get('module');
  const moduleFilter = MODULES.some((m) => m.value === moduleParam) ? moduleParam! : 'All';
  const urlSearch = get('q') ?? '';
  const [search, setSearch] = useDebouncedUrlField('q', urlSearch, set);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('audit', PAGE_SIZE);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const { data: agents = [] } = useAgents();

  // Search updates the URL after typing pauses.

  const tabDefs: SectionTab<AuditTab>[] = [
    { id: 'all', label: 'All activity' },
    { id: 'sales', label: 'Sales' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'customers', label: 'Customers' },
    { id: 'bulk', label: 'Bulk uploads' },
  ];
  const tab = useSectionTab(tabDefs, 'all');
  const range = periodRange(period);

  const filterKey = [tab, entity, moduleFilter, agent, urlSearch, range.from, range.to].join('|');
  const [seenKey, setSeenKey] = useState(filterKey);
  if (seenKey !== filterKey) {
    setSeenKey(filterKey);
    setPage(1);
  }

  // The query key is serialised, so a plain object is fine here.
  const apiFilters = {
    ...(urlSearch.trim() ? { search: urlSearch.trim() } : {}),
    ...(entity !== 'All' ? { entity_type: entity } : {}),
    ...(agent !== 'All' ? { user_id: agent } : {}),
    // A section tab picks its own module, as before; the Module filter applies on All activity.
    ...(moduleFilter !== 'All' && tab === 'all' ? { module: moduleFilter as 'sales' | 'inventory' | 'customers' | 'system' } : {}),
    ...(range.from ? { date_from: range.from } : {}),
    ...(range.to ? { date_to: range.to } : {}),
    ...(tab === 'bulk' ? { category: 'bulk_upload' } : tab === 'all' ? {} : { module: tab as 'sales' | 'inventory' | 'customers' }),
    page,
    limit: pageSize,
  };

  const { data: fetchedList, isFetching } = useAuditLogs(apiFilters);
  // Hold the last result on screen while the next page or filter loads, so the rows, tab counts,
  // entry count and pagination keep their place instead of collapsing to a skeleton
  // (trap/loading-layout-shift). Rows are held only within one tab, since tabs change the columns.
  const [held, setHeld] = useState<{ tab: AuditTab; list: typeof fetchedList }>({ tab, list: fetchedList });
  if (fetchedList && (fetchedList !== held.list || held.tab !== tab)) setHeld({ tab, list: fetchedList });
  const auditList = fetchedList ?? (held.tab === tab ? held.list : undefined);
  const logs = auditList?.items;
  const meta = auditList?.meta ?? { page: 1, limit: pageSize, total: 0, totalPages: 1 };
  const summary = auditList?.summary ?? held.list?.summary;
  const tabCount: Record<AuditTab, number | undefined> = { all: summary?.total, bulk: summary?.bulk, sales: summary?.sales, inventory: summary?.inventory, customers: summary?.customers };
  const tabs = tabDefs.map((t) => ({ ...t, count: tabCount[t.id] }));

  const agentName = agents.find((a) => a.id === agent)?.name;
  const chips: FilterChip[] = [
    ...(period.preset !== 'all' ? [{ key: 'period', label: periodLabel(period), onRemove: () => set(periodToParams({ preset: 'all' }, 'all')) }] : []),
    ...(entity !== 'All' ? [{ key: 'entity', label: `Record: ${entity}`, onRemove: () => set({ entity: null }) }] : []),
    ...(moduleFilter !== 'All' && tab === 'all' ? [{ key: 'module', label: `Module: ${MODULES.find((m) => m.value === moduleFilter)!.label}`, onRemove: () => set({ module: null }) }] : []),
    ...(agent !== 'All' ? [{ key: 'agent', label: `By ${agentName ?? 'user'}`, onRemove: () => set({ agent: null }) }] : []),
    ...(urlSearch ? [{ key: 'q', label: `"${urlSearch}"`, onRemove: () => { setSearch(''); set({ q: null }); } }] : []),
  ];
  const clearAll = () => { setSearch(''); set({ q: null, entity: null, module: null, agent: null, period: null, from: null, to: null }); };

  const summaryNumber = (log: AuditLog, key: string) => {
    const value = log.bulkUpload?.summary?.[key];
    return typeof value === 'number' || typeof value === 'string' ? value : '-';
  };

  const activityColumns: Column<AuditLog>[] = [
    { id: 'time', header: 'Time', mobile: 'value', cell: (l) => <When ts={l.timestamp} /> },
    { id: 'user', header: 'User', mobile: 'subtitle', cell: (l) => <span className="whitespace-nowrap">{l.userName}</span> },
    { id: 'location', header: 'Location', hideBelow: 'lg', cell: (l) => <span className="whitespace-nowrap text-muted-foreground">{l.location || '-'}</span> },
    { id: 'entity', header: 'Record', mobile: 'meta', cell: (l) => <RecordCell log={l} /> },
    { id: 'action', header: 'Action', mobile: 'meta', cell: (l) => <StatusBadge tone="neutral">{formatAuditAction(l.action)}</StatusBadge> },
    { id: 'summary', header: 'What happened', mobile: 'title', cell: (l) => <span className="line-clamp-2">{auditDetailsSummary(l.details)}</span>, className: 'max-w-md' },
  ];

  const bulkColumns: Column<AuditLog>[] = [
    { id: 'file', header: 'File', mobile: 'title', cell: (l) => <span className="block max-w-56 truncate" title={l.bulkUpload?.fileName}>{l.bulkUpload?.fileName ?? 'Upload'}</span> },
    { id: 'type', header: 'Type', mobile: 'subtitle', cell: (l) => <span className="capitalize">{[l.bulkUpload?.domain, l.bulkUpload?.importType].filter(Boolean).join(', ') || '-'}</span> },
    { id: 'rows', header: 'Rows', align: 'right', mobile: 'meta', cell: (l) => <span className="flex flex-col items-end"><span>{summaryNumber(l, 'total')} total</span><span className="text-xs text-muted-foreground">{summaryNumber(l, 'valid')} valid, {summaryNumber(l, 'invalid')} invalid</span></span> },
    { id: 'imported', header: 'Processed', align: 'right', hideBelow: 'lg', cell: (l) => <span className="flex flex-col items-end"><span>{summaryNumber(l, 'processed')} processed</span><span className="text-xs text-muted-foreground">{summaryNumber(l, 'imported')} imported, {summaryNumber(l, 'failed')} failed</span></span> },
    { id: 'stage', header: 'Status', mobile: 'meta', cell: (l) => <StatusBadge tone="neutral">{l.bulkUpload?.stage ?? formatAuditAction(l.action)}</StatusBadge> },
    { id: 'user', header: 'User', hideBelow: 'lg', cell: (l) => l.userName },
    { id: 'time', header: 'Time', mobile: 'value', cell: (l) => <When ts={l.timestamp} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit trail"
        description="Who changed what, and when, across sales, stock and customers."
        overflow={
          <OverflowMenu
            label="Audit trail actions"
            items={[{
              label: 'Export this page (CSV)',
              icon: <Download />,
              disabled: !logs?.length,
              onSelect: () => logs && downloadAuditCsv(logs, `audit-trail-${tab}-page-${meta.page}.csv`),
            }]}
          />
        }
        tabs={<SectionTabs label="Audit sections" tabs={tabs} defaultTab="all" />}
      />

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search by user or action', label: 'Search audit log' }}
        filters={<PeriodSelect value={period} onChange={(p) => set(periodToParams(p, 'all'))} />}
        more={
          <>
            <MoreFilterField label="Record type">
              <FilterSelect ariaLabel="Record type" value={entity} onChange={(v) => set({ entity: v === 'All' ? null : v })} options={[{ value: 'All', label: 'All records' }, ...ENTITIES.map((e) => ({ value: e, label: e }))]} />
            </MoreFilterField>
            {tab === 'all' && (
              <MoreFilterField label="Module">
                <FilterSelect ariaLabel="Module" value={moduleFilter} onChange={(v) => set({ module: v === 'All' ? null : v })} options={[{ value: 'All', label: 'All modules' }, ...MODULES]} />
              </MoreFilterField>
            )}
            <MoreFilterField label="User">
              <FilterSelect ariaLabel="User" value={agent} onChange={(v) => set({ agent: v === 'All' ? null : v })} options={[{ value: 'All', label: 'All users' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]} />
            </MoreFilterField>
          </>
        }
        moreActiveCount={(entity !== 'All' ? 1 : 0) + (agent !== 'All' ? 1 : 0) + (moduleFilter !== 'All' && tab === 'all' ? 1 : 0)}
        chips={chips}
        onClearAll={clearAll}
        resultLabel={logs ? `${meta.total.toLocaleString()} ${meta.total === 1 ? 'entry' : 'entries'}` : undefined}
      />

      <SectionErrorBoundary label="Audit log" resetKey={tab}>
        <div aria-busy={isFetching || undefined}>
          <DataTable
            label={tab === 'bulk' ? 'Bulk uploads' : 'Audit log'}
            columns={tab === 'bulk' ? bulkColumns : activityColumns}
            rows={logs}
            loading={isFetching}
            getRowId={(l) => l.id}
            onRowClick={setSelectedLog}
            pageSize={pageSize}
            pagination={{ page: meta.page, totalPages: meta.totalPages, onPageChange: setPage, pageSize, onPageSizeChange: (n) => { setPageSize(n); setPage(1); }, total: meta.total }}
            empty={
              <EmptyState
                size="compact"
                icon={<ScrollText />}
                title={tab === 'bulk' ? 'No bulk uploads' : 'No activity found'}
                description={chips.length ? 'Nothing matches these filters.' : 'Changes to sales, stock and customers will appear here.'}
                action={chips.length ? <button type="button" onClick={clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
              />
            }
          />
        </div>
      </SectionErrorBoundary>


      {selectedLog && <AuditDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}
