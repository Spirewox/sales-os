'use client';

import { useEffect, useState } from 'react';
import { useUrlState } from '@/hooks/use-url-state';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { parsePeriod, periodLabel, periodRange, periodToParams, previousRange, type Period } from '@/lib/period';
import type { FilterChip } from '@/components/app';
import { PAYMENT_STATUS_FILTERS, type SaleDateFieldFilter } from './sales-utils';

/** Default reporting window for the Sales list and its KPIs. */
export const SALES_DEFAULT_PERIOD = '30d' as const;

export const SALES_SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'amount_desc', label: 'Amount, high to low' },
  { value: 'amount_asc', label: 'Amount, low to high' },
  { value: 'quantity_desc', label: 'Quantity, high to low' },
  { value: 'quantity_asc', label: 'Quantity, low to high' },
] as const;

/** Sale record status (separate from payment): the old "All status" filter. Voided lives under payment. */
export const SALE_STATUSES = ['Pending', 'Approved', 'Paid'] as const;

const csv = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

type Names = { agentName?: (id: string) => string | undefined; skuName?: (id: string) => string | undefined };

/**
 * Sales list filters, kept in the URL so a filtered view can be linked and survives refresh:
 * ?q= &period= &pay= &status= &agent= &channel= &cat= &sku= &datefield=created &sort=
 * Location is the app-wide location from the sidebar (hubScope).
 */
