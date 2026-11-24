'use client';

import { useMemo } from 'react';
import { useDebouncedUrlField, useUrlState } from '@/hooks/use-url-state';
import { CustomerType } from '@/types';
import { parsePeriod, periodLabel, periodRange, periodToParams, type Period } from '@/lib/period';
import type { FilterChip } from '@/components/app';

export type OrdersFilterMode = 'all' | 'once' | 'exact' | 'min';
export type CustomerSort = 'default' | 'orders' | 'orders_asc' | 'revenue' | 'revenue_asc';

export const SORT_OPTIONS: { value: CustomerSort; label: string }[] = [
  { value: 'default', label: 'Sort: default' },
  { value: 'revenue', label: 'Most revenue' },
  { value: 'revenue_asc', label: 'Least revenue' },
  { value: 'orders', label: 'Most orders' },
  { value: 'orders_asc', label: 'Fewest orders' },
];

const ORDER_MODES: OrdersFilterMode[] = ['once', 'exact', 'min'];
const SORTS: CustomerSort[] = ['orders', 'orders_asc', 'revenue', 'revenue_asc'];

/**
 * Customer list filters, all held in the URL: ?q, type, period/from/to, orders + n, seg (ids), sort.
 * Search is typed locally and written to the URL after a pause.
 */
export function useCustomerFilters(segmentName: (id: string) => string | undefined) {
  const { get, set, params } = useUrlState();
  const urlSearch = get('q') ?? '';
  const [search, setSearch] = useDebouncedUrlField('q', urlSearch, set);

  const rawType = get('type');
  const type: CustomerType | 'All' = rawType === CustomerType.B2B || rawType === CustomerType.B2C ? rawType : 'All';
  const period = parsePeriod(params, 'all');
  const rawOrders = get('orders') as OrdersFilterMode | null;
  const ordersMode: OrdersFilterMode = rawOrders && ORDER_MODES.includes(rawOrders) ? rawOrders : 'all';
  const ordersCount = Math.max(0, Math.floor(Number(get('n') ?? 1)) || 0);
  const segParam = get('seg') ?? '';
  const segmentIds = useMemo(() => segParam.split(',').filter(Boolean), [segParam]);
  const rawSort = get('sort') as CustomerSort | null;
  const sort: CustomerSort = rawSort && SORTS.includes(rawSort) ? rawSort : 'default';

  const setType = (v: CustomerType | 'All') => set({ type: v === 'All' ? null : v });
  const setPeriod = (p: Period) => set(periodToParams(p, 'all'));
  const setOrders = (mode: OrdersFilterMode, n?: number) => set({ orders: mode === 'all' ? null : mode, n: mode === 'exact' || mode === 'min' ? String(n ?? ordersCount) : null });
  const setSegments = (ids: string[]) => set({ seg: ids.length ? ids.join(',') : null });
  const setSort = (v: CustomerSort) => set({ sort: v === 'default' ? null : v });

  const range = periodRange(period);
  const periodScoped = period.preset !== 'all';
  const ordersParams =
    ordersMode === 'once' ? { min_orders: 1, max_orders: 1 }
      : ordersMode === 'exact' ? { min_orders: ordersCount, max_orders: ordersCount }
        : ordersMode === 'min' ? { min_orders: ordersCount }
          : {};
  const sortParams = sort === 'default' ? {} : { sort_by: (sort.startsWith('orders') ? 'total_orders' : 'total_spent') as 'total_orders' | 'total_spent', sort_dir: (sort.endsWith('_asc') ? 'asc' : 'desc') as 'asc' | 'desc' };
  const periodParams = periodScoped ? { ...(range.from ? { date_from: range.from } : {}), ...(range.to ? { date_to: range.to } : {}) } : { period: 'all' };

  /** API filters without paging (export uses these as-is). */
  const apiFilters = {
    search: urlSearch || undefined,
    type: type === 'All' ? undefined : type,
    segment_ids: segmentIds.length ? segmentIds : undefined,
    ...sortParams,
    ...ordersParams,
    ...periodParams,
  };

  const ordersLabel = ordersMode === 'once' ? 'Bought once' : ordersMode === 'exact' ? `Exactly ${ordersCount} orders` : ordersMode === 'min' ? `${ordersCount}+ orders` : null;
  const segmentNames = segmentIds.map(segmentName).filter((n): n is string => !!n);

  const chips: FilterChip[] = [
    ...(urlSearch ? [{ key: 'q', label: `"${urlSearch}"`, onRemove: () => { setSearch(''); set({ q: null }); } }] : []),
    ...(periodScoped ? [{ key: 'period', label: periodLabel(period), onRemove: () => setPeriod({ preset: 'all' }) }] : []),
    ...(type !== 'All' ? [{ key: 'type', label: type === CustomerType.B2B ? 'Business' : 'Individual', onRemove: () => setType('All') }] : []),
    ...(ordersLabel ? [{ key: 'orders', label: ordersLabel, onRemove: () => setOrders('all') }] : []),
    ...segmentIds.map((sid) => ({ key: `seg-${sid}`, label: segmentName(sid) ?? 'Segment', onRemove: () => setSegments(segmentIds.filter((x) => x !== sid)) })),
  ];

  const clearAll = () => {
    setSearch('');
    set({ q: null, type: null, period: null, from: null, to: null, orders: null, n: null, seg: null });
  };

  /** Changes whenever the result set changes, to reset paging. */
  const key = [urlSearch, type, range.from, range.to, ordersMode, ordersCount, segParam, sort].join('|');

  return {
    search, setSearch, urlSearch,
    type, setType,
    period, setPeriod, periodScoped,
    ordersMode, ordersCount, setOrders,
    segmentIds, segmentNames, setSegments,
    sort, setSort,
    apiFilters, chips, clearAll, key,
    moreActiveCount: (ordersMode !== 'all' ? 1 : 0) + (segmentIds.length ? 1 : 0),
  };
}
