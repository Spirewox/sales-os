'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { useUrlState } from '@/hooks/use-url-state';
import type { InsightScopeParams } from '@/hooks/use-insights-api';
import { useSavedReports } from '@/hooks/use-reports';
import { resolveReportParam, visibleReports } from '@/lib/reports';
import { Seg } from './analytics-ui';
import { ExploreAsk } from './explore-ask';
import { ReportLibrary } from './report-library';
import { ReportBuilder, type ReportSeed } from './report-builder';
import { ReportViewer, SavedReportViewer } from './report-viewer';

type View = 'reports' | 'ask';
const VIEWS: [View, string][] = [['reports', 'Reports'], ['ask', 'Ask']];
const VIEW_HINT: Record<View, string> = {
  reports: 'Open a ready-made report, or build one of your own.',
  ask: 'Ask in plain words and get a chart, a list of records or a comparison.',
};

/**
 * Analytics → Reports, which also holds what was the Explore tab. Its views are the report library
 * and Ask (`?mode=ask`). A report opens with `?report=<key>` or `saved:<id>`, and the
 * builder with `?report=new` or `edit:<id>`, all for the page's period and location.
 */
export function ReportsTab({ scope, rangeLabel, locationLabel }: Readonly<{ scope: InsightScopeParams; rangeLabel: string; locationLabel: string }>) {
  const { can } = usePermissions();
  const { get, set, params } = useUrlState();
  const saved = useSavedReports();
  const param = get('report');
  const resolved = resolveReportParam(param, can, saved.data ?? []);
  const denied = resolved.kind === 'denied';

  // A shared link to a report this person may not open: say so and show the library.
  useEffect(() => {
    if (!denied) return;
    toast.error("You don't have access to that report.");
    set({ report: null });
  }, [denied, set]);

  // Links keep the page's period and location; only the report changes.
  const hrefFor = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', 'reports');
    next.set('report', value);
    return `/analytics?${next.toString()}`;
  };
  const back = () => set({ report: null });
  const meta = { rangeLabel, locationLabel };
  const rawMode = get('mode');
  const view: View = rawMode === 'ask' ? 'ask' : 'reports';
  // Ask's "build on this" opens a new report seeded with the question's data.
  const [seed, setSeed] = useState<{ key: number; value: ReportSeed } | null>(null);

  const home = (library: React.ReactNode) => (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{VIEW_HINT[view]}</p>
        <Seg label="Reports view" value={view} onChange={(v) => set({ mode: v === 'reports' ? null : v, ask: null })} options={VIEWS} />
      </div>
      {view === 'reports' && library}
      {view === 'ask' && (
        <ExploreAsk
          scope={scope}
          initialQ={get('ask') ?? undefined}
          onRefine={(q) => {
            setSeed((prev) => ({ key: (prev?.key ?? 0) + 1, value: { dataset: q.dataset, groupBy: q.groupBy, measures: [q.measure], filters: q.filters } }));
            set({ mode: null, ask: null, report: 'new' });
          }}
        />
      )}
    </div>
  );

  // A saved report's link waits for the saved list before falling back to the library.
  if ((param?.startsWith('saved:') || param?.startsWith('edit:')) && saved.isPending) return home(<ReportLibrary reports={visibleReports(can)} saved={[]} savedLoading hrefFor={hrefFor} />);
  if (resolved.kind === 'builtin') return <ReportViewer key={resolved.def.key} def={resolved.def} scope={scope} meta={meta} onBack={back} />;
  if (resolved.kind === 'saved') return <SavedReportViewer key={resolved.report.id} report={resolved.report} scope={scope} meta={meta} onBack={back} onEdit={() => set({ report: `edit:${resolved.report.id}` })} />;
  if (resolved.kind === 'new' || resolved.kind === 'edit') {
    const initial = resolved.kind === 'edit' ? resolved.report : undefined;
    return (
      <ReportBuilder
        key={initial?.id ?? `new-${seed?.key ?? 0}`}
        scope={scope}
        meta={meta}
        initial={initial}
        seed={initial ? undefined : seed?.value}
        onBack={() => { setSeed(null); set({ report: initial ? `saved:${initial.id}` : null }); }}
        onSaved={(r) => { setSeed(null); set({ report: `saved:${r.id}` }); }}
      />
    );
  }
  return home(<ReportLibrary reports={visibleReports(can)} saved={saved.data ?? []} savedLoading={saved.isPending && !saved.isError} savedError={saved.isError} onRetrySaved={() => void saved.refetch()} hrefFor={hrefFor} />);
}
