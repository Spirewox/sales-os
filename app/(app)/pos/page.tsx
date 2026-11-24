'use client';

import { Suspense, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { OverflowMenu, PageHeader, SectionErrorBoundary, SectionTabs, useSectionTab, type SectionTab } from '@/components/app';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { useDataScope } from '@/hooks/use-data-scope';
import { useUrlState } from '@/hooks/use-url-state';
import { RegisterTillSheet } from '@/components/till-registration';
import type { PosLocation } from '@/hooks/use-pos-overview';
import { TAB_FILTER_KEYS } from './use-pos-filters';
import type { PosTab } from './pos-utils';
import { OverviewTab } from './overview';
import { TransactionsTab } from './transactions';
import { TillsTab } from './tills';
import { ShiftsTab, ReviewsTab } from './shifts-reviews';
import { ReconciliationTab } from './reconciliation';

const TABS: SectionTab<PosTab>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'tills', label: 'Tills' },
  { id: 'shifts', label: 'Shifts' },
  { id: 'reviews', label: 'Payment review' },
];

export default function PosPage() {
  const { can } = usePermissions();
  // The workspace only mounts after authorization, so forbidden users issue no POS queries.
  if (!can('pos.view'))
    return (
      <div role="alert" className="rounded-xl border bg-card p-6">
        <h1 className="text-xl font-semibold">POS access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your role does not have permission to view tills and POS metrics.</p>
      </div>
    );
  return <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Loading POS…</p>}><PosWorkspace /></Suspense>;
}

function PosWorkspace() {
  const { can } = usePermissions();
  const { isAssignedScoped } = useDataScope();
  const { params, set } = useUrlState();
  const scope = useHubScopeFilter();
  const qc = useQueryClient();
  const tabs: SectionTab<PosTab>[] = [...TABS, { id: 'reconciliation', label: 'Reconciliation', hidden: isAssignedScoped }];
  const tab = useSectionTab(tabs, 'overview');
  const [registering, setRegistering] = useState(false);
  const canRegister = can('pos.manage_tills');

  // Tab filters (status, till, search…) mean different things per tab, so a tab starts clean.
  const changeTab = (next: PosTab) => set({ ...Object.fromEntries(TAB_FILTER_KEYS.map((k) => [k, null])), tab: next === 'overview' ? null : next });
  const tabHref = (next: string) => {
    const q = new URLSearchParams(params.toString());
    TAB_FILTER_KEYS.forEach((k) => q.delete(k));
    q.set('tab', next);
    return `/pos?${q}`;
  };
  const viewTills = (location: PosLocation) => {
    scope.setFilterHub(location.name);
    changeTab('tills');
  };
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['pos-overview'] });
    void qc.invalidateQueries({ queryKey: ['pos-operations'] });
    void qc.invalidateQueries({ queryKey: ['pos-reconciliation'] });
    void qc.invalidateQueries({ queryKey: ['hubs'] });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="POS"
        description="Till operations and recorded sales across your locations."
        actions={tab === 'tills' && canRegister ? (
          <button type="button" onClick={() => setRegistering(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus size={16} aria-hidden />
            Register till
          </button>
        ) : undefined}
        overflow={<OverflowMenu items={[{ label: 'Refresh', icon: <RefreshCw />, onSelect: refresh }]} />}
        tabs={<SectionTabs label="POS sections" tabs={tabs} value={tab} onChange={changeTab} />}
      />

      <SectionErrorBoundary label={tabs.find((t) => t.id === tab)?.label} resetKey={tab}>
        {tab === 'overview' && <OverviewTab onViewTills={viewTills} tabHref={tabHref} />}
        {tab === 'transactions' && <TransactionsTab />}
        {tab === 'tills' && <TillsTab onRegister={canRegister ? () => setRegistering(true) : undefined} />}
        {tab === 'shifts' && <ShiftsTab />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'reconciliation' && <ReconciliationTab scope={scope} canViewInventory={can('inventory.view')} />}
      </SectionErrorBoundary>

      {registering && (
        <RegisterTillSheet
          locations={scope.activeHubs.map((h) => ({ id: h.id, name: h.name }))}
          defaultHubId={scope.hubIdForApi}
          onClose={() => setRegistering(false)}
        />
      )}
    </div>
  );
}
