'use client';

import { useEffect, useMemo, useState } from 'react';
import type { InventoryItem, StockLog } from '@/types';
import { useUrlState } from '@/hooks/use-url-state';
import { buildFifoBatches, expiringOpenBatches, stockState, type FifoBatch, type ProductCategory } from './inventory-utils';

export type StockFilter = 'low' | 'out' | 'expiring';
const STOCK_FILTERS: StockFilter[] = ['low', 'out', 'expiring'];

/**
 * Stock tab filters (URL: ?q=, ?category=, ?stock=low|out|expiring, ?sku=id,id) and the rows they select.
 * `items` must already be limited to active products in the app location.
 */
export function useStockView(items: InventoryItem[], logs: StockLog[]) {
  const { get, set } = useUrlState();
  const urlSearch = get('q') ?? '';
  const category = (get('category') ?? 'All') as ProductCategory | 'All';
  const rawStock = get('stock') as StockFilter | null;
  const stockFilter = rawStock && STOCK_FILTERS.includes(rawStock) ? rawStock : null;
  const skuParam = get('sku') ?? '';
  const skuIds = useMemo(() => (skuParam ? skuParam.split(',').filter(Boolean) : []), [skuParam]);

  // Search types locally and writes the URL after a pause.
  const [search, setSearch] = useState(urlSearch);
  useEffect(() => {
    if (search === urlSearch) return;
    const t = setTimeout(() => set({ q: search.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [search, urlSearch, set]);

  /** Open batches per product from the hub ledger (newest 200 movements). */
  const openBatchesByItem = useMemo(() => {
    const map = new Map<string, FifoBatch[]>();
    for (const item of items) map.set(item.id, buildFifoBatches(logs, item.id));
    return map;
  }, [items, logs]);

  const expiringByItem = useMemo(() => {
    const map = new Map<string, FifoBatch[]>();
    for (const [id, batches] of openBatchesByItem) {
      const exp = expiringOpenBatches(batches);
      if (exp.length) map.set(id, exp);
    }
    return map;
  }, [openBatchesByItem]);

  const nextExpiryByItem = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, batches] of openBatchesByItem) {
      const next = batches.map((b) => b.expiryDate).filter((d): d is string => !!d).sort()[0];
      if (next) map.set(id, next);
    }
    return map;
  }, [openBatchesByItem]);

  const counts = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const i of items) {
      const s = stockState(i);
      if (s === 'Low') low += 1;
      else if (s === 'Out') out += 1;
    }
    let expiringBatches = 0;
    for (const b of expiringByItem.values()) expiringBatches += b.length;
    return { low, out, expiring: expiringByItem.size, expiringBatches };
  }, [items, expiringByItem]);

  const filteredItems = useMemo(() => {
    const q = urlSearch.trim().toLowerCase();
    return items.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q) && !i.sku.toLowerCase().includes(q)) return false;
      if (category !== 'All' && i.category !== category) return false;
      if (skuIds.length && !skuIds.includes(i.id)) return false;
      if (stockFilter === 'low' && stockState(i) !== 'Low') return false;
      if (stockFilter === 'out' && stockState(i) !== 'Out') return false;
      if (stockFilter === 'expiring' && !expiringByItem.has(i.id)) return false;
      return true;
    });
  }, [items, urlSearch, category, skuIds, stockFilter, expiringByItem]);

  const skuOptions = useMemo(
    () =>
      items
        .filter((item) => !!item.sku && (category === 'All' || item.category === category))
        .slice()
        .sort((a, b) => a.sku.localeCompare(b.sku) || a.name.localeCompare(b.name))
        .map((item) => ({ id: item.id, sku: item.sku, name: item.name, location: item.location })),
    [items, category],
  );

  const toggleStockFilter = (f: StockFilter) => set({ stock: stockFilter === f ? null : f });
  const setCategory = (c: string) => set({ category: c === 'All' ? null : c, sku: null });
  const setSkuIds = (ids: string[]) => set({ sku: ids.length ? ids.join(',') : null });
  const clearAll = () => {
    setSearch('');
    set({ q: null, category: null, stock: null, sku: null });
  };

  return {
    search, setSearch, urlSearch,
    category, setCategory,
    stockFilter, toggleStockFilter, clearStockFilter: () => set({ stock: null }),
    skuIds, setSkuIds, skuOptions,
    filteredItems, counts, expiringByItem, nextExpiryByItem,
    clearAll,
  };
}

export type StockView = ReturnType<typeof useStockView>;
