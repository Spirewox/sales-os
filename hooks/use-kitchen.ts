'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosDelete, axiosGet, axiosPatch, axiosPost } from '@/lib/api';
import { requireApi } from '@/lib/require-api';
import type {
  KitchenCustomerOption,
  KitchenIngredient,
  KitchenJob,
  KitchenJobEvent,
  KitchenJobInput,
  KitchenJobList,
  KitchenPaymentMethod,
  KitchenPreview,
  KitchenRecipe,
  KitchenSettingsView,
} from '@/lib/kitchen-types';

/** Board refetch interval; live `kitchen.board` events also invalidate it. */
export const KITCHEN_BOARD_REFRESH_MS = 15_000;

export const kitchenKeys = {
  all: ['kitchen'] as const,
  jobs: (filters: object) => ['kitchen', 'jobs', filters] as const,
  job: (id: string) => ['kitchen', 'job', id] as const,
  events: (id: string) => ['kitchen', 'job', id, 'events'] as const,
  recipes: (q?: string) => ['kitchen', 'recipes', q ?? ''] as const,
  recipe: (id: string) => ['kitchen', 'recipe', id] as const,
  ingredients: (filters: object) => ['kitchen', 'ingredients', filters] as const,
  settings: (hubId?: string) => ['kitchen', 'settings', hubId ?? ''] as const,
  customers: (q: string) => ['kitchen', 'customers', q] as const,
};

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') out.set(k, String(v));
  const s = out.toString();
  return s ? `?${s}` : '';
};

export interface KitchenJobFilters {
  stage?: string;
  hub_id?: string;
  from?: string;
  to?: string;
  date_field?: 'created' | 'due';
  q?: string;
  customer_id?: string;
  page?: number;
  limit?: number;
}

export function useKitchenJobs(filters: KitchenJobFilters, opts: { enabled?: boolean; live?: boolean } = {}) {
  return useQuery({
    queryKey: kitchenKeys.jobs(filters),
    queryFn: async () => {
      requireApi('Kitchen');
      return (await axiosGet(`kitchen/jobs${qs({ ...filters })}`, true)) as KitchenJobList;
    },
    enabled: opts.enabled ?? true,
    placeholderData: keepPreviousData,
    refetchInterval: opts.live ? KITCHEN_BOARD_REFRESH_MS : false,
    staleTime: opts.live ? 5_000 : 30_000,
  });
}

export function useKitchenJob(id: string | null) {
  return useQuery({
    queryKey: kitchenKeys.job(id ?? ''),
    queryFn: async () => ((await axiosGet(`kitchen/jobs/${id}`, true)) as { data: KitchenJob }).data,
    enabled: !!id,
  });
}

export function useKitchenJobEvents(id: string | null) {
  return useQuery({
    queryKey: kitchenKeys.events(id ?? ''),
    queryFn: async () => ((await axiosGet(`kitchen/jobs/${id}/events`, true)) as { data: KitchenJobEvent[] }).data,
    enabled: !!id,
  });
}

/** Server-side price preview for an unsaved job (authoritative numbers). */
export function useKitchenPreview() {
  return useMutation({
    mutationFn: async (input: KitchenJobInput) => ((await axiosPost('kitchen/costing/preview', input, true)) as { data: KitchenPreview }).data,
  });
}

function useJobMutation<TVars>(fn: (vars: TVars) => Promise<{ data: KitchenJob }>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: TVars) => (await fn(vars)).data,
    onSuccess: (job) => {
      qc.setQueryData(kitchenKeys.job(job._id), job);
      void qc.invalidateQueries({ queryKey: ['kitchen', 'jobs'] });
      void qc.invalidateQueries({ queryKey: kitchenKeys.events(job._id) });
    },
  });
}

export const useCreateKitchenJob = () => useJobMutation((input: KitchenJobInput) => axiosPost('kitchen/jobs', input, true));
export const useUpdateKitchenJob = () =>
  useJobMutation(({ id, input }: { id: string; input: KitchenJobInput }) => axiosPatch(`kitchen/jobs/${id}`, input, true));
export const useKitchenJobAction = () =>
  useJobMutation(({ id, action, body }: { id: string; action: 'quote' | 'confirm' | 'advance' | 'cancel' | 'decline' | 'duplicate'; body?: object }) =>
    axiosPost(`kitchen/jobs/${id}/${action}`, body ?? {}, true),
  );
export const useRecordKitchenPayment = () =>
  useJobMutation(({ id, amount, method, note }: { id: string; amount: number; method: KitchenPaymentMethod; note?: string }) =>
    axiosPost(`kitchen/jobs/${id}/payments`, { amount, method, note }, true),
  );

export function useAddKitchenNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => axiosPost(`kitchen/jobs/${id}/notes`, { text }, true),
    onSuccess: (_r, { id }) => void qc.invalidateQueries({ queryKey: kitchenKeys.events(id) }),
  });
}

export function useArchiveKitchenJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => axiosPost(`kitchen/jobs/${id}/archive`, {}, true),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['kitchen', 'jobs'] }),
  });
}

// ---- catalog ------------------------------------------------------------------

