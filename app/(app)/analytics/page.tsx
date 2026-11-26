'use client';

import { Suspense } from 'react';
import { BarChart3, RotateCcw } from 'lucide-react';
import { useAnalyticsOverview } from '@/hooks/use-queries';
import { DEFAULT_PERIOD, useInsightScope } from '@/hooks/use-insights-api';
import { usePermissions } from '@/hooks/use-permissions';
import { useUrlState } from '@/hooks/use-url-state';
import { HAS_API } from '@/lib/require-api';
import { formatDate } from '@/lib/format';
import { periodRange, type Period } from '@/lib/period';
import { ENTITY_KINDS, type EntityKind } from '@/lib/insights';
import { AnalyticsPageSkeleton } from '@/components/ui/loading-skeletons';
import { AnalyticsCompareTab } from '@/components/analytics-compare-tab';
import { KitchenAnalyticsTab } from '@/components/kitchen-analytics-tab';
import {
  EmptyState, LocationSelect, PageHeader, PeriodSelect, SectionErrorBoundary, SectionTabs, useSectionTab, type SectionTab,
} from '@/components/app';
import { SalesTab } from './sales-tab';
import { ProductsTab } from './products-tab';
import { CustomersTab } from './customers-tab';
import { CreditTab } from './credit-tab';
import { ExploreTab } from './explore-tab';
import { InventoryTab } from './inventory-tab';
import { LocationsTab } from './locations-tab';
import { SuppliersTab } from './suppliers-tab';

type AnalyticsTab = 'sales' | 'products' | 'customers' | 'credit' | 'locations' | 'inventory' | 'suppliers' | 'kitchen' | 'compare' | 'explore';
const OVERVIEW_TABS: AnalyticsTab[] = ['sales', 'products', 'customers', 'credit'];

/** "1 Nov to 20 Nov 2026", or "All available data" for All time. */
function activeRange(p: Period): string {
  const { from, to } = periodRange(p);
  if (!from && !to) return 'All available data';
  const day = (s: string | null, year: boolean) => (s ? formatDate(`${s}T12:00:00Z`, { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) }) : '…');
  return from === to ? day(from, true) : `${day(from, false)} to ${day(to, true)}`;
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <Analytics />
    </Suspense>
  );
}

function Analytics() {
  const { can, user } = usePermissions();
  const { get } = useUrlState();
  const { hubScope, period, setPeriod, scope, prevScope, periodLabel } = useInsightScope();

  const tabDefs: SectionTab<AnalyticsTab>[] = [
    { id: 'sales', label: 'Sales' },
    { id: 'products', label: 'Products' },
    { id: 'customers', label: 'Customers' },
    { id: 'credit', label: 'Credit' },
    { id: 'locations', label: 'Locations', hidden: !hubScope.canSwitchHubs },
    { id: 'inventory', label: 'Inventory', hidden: !can('inventory.view') },
    { id: 'suppliers', label: 'Suppliers', hidden: !can('suppliers.view') },
    { id: 'kitchen', label: 'Kitchen', hidden: !can('kitchen.view') },
    { id: 'compare', label: 'Compare' },
    { id: 'explore', label: 'Explore' },
  ];
  const tab = useSectionTab(tabDefs, 'sales');

  const usesOverview = OVERVIEW_TABS.includes(tab);
  const overview = useAnalyticsOverview(scope, { enabled: HAS_API && usesOverview });
  // Previous equal-length period, for "vs previous" on Sales and Products. None for All time.
  const previous = useAnalyticsOverview(prevScope ?? undefined, { enabled: HAS_API && !!prevScope && (tab === 'sales' || tab === 'products') });

  const isDefaultPeriod = period.preset === DEFAULT_PERIOD;
  const compareKind = get('kind') as EntityKind | null;

  if (user && !can('analytics.view')) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <EmptyState icon={<BarChart3 />} title="No access to Analytics" description="Ask an admin for the View analytics and reports permission." />
      </div>
    );
  }

  const header = (
    <PageHeader
      title="Analytics"
      description="Trends in sales, products, customers, credit, stock and suppliers for the selected location and period."
      tabs={<SectionTabs tabs={tabDefs} defaultTab="sales" label="Analytics sections" />}
    />
  );

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <LocationSelect
        scope={hubScope}
        fixed={tab === 'locations' ? { label: hubScope.allLabel, reason: hubScope.allLabel === 'All locations' ? 'Locations compares every location, so it is not filtered by location.' : 'Locations compares each of your locations, so it is not filtered by location.' } : undefined}
      />
      <PeriodSelect value={period} onChange={setPeriod} />
      {/* The exact days, as the old "Active range" line showed them. */}
      <span className="text-xs text-muted-foreground tabular-nums">{activeRange(period)}</span>
      {!isDefaultPeriod && (
        <button
          type="button"
          onClick={() => setPeriod({ preset: DEFAULT_PERIOD })}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RotateCcw size={14} aria-hidden /> Reset
        </button>
      )}
    </div>
  );

  if (!HAS_API) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-5">
        {header}
        <EmptyState icon={<BarChart3 />} title="Analytics needs the API" description="Connect to the API to view analytics." />
      </div>
    );
  }

  const data = overview.data;
  const loadingOverview = usesOverview && (overview.isPending || !data);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {header}
      {filters}

      <SectionErrorBoundary resetKey={tab} label="This tab">
        {tab === 'locations' ? (
          <LocationsTab scope={scope} prevScope={prevScope} />
        ) : tab === 'inventory' ? (
          <InventoryTab scope={scope} />
        ) : tab === 'suppliers' ? (
          <SuppliersTab scope={scope} prevScope={prevScope} period={period} />
        ) : tab === 'kitchen' ? (
          <KitchenAnalyticsTab scope={scope} prevScope={prevScope} />
        ) : tab === 'compare' ? (
          <AnalyticsCompareTab
            scope={scope}
            periodLabel={periodLabel}
            initialKind={compareKind && ENTITY_KINDS.some((k) => k.key === compareKind) ? compareKind : undefined}
            initialA={get('a') ?? undefined}
            initialB={get('b') ?? undefined}
          />
        ) : tab === 'explore' ? (
          <ExploreTab scope={scope} periodLabel={periodLabel} />
        ) : overview.isError ? (
          <EmptyState title="Could not load analytics" description="Check your connection and try again." />
        ) : loadingOverview || !data ? (
          <AnalyticsPageSkeleton />
        ) : tab === 'sales' ? (
          <SalesTab data={data.sales} previous={previous.data?.sales} period={period} hasPrevious={!!prevScope} />
        ) : tab === 'products' ? (
          <ProductsTab data={data.products} previous={previous.data?.products} hasPrevious={!!prevScope} />
        ) : tab === 'customers' ? (
          <CustomersTab data={data.customers} period={period} />
        ) : (
          <CreditTab data={data.credit} period={period} />
        )}
      </SectionErrorBoundary>
    </div>
  );
}
