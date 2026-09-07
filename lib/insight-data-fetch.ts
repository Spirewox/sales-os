import { axiosGet } from '@/lib/api';
import {
  buildHubMap,
  mapCustomer,
  mapHub,
  mapSale,
  mapStockLog,
  mapSupplier,
} from '@/lib/api-mappers';
import { fetchAllPages, readListMeta } from '@/lib/fetch-all-pages';
import { HAS_API } from '@/lib/require-api';
import type {
  ApiCustomer,
  ApiHub,
  ApiListResponse,
  ApiSale,
  ApiStockLog,
  ApiSupplier,
} from '@/types/api';
import type { Customer, Sale, StockLog, Supplier } from '@/types';

/** Production-safe page sizes (at or below each endpoint's @Max). */
export const INSIGHT_PAGE_LIMITS = {
  customers: 100,
  suppliers: 200,
  stockLogs: 20,
  sales: 200,
} as const;

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

async function fetchHubMap(): Promise<Record<string, string>> {
  if (!HAS_API) return {};
  const res = (await axiosGet('hub', true)) as ApiListResponse<ApiHub[]>;
  return buildHubMap((res.data ?? []).map(mapHub));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function unwrapArrayData<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const obj = asRecord(raw);
  if (!obj) return [];
  if (Array.isArray(obj.data)) return obj.data as T[];
  if (Array.isArray(obj.items)) return obj.items as T[];
  const nested = asRecord(obj.data);
  if (!nested) return [];
  if (Array.isArray(nested.data)) return nested.data as T[];
  if (Array.isArray(nested.items)) return nested.items as T[];
  return [];
}

function unwrapSalesItems(raw: unknown): ApiSale[] {
  const direct = unwrapArrayData<ApiSale>(raw);
  if (direct.length > 0) return direct;
  const nested = asRecord(asRecord(raw)?.data);
  if (Array.isArray(nested?.items)) return nested.items as ApiSale[];
  return [];
}

export async function fetchAllInsightCustomers(hubId?: string): Promise<Customer[]> {
  if (!HAS_API) return [];
  const hubMap = await fetchHubMap();
  return fetchAllPages(async (page, limit) => {
    const raw = await axiosGet(
      `customers${buildQuery({ hub_id: hubId, page, limit })}`,
      true,
    );
    const rows = unwrapArrayData<ApiCustomer>(raw);
    const meta = readListMeta(raw, rows.length, limit);
    return {
      items: rows.map((c) => mapCustomer(c, hubMap)),
      totalPages: meta.totalPages,
    };
  }, INSIGHT_PAGE_LIMITS.customers);
}

export async function fetchAllInsightSales(filters: {
  hub_id?: string;
  date_from?: string;
  date_to?: string;
  exclude_voided?: boolean;
}): Promise<Sale[]> {
  if (!HAS_API) return [];
  const hubMap = await fetchHubMap();
  return fetchAllPages(async (page, limit) => {
    const raw = await axiosGet(
      `sales${buildQuery({
        hub_id: filters.hub_id,
        date_from: filters.date_from,
        date_to: filters.date_to,
        exclude_voided: filters.exclude_voided,
        page,
        limit,
      })}`,
      true,
    );
    const items = unwrapSalesItems(raw);
    const meta = readListMeta(raw, items.length, limit);
    return {
      items: items.map((s) => mapSale(s, hubMap)),
      totalPages: meta.totalPages,
    };
  }, INSIGHT_PAGE_LIMITS.sales);
}

export async function fetchAllInsightSuppliers(hubId?: string): Promise<Supplier[]> {
  if (!HAS_API) return [];
  const hubMap = await fetchHubMap();
  return fetchAllPages(async (page, limit) => {
    const raw = await axiosGet(
      `suppliers${buildQuery({ hub_id: hubId, page, limit })}`,
      true,
    );
    const rows = unwrapArrayData<ApiSupplier>(raw);
    const meta = readListMeta(raw, rows.length, limit);
    return {
      items: rows.map((s) => mapSupplier(s, hubMap)),
      totalPages: meta.totalPages,
    };
  }, INSIGHT_PAGE_LIMITS.suppliers);
}

export async function fetchAllInsightStockLogs(filters: {
  hub_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<StockLog[]> {
  if (!HAS_API) return [];
  const hubMap = await fetchHubMap();
  return fetchAllPages(async (page, limit) => {
    const raw = await axiosGet(
      `inventory/stock-logs${buildQuery({
        hub_id: filters.hub_id,
        date_from: filters.date_from,
        date_to: filters.date_to,
        page,
        limit,
      })}`,
      true,
    );
    const rows = unwrapArrayData<ApiStockLog>(raw);
    const meta = readListMeta(raw, rows.length, limit);
    return {
      items: rows.map((l) => mapStockLog(l, hubMap)),
      totalPages: meta.totalPages,
    };
  }, INSIGHT_PAGE_LIMITS.stockLogs);
}
