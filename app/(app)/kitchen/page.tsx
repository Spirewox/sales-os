'use client';

import { Suspense, useState } from 'react';
import { Plus, Zap } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { useUrlState } from '@/hooks/use-url-state';
import { useKitchenSettings } from '@/hooks/use-kitchen';
import { PageHeader, SectionErrorBoundary, SectionTabs, useSectionTab, type SectionTab } from '@/components/app';
import { btnPrimary, btnSecondary } from './kitchen-ui';
import { KitchenBoard } from './board';
import { KitchenJobs } from './jobs';
import { JobPanel } from './job-panel';
import { JobForm, type JobFormMode } from './job-form';
import { KitchenRecipes } from './recipes';
import { KitchenIngredients } from './ingredients';
import { YieldGuide } from './yield-guide';
import { KitchenSettingsSection } from './settings';

type Section = 'board' | 'jobs' | 'recipes' | 'ingredients' | 'guide' | 'settings';

export default function KitchenPage() {
  const { can } = usePermissions();
  // The workspace only mounts after authorization, so forbidden users issue no kitchen queries.
  if (!can('kitchen.view')) {
    return (
      <div role="alert" className="rounded-xl border p-6">
        <h1 className="text-xl font-semibold">Kitchen access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your role does not have permission to view the kitchen board and jobs. Ask an admin to grant kitchen access.</p>
      </div>
    );
  }
  return (
    <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Loading kitchen…</p>}>
      <KitchenWorkspace />
    </Suspense>
  );
}

function KitchenWorkspace() {
  const { get, set: setParams } = useUrlState();
  const { can } = usePermissions();
  const canManage = can('kitchen.manage_jobs');
  const canCosts = can('kitchen.view_costs');
  const hubScope = useHubScopeFilter();

  const sections: SectionTab<Section>[] = [
    { id: 'board', label: 'Board' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'recipes', label: 'Recipes' },
    { id: 'ingredients', label: 'Ingredients', hidden: !canCosts },
    { id: 'guide', label: 'Yield guide' },
    { id: 'settings', label: 'Settings' },
  ];
  const section = useSectionTab(sections, 'board');
  const openJobId = get('job');
  const display = get('display') === '1';

  const settings = useKitchenSettings(hubScope.hubIdForApi);
  const dueSoonMinutes = settings.data?.defaults.due_soon_minutes ?? 120;
  const ackMinutes = settings.data?.defaults.ack_minutes ?? 10;

  const [form, setForm] = useState<{ mode: JobFormMode; jobId?: string } | null>(null);
  const openJob = (id: string | null) => setParams({ job: id });

  const panel = openJobId && (
    <JobPanel
      jobId={openJobId}
      dueSoonMinutes={dueSoonMinutes}
      onClose={() => openJob(null)}
      onEdit={(id) => setForm({ mode: 'edit', jobId: id })}
      onOpenJob={openJob}
      onShowIngredients={(filter) => setParams({ tab: 'ingredients', filter, job: null, display: null })}
    />
  );
  const formModal = form && (
    <JobForm
      mode={form.mode}
      jobId={form.jobId}
      hubScope={hubScope}
      onClose={() => setForm(null)}
      onSaved={(id) => {
        setForm(null);
        openJob(id);
      }}
    />
  );

  if (display) {
    return (
      <>
        <KitchenBoard
          hubId={hubScope.hubIdForApi}
          dueSoonMinutes={dueSoonMinutes}
          ackMinutes={ackMinutes}
          canManage={canManage}
          onOpenJob={openJob}
          displayMode
          onExitDisplay={() => setParams({ display: null })}
        />
        {panel}
        {formModal}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kitchen"
        description="Take orders, price jobs from their true cost, and run the board."
        actions={
          canManage && (
            <>
              <button type="button" className={btnSecondary} onClick={() => setForm({ mode: 'quick' })}>
                <Zap size={16} aria-hidden /> Quick order
              </button>
              <button type="button" className={btnPrimary} onClick={() => setForm({ mode: 'new' })}>
                <Plus size={16} aria-hidden /> New job
              </button>
            </>
          )
        }
        tabs={<SectionTabs label="Kitchen sections" tabs={sections} defaultTab="board" />}
      />

      <SectionErrorBoundary label="Kitchen" resetKey={section}>
        {section === 'board' && (
          <KitchenBoard
            hubId={hubScope.hubIdForApi}
            hubScope={hubScope}
            dueSoonMinutes={dueSoonMinutes}
            ackMinutes={ackMinutes}
            canManage={canManage}
            onOpenJob={openJob}
            onEnterDisplay={() => setParams({ display: '1' })}
          />
        )}
        {section === 'jobs' && <KitchenJobs hubId={hubScope.hubIdForApi} hubScope={hubScope} dueSoonMinutes={dueSoonMinutes} canCosts={canCosts} onOpenJob={openJob} />}
        {section === 'recipes' && <KitchenRecipes onShowIngredients={(filter) => setParams({ tab: 'ingredients', filter })} />}
        {section === 'ingredients' && canCosts && <KitchenIngredients key={get('filter') ?? ''} initialFilter={(get('filter') as 'no_price' | 'stale' | null) ?? ''} />}
        {section === 'guide' && <YieldGuide />}
        {section === 'settings' && <KitchenSettingsSection hubScope={hubScope} />}
      </SectionErrorBoundary>

      {panel}
      {formModal}
    </div>
  );
}
