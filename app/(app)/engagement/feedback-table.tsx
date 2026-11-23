'use client';

import type { ReactNode } from 'react';
import { ArrowUp, Eye, Gift } from 'lucide-react';
import { DataTable, EmptyState, FilterBar, OverflowMenu, RowAction, StatusBadge, type Column, type FilterChip } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate, plural } from '@/lib/format';
import { type Feedback, FeedbackPriority, FeedbackType, Sentiment } from '@/types';
import { useEscalatePriority, type FeedbackIntent } from './feedback-drawer';
import { PriorityBadge, calcResolutionDays } from './interaction-utils';

export type FeedbackFilters = { status: 'All' | 'Open' | 'Resolved'; type: FeedbackType | 'All'; priority: FeedbackPriority | 'All' };

const sentimentLabel = (s?: Sentiment) => s ?? Sentiment.NEUTRAL;

const columns: Column<Feedback>[] = [
  {
    id: 'customer',
    header: 'Customer',
    mobile: 'title',
    sortValue: (f) => f.customerName.toLowerCase(),
    cell: (f) => (
      <span className="block min-w-0">
        <span className="block">{f.customerName}</span>
        <span className="block text-xs font-normal text-muted-foreground">{f.type}, {sentimentLabel(f.sentiment).toLowerCase()}</span>
      </span>
    ),
  },
  {
    id: 'content',
    header: 'Feedback',
    mobile: 'subtitle',
    cell: (f) => <span className="line-clamp-2 max-w-sm text-muted-foreground">{f.content}</span>,
  },
  { id: 'priority', header: 'Priority', mobile: 'meta', sortValue: (f) => Object.values(FeedbackPriority).indexOf(f.priority ?? FeedbackPriority.MEDIUM), cell: (f) => <PriorityBadge priority={f.priority} /> },
  { id: 'date', header: 'Logged', mobile: 'meta', sortValue: (f) => f.date, cell: (f) => <span className="whitespace-nowrap">{formatDate(f.date)}</span> },
  {
    id: 'resolution',
    header: 'Resolved in',
    align: 'right',
    hideBelow: 'lg',
    sortValue: (f) => (f.status === 'Resolved' && f.resolvedDate ? calcResolutionDays(f.date, f.resolvedDate) : null),
    cell: (f) => (f.status === 'Resolved' && f.resolvedDate ? `${calcResolutionDays(f.date, f.resolvedDate)}d` : <span className="text-muted-foreground">-</span>),
  },
  { id: 'status', header: 'Status', mobile: 'value', sortValue: (f) => f.status, cell: (f) => <StatusBadge domain="work" status={f.status} /> },
];

export function FeedbackTable({ rows, loading, search, onSearch, filters, onFilters, onOpen, trailing }: Readonly<{
  rows: Feedback[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  filters: FeedbackFilters;
  onFilters: (f: Partial<FeedbackFilters>) => void;
  onOpen: (f: Feedback, intent: FeedbackIntent) => void;
  trailing?: ReactNode;
}>) {
  const { can } = usePermissions();
  const canResolve = can('interactions.resolve');
  const { escalate } = useEscalatePriority();

  const chips: FilterChip[] = [
    ...(search.trim() ? [{ key: 'q', label: `"${search.trim()}"`, onRemove: () => onSearch('') }] : []),
    ...(filters.status !== 'All' ? [{ key: 'status', label: filters.status, onRemove: () => onFilters({ status: 'All' }) }] : []),
    ...(filters.type !== 'All' ? [{ key: 'type', label: filters.type, onRemove: () => onFilters({ type: 'All' }) }] : []),
    ...(filters.priority !== 'All' ? [{ key: 'priority', label: `${filters.priority} priority`, onRemove: () => onFilters({ priority: 'All' }) }] : []),
  ];
  const clearAll = () => { onSearch(''); onFilters({ status: 'All', type: 'All', priority: 'All' }); };

  return (
    <div className="space-y-3">
      <FilterBar
        search={{ value: search, onChange: onSearch, placeholder: 'Search customer or feedback', label: 'Search feedback' }}
        filters={(
          <>
            <FilterSelect ariaLabel="Feedback status" value={filters.status} onChange={(v) => onFilters({ status: v as FeedbackFilters['status'] })} className="h-9 w-auto min-w-32"
              options={[{ value: 'All', label: 'All statuses' }, { value: 'Open', label: 'Open' }, { value: 'Resolved', label: 'Resolved' }]} />
            <FilterSelect ariaLabel="Feedback type" value={filters.type} onChange={(v) => onFilters({ type: v as FeedbackFilters['type'] })} className="h-9 w-auto min-w-32"
              options={[{ value: 'All', label: 'All types' }, ...Object.values(FeedbackType).map((t) => ({ value: t, label: t }))]} />
            <FilterSelect ariaLabel="Priority" value={filters.priority} onChange={(v) => onFilters({ priority: v as FeedbackFilters['priority'] })} className="h-9 w-auto min-w-36"
              options={[{ value: 'All', label: 'All priorities' }, ...Object.values(FeedbackPriority).map((p) => ({ value: p, label: p }))]} />
          </>
        )}
        chips={chips}
        onClearAll={clearAll}
        resultLabel={loading ? 'Loading feedback…' : plural(rows.length, 'item')}
        trailing={trailing}
      />
      <DataTable
        label="Feedback"
        columns={columns}
        rows={rows}
        loading={loading}
        getRowId={(f) => f.id}
        onRowClick={(f) => onOpen(f, 'view')}
        defaultSort={{ id: 'date', dir: 'desc' }}
        resetPageKey={`${search}|${filters.status}|${filters.type}|${filters.priority}`}
        rowActions={(f) => {
          const open = f.status === 'Open' && canResolve;
          return (
            <>
              {open ? <RowAction tone="primary" onClick={() => onOpen(f, 'resolve')}>Resolve</RowAction> : <RowAction onClick={() => onOpen(f, 'view')}>View</RowAction>}
              {open && (
                <OverflowMenu
                  size="sm"
                  label={`More actions for ${f.customerName}`}
                  items={[
                    { label: 'View details', icon: <Eye aria-hidden />, onSelect: () => onOpen(f, 'view') },
                    { label: 'Escalate priority', icon: <ArrowUp aria-hidden />, onSelect: () => escalate(f), disabled: f.priority === FeedbackPriority.URGENT },
                    { label: 'Issue compensation', icon: <Gift aria-hidden />, onSelect: () => onOpen(f, 'compensate') },
                  ]}
                />
              )}
            </>
          );
        }}
        empty={(
          <EmptyState
            size="compact"
            title="No feedback to show"
            description={chips.length > 0 ? 'No feedback matches these filters.' : 'Feedback you log will appear here.'}
            action={chips.length > 0 ? <button type="button" onClick={clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
          />
        )}
      />
    </div>
  );
}
