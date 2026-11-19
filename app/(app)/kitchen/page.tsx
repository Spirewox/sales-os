'use client';

import { Suspense, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChefHat, Monitor, Plus, Zap } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { HubScopeSelect } from '@/components/hub-scope-filter';
import { useKitchenSettings } from '@/hooks/use-kitchen';
import { cn } from '@/lib/utils';
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
        <h1 className="text-xl font-bold">Kitchen access required</h1>
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
  const params = useSearchParams();
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can('kitchen.manage_jobs');
  const canCosts = can('kitchen.view_costs');
  const hubScope = useHubScopeFilter();

  const sections: { id: Section; label: string }[] = [
    { id: 'board', label: 'Board' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'recipes', label: 'Recipes' },
    ...(canCosts ? [{ id: 'ingredients' as const, label: 'Ingredients' }] : []),
    { id: 'guide', label: 'Yield guide' },
    { id: 'settings', label: 'Settings' },
  ];
  const requested = (params.get('tab') as Section) || 'board';
  const section = sections.some((s) => s.id === requested) ? requested : 'board';
  const openJobId = params.get('job');
  const display = params.get('display') === '1';

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const s = next.toString();
      router.replace(s ? `?${s}` : '?', { scroll: false });
    },
    [params, router],
  );

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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ChefHat className="text-primary" size={24} /> Kitchen
          </h1>
          <p className="text-sm text-muted-foreground">Take orders, price jobs from their true cost, and run the board.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {section === 'board' && (
            <button type="button" className={btnSecondary} onClick={() => setParams({ display: '1' })}>
              <Monitor size={14} /> Kitchen display
            </button>
          )}
          {canManage && (
            <>
              <button type="button" className={btnSecondary} onClick={() => setForm({ mode: 'quick' })}>
                <Zap size={14} /> Quick order
              </button>
              <button type="button" className={cn(btnPrimary, 'h-10 px-4')} onClick={() => setForm({ mode: 'new' })}>
                <Plus size={16} /> New job
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b pb-2 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Kitchen sections" className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={section === s.id ? 'page' : undefined}
              className={cn('rounded-md px-3 py-2 text-sm font-medium', section === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              onClick={() => setParams({ tab: s.id === 'board' ? null : s.id })}
            >
              {s.label}
            </button>
          ))}
        </nav>
        {['board', 'jobs'].includes(section) && <HubScopeSelect scope={hubScope} />}
      </div>

      {section === 'board' && (
        <KitchenBoard hubId={hubScope.hubIdForApi} dueSoonMinutes={dueSoonMinutes} ackMinutes={ackMinutes} canManage={canManage} onOpenJob={openJob} />
      )}
      {section === 'jobs' && <KitchenJobs hubId={hubScope.hubIdForApi} dueSoonMinutes={dueSoonMinutes} canCosts={canCosts} onOpenJob={openJob} />}
      {section === 'recipes' && <KitchenRecipes onShowIngredients={(filter) => setParams({ tab: 'ingredients', filter })} />}
      {section === 'ingredients' && canCosts && <KitchenIngredients key={params.get('filter') ?? ''} initialFilter={(params.get('filter') as 'no_price' | 'stale' | null) ?? ''} />}
      {section === 'guide' && <YieldGuide />}
      {section === 'settings' && <KitchenSettingsSection hubScope={hubScope} />}

      {panel}
      {formModal}
    </div>
  );
}
