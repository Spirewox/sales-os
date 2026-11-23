'use client';

import { useEffect, useState } from 'react';
import { useUrlState } from '@/hooks/use-url-state';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { lagosDay, parsePeriod, periodRange, periodToParams, type Period } from '@/lib/period';

/** Filters that belong to one tab; cleared when the tab changes. */
export const TAB_FILTER_KEYS = ['q', 'status', 'kind', 'device_id', 'cashier_id', 'reference', 'txn'] as const;
export const POS_PERIOD_DEFAULT = 'today' as const;

/** Shared POS filter state: location (app-wide), period and search, all in the URL. */
export function usePosFilters() {
  const { get, set, params } = useUrlState();
  const scope = useHubScopeFilter();
  const period = parsePeriod(params, POS_PERIOD_DEFAULT);
  const range = periodRange(period);
  const urlSearch = get('q') ?? '';
  const [search, setSearch] = useState(urlSearch);
  // Follow the URL when it changes elsewhere (chip removed, tab switched, back button).
  const [seenSearch, setSeenSearch] = useState(urlSearch);
  if (seenSearch !== urlSearch) {
    setSeenSearch(urlSearch);
    setSearch(urlSearch);
  }

  // Search writes to the URL once typing pauses, so results follow without an Apply button.
  useEffect(() => {
    if (search === urlSearch) return;
    const t = setTimeout(() => set({ q: search.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [search, urlSearch, set]);

  const setPeriod = (p: Period) => set(periodToParams(p, POS_PERIOD_DEFAULT));
  const hubId = scope.hubIdForApi;
  const hubName = (id: string) => scope.activeHubs.find((h) => h.id === id)?.name ?? id;

  return {
    get, set, params, scope, hubId, hubName,
    period, setPeriod,
    /** Inclusive dates; "All time" reads from the first possible day so date-bound endpoints still answer. */
    dateFrom: range.from ?? '2000-01-01',
    dateTo: range.to ?? lagosDay(),
    search, setSearch, urlSearch,
  };
}

export type PosFilters = ReturnType<typeof usePosFilters>;
