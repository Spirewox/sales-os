'use client';

import type { ReactNode } from 'react';
import { DataTable, EmptyState, FilterBar, RowAction, type Column, type FilterChip } from '@/components/app';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate, formatMoney, plural } from '@/lib/format';
import type { Compensation } from '@/types';
import { nextCompensationStep, useCompensationStatus } from './compensation-drawer';
import { CompensationStatusBadge } from './interaction-utils';

const columns: Column<Compensation>[] = [
  {
    id: 'customer',
    header: 'Customer',
    mobile: 'title',
    sortValue: (c) => c.customerName.toLowerCase(),
    cell: (c) => (
      <span className="block min-w-0">
        <span className="block">{c.customerName}</span>
        <span className="block text-xs font-normal text-muted-foreground">{c.category}</span>
      </span>
    ),
  },
  { id: 'reason', header: 'Reason', mobile: 'subtitle', cell: (c) => <span className="line-clamp-2 max-w-sm text-muted-foreground">{c.reason || '-'}</span> },
  { id: 'value', header: 'Value', align: 'right', mobile: 'value', sortValue: (c) => c.amount, cell: (c) => <span className="font-medium">{formatMoney(c.amount)}</span> },
  { id: 'date', header: 'Date', mobile: 'meta', sortValue: (c) => c.date, cell: (c) => <span className="whitespace-nowrap">{formatDate(c.date)}</span> },
  { id: 'agent', header: 'Recorded by', hideBelow: 'lg', sortValue: (c) => c.recordedByAgentName ?? '', cell: (c) => c.recordedByAgentName || <span className="text-muted-foreground">-</span> },
  { id: 'status', header: 'Status', mobile: 'meta', sortValue: (c) => ['Pending', 'Approved', 'Paid'].indexOf(c.status), cell: (c) => <CompensationStatusBadge status={c.status} /> },
];

export function CompensationTable({ rows, total, loading, search, onSearch, onOpen, trailing }: Readonly<{
  rows: Compensation[];
  /** Value of every compensation on record (not just the filtered rows). */
  total: { count: number; value: number };
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  onOpen: (c: Compensation) => void;
  trailing?: ReactNode;
}>) {
  const { can } = usePermissions();
  const canResolve = can('interactions.resolve');
  const { change, pending } = useCompensationStatus();
  const chips: FilterChip[] = search.trim() ? [{ key: 'q', label: `"${search.trim()}"`, onRemove: () => onSearch('') }] : [];

  return (
    <div className="space-y-3">
      <FilterBar
        search={{ value: search, onChange: onSearch, placeholder: 'Search customer or reason', label: 'Search compensations' }}
        chips={chips}
        onClearAll={() => onSearch('')}
        resultLabel={loading ? 'Loading compensations…' : `${plural(rows.length, 'record')}; ${formatMoney(total.value)} across all ${plural(total.count, 'record')}`}
        trailing={trailing}
      />
      <DataTable
        label="Compensations"
        columns={columns}
        rows={rows}
        loading={loading}
        getRowId={(c) => c.id}
        onRowClick={onOpen}
        defaultSort={{ id: 'date', dir: 'desc' }}
        resetPageKey={search}
        rowActions={(c) => {
          const next = canResolve ? nextCompensationStep(c.status) : null;
          if (!next) return <RowAction onClick={() => onOpen(c)}>View</RowAction>;
          return (
            <RowAction tone={next.status === 'Paid' ? 'primary' : 'default'} onClick={() => { if (!pending) change(c.id, next.status); }}>
              {next.label}
            </RowAction>
          );
        }}
        empty={(
          <EmptyState
            size="compact"
            title="No compensations to show"
            description={search.trim() ? `No compensations match "${search.trim()}".` : 'Compensations you record will appear here.'}
          />
        )}
      />
    </div>
  );
}
