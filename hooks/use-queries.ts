'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useLayoutEffect } from 'react';
import { HAS_API, requireApi } from '@/lib/require-api';
import { axiosGet, axiosPost, axiosPatch, axiosDelete, axiosGetBlob, axiosPostForm } from '@/lib/api';
import { customerTypeToApi, customerCompanyNameForApi, customerPhoneForApi } from '@/lib/customer-helpers';
import { mapApiUser } from '@/lib/utils';
import { readWhoAmICache, writeWhoAmICache } from '@/lib/whoami-cache';
import {
  ApiUser,
  ApiResponse,
  ApiCreditCustomerSummary,
  ApiCreditRecord,
  ApiListResponse,
  ApiHub,
  ApiCustomer,
  ApiCustomerListResponse,
  ApiCustomerListSummary,
  ApiSale,
  ApiProduct,
  ApiStockLog,
  ApiSupplier,
  ApiSupplierIssue,
  ApiUsersListResponse,
  ApiRole,
  ApiFeedback,
  ApiEnquiry,
  ApiCompensation,
  ApiAuditLog,
  ApiTask,
  ApiSegment,
  ApiDashboardMetricsRaw,
  DashboardMetricsData,
  InventorySalesMetrics,
  ApiProductSupplierRow,
  ApiProductSalesPerformance,
  ProductSupplierRow,
  ProductSalesPerformance,
  DashboardPeriod,
  DashboardSalesSummary,
  DashboardTrendGranularity,
  DashboardCategoryRevenue,
  EMPTY_DASHBOARD_SALES_SUMMARY,
  EMPTY_DASHBOARD_CATEGORY_REVENUE,
  AnalyticsOverviewData,
  EMPTY_ANALYTICS_OVERVIEW,
  ApiBulkImportSaleRow,
  SalesImportValidateResponse,
  SalesImportResult,
  SalesImportChunkResult,
  ApiBulkImportMovementRow,
  InventoryImportValidateResponse,
  InventoryImportResult,
  CustomerImportValidateResponse,
  CustomerImportResult,
  ApiInventoryRequest,
  ApiInventoryRequestLine,
  InventoryRequestStatus,
} from '@/types/api';
import {
  mapCreditCustomerSummary,
  mapCreditRecord,
  buildMetricsFromSummary,
} from '@/lib/credit-mappers';
import {
  feedbackTypeToApi,
  compensationCategoryToApi,
  compensationStatusToApi,
  unwrapApiEntity,
  paginatedList,
} from '@/lib/interaction-payloads';
import {
  mapHub,
  mapCustomer,
  mapSale,
  mapInventoryItem,
  mapStockLog,
  mapSupplier,
  mapSupplierIssue,
  mapProductSupplierRow,
  mapProductSalesPerformance,
  mapAgent,
  mapFeedback,
  mapEnquiry,
  mapCompensation,
  mapAuditLog,
  mapTask,
  mapSegment,
  buildHubMap,
  normalizeDashboardMetrics,
} from '@/lib/api-mappers';
import {
  Compensation,
  Enquiry,
  Hub,
  FeedbackType,
  FeedbackPriority,
  CustomerListResult,
  CustomerListSummary,
  SalesListResult,
  SalesListSummary,
  AuditLogListResult,
  AuditLogListSummary,
  Supplier,
  SupplierIssue,
  SupplierPurchasesResult,
} from '../types';


function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

type UseQueryEnabledOptions = { enabled?: boolean };

const HUBS_STALE_MS = 5 * 60 * 1000;
const CUSTOMERS_PAGE_SIZE = 20;
export const SALES_PAGE_SIZE = 25;
const AUDIT_PAGE_SIZE = 25;

const EMPTY_SALES_LIST: SalesListResult = {
  items: [],
  meta: { page: 1, limit: SALES_PAGE_SIZE, total: 0, totalPages: 1 },
  summary: {
    revenue: 0,
    profit: 0,
    count: 0,
    avgOrder: 0,
    creditCount: 0,
    creditAmount: 0,
    deliveryCount: 0,
    revenueChange: 0,
    profitChange: 0,
  },
};

const EMPTY_AUDIT_LIST: AuditLogListResult = {
  items: [],
  meta: { page: 1, limit: AUDIT_PAGE_SIZE, total: 0, totalPages: 1 },
  summary: { total: 0, bulk: 0, sales: 0, inventory: 0, customers: 0 },
};

function defaultSalesSummary(): SalesListSummary {
  return EMPTY_SALES_LIST.summary;
}

function defaultAuditSummary(): AuditLogListSummary {
  return EMPTY_AUDIT_LIST.summary;
}

function parseSalesListResponse(
  raw: unknown,
  hubMap: Record<string, string>,
): SalesListResult {
  let body: unknown = raw;
  if (
    body &&
    typeof body === 'object' &&
    'message' in body &&
    'data' in body &&
    !('items' in body)
  ) {
    body = (body as ApiListResponse<{ items: ApiSale[]; pagination?: SalesListResult['meta']; summary?: SalesListSummary }>).data;
  }

  if (body && typeof body === 'object' && 'items' in body) {
    const data = body as {
      items?: ApiSale[];
      pagination?: Partial<SalesListResult['meta']>;
      summary?: Partial<SalesListSummary>;
    };
    const page = data.pagination?.page ?? 1;
    const limit = data.pagination?.limit ?? SALES_PAGE_SIZE;
    const total = data.pagination?.total ?? 0;
    const totalPages = data.pagination?.totalPages ?? Math.max(1, Math.ceil(total / limit));
    return {
      items: (data.items ?? []).map((s) => mapSale(s, hubMap)),
      meta: { page, limit, total, totalPages },
      summary: { ...defaultSalesSummary(), ...(data.summary ?? {}) },
    };
  }

  if (Array.isArray(body)) {
    return {
      items: body.map((s) => mapSale(s as ApiSale, hubMap)),
      meta: { page: 1, limit: body.length, total: body.length, totalPages: 1 },
      summary: defaultSalesSummary(),
    };
  }

  return EMPTY_SALES_LIST;
}

function parseAuditListResponse(
  raw: unknown,
  hubMap: Record<string, string>,
): AuditLogListResult {
  let body: unknown = raw;
  if (
    body &&
    typeof body === 'object' &&
    'message' in body &&
    'data' in body &&
    !('items' in body)
  ) {
    body = (body as ApiListResponse<{ items: ApiAuditLog[]; pagination?: AuditLogListResult['meta']; summary?: AuditLogListSummary }>).data;
  }

  if (body && typeof body === 'object' && 'items' in body) {
    const data = body as {
      items?: ApiAuditLog[];
      pagination?: Partial<AuditLogListResult['meta']>;
      summary?: Partial<AuditLogListSummary>;
    };
    const page = data.pagination?.page ?? 1;
    const limit = data.pagination?.limit ?? AUDIT_PAGE_SIZE;
    const total = data.pagination?.total ?? 0;
    const totalPages = data.pagination?.totalPages ?? Math.max(1, Math.ceil(total / limit));
    return {
      items: (data.items ?? []).map((l) => mapAuditLog(l, hubMap)),
      meta: { page, limit, total, totalPages },
      summary: { ...defaultAuditSummary(), ...(data.summary ?? {}) },
    };
  }

  if (Array.isArray(body)) {
    return {
      items: body.map((l) => mapAuditLog(l as ApiAuditLog, hubMap)),
      meta: { page: 1, limit: body.length, total: body.length, totalPages: 1 },
      summary: defaultAuditSummary(),
    };
  }

  return EMPTY_AUDIT_LIST;
}

