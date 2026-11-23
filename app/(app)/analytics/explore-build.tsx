'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { useExploreFieldValues, useExploreQuery, type InsightScopeParams } from '@/hooks/use-insights-api';
import { DATASETS, type Filter, type QueryResult } from '@/lib/explore';
import { cn } from '@/lib/utils';
import { InsightButton } from '@/components/insight-button';
import { KpiStrip } from '@/components/app';
import { Panel } from './analytics-ui';
import { CHART_KINDS, Pending, ResultChart, TwoPane, fmtShort, selectClass, type ChartKind } from './explore-shared';
import type { SeedQuery } from './explore-ask';

type ExploreApiResult = QueryResult & { measureLabel: string; groupLabel: string; measureKind: 'money' | 'number' };

export function ExploreBuild({ scope, seed }: Readonly<{ scope: InsightScopeParams; seed: SeedQuery | null }>) {
  const [dsKey, setDsKey] = useState(seed?.dataset || 'sales');
  const ds = useMemo(() => DATASETS.find((d) => d.key === dsKey) ?? DATASETS[0], [dsKey]);
  const [measure, setMeasure] = useState(seed?.measure || ds.measures[0].key);
  const [groupBy, setGroupBy] = useState(seed?.groupBy || ds.fields[0].key);
  const [filters, setFilters] = useState<Filter[]>(seed?.filters || []);
  const [chart, setChart] = useState<ChartKind>('column');
  const [result, setResult] = useState<ExploreApiResult | null>(null);
  const exploreMut = useExploreQuery();

  // New dataset: start again from its first measure and field.
  const pickDataset = (key: string) => {
    const next = DATASETS.find((d) => d.key === key) ?? DATASETS[0];
    setDsKey(next.key);
    setMeasure(next.measures[0].key);
    setGroupBy(next.fields[0].key);
    setFilters([]);
  };

  // Re-run shortly after the query changes.
  useEffect(() => {
    const t = setTimeout(() => {
      exploreMut.mutate({ dataset: dsKey, measure, groupBy, filters, ...scope }, { onSuccess: (data) => setResult(data) });
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsKey, measure, groupBy, filters, scope]);

  const measureLabel = result?.measureLabel || ds.measures.find((m) => m.key === measure)?.label || '';
  const groupLabel = result?.groupLabel || ds.fields.find((f) => f.key === groupBy)?.label || '';
  const measureKind = result?.measureKind || (ds.measures.find((m) => m.key === measure)?.kind ?? 'number');
  const top = result?.rows[0];

  const addFilter = () => {
    const used = new Set(filters.map((f) => f.field));
    const next = ds.fields.find((f) => !used.has(f.key) && f.key !== groupBy) || ds.fields[0];
    setFilters([...filters, { field: next.key, multi: !!next.multi, values: [] }]);
  };
  const updateFilter = (idx: number, patch: Partial<Filter>) => setFilters(filters.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const removeFilter = (idx: number) => setFilters(filters.filter((_, i) => i !== idx));

  const controls = (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <label htmlFor="explore-dataset" className="text-xs text-muted-foreground">Data</label>
        <select id="explore-dataset" value={dsKey} onChange={(e) => pickDataset(e.target.value)} className={selectClass}>
          {DATASETS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <p className="text-xs text-muted-foreground">{ds.desc}</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="explore-measure" className="text-xs text-muted-foreground">Measure</label>
        <select id="explore-measure" value={measure} onChange={(e) => setMeasure(e.target.value)} className={selectClass}>
          {ds.measures.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="explore-group" className="text-xs text-muted-foreground">Break down by</label>
        <select id="explore-group" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={selectClass}>
          {ds.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="explore-chart" className="text-xs text-muted-foreground">Show as</label>
        <select id="explore-chart" value={chart} onChange={(e) => setChart(e.target.value as ChartKind)} className={selectClass}>
          {CHART_KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>

      <div className="space-y-2 border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground">Filters</p>
        {filters.map((f, idx) => {
          const fDef = ds.fields.find((x) => x.key === f.field);
          if (!fDef) return null;
          const id = `explore-filter-${idx}`;
          return (
            <div key={idx} className="space-y-2 rounded-md border bg-muted/40 p-2.5">
              <div className="flex items-center gap-2">
                <label htmlFor={id} className="sr-only">Filter field</label>
                <select
                  id={id}
                  value={f.field}
                  onChange={(e) => { const nd = ds.fields.find((x) => x.key === e.target.value)!; updateFilter(idx, { field: nd.key, multi: !!nd.multi, values: [] }); }}
                  className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs font-medium"
                >
                  {ds.fields.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                </select>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{f.values.length ? `${f.values.length} chosen` : 'Any'}</span>
                <button type="button" aria-label={`Remove ${fDef.label} filter`} onClick={() => removeFilter(idx)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"><X size={14} aria-hidden /></button>
              </div>
              <FilterValues dataset={dsKey} field={f.field} label={fDef.label} selected={f.values} scope={scope} onChange={(values) => updateFilter(idx, { values })} />
            </div>
          );
        })}
        <button type="button" onClick={addFilter} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          <Plus size={14} aria-hidden /> Add filter
        </button>
      </div>
    </section>
  );

  let results;
  if (exploreMut.isPending && !result) results = <Pending text="Running the query…" />;
  else if (exploreMut.isError && !exploreMut.isPending && !result) results = <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">The query failed. Try other filters.</p>;
  else if (!result) results = <Pending text="Preparing…" />;
  else results = (
    <>
      <KpiStrip
        label="Query summary"
        cells={[
          { label: `Total ${measureLabel.toLowerCase()}`, value: fmtShort(result.total, measureKind) },
          { label: `${groupLabel} groups`, value: result.rows.length },
          { label: `Top ${groupLabel.toLowerCase()}`, value: top ? top.label : '-', detail: top ? `${fmtShort(top.value, measureKind)}${result.total > 0 ? `, ${Math.round((top.value / result.total) * 100)}%` : ''}` : undefined },
        ]}
      />
      <div className="relative">
        {exploreMut.isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/50">
            <Loader2 className="animate-spin text-muted-foreground" size={20} aria-label="Updating" />
          </div>
        )}
        <Panel
          title={`${measureLabel} by ${groupLabel}`}
          control={<InsightButton title={`${measureLabel} by ${groupLabel}`} kind={measureKind} time={!!ds.fields.find((f) => f.key === groupBy)?.time} series={result.rows.map((r) => ({ label: r.label, value: r.value }))} />}
        >
          <ResultChart rows={result.rows} chart={chart} measureLabel={measureLabel} measureKind={measureKind} groupLabel={groupLabel} />
        </Panel>
      </div>
    </>
  );

  return <TwoPane controls={controls} results={results} />;
}

function FilterValues({ dataset, field, label, selected, onChange, scope }: Readonly<{ dataset: string; field: string; label: string; selected: string[]; onChange: (values: string[]) => void; scope: InsightScopeParams }>) {
  const { data: values = [], isLoading, isFetching } = useExploreFieldValues(true, { dataset, field, ...scope });
  if (isLoading || isFetching) {
    return <p className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" aria-hidden /> Loading values…</p>;
  }
  if (values.length === 0) return <p className="text-xs text-muted-foreground">No values in this period</p>;
  return (
    <div role="group" aria-label={`${label} values`} className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
      {values.map((v) => {
        const on = selected.includes(v);
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((x) => x !== v) : [...selected, v])}
            className={cn('rounded-full border px-2 py-0.5 text-xs font-medium transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground')}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}
