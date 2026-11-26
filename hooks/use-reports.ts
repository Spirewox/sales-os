'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosDelete, axiosGet, axiosPost, axiosPut } from '@/lib/api';
import { HAS_API } from '@/lib/require-api';
import type { InsightScopeParams } from '@/hooks/use-insights-api';
import type { Filter } from '@/lib/explore';
import { mergeMeasureRows, reportQueryKey, type ReportResult, type SavedReport } from '@/lib/reports';

/** Reports can scan a long period; give them the insights timeout. */
const REPORT_TIMEOUT_MS = 60_000;

function query(scope: InsightScopeParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(scope)) if (v) qs.set(k, String(v));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

const unwrap = <T,>(raw: unknown): T => (raw && typeof raw === 'object' && 'data' in raw ? (raw as { data: T }).data : raw as T);

/** One ready-made report for the period and location in scope. */
export function useReport(key: string | null, scope: InsightScopeParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: reportQueryKey(key ?? '', scope),
    enabled: !!key && HAS_API && (options.enabled ?? true),
    queryFn: async (): Promise<ReportResult> => {
      const raw = await axiosGet(`analytics/reports/${encodeURIComponent(key!)}${query(scope)}`, true, REPORT_TIMEOUT_MS);
      const res = unwrap<ReportResult | null>(raw);
      if (!res || !Array.isArray(res.columns) || !Array.isArray(res.rows)) throw new Error('This report did not load. Try again.');
      return res;
    },
  });
}

/** The signed-in person's saved Explore reports, newest first. */
export function useSavedReports() {
  return useQuery({
    queryKey: ['saved-reports'],
    enabled: HAS_API,
    queryFn: async (): Promise<SavedReport[]> => {
      const list = unwrap<SavedReport[]>(await axiosGet('analytics/reports/saved', true));
      return Array.isArray(list) ? list : [];
    },
  });
}

export function useSaveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Omit<SavedReport, 'id' | 'createdAt'>): Promise<SavedReport> => unwrap<SavedReport>(await axiosPost('analytics/reports/saved', body, true)),
    // In the list at once, so opening the new report never finds it missing while the list refetches.
    onSuccess: (saved) => {
      qc.setQueryData<SavedReport[]>(['saved-reports'], (list) => [saved, ...(list ?? []).filter((r) => r.id !== saved.id)]);
      return qc.invalidateQueries({ queryKey: ['saved-reports'] });
    },
  });
}

export function useDeleteSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await axiosDelete(`analytics/reports/saved/${encodeURIComponent(id)}`, true); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-reports'] }),
  });
}

export function useUpdateSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Omit<SavedReport, 'id' | 'createdAt'> }): Promise<SavedReport> =>
      unwrap<SavedReport>(await axiosPut(`analytics/reports/saved/${encodeURIComponent(id)}`, body, true)),
    onSuccess: (saved) => {
      qc.setQueryData<SavedReport[]>(['saved-reports'], (list) => (list ?? []).map((r) => (r.id === saved.id ? saved : r)));
      return qc.invalidateQueries({ queryKey: ['saved-reports'] });
    },
  });
}

export type CustomReportQuery = { dataset: string; groupBy: string; filters: Filter[]; measures: string[] };
type ExploreAnswer = { rows: { key: string; label: string; value: number }[]; total: number; measureLabel: string; groupLabel: string; measureKind: 'money' | 'number' };

/**
 * A custom report: one Explore query per column for the period and location in scope, merged into one
 * row per group. Each column is cached by its own query, so adding a column fetches only that one.
 */
export function useCustomReport(q: CustomReportQuery, scope: InsightScopeParams, options: { enabled?: boolean } = {}) {
  const queries = useQueries({
    queries: q.measures.map((measure) => ({
      queryKey: ['custom-report', q.dataset, q.groupBy, measure, q.filters, scope],
      enabled: HAS_API && (options.enabled ?? true),
      queryFn: async (): Promise<ExploreAnswer> => {
        const raw = await axiosPost('insights/explore/query', { dataset: q.dataset, measure, groupBy: q.groupBy, filters: q.filters, ...scope }, true, REPORT_TIMEOUT_MS);
        const res = unwrap<ExploreAnswer | null>(raw);
        if (!res || !Array.isArray(res.rows)) throw new Error('This report did not load. Try again.');
        return res;
      },
    })),
  });
  const answers = queries.map((x) => x.data);
  const ready = queries.length > 0 && answers.every(Boolean);
  return {
    columns: q.measures.map((measure, i) => ({ measure, label: answers[i]?.measureLabel ?? '', kind: answers[i]?.measureKind ?? 'number', total: answers[i]?.total ?? 0, rows: answers[i]?.rows ?? [] })),
    rows: ready ? mergeMeasureRows(q.measures.map((measure, i) => ({ measure, rows: answers[i]!.rows }))) : null,
    groupLabel: answers.find(Boolean)?.groupLabel ?? '',
    isPending: queries.some((x) => x.isPending),
    isFetching: queries.some((x) => x.isFetching),
    isError: queries.some((x) => x.isError),
    refetch: () => queries.forEach((x) => { if (x.isError) void x.refetch(); }),
  };
}