const EMPTY_CUSTOMER_SUMMARY: CustomerListSummary = {
  total: 0,
  b2b: 0,
  b2c: 0,
  repeat: 0,
  totalRevenue: 0,
  avgValue: 0,
  ytdCustomers: 0,
  newThisMonth: 0,
  newLastMonth: 0,
  newCustomersMomPct: 0,
  retentionRate: 0,
};

const EMPTY_CUSTOMER_LIST: CustomerListResult = {
  items: [],
  meta: { page: 1, limit: CUSTOMERS_PAGE_SIZE, total: 0, totalPages: 1 },
  summary: { ...EMPTY_CUSTOMER_SUMMARY },
};

function defaultCustomerListSummary(total: number): CustomerListSummary {
  return { ...EMPTY_CUSTOMER_SUMMARY, total };
}

function normalizeCustomerListSummary(
  summary?: Partial<ApiCustomerListSummary> | null,
  fallbackTotal = 0,
): CustomerListSummary {
  return {
    total: summary?.total ?? fallbackTotal,
    b2b: summary?.b2b ?? 0,
    b2c: summary?.b2c ?? 0,
    repeat: summary?.repeat ?? 0,
    totalRevenue: summary?.totalRevenue ?? 0,
    avgValue: summary?.avgValue ?? 0,
    ytdCustomers: summary?.ytdCustomers ?? 0,
    newThisMonth: summary?.newThisMonth ?? 0,
    newLastMonth: summary?.newLastMonth ?? 0,
    newCustomersMomPct: summary?.newCustomersMomPct ?? 0,
    retentionRate: summary?.retentionRate ?? 0,
  };
}

function isPaginatedCustomerList(value: unknown): value is ApiCustomerListResponse {
  return (
    value !== null &&
    typeof value === 'object' &&
    'meta' in value &&
    'data' in value &&
    Array.isArray((value as ApiCustomerListResponse).data)
  );
}

function parseCustomerListResponse(raw: unknown): {
  data: ApiCustomer[];
  meta: CustomerListResult['meta'];
  summary: CustomerListSummary;
} {
  let body: unknown = raw;

  if (
    body &&
    typeof body === 'object' &&
    'message' in body &&
    'data' in body &&
    !('meta' in body)
  ) {
    body = (body as ApiListResponse<ApiCustomerListResponse>).data;
  }

  if (isPaginatedCustomerList(body)) {
    const list = body;
    const meta = list.meta ?? {
      page: 1,
      limit: list.data?.length ?? 0,
      total: 0,
      totalPages: 1,
    };
    return {
      data: list.data ?? [],
      meta,
      summary: normalizeCustomerListSummary(list.summary, meta.total),
    };
  }

  if (Array.isArray(body)) {
    return {
      data: body,
      meta: { page: 1, limit: body.length, total: body.length, totalPages: 1 },
      summary: defaultCustomerListSummary(body.length),
    };
  }

  return { data: [], meta: EMPTY_CUSTOMER_LIST.meta, summary: EMPTY_CUSTOMER_LIST.summary };
}

async function fetchHubsList(): Promise<Hub[]> {
  if (!HAS_API) return [];
  const res = await axiosGet('hub', true) as ApiListResponse<ApiHub[]>;
  return (res.data ?? []).map(mapHub);
}

async function fetchHubMap(): Promise<Record<string, string>> {
  const hubs = await fetchHubsList();
  return buildHubMap(hubs);
}

function invalidateCredits(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['saleCredits'] });
  qc.invalidateQueries({ queryKey: ['creditSummary'] });
  qc.invalidateQueries({ queryKey: ['creditMetrics'] });
  qc.invalidateQueries({ queryKey: ['credits'] });
}

// --- Auth ---
export function useWhoAmI() {
  const queryClient = useQueryClient();

  // Hydrate from sessionStorage before paint so warm boots skip the flower gate
  useLayoutEffect(() => {
    const cached = readWhoAmICache();
    if (!cached) return;
    if (queryClient.getQueryData(['whoami']) != null) return;
    queryClient.setQueryData(['whoami'], cached);
    void queryClient.invalidateQueries({ queryKey: ['whoami'] });
  }, [queryClient]);

  return useQuery({
    queryKey: ['whoami'],
    queryFn: async () => {
      const res = await axiosGet('auth/whoami', true) as ApiResponse<ApiUser>;
      const user = mapApiUser(res.data);
      writeWhoAmICache(user);
      return user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyticsOverview(filters?: {
  hub_id?: string;
  period?: string;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: ['analyticsOverview', filters],
    queryFn: async () => {
      if (!HAS_API) return EMPTY_ANALYTICS_OVERVIEW;
      const params = new URLSearchParams();
      if (filters?.hub_id) params.set('hub_id', filters.hub_id);
      if (filters?.period) params.set('period', filters.period);
      if (filters?.date_from) params.set('date_from', filters.date_from);
      if (filters?.date_to) params.set('date_to', filters.date_to);
      const qs = params.toString();
      const path = qs ? `analytics/overview?${qs}` : 'analytics/overview';
      const res = await axiosGet(path, true) as ApiResponse<AnalyticsOverviewData>;
      const data = res.data ?? EMPTY_ANALYTICS_OVERVIEW;
      return {
        ...EMPTY_ANALYTICS_OVERVIEW,
        ...data,
        sales: {
          ...EMPTY_ANALYTICS_OVERVIEW.sales,
          ...data.sales,
          weeklyTrend: data.sales?.weeklyTrend ?? [],
          dailyTrend: data.sales?.dailyTrend ?? [],
          aovWeeklyTrend: data.sales?.aovWeeklyTrend ?? [],
        },
        products: { ...EMPTY_ANALYTICS_OVERVIEW.products, ...data.products },
        customers: {
          ...EMPTY_ANALYTICS_OVERVIEW.customers,
          ...data.customers,
          acquisitionWeeklyTrend: data.customers?.acquisitionWeeklyTrend ?? [],
          clvDistribution: (data.customers?.clvDistribution ?? []).map((b) => ({
            ...b,
            revenue: b.revenue ?? 0,
          })),
          segmentData: (data.customers?.segmentData ?? []).map((s) => ({
            name: s.name,
            customers: s.customers ?? s.value ?? 0,
            revenue: s.revenue ?? 0,
            value: s.value ?? s.customers ?? 0,
          })),
          topSpenders: (data.customers?.topSpenders ?? []).map((t) => ({
            ...t,
            totalOrders: t.totalOrders ?? 0,
          })),
        },
        credit: {
          ...EMPTY_ANALYTICS_OVERVIEW.credit,
          ...data.credit,
          collectionWeeklyTrend: data.credit?.collectionWeeklyTrend ?? [],
        },
      } satisfies AnalyticsOverviewData;
    },
  });
}

// --- Hubs ---
export function useHubs() {
  return useQuery({
    queryKey: ['hubs'],
    queryFn: fetchHubsList,
    staleTime: HUBS_STALE_MS,
  });
}

export function useCreateHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      hub_name: string;
      hub_address?: string;
      hub_phone?: string;
      hub_manager?: string;
      is_active?: boolean;
      location_type?: 'hub' | 'rsp';
      parent_hub?: string | null;
      ownership_type?: 'RO' | 'RF';
    }) => {
      requireApi();
      const res = await axiosPost(
        'hub',
        {
          hub_name: dto.hub_name,
          hub_address: dto.hub_address?.trim() || '-',
          hub_phone: dto.hub_phone?.trim() || '-',
          hub_manager: dto.hub_manager,
          is_active: dto.is_active ?? true,
          location_type: dto.location_type,
          parent_hub: dto.parent_hub,
          ownership_type: dto.ownership_type,
        },
        true,
      ) as ApiListResponse<ApiHub>;
      return mapHub(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hubs'] }),
  });
}

