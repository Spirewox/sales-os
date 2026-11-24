'use client';

import { useDebouncedUrlField, useUrlState } from '@/hooks/use-url-state';
import { SupplierBusinessType } from '@/types';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { parsePeriod, periodLabel, periodToParams, type Period } from '@/lib/period';
import type { FilterChip } from '@/components/app';
import { BUSINESS_TYPES, STALE_DAYS } from './supplier-utils';

export type SupplierStatus = 'All' | 'Active' | 'Inactive';
/** KPI quick filters: suppliers with open issues, or with no purchase in 60 days. */
export type SupplierShow = 'all' | 'issues' | 'stale';

/** A text param typed locally and written to the URL after a pause. */
function useDebouncedParam(key: string, get: ReturnType<typeof useUrlState>['get'], set: ReturnType<typeof useUrlState>['set']) {
  const url = get(key) ?? '';
  const [draft, setDraft] = useDebouncedUrlField(key, url, set);
  return { draft, setDraft, url };
}

/**
 * Supplier list filters, all held in the URL:
 * ?q, type, category, status, code_from, code_to, period/from/to, show.
 */
export function useSupplierFilters() {
  const { get, set, params } = useUrlState();
  const search = useDebouncedParam('q', get, set);
  const codeFrom = useDebouncedParam('code_from', get, set);
  const codeTo = useDebouncedParam('code_to', get, set);

  const rawType = get('type');
  const type = rawType && (BUSINESS_TYPES as string[]).includes(rawType) ? (rawType as SupplierBusinessType) : 'All';
  const rawCategory = get('category');
  const category = rawCategory && (PRODUCT_CATEGORIES as string[]).includes(rawCategory) ? rawCategory : 'All';
  const rawStatus = get('status');
  const status: SupplierStatus = rawStatus === 'active' ? 'Active' : rawStatus === 'inactive' ? 'Inactive' : 'All';
  const rawShow = get('show');
  const show: SupplierShow = rawShow === 'issues' || rawShow === 'stale' ? rawShow : 'all';
  const period = parsePeriod(params, 'all');

  const setType = (v: string) => set({ type: v === 'All' ? null : v });
  const setCategory = (v: string) => set({ category: v === 'All' ? null : v });
  const setStatus = (v: SupplierStatus) => set({ status: v === 'All' ? null : v.toLowerCase() });
  const setShow = (v: SupplierShow) => set({ show: v === 'all' ? null : v });
  const setPeriod = (p: Period) => set(periodToParams(p, 'all'));

  const codeLabel = codeFrom.url && codeTo.url ? `Code ${codeFrom.url} to ${codeTo.url}` : codeFrom.url ? `Code from ${codeFrom.url}` : codeTo.url ? `Code up to ${codeTo.url}` : null;

  const chips: FilterChip[] = [
    ...(search.url ? [{ key: 'q', label: `"${search.url}"`, onRemove: () => { search.setDraft(''); set({ q: null }); } }] : []),
    ...(show === 'issues' ? [{ key: 'show', label: 'Open issues', onRemove: () => setShow('all') }] : []),
    ...(show === 'stale' ? [{ key: 'show', label: `No purchase in ${STALE_DAYS} days`, onRemove: () => setShow('all') }] : []),
    ...(period.preset !== 'all' ? [{ key: 'period', label: `Spend: ${periodLabel(period)}`, onRemove: () => setPeriod({ preset: 'all' }) }] : []),
    ...(type !== 'All' ? [{ key: 'type', label: type, onRemove: () => setType('All') }] : []),
    ...(category !== 'All' ? [{ key: 'category', label: category, onRemove: () => setCategory('All') }] : []),
    ...(status !== 'All' ? [{ key: 'status', label: status, onRemove: () => setStatus('All') }] : []),
    ...(codeLabel ? [{ key: 'code', label: codeLabel, onRemove: () => { codeFrom.setDraft(''); codeTo.setDraft(''); set({ code_from: null, code_to: null }); } }] : []),
  ];

  const clearAll = () => {
    search.setDraft('');
    codeFrom.setDraft('');
    codeTo.setDraft('');
    set({ q: null, type: null, category: null, status: null, code_from: null, code_to: null, show: null, period: null, from: null, to: null });
  };

  return {
    search, codeFrom, codeTo,
    type, setType,
    category, setCategory,
    status, setStatus,
    show, setShow,
    period, setPeriod,
    chips, clearAll,
    moreActiveCount: (status !== 'All' ? 1 : 0) + (codeLabel ? 1 : 0),
    /** Changes whenever the result set changes, to reset paging. */
    key: [search.url, type, category, status, codeFrom.url, codeTo.url, show, period.preset, period.from, period.to].join('|'),
  };
}

export type SupplierFilters = ReturnType<typeof useSupplierFilters>;