export function useKitchenRecipes(q?: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: kitchenKeys.recipes(q),
    queryFn: async () => ((await axiosGet(`kitchen/recipes${qs({ q })}`, true)) as { data: KitchenRecipe[] }).data,
    enabled: opts.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useKitchenRecipe(id: string | null) {
  return useQuery({
    queryKey: kitchenKeys.recipe(id ?? ''),
    queryFn: async () => ((await axiosGet(`kitchen/recipes/${id}`, true)) as { data: KitchenRecipe }).data,
    enabled: !!id,
  });
}

export function useKitchenIngredients(filters: { q?: string; filter?: 'no_price' | 'stale' | '' }, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: kitchenKeys.ingredients(filters),
    queryFn: async () => ((await axiosGet(`kitchen/ingredients${qs({ ...filters })}`, true)) as { data: KitchenIngredient[] }).data,
    enabled: opts.enabled ?? true,
    staleTime: 60_000,
  });
}

function useCatalogMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kitchen', 'recipes'] });
      void qc.invalidateQueries({ queryKey: ['kitchen', 'recipe'] });
      void qc.invalidateQueries({ queryKey: ['kitchen', 'ingredients'] });
    },
  });
}

type IngredientInput = Omit<Partial<KitchenIngredient>, '_id' | 'unit_cost' | 'price_history' | 'archived'>;
type RecipeInput = { name?: string; category?: string; yield_qty?: number; yield_unit?: string; notes?: string; lines?: { ingredient: string; qty: number }[] };

export const useSaveKitchenIngredient = () =>
  useCatalogMutation(({ id, input }: { id?: string; input: IngredientInput }) =>
    id ? axiosPatch(`kitchen/ingredients/${id}`, input, true) : axiosPost('kitchen/ingredients', input, true),
  );
export const useArchiveKitchenIngredient = () => useCatalogMutation((id: string) => axiosDelete(`kitchen/ingredients/${id}`, true));
export const useBulkKitchenPrices = () =>
  useCatalogMutation((items: { id: string; pack_price: number; source?: string }[]) => axiosPost('kitchen/ingredients/bulk-prices', { items }, true));
export const useSaveKitchenRecipe = () =>
  useCatalogMutation(({ id, input }: { id?: string; input: RecipeInput }) =>
    id ? axiosPatch(`kitchen/recipes/${id}`, input, true) : axiosPost('kitchen/recipes', input, true),
  );
export const useArchiveKitchenRecipe = () => useCatalogMutation((id: string) => axiosDelete(`kitchen/recipes/${id}`, true));

export function useKitchenSettings(hubId?: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: kitchenKeys.settings(hubId),
    queryFn: async () => ((await axiosGet(`kitchen/settings${qs({ hub_id: hubId })}`, true)) as { data: KitchenSettingsView }).data,
    enabled: opts.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useUpdateKitchenSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: object) => ((await axiosPatch('kitchen/settings', body, true)) as { data: KitchenSettingsView }).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kitchen', 'settings'] });
      void qc.invalidateQueries({ queryKey: ['kitchen', 'recipes'] });
    },
  });
}

export interface KitchenImportSummary {
  ingredients: { created: number; updated: number };
  recipes: { created: number; updated: number };
  settings: boolean;
  running_costs: 'hub' | 'company' | null;
  skipped: { quotes: number; orders: number };
  warnings: string[];
  dry_run: boolean;
}

export function useKitchenImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { data: object; running_costs_hub_id?: string; dry_run?: boolean }) =>
      ((await axiosPost('kitchen/import', body, true, 60_000)) as { data: KitchenImportSummary }).data,
    onSuccess: (summary) => {
      if (!summary.dry_run) void qc.invalidateQueries({ queryKey: kitchenKeys.all });
    },
  });
}

// ---- customer link ------------------------------------------------------------

export function useKitchenCustomerSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: kitchenKeys.customers(term),
    queryFn: async () => ((await axiosGet(`kitchen/customers${qs({ q: term })}`, true)) as { data: KitchenCustomerOption[] }).data,
    enabled: term.length >= 2,
    staleTime: 30_000,
  });
}

export function useCreateKitchenCustomer() {
  return useMutation({
    mutationFn: async (body: { customer_name: string; customer_phone: string; hub_id?: string }) =>
      (await axiosPost('kitchen/customers', body, true)) as { data: KitchenCustomerOption; existing: boolean },
  });
}

// ---- analytics ----------------------------------------------------------------

export interface KitchenAnalytics {
  completed: { jobs: number; revenue: number; collected: number; owed: number; average: number; costed_jobs: number; cost?: number; profit?: number; margin?: number; food_cost_pct?: number };
  by_outlet: { hub: string; name: string; jobs: number; revenue: number; profit?: number }[];
  by_channel: { channel: string; jobs: number; revenue: number }[];
  by_month: { month: string; revenue: number; profit?: number; jobs: number }[];
  time_to_accept: { jobs: number; median_minutes: number | null; average_minutes: number | null };
  quotes: { sent: number; converted: number; declined: number; expired: number; open: number; conversion_rate: number | null };
  cancelled: { jobs: number; top_reasons: { reason: string; jobs: number }[] };
}

/** Kitchen figures for the Analytics page; `scope` = the page's hub + period params. */
export function useKitchenAnalytics(scope: { hub_id?: string; period?: string; date_from?: string; date_to?: string }, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['kitchen', 'analytics', scope],
    queryFn: async () => ((await axiosGet(`kitchen/analytics${qs({ ...scope })}`, true)) as { data: KitchenAnalytics }).data,
    enabled: opts.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