export function useUpdateHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: {
      id: string;
      hub_name?: string;
      hub_address?: string;
      hub_phone?: string;
      hub_manager?: string | null;
      is_active?: boolean;
      location_type?: 'hub' | 'rsp';
      parent_hub?: string | null;
      ownership_type?: 'RO' | 'RF';
    }) => {
      requireApi();
      const res = await axiosPatch(`hub/${id}`, dto, true) as ApiListResponse<ApiHub>;
      return mapHub(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hubs'] }),
  });
}

export function useUpgradeHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      requireApi();
      const res = await axiosPatch(`hub/${id}/upgrade`, {}, true) as ApiListResponse<ApiHub>;
      return mapHub(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hubs'] }),
  });
}

export function useDowngradeHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      child_rsp_actions,
      manager_action,
      reassign_hub_id,
      parent_hub_id,
      ownership_type,
    }: {
      id: string;
      child_rsp_actions: { rsp_id: string; action: 'reassign' | 'standalone'; target_hub_id?: string }[];
      manager_action: 'keep' | 'reassign';
      reassign_hub_id?: string;
      parent_hub_id?: string | null;
      ownership_type: 'RO' | 'RF';
    }) => {
      requireApi();
      const res = await axiosPatch(
        `hub/${id}/downgrade`,
        { child_rsp_actions, manager_action, reassign_hub_id, parent_hub_id, ownership_type },
        true,
      ) as ApiListResponse<ApiHub>;
      return mapHub(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hubs'] }),
  });
}

export function useDeleteHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      requireApi();
      return axiosDelete(`hub/${id}`, true);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hubs'] }),
  });
}

// --- Roles ---
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      if (!HAS_API) return [];
      const res = await axiosGet('roles', true);
      const list = Array.isArray(res) ? res : (res as ApiListResponse<ApiRole[]>).data ?? [];
      return list as ApiRole[];
    },
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      name: string;
      label: string;
      description?: string;
      permissions?: { module: string; submodules: string[] }[];
    }) => axiosPost('roles', dto, true) as Promise<ApiRole>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      permissions,
      label,
      description,
    }: {
      id: string;
      permissions?: { module: string; submodules: string[] }[];
      label?: string;
      description?: string;
    }) => {
      if (!HAS_API) throw new Error('Role updates require API connection');
      return axiosPatch(`roles/${id}`, { permissions, label, description }, true);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['whoami'] });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => axiosDelete(`roles/${id}`, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}

// --- Agents (Users) ---
export function useAgents(
  query?: {
    search?: string;
    role_id?: string;
    hub_id?: string;
    status?: string;
    limit?: number;
  },
  options?: UseQueryEnabledOptions,
) {
  return useQuery({
    queryKey: ['agents', query],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      if (!HAS_API) return [];
      const q = { limit: 200, ...query };
      const res = await axiosGet(`users${buildQuery(q)}`, true) as ApiUsersListResponse;
      return (res.users ?? []).map(mapAgent);
    },
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      full_name: string;
      email: string;
      phone: string;
      role_id: string;
      hub_id?: string;
    }) => {
      requireApi();
      return axiosPost('users/create', dto, true);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      full_name,
      email,
      phone,
      role_id,
      hub_id,
      is_active,
    }: {
      id: string;
      full_name?: string;
      email?: string;
      phone?: string;
      role_id?: string;
      hub_id?: string;
      is_active?: boolean;
    }) => {
      requireApi();
      return axiosPatch(
        `users/${id}`,
        { full_name, email, phone, role_id, hub_id, is_active },
        true,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['whoami'] });
    },
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      requireApi();
      return axiosDelete(`users/${id}`, true);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (dto: { currentPassword: string; newPassword: string }) => {
      requireApi('Password reset');
      return axiosPost('auth/reset-password', dto, true);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (dto: { email: string }) => {
      requireApi('Password recovery');
      return axiosPost('auth/forgot-password', dto) as Promise<{
        message: string;
      }>;
    },
  });
}

export function useCompletePasswordReset() {
  return useMutation({
    mutationFn: async (dto: { token: string; newPassword: string }) => {
      requireApi('Password reset');
      return axiosPost('auth/reset-password/confirm', dto) as Promise<{
        message: string;
      }>;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { full_name?: string; phone?: string }) => {
      requireApi('Profile update');
      return axiosPatch('auth/profile', dto, true) as Promise<{ message: string }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whoami'] });
    },
  });
}

// --- Customers ---
export function useCustomers(filters?: {
  search?: string;
  segment_id?: string;
  segment_ids?: string[];
  type?: string;
  hub_id?: string;
  period?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  sort_by?: 'total_orders' | 'total_spent';
  sort_dir?: 'asc' | 'desc';
  min_orders?: number;
  max_orders?: number;
}, options?: { enabled?: boolean }) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['customers', filters],
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<CustomerListResult> => {
      if (!HAS_API) return EMPTY_CUSTOMER_LIST;
      const hubs = await qc.fetchQuery({
        queryKey: ['hubs'],
        queryFn: fetchHubsList,
        staleTime: HUBS_STALE_MS,
      });
      const hubMap = buildHubMap(hubs);
      const params: Record<string, string | number | undefined> = {
        search: filters?.search,
        customer_type: filters?.type ? customerTypeToApi(filters.type) : undefined,
        hub_id: filters?.hub_id,
        segment_id: filters?.segment_id,
        segment_ids: filters?.segment_ids?.length
          ? filters.segment_ids.join(',')
          : undefined,
        period: filters?.period,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        page: filters?.page,
        limit: filters?.limit,
        sort_by: filters?.sort_by,
        sort_dir: filters?.sort_dir,
        min_orders: filters?.min_orders,
        max_orders: filters?.max_orders,
      };
      const raw = await axiosGet(`customers${buildQuery(params)}`, true);
      const parsed = parseCustomerListResponse(raw);
      return {
        items: parsed.data.map((c) => mapCustomer(c, hubMap)),
        meta: parsed.meta,
        summary: parsed.summary,
      };
    },
  });
}

export type CustomerExportFilters = {
  search?: string;
  segment_id?: string;
  segment_ids?: string[];
  type?: string;
  hub_id?: string;
  period?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'total_orders' | 'total_spent';
  sort_dir?: 'asc' | 'desc';
  min_orders?: number;
  max_orders?: number;
};

