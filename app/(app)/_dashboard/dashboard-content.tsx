'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus, Plus, UserPlus } from 'lucide-react';
import { FilterBar, LocationSelect, OverflowMenu, PageHeader, SectionErrorBoundary } from '@/components/app';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { useUrlState } from '@/hooks/use-url-state';
import { useDashboardMetrics, useDashboardRevenueByCategory, useDashboardSalesSummary, useSalesSummary } from '@/hooks/use-queries';
import { formatDate } from '@/lib/format';
import { periodToParams } from '@/lib/period';
import { DASHBOARD_DEFAULT_PERIOD, DASHBOARD_PERIODS, dashboardWindow, parseDashboardPeriod } from './dashboard-period';
import { DashboardKpis } from './dashboard-kpis';
import { NeedsAttention } from './needs-attention';
import { SalesPanel } from './sales-panel';
import { CategoryPanel } from './category-panel';
import { TopCustomers } from './top-customers';
import { Segmented } from './panel';
import { useAttentionData } from './use-attention-data';

// Phones get these from the overflow menu instead, so no display class here.
const secondaryAction = 'h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted';

export function DashboardContent() {
  const router = useRouter();
  const { params, set } = useUrlState();
  const { can, isAdmin, user } = usePermissions();
  const scope = useHubScopeFilter();

  // One period and one location for every section.
  const periodId = parseDashboardPeriod(params);
  const w = dashboardWindow(periodId);
  const hubId = scope.hubIdForApi;
  const dates = { date_from: w.range.from ?? undefined, date_to: w.range.to ?? undefined };
  const apiScope = { ...dates, hub_id: hubId };

  const { data: metrics, isPending: metricsLoading } = useDashboardMetrics();
  const { data: salesSummary, isPending: summaryLoading } = useSalesSummary({ ...apiScope, exclude_voided: true });
  const { data: previousSummary } = useSalesSummary(
    w.previous ? { date_from: w.previous.from, date_to: w.previous.to, hub_id: hubId, exclude_voided: true } : undefined,
    { enabled: !!w.previous },
  );
  const { data: trend, isPending: trendLoading, isPlaceholderData: trendStale } = useDashboardSalesSummary(w.granularity, apiScope);
  const { data: categories, isPending: categoriesLoading } = useDashboardRevenueByCategory(w.categoryPeriod, apiScope);
  const attention = useAttentionData(metrics, hubId);

  const today = formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' });
  const where = scope.filterHub !== 'All' ? scope.filterHub : (user?.hubName ?? 'all locations');

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Dashboard"
        description={`${today}, ${where}`}
        actions={
          <>
            {can('interactions.create') && (
              <Link href="/engagement?tab=interactions&new=feedback" className="hidden h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex">
                <MessageSquarePlus size={16} aria-hidden /> Log feedback
              </Link>
            )}
            {can('customers.create') && (
              <Link href="/customers?new=1" className={`hidden sm:inline-flex ${secondaryAction}`}>
                <UserPlus size={16} aria-hidden /> Add customer
              </Link>
            )}
            {can('sales.create') && (
              <Link href="/sales?new=1" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:translate-y-px">
                <Plus size={16} aria-hidden /> Record sale
              </Link>
            )}
          </>
        }
        overflow={
          <OverflowMenu
            className="sm:hidden"
            items={[
              { label: 'Add customer', icon: <UserPlus aria-hidden />, onSelect: () => router.push('/customers?new=1'), hidden: !can('customers.create') },
              { label: 'Log feedback', icon: <MessageSquarePlus aria-hidden />, onSelect: () => router.push('/engagement?tab=interactions&new=feedback'), hidden: !can('interactions.create') },
            ]}
          />
        }
      />

      <FilterBar
        filters={
          <>
            <Segmented
              label="Period"
              value={periodId}
              onChange={(id) => set(periodToParams({ preset: id }, DASHBOARD_DEFAULT_PERIOD))}
              options={DASHBOARD_PERIODS}
            />
            <LocationSelect scope={scope} />
          </>
        }
      />

      <SectionErrorBoundary label="Key figures">
        <DashboardKpis
          window={w}
          summary={salesSummary}
          previous={previousSummary}
          attention={attention}
          loading={summaryLoading || attention.creditsLoading || attention.stockLoading}
        />
      </SectionErrorBoundary>

      <SectionErrorBoundary label="Needs attention">
        <NeedsAttention data={attention} ticketsLoading={metricsLoading} />
      </SectionErrorBoundary>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionErrorBoundary label="Sales">
          <SalesPanel
            className="lg:col-span-2"
            summary={trend}
            loading={trendLoading}
            refreshing={trendStale}
            periodLabel={w.label}
            showProfit={isAdmin}
          />
        </SectionErrorBoundary>
        <SectionErrorBoundary label="Revenue by category">
          <CategoryPanel data={categories} loading={categoriesLoading} periodLabel={w.label} />
        </SectionErrorBoundary>
      </div>

      <SectionErrorBoundary label="Top customers">
        <TopCustomers customers={metrics?.customers ?? []} loading={metricsLoading} hub={scope.filterHub} />
      </SectionErrorBoundary>
    </div>
  );
}
