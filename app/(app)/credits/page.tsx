'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleCheck, MessageCircle, Wallet } from 'lucide-react';
import { useCreditSummary } from '@/hooks/use-queries';
import { buildMetricsFromSummary } from '@/lib/credit-mappers';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { usePermissions } from '@/hooks/use-permissions';
import { useUrlState } from '@/hooks/use-url-state';
import type { CreditCustomerSummary } from '@/types/credits';
import { formatCount, formatMoneyShort, plural } from '@/lib/format';
import {
  DataTable, EmptyState, FilterBar, KpiStrip, LocationSelect, PageHeader, RowAction, SectionErrorBoundary,
  type FilterChip, type KpiCell,
} from '@/components/app';
import { useExport } from '@/hooks/use-export';
import { creditExportColumns } from '@/lib/exports/credit';
import { filterLabels } from '@/lib/export';
import { CustomerCreditSheet } from '@/components/credits/customer-credit-sheet';
import { GeneralRepaymentForm } from '@/components/credits/credit-forms';
import { whatsAppHref } from '@/components/credits/credit-utils';
import { creditColumns, isDueThisWeek, matchesFilter, type CreditFilter } from './credit-columns';

const PAGE_SIZE = 20;
const FILTERS: Record<CreditFilter, string> = { overdue: 'Overdue', week: 'Due this week', flagged: 'Flagged' };
const isFilter = (v: string | null): v is CreditFilter => !!v && v in FILTERS;

export default function CreditsPage() {
  return (
    <Suspense fallback={null}>
      <Credits />
    </Suspense>
  );
}

