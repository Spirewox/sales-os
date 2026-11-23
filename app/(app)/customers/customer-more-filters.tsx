'use client';

import { useId } from 'react';
import { SEGMENT_TAXONOMY } from '@/lib/segmentation';
import { FilterSelect } from '@/components/filter-select';
import { MoreFilterField } from '@/components/app';
import type { OrdersFilterMode, useCustomerFilters } from './use-customer-filters';

type Filters = ReturnType<typeof useCustomerFilters>;
type Segment = { id: string; name: string };

/** Orders count and segments, inside FilterBar's "More filters" popover. */
export function CustomerMoreFilters({ filters: f, segments }: Readonly<{ filters: Filters; segments: Segment[] }>) {
  const id = useId();
  const byName = new Map(segments.map((s) => [s.name, s.id]));
  const toggle = (sid: string) => f.setSegments(f.segmentIds.includes(sid) ? f.segmentIds.filter((x) => x !== sid) : [...f.segmentIds, sid]);
  const groups = SEGMENT_TAXONOMY.map((group) => ({
    group: group.group,
    options: group.segments.map((name) => ({ name, id: byName.get(name) })).filter((o): o is { name: string; id: string } => !!o.id),
  })).filter((g) => g.options.length > 0);
  const needsCount = f.ordersMode === 'exact' || f.ordersMode === 'min';

  return (
    <>
      <MoreFilterField label="Orders" htmlFor={`${id}-orders`}>
        <div className="flex items-center gap-2">
          <FilterSelect
            id={`${id}-orders`}
            value={f.ordersMode}
            onChange={(v) => f.setOrders(v as OrdersFilterMode)}
            className="h-9 data-[size=default]:h-9"
            options={[
              { value: 'all', label: 'Any number' },
              { value: 'once', label: 'Bought once' },
              { value: 'exact', label: 'Exactly…' },
              { value: 'min', label: 'At least…' },
            ]}
          />
          {needsCount && (
            <input
              type="number"
              min={0}
              step={1}
              value={f.ordersCount}
              onChange={(e) => f.setOrders(f.ordersMode, Math.max(0, Math.floor(Number(e.target.value)) || 0))}
              aria-label={f.ordersMode === 'exact' ? 'Exact order count' : 'Minimum order count'}
              className="h-9 w-20 shrink-0 rounded-md border border-input bg-background px-2 text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
            />
          )}
        </div>
      </MoreFilterField>

      {groups.length > 0 && (
        <fieldset className="space-y-1">
          <div className="flex items-center justify-between">
            <legend className="text-xs font-medium text-muted-foreground">Segments (match all)</legend>
            {f.segmentIds.length > 0 && (
              <button type="button" onClick={() => f.setSegments([])} className="text-xs font-medium text-primary hover:underline">Clear</button>
            )}
          </div>
          {f.periodScoped && <p className="text-xs text-muted-foreground">Based on activity in the selected period.</p>}
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {groups.map(({ group: name, options }) => {
              const group = { group: name };
              return (
                <div key={group.group}>
                  <p className="px-1 py-0.5 text-xs text-muted-foreground">{group.group}</p>
                  {options.map((opt) => (
                    <label key={opt.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50">
                      <input type="checkbox" checked={f.segmentIds.includes(opt.id)} onChange={() => toggle(opt.id)} className="size-4 accent-[var(--primary)]" />
                      <span className="truncate">{opt.name}</span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </fieldset>
      )}
    </>
  );
}