export function useExportCustomers() {
  return useMutation({
    mutationFn: async (filters?: CustomerExportFilters) => {
      const params: Record<string, string | number | undefined> = {
        search: filters?.search,
        customer_type: filters?.type ? customerTypeToApi(filters.type) : undefined,
        hub_id: filters?.hub_id,
        segment_id: filters?.segment_id,
        segment_ids: filters?.segment_ids?.length
          ? filters.segment_ids.join(',')
          : undefined,
        period: filters?.period,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        sort_by: filters?.sort_by,
        sort_dir: filters?.sort_dir,
        min_orders: filters?.min_orders,
        max_orders: filters?.max_orders,
      };
      const buffer = await axiosGetBlob(`customers/export${buildQuery(params)}`, true);
      const blob = new Blob([buffer], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customers-export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      customer_name: string;
      customer_email?: string;
      customer_phone: string;
      customer_type: string;
      customer_location: string;
      company_name?: string;
      assigned_agent?: string;
      business_category?: string;
      gender?: string;
      family_type?: string;
      marital_status?: string;
      age_group?: string;
      lifestyle?: string;
      employment_status?: string;
      job_type?: string;
      religion?: string;
    }) => {
      const { company_name, customer_type, ...rest } = dto;
      const res = await axiosPost('customers', {
        ...rest,
        customer_type: customerTypeToApi(customer_type),
        customer_phone: customerPhoneForApi(dto.customer_phone),
        ...customerCompanyNameForApi(customer_type, company_name),
      }, true) as ApiCustomer;
      const hubMap = await fetchHubMap();
      return mapCustomer(res, hubMap);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: {
      id: string;
      customer_name?: string;
      customer_email?: string;
      customer_phone?: string;
      customer_type?: string;
      customer_location?: string;
      company_name?: string;
      assigned_agent?: string;
      business_category?: string;
      gender?: string;
      family_type?: string;
      marital_status?: string;
      age_group?: string;
      lifestyle?: string;
      employment_status?: string;
      job_type?: string;
      religion?: string;
    }) => {
      const { company_name, customer_type, customer_phone, ...rest } = dto;
      const res = await axiosPatch(`customers/${id}`, {
        ...rest,
        ...(customer_phone !== undefined ? { customer_phone: customerPhoneForApi(customer_phone) } : {}),
        ...(customer_type !== undefined
          ? {
              customer_type: customerTypeToApi(customer_type),
              ...customerCompanyNameForApi(customer_type, company_name),
            }
          : {}),
      }, true) as ApiCustomer;
      const hubMap = await fetchHubMap();
      return mapCustomer(res, hubMap);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDownloadCustomerImportTemplate() {
  return useMutation({
    mutationFn: async () => {
      const buffer = await axiosGetBlob('customers/import/template', true);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customer-name-import-template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}

export function useValidateCustomerImport() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await axiosPostForm('customers/import/validate', form, true) as ApiListResponse<CustomerImportValidateResponse> | CustomerImportValidateResponse;
      return unwrapImportResponse(res);
    },
  });
}

export function useImportCustomers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: unknown[]) =>
      unwrapImportResponse(
        await axiosPost('customers/import', { rows }, true, 120_000),
      ) as CustomerImportResult,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['auditLogs'] });
      qc.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useSegments() {
  return useQuery({
    queryKey: ['segments'],
    queryFn: async () => {
      if (!HAS_API) return [];
      const raw = await axiosGet('customers/segments', true);
      const list: ApiSegment[] = Array.isArray(raw) ? raw : (raw as ApiListResponse<ApiSegment[]>).data ?? [];
      return list.map(mapSegment);
    },
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { name: string }) => {
      const raw = await axiosPost('customers/segments', dto, true);
      return mapSegment(unwrapApiEntity<ApiSegment>(raw));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['segments'] }),
  });
}

export function useDeleteSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => axiosDelete(`customers/segments/${id}`, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['segments'] }),
  });
}

// --- Sales ---
type SalesQueryFilters = {
  status?: string;
  date_from?: string;
  date_to?: string;
  date_field?: string;
  payment_mode?: string;
  hub_id?: string;
  agent_id?: string;
  customer_id?: string;
  channel?: string;
  search?: string;
  exclude_voided?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'quantity' | 'amount';
  sort_dir?: 'asc' | 'desc';
};

export function useSales(
  filters?: SalesQueryFilters,
  options?: UseQueryEnabledOptions,
) {
  return useQuery({
    queryKey: ['sales', filters],
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<SalesListResult> => {
      if (!HAS_API) return EMPTY_SALES_LIST;
      const hubMap = await fetchHubMap();
      const params: Record<string, string | number | boolean | undefined> = {
        status: filters?.status,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        date_field: filters?.date_field,
        payment_mode: filters?.payment_mode,
        hub_id: filters?.hub_id,
        agent_id: filters?.agent_id,
        customer_id: filters?.customer_id,
        channel: filters?.channel,
        search: filters?.search,
        exclude_voided: filters?.exclude_voided,
        page: filters?.page,
        limit: filters?.limit,
        sort_by: filters?.sort_by,
        sort_dir: filters?.sort_dir,
      };
      const raw = await axiosGet(`sales${buildQuery(params)}`, true);
      return parseSalesListResponse(raw, hubMap);
    },
  });
}

/** KPI summary only — omits page so paging the table does not refetch metrics. */
export function useSalesSummary(
  filters?: Omit<SalesQueryFilters, 'page' | 'limit'>,
  options?: UseQueryEnabledOptions,
) {
  return useQuery({
    queryKey: ['sales-summary', filters],
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<SalesListSummary> => {
      if (!HAS_API) return EMPTY_SALES_LIST.summary;
      const hubMap = await fetchHubMap();
      const params: Record<string, string | number | boolean | undefined> = {
        status: filters?.status,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        date_field: filters?.date_field,
        payment_mode: filters?.payment_mode,
        hub_id: filters?.hub_id,
        agent_id: filters?.agent_id,
        channel: filters?.channel,
        search: filters?.search,
        exclude_voided: filters?.exclude_voided,
        page: 1,
        limit: 1,
      };
      const raw = await axiosGet(`sales${buildQuery(params)}`, true);
      return parseSalesListResponse(raw, hubMap).summary;
    },
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      customer_id: string;
      hub_id: string;
      amount: number;
      amount_paid?: number;
      payment_mode: string;
      payment_type?: string;
      due_date?: string;
      payment_terms?: string;
      channel?: string;
      delivery_status?: string;
      delivery_address?: string;
      notes?: string;
      profit_margin?: number;
      profit_amount?: number;
      date?: string;
      item?: {
        product_id?: string;
        product_name?: string;
        quantity: number;
        unit?: string;
        category?: string;
      };
    }) => {
      const res = await axiosPost('sales', dto, true) as ApiListResponse<{ sale: ApiSale; credit_record?: ApiCreditRecord }>;
      return {
        sale: mapSale(res.data.sale),
        creditRecord: res.data.credit_record ? mapCreditRecord(res.data.credit_record) : undefined,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales-summary'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-sales-metrics'] });
      qc.invalidateQueries({ queryKey: ['stockLogs'] });
      invalidateCredits(qc);
      qc.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useUpdateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: { id: string; [key: string]: unknown }) => {
      const res = await axiosPatch(`sales/${id}`, dto, true) as ApiListResponse<ApiSale>;
      const hubMap = await fetchHubMap();
      return mapSale(res.data, hubMap);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales-summary'] });
      qc.invalidateQueries({ queryKey: ['inventory-sales-metrics'] });
    },
  });
}

export function useUpdateSaleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await axiosPatch(`sales/${id}/status`, { status }, true) as ApiListResponse<ApiSale>;
      return mapSale(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales-summary'] });
    },
  });
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, delivery_status, delivery_address }: { id: string; delivery_status: string; delivery_address?: string }) => {
      const res = await axiosPatch(`sales/${id}/delivery`, { delivery_status, delivery_address }, true) as ApiListResponse<ApiSale>;
      return mapSale(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales-summary'] });
    },
  });
}

export function useVoidSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosPatch(`sales/${id}/void`, {}, true) as ApiListResponse<ApiSale>;
      return mapSale(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales-summary'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-sales-metrics'] });
      qc.invalidateQueries({ queryKey: ['stockLogs'] });
      invalidateCredits(qc);
    },
  });
}

function invalidateSalesImportQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['sales'] });
  qc.invalidateQueries({ queryKey: ['sales-summary'] });
  qc.invalidateQueries({ queryKey: ['customers'] });
  qc.invalidateQueries({ queryKey: ['inventory'] });
  qc.invalidateQueries({ queryKey: ['inventory-sales-metrics'] });
  qc.invalidateQueries({ queryKey: ['stockLogs'] });
  invalidateCredits(qc);
  qc.invalidateQueries({ queryKey: ['dashboardMetrics'] });
}

function unwrapImportResponse<T>(response: ApiListResponse<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiListResponse<T>).data;
  }
  return response as T;
}

export const SALES_IMPORT_TIMEOUT_MS = 120_000;

export function useDownloadSalesImportTemplate() {
  return useMutation({
    mutationFn: async (type: 'catalog' | 'custom' = 'catalog') => {
      requireApi();
      const buffer = await axiosGetBlob(`sales/import/template?type=${type}`, true);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-import-${type}-template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useValidateSalesImport() {
  return useMutation({
    mutationFn: async (file: File) => {
      requireApi();
      const form = new FormData();
      form.append('file', file);
      const res = await axiosPostForm(
        'sales/import/validate',
        form,
        true,
        SALES_IMPORT_TIMEOUT_MS,
      ) as ApiListResponse<SalesImportValidateResponse> | SalesImportValidateResponse;
      return unwrapImportResponse(res);
    },
  });
}

export function useImportSales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ApiBulkImportSaleRow[]) => {
      requireApi();
      const res = await axiosPost('sales/import', { rows }, true) as ApiListResponse<SalesImportResult> | SalesImportResult;
      return unwrapImportResponse(res);
    },
    onSuccess: () => invalidateSalesImportQueries(qc),
  });
}

export async function confirmSalesImport(args: {
  validate_audit_id: string;
}): Promise<SalesImportChunkResult> {
  requireApi();
  const res = await axiosPost(
    'sales/import/confirm',
    {
      validate_audit_id: args.validate_audit_id,
      offset: 0,
      limit: 500,
    },
    true,
    SALES_IMPORT_TIMEOUT_MS,
  ) as ApiListResponse<SalesImportChunkResult> | SalesImportChunkResult;
  return unwrapImportResponse(res);
}

/** @deprecated Prefer confirmSalesImport — imports are atomic (all-or-nothing). */
export const SALES_IMPORT_CHUNK_SIZE = 500;

export async function confirmSalesImportChunk(args: {
  validate_audit_id: string;
  offset: number;
  limit?: number;
}): Promise<SalesImportChunkResult> {
  return confirmSalesImport({ validate_audit_id: args.validate_audit_id });
}

export async function runChunkedSalesImport(
  validateAuditId: string,
  total: number,
  onProgress?: (progress: { processed: number; total: number; imported: number; failed: number }) => void,
): Promise<SalesImportChunkResult> {
  onProgress?.({ processed: 0, total, imported: 0, failed: 0 });
  const last = await confirmSalesImport({ validate_audit_id: validateAuditId });
  onProgress?.({
    processed: last.total ?? total,
    total: last.total ?? total,
    imported: last.imported_so_far ?? last.imported,
    failed: last.failed_so_far ?? last.failed,
  });
  return last;
}

function invalidateInventoryImportQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['inventory'] });
  qc.invalidateQueries({ queryKey: ['stockLogs'] });
  qc.invalidateQueries({ queryKey: ['dashboardMetrics'] });
}

export function useDownloadInventoryImportTemplate() {
  return useMutation({
    mutationFn: async () => {
      requireApi();
      const buffer = await axiosGetBlob('inventory/import/template', true);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory-import-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useValidateInventoryImport() {
  return useMutation({
    mutationFn: async (file: File) => {
      requireApi();
      const form = new FormData();
      form.append('file', file);
      const res = await axiosPostForm('inventory/import/validate', form, true) as ApiListResponse<InventoryImportValidateResponse> | InventoryImportValidateResponse;
      return unwrapImportResponse(res);
    },
  });
}

export function useImportInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ApiBulkImportMovementRow[]) => {
      requireApi();
      const res = await axiosPost(
        'inventory/import',
        { rows },
        true,
        120_000,
      ) as ApiListResponse<InventoryImportResult> | InventoryImportResult;
      return unwrapImportResponse(res);
    },
    onSuccess: () => invalidateInventoryImportQueries(qc),
  });
}

// --- Inventory ---
export function useInventory(filters?: { hub_id?: string; category?: string; low_stock?: boolean; search?: string }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['inventory', filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      if (!HAS_API) return [];
      const hubMap = await fetchHubMap();
      const params: Record<string, string | boolean | undefined> = {
        hub_id: filters?.hub_id,
        category: filters?.category,
        search: filters?.search,
        low_stock: filters?.low_stock ? 'true' : undefined,
      };
      const res = await axiosGet(`inventory${buildQuery(params)}`, true) as ApiListResponse<ApiProduct[]>;
      return (res.data ?? []).map((p) => mapInventoryItem(p, hubMap));
    },
  });
}

export function useInventorySalesMetrics(filters?: {
  hub_id?: string;
  period?: string;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: ['inventory-sales-metrics', filters],
    queryFn: async (): Promise<InventorySalesMetrics> => {
      if (!HAS_API) {
        return {
          volumeByUnit: { Kg: 0, Litres: 0, Units: 0 },
          topSellers: [],
          mostVolatile: [],
          mealsServed: 0,
        };
      }
      const params: Record<string, string | undefined> = {
        hub_id: filters?.hub_id,
        period: filters?.period,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
      };
      const res = await axiosGet(
        `inventory/sales-metrics${buildQuery(params)}`,
        true,
      ) as ApiListResponse<InventorySalesMetrics>;
      return res.data ?? {
        volumeByUnit: { Kg: 0, Litres: 0, Units: 0 },
        topSellers: [],
        mostVolatile: [],
        mealsServed: 0,
      };
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: object) => {
      const res = await axiosPost('inventory', dto, true, 120_000) as ApiListResponse<ApiProduct>;
      const hubMap = await fetchHubMap();
      return mapInventoryItem(res.data, hubMap);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['stockLogs'] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: { id: string; [key: string]: unknown }) => {
      const res = await axiosPatch(`inventory/${id}`, dto, true) as ApiListResponse<ApiProduct>;
      const hubMap = await fetchHubMap();
      return mapInventoryItem(res.data, hubMap);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useStockLogs(filters?: { item_id?: string; hub_id?: string; type?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['stockLogs', filters],
    queryFn: async () => {
      if (!HAS_API) return [];
      const res = await axiosGet(`inventory/stock-logs${buildQuery(filters ?? {})}`, true) as ApiListResponse<ApiStockLog[]>;
      return (res.data ?? []).map(mapStockLog);
    },
  });
}

export function useProductSuppliers(productId: string | null) {
  return useQuery({
    queryKey: ['product-suppliers', productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductSupplierRow[]> => {
      if (!productId || !HAS_API) return [];
      const res = await axiosGet(
        `inventory/${productId}/suppliers`,
        true,
      ) as ApiListResponse<ApiProductSupplierRow[]>;
      return (res.data ?? []).map(mapProductSupplierRow);
    },
  });
}

export function useProductSalesPerformance(productId: string | null) {
  return useQuery({
    queryKey: ['product-sales-performance', productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductSalesPerformance | null> => {
      if (!productId || !HAS_API) return null;
      const res = await axiosGet(
        `inventory/${productId}/sales-performance`,
        true,
      ) as ApiListResponse<ApiProductSalesPerformance>;
      return mapProductSalesPerformance(res.data);
    },
  });
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: ['customer', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id || !HAS_API) return null;
      const hubMap = await fetchHubMap();
      const raw = await axiosGet(`customers/${id}`, true);
      const entity = unwrapApiEntity<ApiCustomer>(raw);
      return mapCustomer(entity, hubMap);
    },
  });
}

export function useRecordStockMove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: object) => {
      const res = await axiosPost('inventory/stock-logs', dto, true) as ApiListResponse<ApiStockLog>;
      return mapStockLog(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockLogs'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['supplierPurchases'] });
      qc.invalidateQueries({ queryKey: ['product-suppliers'] });
      qc.invalidateQueries({ queryKey: ['product-sales-performance'] });
    },
  });
}

