'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosDelete, axiosGet, axiosPost } from '@/lib/api';
import { HAS_API } from '@/lib/require-api';
import type { InsightScopeParams } from '@/hooks/use-insights-api';
import { reportQueryKey, type ReportResult, type SavedReport } from '@/lib/reports';

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-reports'] }),
  });
}

export function useDeleteSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await axiosDelete(`analytics/reports/saved/${encodeURIComponent(id)}`, true); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-reports'] }),
  });
}
