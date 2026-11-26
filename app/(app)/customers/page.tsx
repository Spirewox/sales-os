'use client';

import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Plus, Upload, Users } from 'lucide-react';
import { useOpenFromQuery } from '@/hooks/use-open-from-query';
import { useUrlState } from '@/hooks/use-url-state';
import { usePageSize } from '@/hooks/use-page-size';
import { fetchCustomers, useCreditSummary, useCustomer, useCustomers, useSegments } from '@/hooks/use-queries';
import { useExport } from '@/hooks/use-export';
import { filterLabels } from '@/lib/export';
import { customerExportColumns } from '@/lib/exports/customers';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { Customer, CustomerType } from '@/types';
import type { CreditCustomerSummary } from '@/types/credits';
import { formatCount, formatMoney, formatMoneyShort, plural } from '@/lib/format';
import { FilterSelect } from '@/components/filter-select';
import {
  DataTable, EmptyState, FilterBar, KpiStrip, LocationSelect, PageHeader, PeriodSelect, SectionErrorBoundary,
  OverflowMenu, type KpiCell,
} from '@/components/app';
import { CustomerImportModal } from './customer-import-modal';
import { CustomerImportSummaryDialog } from './customer-import-summary';
import { CustomerDetailPanel } from './customer-detail-panel';
import { CustomerFormSheet } from './customer-form';
import { CustomerMoreFilters } from './customer-more-filters';
import { CustomerRowActions, customerColumns } from './customer-columns';
import { useCustomerFilters, type CustomerSort } from './use-customer-filters';
import { useCustomerImport } from './use-customer-import';

const PAGE_SIZE = 25;
const EMPTY_SUMMARY = { total: 0, b2b: 0, b2c: 0, repeat: 0, totalRevenue: 0, avgValue: 0, ytdCustomers: 0, newThisMonth: 0, newLastMonth: 0, newCustomersMomPct: 0, retentionRate: 0 };

export default function CustomersPage() {
  return (
    <Suspense fallback={null}>
      <Customers />
    </Suspense>
  );
}

