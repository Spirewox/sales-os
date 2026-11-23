'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, MessageSquare, ShoppingCart, X } from 'lucide-react';
import {
  DataTable, EmptyState, FilterBar, KpiStrip, LocationSelect, MoreFilterField, OverflowMenu, RowAction,
  type FilterChip,
} from '@/components/app';
import { FilterSelect } from '@/components/filter-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { useUrlState } from '@/hooks/use-url-state';
import { useCustomer, useCustomerEngagement, type EngagementCustomer } from '@/hooks/use-queries';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCount, formatDateTime, formatMoneyShort, plural } from '@/lib/format';
import type { Customer } from '@/types';
import { CustomerDetailPanel, CustomerDrawer } from '../customers/customer-detail-panel';
import { hasPhone, recordSaleHref, whatsappHref } from '../customers/customer-links';
import { LOYALTY_OPTIONS, activityLabel, churnColumns, type ChurnActivity } from './churn-columns';
import { logFeedbackHref } from './interaction-utils';

// RowAction has no target prop yet; WhatsApp must open in a new tab so the app stays open.
const ROW_LINK = 'inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-muted [&_svg]:size-3.5';

const parseActivity = (v: string | null): ChurnActivity => (v === 'At Risk' || v === 'Dormant' ? v : 'All');