export function useSuppliers(filters?: {
  search?: string;
  business_type?: string;
  hub_id?: string;
  category?: string;
  is_active?: boolean;
  code_from?: string;
  code_to?: string;
  page?: number;
  limit?: number;
  sort_by?: 'rating' | 'total_spend';
  sort_dir?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: ['suppliers', filters],
    queryFn: async (): Promise<{
      items: Supplier[];
      summary: { total: number; active: number; openIssues: number };
    }> => {
      if (!HAS_API) return { items: [], summary: { total: 0, active: 0, openIssues: 0 } };
      const hubMap = await fetchHubMap();
      const raw = await axiosGet(`suppliers${buildQuery(filters ?? {})}`, true) as {
        data?: ApiSupplier[];
        summary?: { total?: number; active?: number; open_issues?: number };
      };
      return {
        items: (raw.data ?? []).map((s) => mapSupplier(s, hubMap)),
        summary: {
          total: raw.summary?.total ?? 0,
          active: raw.summary?.active ?? 0,
          openIssues: raw.summary?.open_issues ?? 0,
        },
      };
    },
  });
}

export function useSupplier(id: string | null) {
  return useQuery({
    queryKey: ['supplier', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id || !HAS_API) return null;
      const hubMap = await fetchHubMap();
      const raw = await axiosGet(`suppliers/${id}`, true) as ApiSupplier;
      return mapSupplier(raw, hubMap);
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const hubMap = await fetchHubMap();
      const raw = await axiosPost('suppliers', dto, true) as ApiSupplier;
      return mapSupplier(raw, hubMap);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: { id: string } & Record<string, unknown>) => {
      const hubMap = await fetchHubMap();
      const raw = await axiosPatch(`suppliers/${id}`, dto, true) as ApiSupplier;
      return mapSupplier(raw, hubMap);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['supplier', vars.id] });
    },
  });
}

export function useSupplierPurchases(supplierId: string | null) {
  return useQuery({
    queryKey: ['supplierPurchases', supplierId],
    enabled: !!supplierId,
    queryFn: async (): Promise<SupplierPurchasesResult> => {
      if (!supplierId || !HAS_API) {
        return { items: [], summary: { orderCount: 0, totalSpend: 0, avgOrder: 0 } };
      }
      const raw = await axiosGet(`suppliers/${supplierId}/purchases?limit=200`, true) as {
        data?: ApiStockLog[];
        summary?: { order_count?: number; total_spend?: number; avg_order?: number };
      };
      return {
        items: (raw.data ?? []).map(mapStockLog),
        summary: {
          orderCount: raw.summary?.order_count ?? 0,
          totalSpend: raw.summary?.total_spend ?? 0,
          avgOrder: raw.summary?.avg_order ?? 0,
        },
      };
    },
  });
}

export function useSupplierIssues(supplierId: string | null) {
  return useQuery({
    queryKey: ['supplierIssues', supplierId],
    enabled: !!supplierId,
    queryFn: async (): Promise<SupplierIssue[]> => {
      if (!supplierId || !HAS_API) return [];
      const raw = await axiosGet(`suppliers/${supplierId}/issues`, true);
      const list: ApiSupplierIssue[] = Array.isArray(raw) ? raw : [];
      return list.map(mapSupplierIssue);
    },
  });
}

export function useCreateSupplierIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplierId,
      ...dto
    }: {
      supplierId: string;
      type: string;
      severity: string;
      description: string;
      related_item_id?: string;
    }) => {
      const raw = await axiosPost(`suppliers/${supplierId}/issues`, dto, true) as ApiSupplierIssue;
      return mapSupplierIssue(raw);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['supplierIssues', vars.supplierId] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplierIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplierId,
      issueId,
      ...dto
    }: {
      supplierId: string;
      issueId: string;
      status?: string;
      resolution_note?: string;
    }) => {
      const raw = await axiosPatch(
        `suppliers/${supplierId}/issues/${issueId}`,
        dto,
        true,
      ) as ApiSupplierIssue;
      return mapSupplierIssue(raw);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['supplierIssues', vars.supplierId] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useTransferStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: object) => axiosPost('inventory/transfer', dto, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockLogs'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useBatchStockUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: object) => axiosPost('inventory/batch', dto, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockLogs'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export interface InventoryRequestFilters {
  status?: InventoryRequestStatus;
  requesting_location?: string;
  fulfilling_hub?: string;
}

export function useInventoryRequests(filters?: InventoryRequestFilters) {
  return useQuery({
    queryKey: ['inventoryRequests', filters],
    queryFn: async () => {
      if (!HAS_API) return [] as ApiInventoryRequest[];
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.requesting_location) params.set('requesting_location', filters.requesting_location);
      if (filters?.fulfilling_hub) params.set('fulfilling_hub', filters.fulfilling_hub);
      const qs = params.toString();
      const path = qs ? `inventory/requests?${qs}` : 'inventory/requests';
      const res = await axiosGet(path, true) as ApiListResponse<ApiInventoryRequest[]>;
      return res.data ?? [];
    },
  });
}

export function useCreateInventoryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      requesting_location: string;
      fulfilling_hub: string;
      lines: ApiInventoryRequestLine[];
      notes?: string;
    }) => {
      requireApi();
      const res = await axiosPost('inventory/requests', dto, true) as ApiListResponse<ApiInventoryRequest>;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventoryRequests'] });
    },
  });
}

export function useApproveInventoryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      requireApi();
      const res = await axiosPatch(`inventory/requests/${id}/approve`, {}, true) as ApiListResponse<ApiInventoryRequest>;
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventoryRequests'] }),
  });
}

export function useRejectInventoryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rejection_reason }: { id: string; rejection_reason: string }) => {
      requireApi();
      const res = await axiosPatch(`inventory/requests/${id}/reject`, { rejection_reason }, true) as ApiListResponse<ApiInventoryRequest>;
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventoryRequests'] }),
  });
}

export function useFulfillInventoryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      requireApi();
      const res = await axiosPatch(`inventory/requests/${id}/fulfill`, {}, true) as ApiListResponse<ApiInventoryRequest>;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventoryRequests'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['stockLogs'] });
    },
  });
}

export function useCancelInventoryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      requireApi();
      const res = await axiosPatch(`inventory/requests/${id}/cancel`, {}, true) as ApiListResponse<ApiInventoryRequest>;
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventoryRequests'] }),
  });
}

