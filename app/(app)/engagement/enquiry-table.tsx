'use client';

import type { ReactNode } from 'react';
import { MailOpen } from 'lucide-react';
import { DataTable, EmptyState, FilterBar, RowAction, StatusBadge, type Column, type FilterChip } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate, plural } from '@/lib/format';
import type { Enquiry } from '@/types';
import { replyEmail, replyHref } from './enquiry-drawer';

export type EnquiryStatusFilter = 'All' | 'Open' | 'Closed';

const columns: Column<Enquiry>[] = [
  {
    id: 'customer',
    header: 'Customer',
    mobile: 'title',
    sortValue: (e) => e.customerName.toLowerCase(),
    cell: (e) => (
      <span className="block min-w-0">
        <span className="block">{e.customerName}</span>
        {replyEmail(e) && <span className="block max-w-48 truncate text-xs font-normal text-muted-foreground">{replyEmail(e)}</span>}
      </span>
    ),
  },
  {
    id: 'subject',
    header: 'Subject',
    mobile: 'subtitle',
    cell: (e) => (
      <span className="block max-w-xs min-w-0">
        <span className="block truncate font-medium">{e.subject}</span>
        <span className="block truncate text-xs text-muted-foreground">{e.message}</span>
      </span>
    ),
  },
  {
    id: 'date',
    header: 'Received',
    mobile: 'meta',
    sortValue: (e) => e.date,
    cell: (e) => (
      <span className="block whitespace-nowrap">
        {formatDate(e.date)}
        {e.category && <span className="block text-xs text-muted-foreground max-md:ml-1 max-md:inline">{e.category}</span>}
      </span>
    ),
  },
  { id: 'status', header: 'Status', mobile: 'value', sortValue: (e) => e.status, cell: (e) => <StatusBadge domain="work" status={e.status} /> },
];

export function EnquiryTable({ rows, loading, search, onSearch, status, onStatus, onOpen, trailing }: Readonly<{
  rows: Enquiry[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  status: EnquiryStatusFilter;
  onStatus: (s: EnquiryStatusFilter) => void;
  onOpen: (e: Enquiry, focusClose: boolean) => void;
  trailing?: ReactNode;
}>) {
  const { can } = usePermissions();
  const canResolve = can('interactions.resolve');
  const chips: FilterChip[] = [
    ...(search.trim() ? [{ key: 'q', label: `"${search.trim()}"`, onRemove: () => onSearch('') }] : []),
    ...(status !== 'All' ? [{ key: 'status', label: status, onRemove: () => onStatus('All') }] : []),
  ];
  const clearAll = () => { onSearch(''); onStatus('All'); };

  return (
    <div className="space-y-3">
      <FilterBar
        search={{ value: search, onChange: onSearch, placeholder: 'Search customer, subject or message', label: 'Search enquiries' }}
        filters={(
          <FilterSelect ariaLabel="Enquiry status" value={status} onChange={(v) => onStatus(v as EnquiryStatusFilter)} className="h-9 w-auto min-w-32"
            options={[{ value: 'All', label: 'All statuses' }, { value: 'Open', label: 'Open' }, { value: 'Closed', label: 'Closed' }]} />
        )}
        chips={chips}
        onClearAll={clearAll}
        resultLabel={loading ? 'Loading enquiries…' : plural(rows.length, 'enquiry', 'enquiries')}
        trailing={trailing}
      />
      <DataTable
        label="Enquiries"
        columns={columns}
        rows={rows}
        loading={loading}
        getRowId={(e) => e.id}
        onRowClick={(e) => onOpen(e, false)}
        defaultSort={{ id: 'date', dir: 'desc' }}
        resetPageKey={`${search}|${status}`}
        rowActions={(e) => {
          const open = e.status === 'Open' && canResolve;
          const email = replyEmail(e);
          return (
            <>
              {open ? <RowAction tone="primary" onClick={() => onOpen(e, true)}>Close</RowAction> : <RowAction onClick={() => onOpen(e, false)}>View</RowAction>}
              {open && email && <RowAction href={replyHref(e, email)}><MailOpen aria-hidden /> Reply</RowAction>}
            </>
          );
        }}
        empty={(
          <EmptyState
            size="compact"
            title="No enquiries to show"
            description={chips.length > 0 ? 'No enquiries match these filters.' : 'Enquiries you record will appear here.'}
            action={chips.length > 0 ? <button type="button" onClick={clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
          />
        )}
      />
    </div>
  );
}