function Customers() {
  const router = useRouter();
  const { can } = usePermissions();
  const hubScope = useHubScopeFilter();
  const { get, set } = useUrlState();

  const [showAdd, setShowAdd] = useState(false);
  const openAdd = useCallback(() => setShowAdd(true), []);
  // Also drop ?new=1 from the router's copy of the URL, so later filter writes don't bring it back.
  const openAddFromLink = useCallback(() => { setShowAdd(true); set({ new: null }); }, [set]);
  useOpenFromQuery('new', '1', openAddFromLink);

  const { data: segments = [] } = useSegments();
  const segmentName = useCallback((id: string) => segments.find((s) => s.id === id)?.name, [segments]);
  const f = useCustomerFilters(segmentName);

  // Paging resets whenever the filters (or location) change.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('customers', PAGE_SIZE);
  const pageKey = `${f.key}|${hubScope.hubIdForApi ?? ''}`;
  const [seenKey, setSeenKey] = useState(pageKey);
  if (seenKey !== pageKey) {
    setSeenKey(pageKey);
    setPage(1);
  }

  const exportFilters = { ...f.apiFilters, hub_id: hubScope.hubIdForApi };
  const { data: list, isFetching } = useCustomers({ ...exportFilters, page, limit: pageSize });
  const customers = list?.items;
  const meta = list?.meta ?? { page: 1, limit: pageSize, total: 0, totalPages: 1 };
  const kpis = list?.summary ?? EMPTY_SUMMARY;
  const imports = useCustomerImport();
  const fileInput = useRef<HTMLInputElement>(null);

  // Outstanding per customer, from the credits summary (one request for everyone who owes).
  const { data: creditRows, isError: creditsFailed } = useCreditSummary();
  const creditByCustomer = useMemo(() => {
    if (!creditRows || creditsFailed) return null;
    return new Map<string, CreditCustomerSummary>(creditRows.map((r) => [r.customerId, r]));
  }, [creditRows, creditsFailed]);

  // Open drawer: ?customer=<id> (older links use ?open=<id>).
  const openId = get('customer') ?? get('open');
  const [override, setOverride] = useState<Customer | null>(null);
  const fromList = customers?.find((c) => c.id === openId);
  const { data: fetched } = useCustomer(openId && !fromList ? openId : null);
  const selected = openId ? (override?.id === openId ? override : fromList ?? fetched ?? null) : null;
  const openCustomer = (c: Customer) => { setOverride(null); set({ customer: c.id, open: null }); };
  const closeCustomer = () => { setOverride(null); set({ customer: null, open: null }); };

  const periodScoped = f.periodScoped;
  const repeatActive = f.ordersMode === 'min' && f.ordersCount === 2;
  const businessActive = f.type === CustomerType.B2B;
  // Detail lines carry the old period hint: what each number counts in "all time" vs a chosen period.
  const kpiCells: KpiCell[] = [
    { label: 'Customers', value: formatCount(kpis.total), detail: periodScoped ? 'Bought in this period' : 'All time, matching filters' },
    {
      label: periodScoped ? 'Active in period' : 'Created this year',
      value: formatCount(kpis.ytdCustomers ?? 0),
      detail: periodScoped ? 'Transacted in this period' : 'Joined since 1 January',
    },
    {
      label: periodScoped ? 'New in period' : 'New this month',
      value: formatCount(kpis.newThisMonth ?? 0),
      detail: periodScoped ? 'First purchase in this period' : 'First purchase this calendar month',
      change: list ? { pct: kpis.newCustomersMomPct ?? 0, label: periodScoped ? 'vs prior period' : 'vs last month' } : null,
    },
    {
      label: 'Repeat customers',
      value: kpis.total > 0 ? `${((kpis.repeat / kpis.total) * 100).toFixed(1)}%` : '-',
      detail: repeatActive ? 'Showing 2+ orders' : `${formatCount(kpis.repeat)} with 2+ orders`,
      onClick: () => f.setOrders(repeatActive ? 'all' : 'min', 2),
      active: repeatActive,
    },
  ];
  const valueCells: KpiCell[] = [
    { label: 'Revenue', value: formatMoneyShort(kpis.totalRevenue), detail: `${formatMoney(kpis.totalRevenue)} from these customers${periodScoped ? ' this period' : ''}` },
    { label: 'Average value', value: formatMoney(Math.round(kpis.avgValue)), detail: 'Revenue per customer' },
    { label: 'Retention', value: `${(kpis.retentionRate ?? 0).toFixed(1)}%`, detail: periodScoped ? 'For this period' : 'All time' },
    {
      label: 'Business customers',
      value: formatCount(kpis.b2b),
      detail: `${formatCount(kpis.b2c)} individual`,
      onClick: () => f.setType(businessActive ? 'All' : CustomerType.B2B),
      active: businessActive,
    },
  ];

  const canSell = can('sales.create');
  const canLog = can('interactions.create');
  const columns = customerColumns(creditByCustomer, f.segmentNames);
  const filtered = f.chips.length > 0;

  // Every customer the filters match, paged from the same list the table reads.
  const exportCustomers = useExport({
    module: 'customers', title: 'Customers', noun: { one: 'customer', many: 'customers' },
    columns: customerExportColumns((id) => creditByCustomer?.get(id)?.totalOutstanding),
    filters: () => filterLabels({ location: hubScope.filterHub, chips: f.chips }),
    fetchPage: async (p, l) => {
      const res = await fetchCustomers({ ...exportFilters, page: p, limit: l });
      return { items: res.items, totalPages: res.meta.totalPages };
    },
    pageSize: 100,
    disabled: !list || meta.total === 0,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Find a customer, then message, sell or follow up."
        actions={
          can('customers.create') ? (
            <button type="button" onClick={openAdd} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
              <Plus size={16} aria-hidden /> Add customer
            </button>
          ) : undefined
        }
        overflow={
          <OverflowMenu
            label="More customer actions"
            items={[
              { label: 'Import customers', icon: <Upload />, onSelect: () => fileInput.current?.click(), hidden: !can('customers.create') },
              { label: 'Download template', icon: <FileSpreadsheet />, onSelect: imports.downloadTemplate, hidden: !can('customers.create') },
            ]}
          />
        }
      />
      {can('customers.create') && (
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            imports.handleFile(e.target.files?.[0]);
            e.target.value = ''; // so choosing the same file again still fires
          }}
        />
      )}

      <div className="space-y-3">
        <KpiStrip cells={kpiCells} loading={!list} label="Customer growth" />
        <KpiStrip cells={valueCells} loading={!list} label="Customer value and mix" />
      </div>

      <FilterBar
        search={{ value: f.search, onChange: f.setSearch, placeholder: 'Search name, phone, email, company', label: 'Search customers' }}
        filters={
          <>
            <LocationSelect scope={hubScope} />
            <FilterSelect
              ariaLabel="Customer type"
              value={f.type}
              onChange={(v) => f.setType(v as CustomerType | 'All')}
              className="h-9 w-auto min-w-36 data-[size=default]:h-9"
              options={[
                { value: 'All', label: 'All types' },
                { value: CustomerType.B2B, label: 'Business' },
                { value: CustomerType.B2C, label: 'Individual' },
              ]}
            />
            <PeriodSelect value={f.period} onChange={f.setPeriod} />
          </>
        }
        more={<CustomerMoreFilters filters={f} segments={segments} />}
        moreActiveCount={f.moreActiveCount}
        chips={f.chips}
        trailing={can('customers.view') ? exportCustomers.menu : undefined}
        onClearAll={f.clearAll}
        resultLabel={list ? `${meta.total > meta.limit ? `${(meta.page - 1) * meta.limit + 1} to ${Math.min(meta.page * meta.limit, meta.total)} of ` : ''}${plural(meta.total, 'customer')}${isFetching ? ', updating…' : ''}` : undefined}
      />

      <SectionErrorBoundary label="Customer list" resetKey={pageKey}>
        <DataTable
          label="Customers"
          columns={columns}
          rows={isFetching ? undefined : customers}
          loading={isFetching}
          getRowId={(c) => c.id}
          onRowClick={openCustomer}
          rowActions={canSell || canLog ? (c) => <CustomerRowActions customer={c} router={router} canSell={canSell} canLog={canLog} /> : undefined}
          pageSize={pageSize}
          manualSort
          sort={f.sort === 'default' ? null : { id: f.sort.startsWith('orders') ? 'orders' : 'revenue', dir: f.sort.endsWith('_asc') ? 'asc' : 'desc' }}
          onSortChange={(s) => f.setSort(s ? ((s.id + (s.dir === 'asc' ? '_asc' : '')) as CustomerSort) : 'default')}
          pagination={{ page: meta.page, totalPages: meta.totalPages, onPageChange: setPage, pageSize, onPageSizeChange: (n) => { setPageSize(n); setPage(1); }, total: meta.total }}
          empty={
            <EmptyState
              size="compact"
              icon={<Users />}
              title="No customers to show"
              description={filtered ? 'No customers match these filters.' : 'Add a customer or import a list to get started.'}
              action={filtered ? <button type="button" onClick={f.clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
            />
          }
        />
      </SectionErrorBoundary>


      {showAdd && <CustomerFormSheet onClose={() => setShowAdd(false)} existingCustomers={customers} />}

      <CustomerImportModal {...imports.modal} />
      {imports.summary && <CustomerImportSummaryDialog summary={imports.summary} onClose={imports.closeSummary} />}

      {selected && (
        <CustomerDetailPanel
          customer={selected}
          onClose={closeCustomer}
          onUpdated={setOverride}
          prioritySegmentNames={f.segmentNames}
        />
      )}
    </div>
  );
}
