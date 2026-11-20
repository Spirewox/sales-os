'use client';

import { CalendarClock, ShieldAlert } from 'lucide-react';
import { DataTable, EmptyState, MoreFilterField, RowAction, type Column, type FilterChip } from '@/components/app';
import { plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { TAB_FILTER_KEYS, usePosFilters } from './use-pos-filters';
import { operationsQuery, useCursorPages, useOperationsList } from './operations';
import { PosFilterBar, UrlFilterSelect, useCashierOptions, useTillOptions } from './pos-filter-bar';
import { OperationStatus, SHIFT_STATUSES, formatKobo, posTime, rowReference, LoadError, withSelected, type PosRow } from './pos-utils';

const fullWidth = 'h-9 w-full data-[size=default]:h-9';

export function ShiftsTab() {
  const f = usePosFilters();
  const status = f.get('status');
  const till = f.get('device_id');
  const cashier = f.get('cashier_id');
  const base = { hub_id: f.hubId, date_from: f.dateFrom, date_to: f.dateTo, q: f.urlSearch.trim(), status, device_id: till, cashier_id: cashier };
  const { before, pagination } = useCursorPages(operationsQuery(base));
  const list = useOperationsList('shifts', { ...base, before });
  const rows = list.data?.data;
  const { options: tillOptions, tillLabel } = useTillOptions(f);
  const cashierOptions = withSelected(useCashierOptions(f, rows), cashier, 'Selected cashier');
  const chips: FilterChip[] = [
    ...(status ? [{ key: 'status', label: SHIFT_STATUSES.find((s) => s.value === status)?.label ?? status, onRemove: () => f.set({ status: null }) }] : []),
    ...(till ? [{ key: 'till', label: `Till: ${tillLabel(till)}`, onRemove: () => f.set({ device_id: null }) }] : []),
    ...(cashier ? [{ key: 'cashier', label: `Cashier: ${cashierOptions.find((o) => o.value === cashier)?.label}`, onRemove: () => f.set({ cashier_id: null }) }] : []),
  ];
  const columns: Column<PosRow>[] = [
    { id: 'opened', header: 'Opened', mobile: 'meta', className: 'whitespace-nowrap', cell: (r) => posTime(r.opened_at) },
    { id: 'shift', header: 'Shift', mobile: 'title', cell: (r) => <span className="break-all">{rowReference(r)}</span> },
    { id: 'location', header: 'Location', mobile: 'subtitle', hideBelow: 'lg', cell: (r) => f.hubName(r.hub) },
    { id: 'till', header: 'Till', cell: (r) => tillLabel(r.device_id) },
    { id: 'cashier', header: 'Cashier', mobile: 'subtitle', cell: (r) => r.cashier_name || '-' },
    { id: 'status', header: 'Status', mobile: 'meta', cell: (r) => <OperationStatus status={r.status} section="shifts" /> },
    { id: 'closed', header: 'Closed', hideBelow: 'xl', className: 'whitespace-nowrap', cell: (r) => (r.closed_at ? posTime(r.closed_at) : '-') },
    { id: 'variance', header: 'Variance', align: 'right', mobile: 'value', cell: (r) => <span className={cn((r.variance ?? 0) < 0 && 'text-destructive')}>{formatKobo(r.variance)}</span> },
  ];
  const page = pagination(list.data?.nextCursor);
  return (
    <div className="space-y-4">
      <PosFilterBar
        f={f}
        searchPlaceholder="Search shifts"
        filters={<UrlFilterSelect f={f} param="status" label="Status" allLabel="All statuses" options={SHIFT_STATUSES} />}
        more={<>
          <MoreFilterField label="Till" htmlFor="pos-filter-device_id">
            <UrlFilterSelect f={f} param="device_id" label="Till" allLabel="All tills" options={withSelected(tillOptions, till, till ?? '')} className={fullWidth} />
          </MoreFilterField>
          <MoreFilterField label="Cashier" htmlFor="pos-filter-cashier_id">
            <UrlFilterSelect f={f} param="cashier_id" label="Cashier" allLabel="All cashiers" options={cashierOptions} className={fullWidth} />
          </MoreFilterField>
        </>}
        moreActiveCount={[till, cashier].filter(Boolean).length}
        chips={chips}
        resultLabel={rows ? `${plural(rows.length, 'shift')}${list.data?.nextCursor || page.page > 1 ? ` on page ${page.page}` : ''}` : undefined}
      />
      <LoadError show={list.isError} what="shifts" retry={() => void list.refetch()} />
      <DataTable
        label="Till shifts"
        columns={columns}
        rows={rows}
        loading={list.isFetching && (!rows || list.isPlaceholderData)}
        getRowId={(r) => r._id}
        pagination={page}
        empty={<EmptyState size="compact" icon={<CalendarClock />} title="No shifts" description={chips.length || f.urlSearch ? 'Nothing matches these filters.' : 'Shifts opened on tills in this period appear here.'} />}
      />
    </div>
  );
}

export function ReviewsTab() {
  const f = usePosFilters();
  const base = { hub_id: f.hubId, date_from: f.dateFrom, date_to: f.dateTo, q: f.urlSearch.trim() };
  const { before, pagination } = useCursorPages(operationsQuery(base));
  const list = useOperationsList('reviews', { ...base, before });
  const rows = list.data?.data;
  const openTransaction = (reference: string) =>
    f.set({ ...Object.fromEntries(TAB_FILTER_KEYS.map((k) => [k, null])), tab: 'transactions', reference, period: 'all', from: null, to: null });
  const columns: Column<PosRow>[] = [
    { id: 'time', header: 'Time', mobile: 'meta', className: 'whitespace-nowrap', cell: (r) => posTime(r.createdAt) },
    { id: 'reference', header: 'Reference', mobile: 'title', cell: (r) => <span className="break-all">{rowReference(r)}</span> },
    { id: 'location', header: 'Location', mobile: 'subtitle', hideBelow: 'lg', cell: (r) => f.hubName(r.hub) },
    { id: 'terminal', header: 'Terminal', hideBelow: 'xl', cell: (r) => r.evidence?.terminalSerial || '-' },
    { id: 'reason', header: 'Reason', mobile: 'subtitle', className: 'max-w-xs', cell: (r) => <span className="line-clamp-2">{r.review_reason || 'Needs review'}</span> },
    { id: 'amount', header: 'Amount', align: 'right', mobile: 'value', cell: (r) => formatKobo(r.evidence?.amountKobo) },
  ];
  const page = pagination(list.data?.nextCursor);
  return (
    <div className="space-y-4">
      <PosFilterBar
        f={f}
        searchPlaceholder="Search payment reviews"
        resultLabel={rows ? `${plural(rows.length, 'payment')} to review${list.data?.nextCursor || page.page > 1 ? ` on page ${page.page}` : ''}` : undefined}
      />
      <LoadError show={list.isError} what="payment reviews" retry={() => void list.refetch()} />
      <DataTable
        label="Payments to review"
        columns={columns}
        rows={rows}
        loading={list.isFetching && (!rows || list.isPlaceholderData)}
        getRowId={(r) => r._id}
        rowActions={(r) => (r.checkoutReference ? <RowAction onClick={() => openTransaction(r.checkoutReference!)}>Open transaction<span className="sr-only"> {r.checkoutReference}</span></RowAction> : null)}
        pagination={page}
        empty={<EmptyState size="compact" icon={<ShieldAlert />} title="Nothing to review" description={f.urlSearch ? 'Nothing matches this search.' : 'Card payments that need a manual check appear here.'} />}
      />
    </div>
  );
}
