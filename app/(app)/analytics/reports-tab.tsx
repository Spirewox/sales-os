'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { useUrlState } from '@/hooks/use-url-state';
import type { InsightScopeParams } from '@/hooks/use-insights-api';
import { useSavedReports } from '@/hooks/use-reports';
import { resolveReportParam, visibleReports } from '@/lib/reports';
import { ReportLibrary } from './report-library';
import { ReportViewer, SavedReportViewer } from './report-viewer';

/**
 * Analytics → Reports: the library of ready-made and saved reports, or one report open
 * (`?report=<key>` or `?report=saved:<id>`), for the page's period and location.
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

  // A saved report's link waits for the saved list before falling back to the library.
  if (param?.startsWith('saved:') && saved.isPending) return <ReportLibrary reports={visibleReports(can)} saved={[]} savedLoading hrefFor={hrefFor} />;
  if (resolved.kind === 'builtin') return <ReportViewer key={resolved.def.key} def={resolved.def} scope={scope} meta={meta} onBack={back} />;
  if (resolved.kind === 'saved') return <SavedReportViewer key={resolved.report.id} report={resolved.report} scope={scope} meta={meta} onBack={back} />;
  return <ReportLibrary reports={visibleReports(can)} saved={saved.data ?? []} savedLoading={saved.isPending && !saved.isError} savedError={saved.isError} onRetrySaved={() => void saved.refetch()} hrefFor={hrefFor} />;
}