function Credits() {
  const { get, set } = useUrlState();
  const { can } = usePermissions();
  const scope = useHubScopeFilter();
  const { data: summary, isFetching } = useCreditSummary(scope.hubIdForApi ? { hub_id: scope.hubIdForApi } : undefined);

  // ?filter=overdue|week|flagged; the older ?overdue=1 link still selects Overdue.
  const rawFilter = get('filter');
  const filter: CreditFilter | null = isFilter(rawFilter) ? rawFilter : get('overdue') === '1' ? 'overdue' : null;
  const setFilter = (f: CreditFilter | null) => set({ filter: f, overdue: null });
  const toggleFilter = (f: CreditFilter) => setFilter(filter === f ? null : f);

  const urlSearch = get('q') ?? '';
  const [search, setSearch] = useState(urlSearch);
  useEffect(() => {
    if (search === urlSearch) return;
    const t = setTimeout(() => set({ q: search.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [search, urlSearch, set]);

  const customerId = get('customer');
  const [repayFor, setRepayFor] = useState<CreditCustomerSummary | null>(null);

  // Location scopes both the KPIs and the list, so the numbers and rows agree.
  const inLocation = useMemo(
    () => (summary ?? []).filter((r) => scope.filterHub === 'All' || !r.hubName || r.hubName === scope.filterHub),
    [summary, scope.filterHub],
  );
  const rows = useMemo(() => {
    const q = urlSearch.trim().toLowerCase();
    return inLocation.filter(
      (r) => matchesFilter(r, filter) && (!q || r.customerName.toLowerCase().includes(q) || (r.phone ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))),
    );
  }, [inLocation, filter, urlSearch]);

  const kpis = useMemo(() => {
    const overdue = inLocation.filter((r) => r.overdueCount > 0);
    const week = inLocation.filter(isDueThisWeek);
    const flagged = inLocation.filter((r) => r.flaggedCount > 0);
    const hasOverdueAmount = inLocation.every((r) => r.overdueAmount != null);
    const hasWeekAmount = inLocation.every((r) => r.dueThisWeekAmount != null);
    return {
      outstanding: inLocation.reduce((s, r) => s + r.totalOutstanding, 0),
      customers: inLocation.length,
      overdueCustomers: overdue.length,
      overdueItems: overdue.reduce((s, r) => s + r.overdueCount, 0),
      overdueAmount: hasOverdueAmount ? overdue.reduce((s, r) => s + (r.overdueAmount ?? 0), 0) : null,
      weekCustomers: week.length,
      weekAmount: hasWeekAmount ? week.reduce((s, r) => s + (r.dueThisWeekAmount ?? 0), 0) : null,
      flaggedCustomers: flagged.length,
      flaggedItems: flagged.reduce((s, r) => s + r.flaggedCount, 0),
      openItems: inLocation.reduce((s, r) => s + r.openCreditCount, 0),
      // Same calculation the old "Avg days overdue" card used (from each customer's oldest overdue item).
      avgDaysOverdue: buildMetricsFromSummary(inLocation).avgDaysOverdue,
    };
  }, [inLocation]);

  const loading = isFetching && !summary;
  const exportCredit = useExport({
    module: 'credit',
    title: 'Credit records',
    filters: () => filterLabels({ location: scope.filterHub, chips }),
    noun: { one: 'credit record', many: 'credit records' },
    columns: creditExportColumns(new Date()),
    fetchPage: async () => ({ items: rows, totalPages: 1 }),
    disabled: loading || rows.length === 0,
  });
  const cells: KpiCell[] = [
    {
      label: 'Outstanding',
      value: formatMoneyShort(kpis.outstanding),
      detail: plural(kpis.customers, 'customer'),
      onClick: () => setFilter(null),
      active: filter === null,
    },
    {
      label: 'Overdue',
      value: kpis.overdueAmount != null ? formatMoneyShort(kpis.overdueAmount) : formatCount(kpis.overdueItems),
      detail: `${plural(kpis.overdueCustomers, 'customer')}, ${plural(kpis.overdueItems, 'item')}`,
      tone: kpis.overdueCustomers > 0 ? 'danger' : 'default',
      onClick: () => toggleFilter('overdue'),
      active: filter === 'overdue',
    },
    {
      label: 'Due this week',
      value: kpis.weekAmount != null ? formatMoneyShort(kpis.weekAmount) : formatCount(kpis.weekCustomers),
      detail: kpis.weekAmount != null ? plural(kpis.weekCustomers, 'customer') : `${plural(kpis.weekCustomers, 'customer')}, next 7 days`,
      onClick: () => toggleFilter('week'),
      active: filter === 'week',
    },
    {
      label: 'Flagged',
      value: formatCount(kpis.flaggedCustomers),
      detail: `${plural(kpis.flaggedCustomers, 'customer')}, ${plural(kpis.flaggedItems, 'item')}`,
      tone: kpis.flaggedCustomers > 0 ? 'warning' : 'default',
      onClick: () => toggleFilter('flagged'),
      active: filter === 'flagged',
    },
  ];

  // Second strip: the old page's collection figures that do not filter the list.
  const healthCells: KpiCell[] = [
    {
      label: 'Avg days overdue',
      value: `${formatCount(kpis.avgDaysOverdue)} ${kpis.avgDaysOverdue === 1 ? 'day' : 'days'}`,
      detail: kpis.overdueCustomers ? `From each overdue customer's oldest item (${kpis.overdueCustomers})` : 'Nothing overdue',
      tone: kpis.avgDaysOverdue > 0 ? 'warning' : 'default',
    },
    { label: 'Open credit items', value: formatCount(kpis.openItems), detail: `Across ${plural(kpis.customers, 'customer')}` },
    { label: 'Overdue items', value: formatCount(kpis.overdueItems), tone: kpis.overdueItems > 0 ? 'danger' : 'default', detail: kpis.openItems ? `${Math.round((kpis.overdueItems / kpis.openItems) * 100)}% of open items` : undefined },
  ];

  const chips: FilterChip[] = [
    ...(filter ? [{ key: 'filter', label: FILTERS[filter], onRemove: () => setFilter(null) }] : []),
    ...(urlSearch ? [{ key: 'q', label: `"${urlSearch}"`, onRemove: () => { setSearch(''); set({ q: null }); } }] : []),
  ];
  const clearAll = () => { setSearch(''); set({ q: null, filter: null, overdue: null }); };

  const canPay = can('credits.record_payment');
  const selectedSummary = customerId ? (summary ?? []).find((r) => r.customerId === customerId) ?? null : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Credits"
        description="Balances customers owe, most overdue first. Credits come from credit sales."
      />

      <KpiStrip cells={cells} loading={loading} label="Credit summary" />
      <KpiStrip cells={healthCells} loading={loading} label="Collection health" />

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search customer or phone', label: 'Search customers' }}
        filters={<LocationSelect scope={scope} />}
        chips={chips}
        trailing={can('credits.view') ? exportCredit.menu : undefined}
        onClearAll={clearAll}
        resultLabel={summary ? plural(rows.length, 'customer') : undefined}
      />

      <SectionErrorBoundary label="Credits list">
        <DataTable
          label="Customers with credit"
          columns={creditColumns}
          rows={loading ? undefined : rows}
          loading={loading}
          getRowId={(r) => r.customerId}
          onRowClick={(r) => set({ customer: r.customerId })}
          defaultSort={{ id: 'oldest', dir: 'desc' }}
          pageSize={PAGE_SIZE}
          rowActions={(r) => {
            const wa = whatsAppHref(r.phone);
            return (
              <>
                {wa && <RowAction href={wa} external ariaLabel={`WhatsApp ${r.customerName}`}><MessageCircle aria-hidden /> WhatsApp</RowAction>}
                {canPay && r.totalOutstanding > 0 && (
                  <RowAction tone="primary" onClick={() => setRepayFor(r)}><Wallet aria-hidden /><span className="md:hidden">Pay</span><span className="hidden md:inline">Record payment</span></RowAction>
                )}
              </>
            );
          }}
          empty={
            <EmptyState
              size="compact"
              icon={<CircleCheck />}
              title="No customers to show"
              description={chips.length ? 'No customers with open credit match these filters.' : 'No customer has an open credit balance.'}
              action={chips.length ? <button type="button" onClick={clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
            />
          }
        />
      </SectionErrorBoundary>

      <CustomerCreditSheet customerId={customerId} summary={selectedSummary} onClose={() => set({ customer: null })} />

      {repayFor && (
        <GeneralRepaymentForm
          customerId={repayFor.customerId}
          customerName={repayFor.customerName}
          totalOutstanding={repayFor.totalOutstanding}
          onClose={() => setRepayFor(null)}
        />
      )}
    </div>
  );
}
