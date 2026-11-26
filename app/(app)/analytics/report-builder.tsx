'use client';

import { useId, useMemo, useState } from 'react';
import { ArrowLeft, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog, EmptyState } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';
import type { InsightScopeParams } from '@/hooks/use-insights-api';
import { useCustomReport } from '@/hooks/use-reports';
import { DATASETS, type Filter } from '@/lib/explore';
import { MAX_REPORT_COLUMNS, customReportName, reportDraftError, savedReportMeasures, type SavedReport } from '@/lib/reports';
import { CustomReportResults } from './custom-report';
import { ExploreFilters } from './explore-build';
import { CHART_KINDS, type ChartKind } from './explore-shared';
import { SaveReportDialog } from './save-report-dialog';

type Meta = { rangeLabel: string; locationLabel: string };

/**
 * Build a report of your own: pick the data, how to break it down, up to eight columns, filters and a
 * chart, with a live preview for the period and location in scope. With `initial`, it edits that report.
 */
export function ReportBuilder({ scope, meta, initial, onBack, onSaved }: Readonly<{
  scope: InsightScopeParams; meta: Meta; initial?: SavedReport; onBack: () => void; onSaved: (report: SavedReport) => void;
}>) {
  const ids = { data: useId(), group: useId(), chart: useId(), cols: useId() };
  const [dataset, setDataset] = useState(initial?.dataset ?? 'sales');
  const ds = useMemo(() => DATASETS.find((d) => d.key === dataset) ?? DATASETS[0], [dataset]);
  const [groupBy, setGroupBy] = useState(initial?.groupBy ?? ds.fields.find((f) => f.key === 'Location')?.key ?? ds.fields[0].key);
  const [measures, setMeasures] = useState<string[]>(initial ? savedReportMeasures(initial) : ds.measures.slice(0, 2).map((m) => m.key));
  const [filters, setFilters] = useState<Filter[]>(initial?.filters ?? []);
  const [chart, setChart] = useState<ChartKind>(initial?.chart ?? 'column');
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const draft = { dataset, groupBy, measures, filters, chart };
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial
    ? { dataset: initial.dataset, groupBy: initial.groupBy, measures: savedReportMeasures(initial), filters: initial.filters, chart: initial.chart }
    : { dataset: 'sales', groupBy: DATASETS[0].fields.find((f) => f.key === 'Location')?.key ?? DATASETS[0].fields[0].key, measures: DATASETS[0].measures.slice(0, 2).map((m) => m.key), filters: [], chart: 'column' });
  const problem = reportDraftError(draft);
  const report = useCustomReport({ dataset, groupBy, filters, measures }, scope, { enabled: !problem });

  // New data: start again from its first breakdown and column.
  const pickDataset = (key: string) => {
    const next = DATASETS.find((d) => d.key === key) ?? DATASETS[0];
    setDataset(next.key);
    setGroupBy(next.fields[0].key);
    setMeasures([next.measures[0].key]);
    setFilters([]);
  };
  const toggle = (key: string, on: boolean) => setMeasures((list) => (on ? [...list, key] : list.filter((m) => m !== key)));
  const back = () => (dirty ? setLeaving(true) : onBack());

  const labels = measures.map((m) => ds.measures.find((x) => x.key === m)?.label ?? m);
  const groupLabel = ds.fields.find((f) => f.key === groupBy)?.label ?? '';
  const title = initial ? `Edit ${initial.name}` : 'New report';

  const controls = (
    <section aria-label="Report settings" className="space-y-4 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <label htmlFor={ids.data} className="text-xs text-muted-foreground">Data</label>
        <FilterSelect id={ids.data} value={dataset} onChange={pickDataset} options={DATASETS.map((d) => ({ value: d.key, label: d.label }))} />
        <p className="text-xs text-muted-foreground">{ds.desc}</p>
      </div>
      <div className="space-y-1">
        <label htmlFor={ids.group} className="text-xs text-muted-foreground">One row per</label>
        <FilterSelect id={ids.group} value={groupBy} onChange={setGroupBy} options={ds.fields.map((f) => ({ value: f.key, label: f.label }))} />
      </div>
      <fieldset className="space-y-1" aria-describedby={ids.cols}>
        <legend className="text-xs text-muted-foreground">Columns</legend>
        <p id={ids.cols} className={problem ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
          {problem ?? `Up to ${MAX_REPORT_COLUMNS}, in the order you pick them. The first one is charted.`}
        </p>
        <div className="grid grid-cols-1 gap-0.5 pt-1">
          {ds.measures.map((m) => {
            const on = measures.includes(m.key);
            const full = !on && measures.length >= MAX_REPORT_COLUMNS;
            return (
              <label key={m.key} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted has-data-disabled:cursor-not-allowed has-data-disabled:text-muted-foreground">
                <Checkbox aria-label={m.label} checked={on} disabled={full} onCheckedChange={(v) => toggle(m.key, v === true)} />
                <span className="min-w-0 flex-1">{m.label}</span>
                {on && <span className="text-xs text-muted-foreground tabular-nums">{measures.indexOf(m.key) + 1}</span>}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="space-y-1">
        <label htmlFor={ids.chart} className="text-xs text-muted-foreground">Show as</label>
        <FilterSelect id={ids.chart} value={chart} onChange={(v) => setChart(v as ChartKind)} options={CHART_KINDS.map(([value, label]) => ({ value, label }))} />
      </div>
      <ExploreFilters dataset={dataset} groupBy={groupBy} filters={filters} onChange={setFilters} scope={scope} idPrefix="report" />
    </section>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={back}><ArrowLeft aria-hidden /> Back to reports</Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground tabular-nums">Preview for {meta.rangeLabel} · {meta.locationLabel}</p>
          </div>
          <Button onClick={() => setSaving(true)} disabled={!!problem}>{initial ? 'Save changes' : 'Save report'}</Button>
        </div>
      </div>

      {/* Settings first on a phone, beside the preview from lg up. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <div className="min-w-0">{controls}</div>
        <div className="min-w-0 lg:col-span-2">{problem
          ? <EmptyState icon={<Columns3 />} title="Pick a column" description="The report shows the columns you pick, one row per group." />
          : <CustomReportResults report={report} dataset={dataset} groupBy={groupBy} measures={measures} chart={chart} title={initial?.name ?? customReportName(labels, groupLabel)} />}</div>
      </div>

      {saving && (
        <SaveReportDialog
          query={{ dataset, measure: measures[0], measures, groupBy, filters, chart }}
          defaultName={customReportName(labels, groupLabel)}
          existing={initial}
          successMessage={initial ? 'Changes saved.' : 'Report saved.'}
          onSaved={onSaved}
          onClose={() => setSaving(false)}
        />
      )}
      {leaving && (
        <ConfirmDialog
          title="Leave without saving?"
          message={initial ? 'Your changes to this report will be lost.' : 'This report has not been saved.'}
          confirmLabel="Leave"
          onCancel={() => setLeaving(false)}
          onConfirm={onBack}
        />
      )}
    </div>
  );
}
