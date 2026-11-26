'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Inbox, Truck, X } from 'lucide-react';
import {
  useApproveInventoryRequest, useCancelInventoryRequest, useFulfillInventoryRequest, useRejectInventoryRequest,
} from '@/hooks/use-queries';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { useUrlState } from '@/hooks/use-url-state';
import type { ApiInventoryRequest, InventoryRequestStatus } from '@/types/api';
import { formatDateTime } from '@/lib/format';
import { FilterSelect } from '@/components/filter-select';
import {
  DataTable, EmptyState, FilterBar, FormField, FormSheet, LocationSelect, OverflowMenu, RowAction, StatusBadge,
  fieldClass, type Column, type FilterChip,
} from '@/components/app';
import { useExport } from '@/hooks/use-export';
import { REQUEST_EXPORT_COLUMNS, requestExportRows } from '@/lib/exports/inventory';
import { filterLabels } from '@/lib/export';
import { REQUEST_STATUS_LABEL as STATUS_LABEL, formatRequestLine as formatLineDisplay, hubRefName, isOpenRequest, type RequestScope } from './use-request-scope';
import { RequestDrawer } from './request-drawer';

type RequestFilter = 'mine' | 'open' | 'all' | InventoryRequestStatus;
const FILTERS: { value: RequestFilter; label: string }[] = [
  { value: 'mine', label: 'Needs my action' },
  { value: 'open', label: 'All open' },
  { value: 'all', label: 'All requests' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** Requests between locations. Defaults to the ones waiting on this user; approve, fulfil and reject inline. */
export function RequestsTab({ hubScope, scope }: Readonly<{ hubScope: HubScopeFilter; scope: RequestScope }>) {
  const { get, set } = useUrlState();
  const raw = get('rstatus') as RequestFilter | null;
  const filter: RequestFilter = raw && FILTERS.some((f) => f.value === raw) ? raw : 'mine';
  const approveRequest = useApproveInventoryRequest();
  const rejectRequest = useRejectInventoryRequest();
  const fulfillRequest = useFulfillInventoryRequest();
  const cancelRequest = useCancelInventoryRequest();
  const [rejecting, setRejecting] = useState<ApiInventoryRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // Full request (every line, notes, rejection reason, who reviewed and fulfilled); the table truncates.
  const [openId, setOpenId] = useState<string | null>(null);
  const openRequest = openId ? scope.requests.find((r) => r._id === openId) ?? null : null;

  const rows = scope.requests.filter((r) => {
    if (filter === 'mine') return scope.needsMyAction(r);
    if (filter === 'open') return isOpenRequest(r);
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const exportRequests = useExport({
    module: 'stock-requests', title: 'Stock requests',
    filters: () => filterLabels({ location: hubScope.filterHub, chips }),
    noun: { one: 'request line', many: 'request lines' }, columns: REQUEST_EXPORT_COLUMNS,
    fetchPage: async () => ({ items: requestExportRows(rows), totalPages: 1 }), disabled: rows.length === 0,
  });

  const handleReject = async () => {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    try {
      await rejectRequest.mutateAsync({ id: rejecting._id, rejection_reason: rejectReason.trim() });
      toast.success('Request rejected.');
      setRejecting(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject request.');
    }
  };

  const columns: Column<ApiInventoryRequest>[] = [
    {
      id: 'route', header: 'Request', mobile: 'title',
      cell: (r) => <span>{hubRefName(r.requesting_location)} <span className="text-muted-foreground">to</span> {hubRefName(r.fulfilling_hub)}</span>,
      sortValue: (r) => hubRefName(r.requesting_location),
    },
    {
      id: 'lines', header: 'Items', mobile: 'subtitle', className: 'max-w-sm',
      cell: (r) => (
        <div className="space-y-0.5 text-xs">
          {r.lines.map((line, idx) => <p key={idx} className="truncate">{formatLineDisplay(line)}</p>)}
          {r.notes && <p className="truncate text-muted-foreground">{r.notes}</p>}
          {r.rejection_reason && <p className="truncate text-destructive">Rejected: {r.rejection_reason}</p>}
        </div>
      ),
    },
    {
      id: 'by', header: 'Requested', mobile: 'meta', hideBelow: 'lg',
      cell: (r) => <span className="text-xs"><span className="block">{r.requested_by_name ?? '-'}</span>{r.createdAt && <span className="text-muted-foreground">{formatDateTime(r.createdAt)}</span>}</span>,
      sortValue: (r) => r.createdAt ?? '',
    },
    {
      id: 'status', header: 'Status', mobile: 'value',
      cell: (r) => <StatusBadge domain="work" status={STATUS_LABEL[r.status]} />,
      sortValue: (r) => r.status,
    },
  ];

  const rowActions = (r: ApiInventoryRequest) => {
    const fulfilling = scope.isFulfillingHub(r);
    const open = isOpenRequest(r);
    if (!open) return null;
    return (
      <>
        {r.status === 'submitted' && fulfilling && (
          <RowAction tone="primary" onClick={() => approveRequest.mutateAsync(r._id).then(() => toast.success('Approved.')).catch((e) => toast.error(e.message))}>
            <Check aria-hidden /> Approve
          </RowAction>
        )}
        {r.status === 'approved' && fulfilling && (
          <RowAction tone="primary" onClick={() => fulfillRequest.mutateAsync(r._id).then(() => toast.success('Fulfilled, stock transferred.')).catch((e) => toast.error(e.message))}>
            <Truck aria-hidden /> Fulfil
          </RowAction>
        )}
        {fulfilling && (
          <RowAction onClick={() => { setRejecting(r); setRejectReason(''); }}>
            <X aria-hidden /> Reject
          </RowAction>
        )}
        <OverflowMenu
          size="sm"
          label="More request actions"
          items={[
            {
              label: 'Cancel request',
              destructive: true,
              hidden: !scope.isRequester(r),
              onSelect: () => void cancelRequest.mutateAsync(r._id).then(() => toast.success('Cancelled.')).catch((e) => toast.error(e.message)),
            },
          ]}
        />
      </>
    );
  };

  const filterLabel = FILTERS.find((f) => f.value === filter)?.label ?? '';
  const chips: FilterChip[] = filter !== 'mine' ? [{ key: 'rstatus', label: filterLabel, onRemove: () => set({ rstatus: null }) }] : [];

  return (
    <div className="space-y-4">
      <FilterBar
        filters={
          <>
            <LocationSelect scope={hubScope} />
            <FilterSelect
              ariaLabel="Show requests"
              value={filter}
              onChange={(v) => set({ rstatus: v === 'mine' ? null : v })}
              className="h-9 w-auto min-w-44 data-[size=default]:h-9"
              options={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
            />
          </>
        }
        chips={chips}
        resultLabel={scope.isLoading ? undefined : `${rows.length} ${rows.length === 1 ? 'request' : 'requests'}`}
        trailing={exportRequests.menu}
      />
      <DataTable
        label="Inventory requests"
        // Kit gap: the sr-only "Actions" header is absolute; a positioned table keeps it clipped (no page scroll).
        className="relative"
        columns={columns}
        rows={scope.isLoading ? undefined : rows}
        loading={scope.isLoading}
        getRowId={(r) => r._id}
        onRowClick={(r) => setOpenId(r._id)}
        rowActions={rowActions}
        defaultSort={{ id: 'by', dir: 'desc' }}
        empty={
          <EmptyState
            size="compact"
            icon={<Inbox />}
            title={filter === 'mine' ? 'Nothing needs your action' : 'No requests'}
            description={filter === 'mine' ? 'Requests you can approve or fulfil will appear here.' : 'Nothing matches this filter in this location.'}
            action={filter === 'mine' && scope.requests.length > 0 ? (
              <button type="button" onClick={() => set({ rstatus: 'all' })} className="text-sm font-medium text-primary hover:underline">Show all requests</button>
            ) : undefined}
          />
        }
      />

      {openRequest && (
        <RequestDrawer
          request={openRequest}
          onClose={() => setOpenId(null)}
          actions={rowActions(openRequest)}
        />
      )}

      {rejecting && (
        <FormSheet
          title="Reject request"
          description={`${hubRefName(rejecting.requesting_location)} to ${hubRefName(rejecting.fulfilling_hub)}`}
          onClose={() => setRejecting(null)}
          onSubmit={() => void handleReject()}
          submitLabel="Reject request"
          submitting={rejectRequest.isPending}
          disabledReason={rejectReason.trim() ? null : 'Enter a reason'}
        >
          <ul className="space-y-1 text-sm">
            {rejecting.lines.map((line, idx) => <li key={idx}>{formatLineDisplay(line)}</li>)}
          </ul>
          <FormField label="Reason" htmlFor="reject-reason" required hint="The requesting location sees this.">
            <input id="reject-reason" type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className={fieldClass} />
          </FormField>
        </FormSheet>
      )}
    </div>
  );
}
