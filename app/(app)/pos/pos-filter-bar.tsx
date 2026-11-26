'use client';

import type { ReactNode } from 'react';
import { FilterBar, LocationSelect, PeriodSelect, type FilterChip } from '@/components/app';
import { useAgents } from '@/hooks/use-queries';
import { FilterSelect } from '@/components/filter-select';
import { periodLabel } from '@/lib/period';
import { POS_PERIOD_DEFAULT, TAB_FILTER_KEYS, type PosFilters } from './use-pos-filters';
import { useOperationsList } from './operations';
import type { PosRow } from './pos-utils';

/** The shared filter row: search, location, period (where data follows one), then tab filters. */
export function PosFilterBar({ f, searchPlaceholder, withPeriod = true, filters, more, moreActiveCount, chips = [], resultLabel, trailing }: Readonly<{
  f: PosFilters; searchPlaceholder: string; withPeriod?: boolean; filters?: ReactNode; more?: ReactNode; moreActiveCount?: number; chips?: FilterChip[]; resultLabel?: ReactNode;
  /** Actions such as Export, pushed right of the filters. */
  trailing?: ReactNode;
}>) {
  const all: FilterChip[] = [
    ...(withPeriod && f.period.preset !== POS_PERIOD_DEFAULT ? [{ key: 'period', label: periodLabel(f.period), onRemove: () => f.set({ period: null, from: null, to: null }) }] : []),
    ...(f.urlSearch ? [{ key: 'q', label: `"${f.urlSearch}"`, onRemove: () => { f.setSearch(''); f.set({ q: null }); } }] : []),
    ...chips,
  ];
  const clearAll = () => {
    f.setSearch('');
    f.set({ period: null, from: null, to: null, ...Object.fromEntries(TAB_FILTER_KEYS.map((k) => [k, null])) });
  };
  return (
    <FilterBar
      search={{ value: f.search, onChange: f.setSearch, placeholder: searchPlaceholder, label: searchPlaceholder }}
      filters={<>
        <LocationSelect scope={f.scope} />
        {withPeriod && <PeriodSelect value={f.period} onChange={f.setPeriod} />}
        {filters}
      </>}
      more={more}
      moreActiveCount={moreActiveCount}
      chips={all}
      onClearAll={clearAll}
      resultLabel={resultLabel}
      trailing={trailing}
    />
  );
}

/** A URL-backed select for one filter key, with an "All" option. */
export function UrlFilterSelect({ f, param, label, allLabel, options, className }: Readonly<{
  f: PosFilters; param: string; label: string; allLabel: string; options: readonly { value: string; label: string }[]; className?: string;
}>) {
  return (
    <FilterSelect
      id={`pos-filter-${param}`}
      ariaLabel={label}
      value={f.get(param) ?? 'All'}
      onChange={(v) => f.set({ [param]: v === 'All' ? null : v, txn: null })}
      options={[{ value: 'All', label: allLabel }, ...options]}
      className={className ?? 'h-9 w-auto min-w-36 data-[size=default]:h-9'}
    />
  );
}

/** Till options: the tills the user can see at the current location. */
export function useTillOptions(f: PosFilters) {
  const tills = useOperationsList('tills', { hub_id: f.hubId }, { refetchInterval: false }).data?.data ?? [];
  const options = tills.filter((t) => t.device_id).map((t) => ({
    value: t.device_id!,
    label: `${t.label || 'Till'}${f.hubId ? '' : `, ${f.hubName(t.hub)}`}`,
  }));
  const tillLabel = (deviceId?: string) => (deviceId ? options.find((o) => o.value === deviceId)?.label.split(',')[0] ?? deviceId : '-');
  return { options, tillLabel };
}

/** Cashier options: users at the location, plus any cashier seen in the loaded rows. */
export function useCashierOptions(f: PosFilters, rows: PosRow[] | undefined) {
  const { data: agents = [] } = useAgents(f.hubId ? { hub_id: f.hubId } : undefined);
  const byId = new Map<string, string>(agents.map((a) => [a.id, a.name]));
  for (const row of rows ?? []) if (row.cashier_id && row.cashier_name && !byId.has(row.cashier_id)) byId.set(row.cashier_id, row.cashier_name);
  return [...byId.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}