// --- Credits (API with local fallback when no API_URL) ---
export function useSaleCredits() {
  return useQuery({
    queryKey: ['saleCredits'],
    queryFn: async () => {
      if (!HAS_API) return [];
      const summaryRes = await axiosGet('credits/summary', true) as ApiListResponse<ApiCreditCustomerSummary[]>;
      const all: ReturnType<typeof mapCreditRecord>[] = [];
      for (const row of summaryRes.data) {
        const res = await axiosGet(`credits?customer_id=${row.customer_id}`, true) as ApiListResponse<ApiCreditRecord[]>;
        all.push(...res.data.map(mapCreditRecord));
      }
      return all;
    },
  });
}

export function useCreditSummary(filters?: { search?: string; flagged?: boolean }) {
  return useQuery({
    queryKey: ['creditSummary', filters],
    queryFn: async () => {
      if (!HAS_API) return [];
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.flagged) params.set('flagged', 'true');
      const qs = params.toString();
      const path = qs ? `credits/summary?${qs}` : 'credits/summary';
      const res = await axiosGet(path, true) as ApiListResponse<ApiCreditCustomerSummary[]>;
      return res.data.map(mapCreditCustomerSummary);
    },
  });
}

export function useCreditMetrics() {
  return useQuery({
    queryKey: ['creditMetrics'],
    queryFn: async () => {
      if (!HAS_API) return buildMetricsFromSummary([]);
      const res = await axiosGet('credits/summary', true) as ApiListResponse<ApiCreditCustomerSummary[]>;
      return buildMetricsFromSummary(res.data.map(mapCreditCustomerSummary));
    },
  });
}

export function useCustomerCredits(customerId: string | null, filters?: { status?: string }) {
  return useQuery({
    queryKey: ['saleCredits', 'customer', customerId, filters],
    queryFn: async () => {
      if (!customerId) return [];
      if (!HAS_API) return [];
      const qs = filters?.status ? `&status=${filters.status}` : '';
      const res = await axiosGet(`credits?customer_id=${customerId}${qs}`, true) as ApiListResponse<ApiCreditRecord[]>;
      return res.data.map(mapCreditRecord);
    },
    enabled: !!customerId,
  });
}

export function useCreditRecord(id: string | null) {
  return useQuery({
    queryKey: ['saleCredits', 'detail', id],
    queryFn: async () => {
      if (!id) return undefined;
      if (!HAS_API) return null;
      const res = await axiosGet(`credits/${id}`, true) as ApiListResponse<ApiCreditRecord>;
      return mapCreditRecord(res.data);
    },
    enabled: !!id,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      creditId,
      amount,
      method,
      note,
      recordedBy,
      recordedByName,
    }: {
      creditId: string;
      amount: number;
      method: 'Cash' | 'Transfer' | 'POS';
      note?: string;
      recordedBy: string;
      recordedByName: string;
    }) => {
      requireApi();
      const res = await axiosPost(`credits/${creditId}/payment`, { amount, method, note }, true) as ApiListResponse<ApiCreditRecord>;
      return mapCreditRecord(res.data);
    },
    onSuccess: () => invalidateCredits(qc),
  });
}

export function useGeneralCreditPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      customerId,
      amount,
      method,
      note,
    }: {
      customerId: string;
      amount: number;
      method: 'Cash' | 'Transfer' | 'POS';
      note?: string;
    }) => {
      requireApi();
      const res = await axiosPost(
        'credits/general-payment',
        { customer_id: customerId, amount, method, note },
        true,
      ) as ApiListResponse<{
        customer_id: string;
        amount_paid: number;
        allocations: { credit_id: string; amount: number; balance_after: number }[];
        total_outstanding: number;
        credits: ApiCreditRecord[];
      }>;
      return {
        customerId: res.data.customer_id,
        amountPaid: res.data.amount_paid,
        allocations: res.data.allocations,
        totalOutstanding: res.data.total_outstanding,
        credits: (res.data.credits ?? []).map(mapCreditRecord),
      };
    },
    onSuccess: () => invalidateCredits(qc),
  });
}

export function useExtendDueDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      creditId,
      newDueDate,
      reason,
      extendedByName,
    }: {
      creditId: string;
      newDueDate: string;
      reason?: string;
      extendedByName: string;
    }) => {
      requireApi();
      const res = await axiosPatch(`credits/${creditId}/extend-due-date`, { new_due_date: newDueDate, reason }, true) as ApiListResponse<ApiCreditRecord>;
      return mapCreditRecord(res.data);
    },
    onSuccess: () => invalidateCredits(qc),
  });
}

export function useFlagCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ creditId, reason }: { creditId: string; reason?: string }) => {
      requireApi();
      const res = await axiosPatch(`credits/${creditId}/flag`, { flag_reason: reason }, true) as ApiListResponse<ApiCreditRecord>;
      return mapCreditRecord(res.data);
    },
    onSuccess: () => invalidateCredits(qc),
  });
}

// --- Feedback ---
export function useFeedback(filters?: { status?: string }, options?: UseQueryEnabledOptions) {
  return useQuery({
    queryKey: ['feedback', filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      if (!HAS_API) return [];
      const raw = await axiosGet(`feedbacks${buildQuery(filters ?? {})}`, true);
      return paginatedList<ApiFeedback>(raw).map(mapFeedback);
    },
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      customerId: string;
      customerName: string;
      type: FeedbackType;
      content: string;
      priority?: FeedbackPriority;
    }) => {
      const priorityMap: Record<FeedbackPriority, string> = {
        [FeedbackPriority.LOW]: 'Low',
        [FeedbackPriority.MEDIUM]: 'Medium',
        [FeedbackPriority.HIGH]: 'High',
        [FeedbackPriority.URGENT]: 'Urgent',
      };
      requireApi();
      const raw = await axiosPost(
        'feedbacks',
        {
          customer: dto.customerId,
          type: feedbackTypeToApi(dto.type),
          content: dto.content,
          ...(dto.priority ? { priority: priorityMap[dto.priority] } : {}),
        },
        true,
      );
      return mapFeedback(unwrapApiEntity<ApiFeedback>(raw));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback'] });
      qc.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useUpdateFeedbackPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: FeedbackPriority }) => {
      const priorityMap: Record<FeedbackPriority, string> = {
        [FeedbackPriority.LOW]: 'Low',
        [FeedbackPriority.MEDIUM]: 'Medium',
        [FeedbackPriority.HIGH]: 'High',
        [FeedbackPriority.URGENT]: 'Urgent',
      };
      requireApi();
      const raw = await axiosPatch(
        `feedbacks/${id}/priority`,
        { priority: priorityMap[priority] },
        true,
      );
      return mapFeedback(unwrapApiEntity<ApiFeedback>(raw));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
  });
}

export function useResolveFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      requireApi();
      const raw = await axiosPatch(`feedbacks/${id}/resolve`, { resolution }, true);
      return mapFeedback(unwrapApiEntity<ApiFeedback>(raw));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
  });
}

// --- Enquiries ---
/** Backend list endpoints cap limit at 100 (see ListCompensationQueryDto). */
const INTERACTION_LIST_LIMIT = 100;

export function useEnquiries(filters?: { status?: string }, options?: UseQueryEnabledOptions) {
  return useQuery({
    queryKey: ['enquiries', filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      if (!HAS_API) return [];
      const q = { page: 1, limit: INTERACTION_LIST_LIMIT, ...filters };
      const raw = await axiosGet(`enquiries${buildQuery(q)}`, true);
      return paginatedList<ApiEnquiry>(raw).map(mapEnquiry);
    },
  });
}

