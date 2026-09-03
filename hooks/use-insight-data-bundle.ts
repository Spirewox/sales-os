'use client';

import { useMemo } from 'react';
import {
  useCustomers,
  useSales,
  useSuppliers,
  useStockLogs,
  useInventory,
  useSaleCredits,
  useAgents,
} from '@/hooks/use-queries';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { useMetricsPeriod } from '@/components/metrics-period-bar';
import type { DataBundle } from '@/lib/insights';
import type { Sale, StockLog, CreditRecord, SupplierIssue } from '@/types';
import { axiosGet } from '@/lib/api';
import { HAS_API } from '@/lib/require-api';
import { useQuery } from '@tanstack/react-query';
import type { ApiSupplierIssue } from '@/types/api';
import { mapSupplierIssue } from '@/lib/api-mappers';

const BUNDLE_LIMIT = 500;

function inDateRange(iso: string | undefined, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  if (!iso) return false;
  const day = iso.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function filterSales(sales: Sale[], from?: string, to?: string, hubName?: string): Sale[] {
  return sales.filter((s) => {
    if (hubName && s.hubName && s.hubName !== hubName) return false;
    return inDateRange(s.date, from, to);
  });
}

function filterLogs(logs: StockLog[], from?: string, to?: string): StockLog[] {
  return logs.filter((l) => inDateRange(l.date, from, to));
}

function filterCredits(credits: CreditRecord[], from?: string, to?: string): CreditRecord[] {
  return credits.filter((c) => c.status !== 'Voided' && inDateRange(c.dateIssued, from, to));
}

export function useInsightDataBundle(options?: {
  hubId?: string;
  hubName?: string;
  dateFrom?: string;
  dateTo?: string;
  /** When false, skip period filter (full history). Default true when dates provided. */
  applyPeriod?: boolean;
}) {
  const hubScope = useHubScopeFilter();
  const metricsPeriod = useMetricsPeriod('month');

  const hubId = options?.hubId ?? hubScope.hubIdForApi;
  const hubName =
    options?.hubName ??
    (hubScope.filterHub !== 'All' ? hubScope.filterHub : undefined);
  const dateFrom =
    options?.dateFrom ??
    (metricsPeriod.isCustom || metricsPeriod.preset !== 'all'
      ? metricsPeriod.apiParams.date_from
      : undefined);
  const dateTo =
    options?.dateTo ??
    (metricsPeriod.isCustom || metricsPeriod.preset !== 'all'
      ? metricsPeriod.apiParams.date_to
      : undefined);
  const applyPeriod = options?.applyPeriod ?? true;

  const customersQ = useCustomers({ hub_id: hubId, limit: BUNDLE_LIMIT, page: 1 });
  const salesQ = useSales({
    hub_id: hubId,
    limit: BUNDLE_LIMIT,
    page: 1,
    exclude_voided: true,
    ...(applyPeriod && dateFrom ? { date_from: dateFrom } : {}),
    ...(applyPeriod && dateTo ? { date_to: dateTo } : {}),
  });
  const suppliersQ = useSuppliers({ hub_id: hubId, limit: BUNDLE_LIMIT, page: 1 });
  const inventoryQ = useInventory({ hub_id: hubId });
  const stockLogsQ = useStockLogs({
    hub_id: hubId,
    limit: BUNDLE_LIMIT,
    ...(applyPeriod && dateFrom ? { date_from: dateFrom } : {}),
    ...(applyPeriod && dateTo ? { date_to: dateTo } : {}),
  });
  const creditsQ = useSaleCredits();
  const agentsQ = useAgents({ hub_id: hubId, limit: 200 });

  const supplierIds = (suppliersQ.data?.items ?? []).map((s) => s.id).slice(0, 80);
  const issuesQ = useQuery({
    queryKey: ['insight-supplier-issues', supplierIds],
    enabled: HAS_API && supplierIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<SupplierIssue[]> => {
      const all: SupplierIssue[] = [];
      // Sequential batches of 8 to avoid flooding the API
      for (let i = 0; i < supplierIds.length; i += 8) {
        const chunk = supplierIds.slice(i, i + 8);
        const rows = await Promise.all(
          chunk.map(async (id) => {
            try {
              const raw = await axiosGet(`suppliers/${id}/issues`, true);
              const list: ApiSupplierIssue[] = Array.isArray(raw) ? raw : [];
              return list.map(mapSupplierIssue);
            } catch {
              return [] as SupplierIssue[];
            }
          }),
        );
        rows.forEach((r) => all.push(...r));
      }
      return all;
    },
  });

  const isLoading =
    customersQ.isLoading ||
    salesQ.isLoading ||
    suppliersQ.isLoading ||
    inventoryQ.isLoading ||
    stockLogsQ.isLoading ||
    creditsQ.isLoading ||
    agentsQ.isLoading;

  const bundle: DataBundle = useMemo(() => {
    const customers = customersQ.data?.items ?? [];
    let sales = salesQ.data?.items ?? [];
    let stockLogs = stockLogsQ.data ?? [];
    let credits = (creditsQ.data ?? []) as CreditRecord[];
    const inventory = inventoryQ.data ?? [];
    const suppliers = suppliersQ.data?.items ?? [];
    const agents = agentsQ.data ?? [];
    const supplierIssues = issuesQ.data ?? [];

    if (applyPeriod) {
      sales = filterSales(sales, dateFrom, dateTo, hubName);
      stockLogs = filterLogs(stockLogs, dateFrom, dateTo);
      credits = filterCredits(credits, dateFrom, dateTo);
    } else if (hubName) {
      sales = filterSales(sales, undefined, undefined, hubName);
    }

    return {
      customers,
      sales,
      suppliers,
      supplierIssues,
      stockLogs,
      inventory,
      credits,
      agents,
    };
  }, [
    customersQ.data,
    salesQ.data,
    suppliersQ.data,
    inventoryQ.data,
    stockLogsQ.data,
    creditsQ.data,
    agentsQ.data,
    issuesQ.data,
    applyPeriod,
    dateFrom,
    dateTo,
    hubName,
  ]);

  return {
    bundle,
    isLoading,
    hubScope,
    metricsPeriod,
    dateFrom,
    dateTo,
    hubId,
    hubName,
  };
}
