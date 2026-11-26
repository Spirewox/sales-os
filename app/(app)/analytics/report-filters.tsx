'use client';

import { Loader2, Plus, X } from 'lucide-react';
import { FilterSelect } from '@/components/filter-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useExploreFieldValues, type InsightScopeParams } from '@/hooks/use-insights-api';
import { DATASETS, type Filter } from '@/lib/explore';

/** A report's filters: one field and its chosen values per filter, and Add filter. */
export function ReportFilters({ dataset, groupBy, filters, onChange, scope }: Readonly<{
  dataset: string; groupBy: string; filters: Filter[]; onChange: (filters: Filter[]) => void; scope: InsightScopeParams;
}>) {
  const ds = DATASETS.find((d) => d.key === dataset) ?? DATASETS[0];
  const addFilter = () => {
    const used = new Set(filters.map((f) => f.field));
    const next = ds.fields.find((f) => !used.has(f.key) && f.key !== groupBy) || ds.fields[0];
    onChange([...filters, { field: next.key, multi: !!next.multi, values: [] }]);
  };
  const updateFilter = (idx: number, patch: Partial<Filter>) => onChange(filters.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const removeFilter = (idx: number) => onChange(filters.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2 border-t pt-4">
      <p className="text-xs font-medium text-muted-foreground">Filters</p>
      {filters.map((f, idx) => {
        const fDef = ds.fields.find((x) => x.key === f.field);
        if (!fDef) return null;
        return (
          <div key={idx} className="space-y-2 rounded-md border bg-muted/40 p-2.5">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <FilterSelect
                  ariaLabel={`Filter ${idx + 1} field`}
                  value={f.field}
                  onChange={(key) => { const nd = ds.fields.find((x) => x.key === key)!; updateFilter(idx, { field: nd.key, multi: !!nd.multi, values: [] }); }}
                  options={ds.fields.map((x) => ({ value: x.key, label: x.label }))}
                />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{f.values.length ? `${f.values.length} chosen` : 'Any'}</span>
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${fDef.label} filter`} onClick={() => removeFilter(idx)}><X aria-hidden /></Button>
            </div>
            <FilterValues dataset={dataset} field={f.field} label={fDef.label} selected={f.values} scope={scope} onChange={(values) => updateFilter(idx, { values })} />
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={addFilter}><Plus aria-hidden /> Add filter</Button>
    </div>
  );
}

/** The values a filter can take in this period, as toggles. */
function FilterValues({ dataset, field, label, selected, onChange, scope }: Readonly<{ dataset: string; field: string; label: string; selected: string[]; onChange: (values: string[]) => void; scope: InsightScopeParams }>) {
  const { data: values = [], isLoading, isFetching } = useExploreFieldValues(true, { dataset, field, ...scope });
  if (isLoading || isFetching) {
    return <p className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" aria-hidden /> Loading values…</p>;
  }
  if (values.length === 0) return <p className="text-xs text-muted-foreground">No values in this period</p>;
  return (
    <div role="group" aria-label={`${label} values`} className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
      {values.map((v) => (
        <label
          key={v}
          className="flex cursor-pointer select-none items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1.5 text-xs font-medium text-muted-foreground hover:bg-muted has-data-checked:border-primary/50 has-data-checked:bg-primary/5 has-data-checked:text-foreground"
        >
          <Checkbox checked={selected.includes(v)} onCheckedChange={(on) => onChange(on === true ? [...selected, v] : selected.filter((x) => x !== v))} />
          {v}
        </label>
      ))}
    </div>
  );
}