export function useCreateEnquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      customerName: string;
      email?: string;
      subject?: string;
      message: string;
      date?: string;
      category?: Enquiry['category'];
    }) => {
      requireApi();
      const raw = await axiosPost(
        'enquiries',
        {
          customer_name: dto.customerName,
          customer_email: dto.email?.trim() || 'noreply@fudfarmer.local',
          date: dto.date || new Date().toISOString().split('T')[0],
          subject: dto.subject || 'General Enquiry',
          message: dto.message,
        },
        true,
      );
      return mapEnquiry(unwrapApiEntity<ApiEnquiry>(raw));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries'] }),
  });
}

export function useResolveEnquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      requireApi();
      const raw = await axiosPatch(`enquiries/${id}/resolve`, { resolution }, true);
      return mapEnquiry(unwrapApiEntity<ApiEnquiry>(raw));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries'] }),
  });
}

// --- Compensations ---
export function useCompensations(filters?: { status?: string }, options?: UseQueryEnabledOptions) {
  return useQuery({
    queryKey: ['compensations', filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      if (!HAS_API) return [];
      const q = { page: 1, limit: INTERACTION_LIST_LIMIT, ...filters };
      const raw = await axiosGet(`compensations${buildQuery(q)}`, true);
      return paginatedList<ApiCompensation>(raw).map(mapCompensation);
    },
  });
}

export function useCreateCompensation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      customerId: string;
      customerName: string;
      reason: string;
      amount: number;
      status: Compensation['status'];
      category: Compensation['category'];
      recordedByAgentId?: string;
      recordedByAgentName?: string;
    }) => {
      requireApi();
      const raw = await axiosPost(
        'compensations',
        {
          customer: dto.customerId,
          category: compensationCategoryToApi(dto.category),
          reason: dto.reason,
          value: dto.amount,
          status: compensationStatusToApi(dto.status),
        },
        true,
      );
      return mapCompensation(unwrapApiEntity<ApiCompensation>(raw));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensations'] }),
  });
}

export function useUpdateCompensationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Compensation['status'] }) => {
      requireApi();
      const raw = await axiosPatch(
        `compensations/${id}/status`,
        { status: compensationStatusToApi(status) },
        true,
      );
      return mapCompensation(unwrapApiEntity<ApiCompensation>(raw));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensations'] }),
  });
}

// --- Audit Logs ---
export function useAuditLogs(filters?: {
  entity_type?: string;
  user_id?: string;
  module?: 'sales' | 'inventory' | 'customers' | 'system';
  date_from?: string;
  date_to?: string;
  search?: string;
  category?: string;
  bulk_domain?: string;
  import_type?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: async (): Promise<AuditLogListResult> => {
      if (!HAS_API) return EMPTY_AUDIT_LIST;
      const hubMap = await fetchHubMap();
      const params: Record<string, string | number | undefined> = {
        entity_type: filters?.entity_type,
        user_id: filters?.user_id,
        module: filters?.module,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        search: filters?.search,
        category: filters?.category,
        bulk_domain: filters?.bulk_domain,
        import_type: filters?.import_type,
        page: filters?.page,
        limit: filters?.limit,
      };
      const raw = await axiosGet(`audit-trail${buildQuery(params)}`, true);
      return parseAuditListResponse(raw, hubMap);
    },
  });
}

// --- Tasks ---
export function useTasks(filters?: { assigned_to?: string; status?: string }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      if (!HAS_API) return [];
      const raw = await axiosGet(`tasks${buildQuery(filters ?? {})}`, true);
      const list: ApiTask[] = Array.isArray(raw) ? raw : (raw as ApiListResponse<ApiTask[]>).data ?? [];
      return list.map(mapTask);
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: object) => {
      const raw = await axiosPost('tasks', dto, true);
      return mapTask(raw as ApiTask);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: { id: string } & object) => {
      const raw = await axiosPatch(`tasks/${id}`, dto, true);
      return mapTask(raw as ApiTask);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => axiosDelete(`tasks/${id}`, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// --- Dashboard ---
export function useDashboardSalesSummary(
  granularity: DashboardTrendGranularity = 'all',
) {
  return useQuery({
    queryKey: ['dashboardSalesSummary', granularity],
    queryFn: async (): Promise<DashboardSalesSummary> => {
      if (!HAS_API) return EMPTY_DASHBOARD_SALES_SUMMARY;
      const res = await axiosGet(
        `dashboard/sales-summary${buildQuery({ granularity })}`,
        true,
      ) as ApiResponse<DashboardSalesSummary>;
      return res.data;
    },
  });
}

export function useDashboardRevenueByCategory(period: DashboardPeriod = 'all') {
  return useQuery({
    queryKey: ['dashboardRevenueByCategory', period],
    queryFn: async (): Promise<DashboardCategoryRevenue> => {
      if (!HAS_API) return EMPTY_DASHBOARD_CATEGORY_REVENUE;
      const res = await axiosGet(
        `dashboard/revenue-by-category${buildQuery({ period })}`,
        true,
      ) as ApiResponse<DashboardCategoryRevenue>;
      return res.data;
    },
  });
}

export function useDashboardMetrics(): ReturnType<typeof useQuery<DashboardMetricsData>> {
  return useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async (): Promise<DashboardMetricsData> => {
      requireApi();

      const [
        metricsRaw,
        creditSummaryRes,
        inventoryRes,
        feedbackRaw,
        enquiryRaw,
        customerRaw,
      ] = await Promise.all([
        axiosGet('dashboard/metrics', true) as Promise<ApiDashboardMetricsRaw>,
        axiosGet('credits/summary', true) as Promise<ApiListResponse<ApiCreditCustomerSummary[]>>,
        axiosGet('inventory', true) as Promise<ApiListResponse<ApiProduct[]>>,
        axiosGet('feedbacks', true),
        axiosGet('enquiries', true),
        axiosGet('customers', true),
      ]);

      const hubMap = await fetchHubMap();
      const inventory = (inventoryRes.data ?? []).map((p) => mapInventoryItem(p, hubMap));
      const feedbackList: ApiFeedback[] = Array.isArray(feedbackRaw) ? feedbackRaw : (feedbackRaw as ApiListResponse<ApiFeedback[]>).data ?? [];
      const enquiryList: ApiEnquiry[] = Array.isArray(enquiryRaw) ? enquiryRaw : (enquiryRaw as ApiListResponse<ApiEnquiry[]>).data ?? [];
      const customerList = parseCustomerListResponse(customerRaw);
      const customers = customerList.data.map((c) => mapCustomer(c, hubMap));

      return normalizeDashboardMetrics(metricsRaw, {
        creditSummary: creditSummaryRes.data,
        inventory,
        feedbacks: feedbackList.map(mapFeedback),
        enquiries: enquiryList.map(mapEnquiry),
        customers,
      });
    },
  });
}

// --- Insights (Gemini narrative over structured compare/ask results) ---
export type NarrateInsightPayload = {
  kind: string;
  aLabel: string;
  bLabel: string;
  aWins: number;
  bWins: number;
  periodLabel?: string;
  insights?: string[];
  metrics?: Array<{
    group?: string;
    label: string;
    a: string;
    b: string;
    winner?: 'a' | 'b' | null;
    deltaPct?: number;
  }>;
};

export function useNarrateInsight() {
  return useMutation({
    mutationFn: async (payload: NarrateInsightPayload) => {
      requireApi();
      const res = await axiosPost('insights/narrate', payload, true) as
        | { summary?: string }
        | { data?: { summary?: string } };
      const summary =
        (res as { summary?: string }).summary ??
        (res as { data?: { summary?: string } }).data?.summary;
      if (!summary) throw new Error('No summary returned');
      return { summary };
    },
  });
}