export function useSalesFilters(hubScope: HubScopeFilter, validSkuIds: string[] | null, names: Names = {}) {
  const { get, set, params } = useUrlState();
  const period: Period = parsePeriod(params, SALES_DEFAULT_PERIOD);
  const urlSearch = get('q') ?? '';
  const pay = get('pay') ?? '';
  const saleStatus = (SALE_STATUSES as readonly string[]).includes(get('status') ?? '') ? (get('status') as string) : '';
  const agent = get('agent') ?? '';
  const channel = get('channel') ?? '';
  const categories = csv(get('cat'));
  const rawSkus = csv(get('sku'));
  // Drop SKUs that no longer match the location or category (no effect needed: derived).
  const productIds = validSkuIds ? rawSkus.filter((id) => validSkuIds.includes(id)) : rawSkus;
  const dateField: SaleDateFieldFilter = get('datefield') === 'created' ? 'created' : 'sold';
  const sort = SALES_SORTS.some((s) => s.value === get('sort')) ? (get('sort') as (typeof SALES_SORTS)[number]['value']) : 'newest';

  // Search box is local while typing; the URL updates after a pause.
  const [search, setSearch] = useState(urlSearch);
  useEffect(() => {
    if (search === urlSearch) return;
    const t = setTimeout(() => set({ q: search.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [search, urlSearch, set]);

  const range = periodRange(period);
  const prev = previousRange(period);
  const [sortBy, sortDir] = sort === 'newest' ? [null, null] : (sort.split('_') as ['amount' | 'quantity', 'asc' | 'desc']);

  const payFilter =
    pay === 'voided' ? { status: 'Voided' as const }
      : pay === 'paid' ? { payment_mode: 'Full Payment', exclude_voided: true }
        : pay === 'partial' ? { payment_mode: 'Partial Credit', exclude_voided: true }
          : pay === 'credit' ? { payment_mode: 'Full Credit', exclude_voided: true }
            : { exclude_voided: true };
  // Sale status narrows further, except when payment already asks for voided sales.
  const statusFilter = saleStatus && pay !== 'voided' ? { status: saleStatus } : {};

  const base = {
    hub_id: hubScope.hubIdForApi,
    ...(urlSearch.trim() ? { search: urlSearch.trim() } : {}),
    ...(agent ? { agent_id: agent } : {}),
    ...payFilter,
    ...statusFilter,
    ...(channel ? { channel } : {}),
    ...(categories.length ? { categories: categories.join(',') } : {}),
    ...(productIds.length ? { product_ids: productIds.join(',') } : {}),
  };
  const withDates = (from: string | null, to: string | null) => ({
    ...base,
    ...(from ? { date_from: from } : {}),
    ...(to ? { date_to: to } : {}),
    ...(from || to ? { date_field: dateField } : {}),
  });

  const summaryFilters = withDates(range.from, range.to);
  const previousFilters = prev ? withDates(prev.from, prev.to) : null;
  const sortParams = sortBy ? { sort_by: sortBy, sort_dir: sortDir! } : {};

  const filterKey = JSON.stringify([summaryFilters, sortParams]);

  const moreActiveCount = (saleStatus ? 1 : 0) + (agent ? 1 : 0) + (channel ? 1 : 0) + (categories.length ? 1 : 0) + (productIds.length ? 1 : 0) + (dateField === 'created' ? 1 : 0) + (sort !== 'newest' ? 1 : 0);

  const payLabel = PAYMENT_STATUS_FILTERS.find((p) => p.value === pay)?.label;
  const chips: FilterChip[] = [
    ...(urlSearch ? [{ key: 'q', label: `"${urlSearch}"`, onRemove: () => { setSearch(''); set({ q: null }); } }] : []),
    ...(period.preset !== SALES_DEFAULT_PERIOD ? [{ key: 'period', label: periodLabel(period), onRemove: () => set(periodToParams({ preset: SALES_DEFAULT_PERIOD }, SALES_DEFAULT_PERIOD)) }] : []),
    ...(hubScope.canSwitchHubs && hubScope.filterHub !== 'All' ? [{ key: 'hub', label: hubScope.filterHub, onRemove: () => hubScope.setFilterHub('All') }] : []),
    ...(payLabel ? [{ key: 'pay', label: payLabel, onRemove: () => set({ pay: null }) }] : []),
    ...(saleStatus ? [{ key: 'status', label: `Status: ${saleStatus}`, onRemove: () => set({ status: null }) }] : []),
    ...(agent ? [{ key: 'agent', label: `By ${names.agentName?.(agent) ?? 'agent'}`, onRemove: () => set({ agent: null }) }] : []),
    ...(channel ? [{ key: 'channel', label: channel, onRemove: () => set({ channel: null }) }] : []),
    ...(categories.length ? [{ key: 'cat', label: categories.join(', '), onRemove: () => set({ cat: null }) }] : []),
    ...(productIds.length ? [{ key: 'sku', label: productIds.length === 1 ? (names.skuName?.(productIds[0]) ?? '1 SKU') : `${productIds.length} SKUs`, onRemove: () => set({ sku: null }) }] : []),
    ...(dateField === 'created' ? [{ key: 'datefield', label: 'By date recorded', onRemove: () => set({ datefield: null }) }] : []),
    ...(sort !== 'newest' ? [{ key: 'sort', label: SALES_SORTS.find((s) => s.value === sort)!.label, onRemove: () => set({ sort: null }) }] : []),
  ];

  const clearAll = () => {
    setSearch('');
    if (hubScope.canSwitchHubs) hubScope.setFilterHub('All');
    set({ q: null, pay: null, status: null, agent: null, channel: null, cat: null, sku: null, datefield: null, sort: null, ...periodToParams({ preset: SALES_DEFAULT_PERIOD }, SALES_DEFAULT_PERIOD) });
  };

  return {
    period, setPeriod: (p: Period) => set(periodToParams(p, SALES_DEFAULT_PERIOD)),
    search, setSearch,
    pay, setPay: (v: string) => set({ pay: v || null }),
    saleStatus, setSaleStatus: (v: string) => set({ status: v || null }),
    agent, setAgent: (v: string) => set({ agent: v || null }),
    channel, setChannel: (v: string) => set({ channel: v || null }),
    categories, setCategories: (v: string[]) => set({ cat: v.length ? v.join(',') : null }),
    productIds, setProductIds: (v: string[]) => set({ sku: v.length ? v.join(',') : null }),
    dateField, setDateField: (v: SaleDateFieldFilter) => set({ datefield: v === 'created' ? 'created' : null }),
    sort, setSort: (v: string) => set({ sort: v === 'newest' ? null : v }),
    summaryFilters, previousFilters, sortParams, filterKey,
    chips, clearAll, moreActiveCount,
    hasFilters: chips.length > 0,
  };
}

export type SalesFilters = ReturnType<typeof useSalesFilters>;
