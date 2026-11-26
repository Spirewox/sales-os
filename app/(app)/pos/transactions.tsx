'use client';

import { Receipt } from 'lucide-react';
import { DataTable, EmptyState, MoreFilterField, OverflowMenu, type Column, type FilterChip } from '@/components/app';
import { useExport } from '@/hooks/use-export';
import { axiosGet } from '@/lib/api';
import { posTransactionExportColumns } from '@/lib/exports/pos';
import { plural } from '@/lib/format';
import { usePosFilters } from './use-pos-filters';
import { operationsQuery, useCursorPages, useOperationsList } from './operations';
import { PosFilterBar, UrlFilterSelect, useCashierOptions, useTillOptions } from './pos-filter-bar';
import { OperationStatus, TRANSACTION_KINDS, TRANSACTION_STATUSES, formatKobo, posTime, rowMethod, rowReference, LoadError, withSelected, type PosRow } from './pos-utils';
import { TransactionDrawer } from './transaction-drawer';

export function TransactionsTab() {
  const f = usePosFilters();
  const status = f.get('status');
  const kind = f.get('kind');
  const till = f.get('device_id');
  const cashier = f.get('cashier_id');
  const reference = f.get('reference');
  const base = { hub_id: f.hubId, date_from: f.dateFrom, date_to: f.dateTo, q: f.urlSearch.trim(), status, kind, device_id: till, cashier_id: cashier, reference };
  const { before, pagination } = useCursorPages(operationsQuery(base));
  const list = useOperationsList('transactions', { ...base, before });
  const rows = list.data?.data;
  const { options: tillOptions, tillLabel } = useTillOptions(f);
  const cashierOptions = withSelected(useCashierOptions(f, rows), cashier, 'Selected cashier');
  const selected = rows?.find((r) => r._id === f.get('txn'));

  // Every transaction matching the filters, following the API's cursor past the page on screen.
  const exportTransactions = useExport({
    module: 'pos-transactions',
    noun: { one: 'transaction', many: 'transactions' },
    columns: posTransactionExportColumns({
      hubName: f.hubName,
      tillLabel,
      statusLabel: (s) => TRANSACTION_STATUSES.find((o) => o.value === s)?.label ?? s ?? '',
    }),
    fetchCursor: async (cursor) => {
      const res = await axiosGet(`pos/operations/transactions?${operationsQuery({ ...base, before: cursor })}`, true) as { data?: PosRow[]; nextCursor?: string | null };
      return { items: res.data ?? [], nextCursor: res.nextCursor };
    },
    disabled: !rows?.length,
  });

  const label = (list: readonly { value: string; label: string }[], value: string | null) => list.find((o) => o.value === value)?.label ?? value;
  const chips: FilterChip[] = [
    ...(status ? [{ key: 'status', label: label(TRANSACTION_STATUSES, status)!, onRemove: () => f.set({ status: null }) }] : []),
    ...(kind ? [{ key: 'kind', label: label(TRANSACTION_KINDS, kind)!, onRemove: () => f.set({ kind: null }) }] : []),
    ...(till ? [{ key: 'till', label: `Till: ${tillLabel(till)}`, onRemove: () => f.set({ device_id: null }) }] : []),
    ...(cashier ? [{ key: 'cashier', label: `Cashier: ${label(cashierOptions, cashier)}`, onRemove: () => f.set({ cashier_id: null }) }] : []),
    ...(reference ? [{ key: 'reference', label: `Checkout: ${reference}`, onRemove: () => f.set({ reference: null }) }] : []),
  ];
  const filtered = chips.length > 0 || !!f.urlSearch;

  const columns: Column<PosRow>[] = [
    { id: 'time', header: 'Time', mobile: 'meta', className: 'whitespace-nowrap', cell: (r) => posTime(r.createdAt) },
    {
      id: 'reference', header: 'Reference', mobile: 'title',
      cell: (r) => <span className="break-all">{rowReference(r)}{r.kind && r.kind !== 'sale' && <span className="ml-1.5 text-xs font-normal text-muted-foreground capitalize">{r.kind}</span>}</span>,
    },
    { id: 'location', header: 'Location', mobile: 'subtitle', hideBelow: 'lg', cell: (r) => f.hubName(r.hub) },
    { id: 'till', header: 'Till', hideBelow: 'lg', cell: (r) => tillLabel(r.device_id) },
    { id: 'cashier', header: 'Cashier', mobile: 'subtitle', cell: (r) => r.cashier_name || '-' },
    { id: 'method', header: 'Method', hideBelow: 'xl', cell: (r) => rowMethod(r) },
    { id: 'status', header: 'Status', mobile: 'meta', cell: (r) => <OperationStatus status={r.status} section="transactions" /> },
    { id: 'amount', header: 'Amount', align: 'right', mobile: 'value', cell: (r) => formatKobo(r.total_kobo) },
  ];

  const page = pagination(list.data?.nextCursor);
  return (
    <div className="space-y-4">
      <PosFilterBar
        f={f}
        searchPlaceholder="Search receipts and references"
        filters={<UrlFilterSelect f={f} param="status" label="Status" allLabel="All statuses" options={TRANSACTION_STATUSES} />}
        more={<>
          <MoreFilterField label="Till" htmlFor="pos-filter-device_id">
            <UrlFilterSelect f={f} param="device_id" label="Till" allLabel="All tills" options={withSelected(tillOptions, till, till ?? '')} className="h-9 w-full data-[size=default]:h-9" />
          </MoreFilterField>
          <MoreFilterField label="Cashier" htmlFor="pos-filter-cashier_id">
            <UrlFilterSelect f={f} param="cashier_id" label="Cashier" allLabel="All cashiers" options={cashierOptions} className="h-9 w-full data-[size=default]:h-9" />
          </MoreFilterField>
          <MoreFilterField label="Type" htmlFor="pos-filter-kind">
            <UrlFilterSelect f={f} param="kind" label="Type" allLabel="All types" options={TRANSACTION_KINDS} className="h-9 w-full data-[size=default]:h-9" />
          </MoreFilterField>
        </>}
        moreActiveCount={[till, cashier, kind].filter(Boolean).length}
        chips={chips}
        resultLabel={rows ? `${plural(rows.length, 'transaction')}${list.data?.nextCursor || page.page > 1 ? ` on page ${page.page}` : ''}` : undefined}
        trailing={<OverflowMenu label="More transaction actions" items={[exportTransactions.item]} />}
      />
      <LoadError show={list.isError} what="transactions" retry={() => void list.refetch()} />
      <DataTable
        label="POS transactions"
        columns={columns}
        rows={rows}
        loading={list.isFetching && (!rows || list.isPlaceholderData)}
        getRowId={(r) => r._id}
        onRowClick={(r) => f.set({ txn: r._id })}
        pagination={page}
        empty={<EmptyState size="compact" icon={<Receipt />} title="No transactions" description={filtered ? 'Nothing matches these filters.' : 'Till sales in this period appear here once they sync.'} />}
      />
      {selected && <TransactionDrawer row={selected} hubName={f.hubName(selected.hub)} tillLabel={tillLabel(selected.device_id)} onClose={() => f.set({ txn: null })} />}
    </div>
  );
}