export default function Churn() {
  const router = useRouter();
  const { can } = usePermissions();
  const hubScope = useHubScopeFilter();
  const { get, set } = useUrlState();
  // ?activity= is linked from the customer drawer ("At Risk" / "Dormant").
  const activity = parseActivity(get('activity'));
  const setActivity = (a: ChurnActivity) => set({ activity: a === 'All' ? null : a });
  const [loyalty, setLoyalty] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [openCustomerOverride, setOpenCustomerOverride] = useState<Customer | null>(null);

  // Fetch every activity and filter here, so the KPI counts stay true while a risk filter is on.
  const { data, isFetching, isError } = useCustomerEngagement(
    { activity: 'All', loyalty: loyalty === 'All' ? undefined : loyalty, hub_id: hubScope.hubIdForApi },
    { enabled: can('customers.view') },
  );

  const { data: fetchedCustomer, isFetching: openCustomerLoading, isError: openCustomerError } = useCustomer(openCustomerId);
  const openCustomer = openCustomerOverride?.id === openCustomerId ? openCustomerOverride : (fetchedCustomer ?? null);
  const closeCustomer = () => {
    setOpenCustomerId(null);
    setOpenCustomerOverride(null);
  };
  const openRow = (row: EngagementCustomer) => {
    setOpenCustomerOverride(null);
    setOpenCustomerId(row.id);
  };

  const all = useMemo(() => data?.items ?? [], [data]);
  const totals = useMemo(() => ({
    atRisk: all.filter((r) => r.activity === 'At Risk').length,
    dormant: all.filter((r) => r.activity === 'Dormant').length,
    ltv: all.reduce((sum, r) => sum + (r.ltv || 0), 0),
  }), [all]);
  const rows = useMemo(
    () => all.filter((r) => (activity === 'All' || r.activity === activity)
      && (!search.trim() || [r.name, r.company, r.phone, r.hub].some((f) => f?.toLowerCase().includes(search.trim().toLowerCase())))),
    [all, activity, search],
  );

  if (!can('customers.view')) {
    return <div className="p-8 text-sm text-muted-foreground">You do not have permission to view customer engagement.</div>;
  }

  const loading = isFetching && !data;
  const canSell = can('sales.create');
  const canLog = can('interactions.view') && can('interactions.create');

  const chips: FilterChip[] = [
    ...(search.trim() ? [{ key: 'q', label: `"${search.trim()}"`, onRemove: () => setSearch('') }] : []),
    ...(activity !== 'All' ? [{ key: 'activity', label: activityLabel(activity), onRemove: () => setActivity('All') }] : []),
    ...(loyalty !== 'All' ? [{ key: 'loyalty', label: loyalty, onRemove: () => setLoyalty('All') }] : []),
    ...(hubScope.canSwitchHubs && hubScope.filterHub !== 'All' ? [{ key: 'hub', label: hubScope.filterHub, onRemove: () => hubScope.setFilterHub('All') }] : []),
  ];
  const clearAll = () => {
    setSearch('');
    setActivity('All');
    setLoyalty('All');
    if (hubScope.canSwitchHubs) hubScope.setFilterHub('All');
  };

  const resultLabel = loading ? 'Loading customers…' : (
    <>
      {plural(rows.length, 'customer')}
      {data?.summaryUpdatedAt && (
        <>, summary updated <time dateTime={data.summaryUpdatedAt}>{formatDateTime(data.summaryUpdatedAt)}</time>{data.summaryStale && ', updates pending'}</>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      <KpiStrip
        loading={loading}
        label="Churn figures"
        cells={[
          { label: 'Off cadence', value: formatCount(all.length), detail: 'Buying later than usual', onClick: () => setActivity('All'), active: activity === 'All' },
          { label: 'At risk', value: formatCount(totals.atRisk), tone: totals.atRisk > 0 ? 'warning' : 'default', detail: 'Past their usual gap', onClick: () => setActivity(activity === 'At Risk' ? 'All' : 'At Risk'), active: activity === 'At Risk' },
          { label: 'Dormant', value: formatCount(totals.dormant), tone: totals.dormant > 0 ? 'danger' : 'default', detail: 'Over 3 times their usual gap', onClick: () => setActivity(activity === 'Dormant' ? 'All' : 'Dormant'), active: activity === 'Dormant' },
          { label: 'Lifetime value at stake', value: formatMoneyShort(totals.ltv), detail: 'Total spent by these customers' },
        ]}
      />

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, phone or location', label: 'Search customers' }}
        filters={(
          <>
            <LocationSelect scope={hubScope} />
            <FilterSelect
              ariaLabel="Risk"
              value={activity}
              onChange={(v) => setActivity(parseActivity(v))}
              className="h-9 w-auto min-w-36"
              options={[{ value: 'All', label: 'All activity' }, { value: 'At Risk', label: 'At risk' }, { value: 'Dormant', label: 'Dormant' }]}
            />
          </>
        )}
        more={(
          <MoreFilterField label="Loyalty">
            <FilterSelect
              ariaLabel="Loyalty"
              value={loyalty}
              onChange={setLoyalty}
              options={LOYALTY_OPTIONS.map((v) => ({ value: v, label: v === 'All' ? 'All loyalty' : v }))}
            />
          </MoreFilterField>
        )}
        moreActiveCount={loyalty !== 'All' ? 1 : 0}
        chips={chips}
        onClearAll={clearAll}
        resultLabel={resultLabel}
      />

      <DataTable
        label="Off-cadence customers"
        columns={churnColumns}
        rows={isError ? [] : rows}
        getRowId={(r) => r.id}
        loading={isFetching && !data}
        onRowClick={openRow}
        defaultSort={{ id: 'daysSince', dir: 'desc' }}
        resetPageKey={`${activity}|${loyalty}|${search}|${hubScope.filterHub}`}
        rowActions={(r) => {
          const phone = hasPhone(r.phone) ? r.phone : null;
          return (
            <>
              {phone && (
                <a href={whatsappHref(phone)} target="_blank" rel="noopener noreferrer" className={ROW_LINK} aria-label={`WhatsApp ${r.name}`}>
                  <MessageCircle aria-hidden /> WhatsApp
                </a>
              )}
              {!phone && <RowAction onClick={() => openRow(r)}>Open</RowAction>}
              <OverflowMenu
                size="sm"
                label={`More actions for ${r.name}`}
                items={[
                  { label: 'Record sale', icon: <ShoppingCart aria-hidden />, onSelect: () => router.push(recordSaleHref(r.id)), hidden: !canSell },
                  { label: 'Log feedback', icon: <MessageSquare aria-hidden />, onSelect: () => router.push(logFeedbackHref(r.id)), hidden: !canLog },
                ]}
              />
            </>
          );
        }}
        empty={isError ? (
          <EmptyState size="compact" title="Couldn’t load churn" description="Check your connection and try again." />
        ) : (
          <EmptyState
            size="compact"
            title="No off-cadence customers"
            description={chips.length > 0 ? 'Nobody matches these filters.' : 'Every customer is buying on their usual cadence.'}
            action={chips.length > 0 ? <button type="button" onClick={clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
          />
        )}
      />

      {openCustomerId && !openCustomer ? (
        <CustomerDrawer onClose={closeCustomer}>
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-lg font-semibold">Customer details</h2>
            <button type="button" onClick={closeCustomer} aria-label="Close customer details" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={18} aria-hidden />
            </button>
          </div>
          {openCustomerError && !openCustomerLoading ? (
            <p role="alert" className="p-6 text-sm text-destructive">Couldn’t load customer details. Close the drawer and try again.</p>
          ) : (
            <div className="space-y-6 p-6" role="status" aria-label="Loading customer details" aria-busy="true">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}
              </div>
              <Skeleton className="h-28 rounded-xl" />
            </div>
          )}
        </CustomerDrawer>
      ) : null}

      {openCustomer ? (
        <CustomerDetailPanel customer={openCustomer} onClose={closeCustomer} onUpdated={setOpenCustomerOverride} />
      ) : null}
    </div>
  );
}
