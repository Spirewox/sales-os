'use client';

import { useMemo } from 'react';
import { useAllSupplierIssues, useStockLogs, useSuppliers } from '@/hooks/use-queries';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import type { ProductCategory, StockLog, Supplier } from '@/types';
import { periodRange, previousRange } from '@/lib/period';
import { STALE_DAYS, daysAgoDay, isPurchase, logValue, parseSupplierCodeNum, supplierKeyResolver } from './supplier-utils';
import type { SupplierFilters } from './use-supplier-filters';

export type ProductRef = { id: string; name: string };

export type SupplierRow = {
  supplier: Supplier;
  /** Spend in the selected period (all time: the API's total, else summed purchases). */
  spend: number;
  lastPurchase: string | null;
  /** null while issues are loading. */
  openIssues: number | null;
  products: ProductRef[];
};

/** Enough recent purchases to find each supplier's last order and products. */
const LOG_LIMIT = 500;

function sumBySupplier(logs: StockLog[], keyOf: (l: StockLog) => string | undefined) {
  const map = new Map<string, number>();
  logs.forEach((l) => {
    if (!isPurchase(l)) return;
    const k = keyOf(l);
    if (k) map.set(k, (map.get(k) ?? 0) + logValue(l));
  });
  return map;
}

/** Supplier rows with spend, last purchase and open issues, filtered as the URL says, plus the KPI figures. */
export function useSupplierList(f: SupplierFilters, hubScope: HubScopeFilter) {
  const { data: supplierList, isFetching } = useSuppliers({
    limit: 200,
    hub_id: hubScope.hubIdForApi,
    code_from: f.codeFrom.url || undefined,
    code_to: f.codeTo.url || undefined,
  });
  const suppliers = useMemo(() => supplierList?.items ?? [], [supplierList]);
  const keyOf = useMemo(() => supplierKeyResolver(suppliers), [suppliers]);

  const { data: allLogsResult, isLoading: logsLoading } = useStockLogs({ type: 'PURCHASE', limit: LOG_LIMIT });
  const range = periodRange(f.period);
  const ranged = f.period.preset !== 'all';
  const prev = ranged ? previousRange(f.period) : null;
  const { data: periodLogsResult, isLoading: periodLoading } = useStockLogs(
    ranged ? { type: 'PURCHASE', date_from: range.from ?? undefined, date_to: range.to ?? undefined, limit: LOG_LIMIT } : null,
  );
  const { data: prevLogsResult } = useStockLogs(prev ? { type: 'PURCHASE', date_from: prev.from, date_to: prev.to, limit: LOG_LIMIT } : null);

  const supplierIds = useMemo(() => suppliers.map((s) => s.id), [suppliers]);
  const { data: allIssues, isLoading: issuesLoading } = useAllSupplierIssues(supplierIds);

  const perSupplier = useMemo(() => {
    const allLogs = allLogsResult?.data ?? [];
    const last = new Map<string, string>();
    const products = new Map<string, Map<string, string>>();
    allLogs.forEach((l) => {
      if (!isPurchase(l)) return;
      const k = keyOf(l);
      if (!k) return;
      if (l.date > (last.get(k) ?? '')) last.set(k, l.date);
      const p = products.get(k) ?? new Map<string, string>();
      if (l.itemId) p.set(l.itemId, l.itemName);
      products.set(k, p);
    });
    const openIssues = new Map<string, number>();
    (allIssues ?? []).forEach((i) => {
      if (i.status === 'Open') openIssues.set(i.supplierId, (openIssues.get(i.supplierId) ?? 0) + 1);
    });
    return {
      allSpend: sumBySupplier(allLogs, keyOf),
      periodSpend: sumBySupplier(periodLogsResult?.data ?? [], keyOf),
      prevSpend: sumBySupplier(prevLogsResult?.data ?? [], keyOf),
      last, products, openIssues,
    };
  }, [allLogsResult, periodLogsResult, prevLogsResult, allIssues, keyOf]);

  const rows = useMemo<SupplierRow[]>(
    () =>
      suppliers.map((s) => ({
        supplier: s,
        // Phase 0 fix: all-time spend is the API's total_spend when present, else summed purchase logs.
        spend: ranged
          ? perSupplier.periodSpend.get(s.id) ?? 0
          : typeof s.totalSpend === 'number' ? s.totalSpend : perSupplier.allSpend.get(s.id) ?? 0,
        lastPurchase: perSupplier.last.get(s.id) ?? null,
        openIssues: allIssues ? perSupplier.openIssues.get(s.id) ?? 0 : null,
        products: [...(perSupplier.products.get(s.id) ?? new Map()).entries()].map(([id, name]) => ({ id, name })),
      })),
    [suppliers, perSupplier, ranged, allIssues],
  );

  const staleCutoff = daysAgoDay(STALE_DAYS);
  const isStale = (r: SupplierRow) => r.supplier.isActive && (!r.lastPurchase || r.lastPurchase < staleCutoff);

  // Everything except the KPI quick filter, so the KPIs don't change when one is clicked.
  const q = f.search.url.toLowerCase();
  const fromNum = parseSupplierCodeNum(f.codeFrom.url);
  const toNum = parseSupplierCodeNum(f.codeTo.url);
  const base = rows.filter(({ supplier: s }) => {
    const matchSearch = !q || [s.name, s.businessName, s.contactPerson, s.email, s.phone, s.code].some((v) => (v || '').toLowerCase().includes(q));
    const codeNum = parseSupplierCodeNum(s.code);
    const matchCode = (fromNum === null || (codeNum !== null && codeNum >= fromNum)) && (toNum === null || (codeNum !== null && codeNum <= toNum));
    return (
      matchSearch && matchCode &&
      hubScope.matchesHub(s.location) &&
      (f.type === 'All' || s.businessType === f.type) &&
      (f.category === 'All' || !!s.categories?.includes(f.category as ProductCategory)) &&
      (f.status === 'All' || (f.status === 'Active' ? s.isActive : !s.isActive))
    );
  });
  const visible = base.filter((r) => (f.show === 'issues' ? (r.openIssues ?? 0) > 0 : f.show === 'stale' ? isStale(r) : true));

  const spend = base.reduce((a, r) => a + r.spend, 0);
  const prevSpend = prev ? base.reduce((a, r) => a + (perSupplier.prevSpend.get(r.supplier.id) ?? 0), 0) : 0;
  const kpis = {
    spend,
    spendChangePct: prev && prevSpend > 0 ? ((spend - prevSpend) / prevSpend) * 100 : null,
    openIssues: base.reduce((a, r) => a + (r.openIssues ?? 0), 0),
    suppliersWithIssues: base.filter((r) => (r.openIssues ?? 0) > 0).length,
    stale: base.filter(isStale).length,
    active: base.filter((r) => r.supplier.isActive).length,
  };

  // Supplier base, as the original page showed it: the API's totals for this location, and the
  // average lead time over every loaded supplier that has one.
  const withLead = suppliers.filter((s) => s.leadTimeDays != null);
  const supplierBase = {
    total: supplierList?.summary.total ?? 0,
    active: supplierList?.summary.active ?? 0,
    avgLead: withLead.length ? Math.round(withLead.reduce((a, s) => a + (s.leadTimeDays || 0), 0) / withLead.length) : null,
    withLead: withLead.length,
  };

  // Top 5 by spend among the filtered suppliers (follows the period).
  const topBySpend = base.filter((r) => r.spend > 0).sort((a, b) => b.spend - a.spend).slice(0, 5);

  return {
    suppliers,
    rows: visible,
    kpis,
    supplierBase,
    topBySpend,
    listLoading: !supplierList || isFetching,
    kpiLoading: !supplierList || logsLoading || (ranged && periodLoading) || (supplierIds.length > 0 && issuesLoading),
    rowById: (id: string) => rows.find((r) => r.supplier.id === id) ?? null,
  };
}
